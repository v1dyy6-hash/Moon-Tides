import type { Skin, WaterTheme } from "@/lib/gameData";
import { playCombo, playHit, playPearl } from "./sound";
import type { ControlPoint, GameMode, Jellyfish, Particle, Pearl, Spike } from "./types";

export const LOGICAL_W = 480;
export const LOGICAL_H = 854;
const BOAT_X = LOGICAL_W * 0.3;
const BOAT_R = 15;
const NEAR_MISS_BAND = 24;
const SEGMENT_SPACING = 150;
const WALL_MARGIN = 46;
const COMBO_WINDOW = 2.4;
const RISE_ACCEL = 1180;
const FALL_ACCEL = 760;
const DAMPING = 2.4;
const MAX_V = 420;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^ (h >>> 16)) >>> 0;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function smooth(t: number) {
  return 0.5 - 0.5 * Math.cos(Math.min(1, Math.max(0, t)) * Math.PI);
}

export interface EngineCallbacks {
  onHud: (hud: { score: number; pearls: number; combo: number; distance: number }) => void;
  onGameOver: (result: { score: number; pearls: number; distance: number }) => void;
  onPearlBurst?: () => void;
}

export class MoonTidesEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cb: EngineCallbacks;
  private skin: Skin;
  private theme: WaterTheme;
  private mode: GameMode;
  private rng: () => number;

  private raf = 0;
  private lastTime = 0;
  private running = false;
  private dead = false;
  private invulnerableUntil = 0;

  private boatY = LOGICAL_H / 2;
  private boatVY = 0;
  private holding = false;
  private boatAngle = 0;

  private scrollX = 0;
  private speed = 165;

  private points: ControlPoint[] = [];
  private spikes: Spike[] = [];
  private jellies: Jellyfish[] = [];
  private pearls: Pearl[] = [];
  private particles: Particle[] = [];
  private plankton: { x: number; y: number; r: number; speed: number; phase: number }[] = [];

  private score = 0;
  private pearlCount = 0;
  private comboStreak = 0;
  private comboTimer = 0;
  private lastHudPush = 0;
  private elapsed = 0;

  private dpr = 1;

  constructor(canvas: HTMLCanvasElement, skin: Skin, theme: WaterTheme, mode: GameMode, seed: number, cb: EngineCallbacks) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D not supported");
    this.ctx = context;
    this.cb = cb;
    this.skin = skin;
    this.theme = theme;
    this.mode = mode;
    this.rng = mulberry32(seed);
    this.resize();
    this.seedWorld();
  }

  updateSkin(skin: Skin) {
    this.skin = skin;
  }

  updateTheme(theme: WaterTheme) {
    this.theme = theme;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(rect.width * this.dpr);
    this.canvas.height = Math.round(rect.height * this.dpr);
  }

  setHolding(v: boolean) {
    this.holding = v;
  }

  private seedWorld() {
    this.points = [{ x: 0, ceiling: 140, floor: LOGICAL_H - 140 }];
    this.points.push({ x: SEGMENT_SPACING, ceiling: 140, floor: LOGICAL_H - 140 });
    while (this.points[this.points.length - 1].x < LOGICAL_W * 3) {
      this.generateSegment();
    }
    for (let i = 0; i < 70; i++) {
      this.plankton.push({
        x: this.rng() * LOGICAL_W,
        y: this.rng() * LOGICAL_H,
        r: 1 + this.rng() * 2.2,
        speed: 8 + this.rng() * 18,
        phase: this.rng() * Math.PI * 2,
      });
    }
    this.boatY = (this.points[0].ceiling + this.points[0].floor) / 2;
  }

  private generateSegment() {
    const prev = this.points[this.points.length - 1];
    const dist = prev.x;
    const gap = Math.max(168, 300 - dist / 55);
    const prevCenter = (prev.ceiling + prev.floor) / 2;
    const walk = (this.rng() - 0.5) * 150;
    let center = prevCenter + walk;
    center = Math.max(WALL_MARGIN + gap / 2, Math.min(LOGICAL_H - WALL_MARGIN - gap / 2, center));
    const next: ControlPoint = {
      x: prev.x + SEGMENT_SPACING,
      ceiling: center - gap / 2,
      floor: center + gap / 2,
    };
    this.points.push(next);

    const midX = (prev.x + next.x) / 2 + (this.rng() - 0.5) * 30;
    const roll = this.rng();
    const difficulty = Math.min(1, dist / 4500);

    if (dist > 500 && roll < 0.38 + difficulty * 0.15) {
      const side: "top" | "bottom" = this.rng() < 0.5 ? "top" : "bottom";
      const length = gap * (0.26 + this.rng() * 0.16);
      const baseY = side === "top" ? center - gap / 2 : center + gap / 2;
      this.spikes.push({ x: midX, side, length, baseY, alive: true, nearMissDone: false });

      if (this.rng() < 0.55) {
        const tip = side === "top" ? baseY + length : baseY - length;
        const offset = (side === "top" ? 1 : -1) * 26;
        this.pearls.push({ x: midX + (this.rng() - 0.5) * 20, y: tip + offset, radius: 8, collected: false, bonus: true });
      }
    } else if (dist > 700 && roll < 0.58 + difficulty * 0.1) {
      this.jellies.push({
        x: midX,
        baseY: center + (this.rng() - 0.5) * gap * 0.3,
        amplitude: 14 + this.rng() * 22,
        freq: 0.6 + this.rng() * 0.8,
        phase: this.rng() * Math.PI * 2,
        radius: 16 + this.rng() * 6,
        alive: true,
        nearMissDone: false,
      });
    }

    const pearlCount = this.rng() < 0.75 ? 1 + Math.floor(this.rng() * 2) : 0;
    for (let i = 0; i < pearlCount; i++) {
      const px = prev.x + SEGMENT_SPACING * (0.25 + i * 0.3) + (this.rng() - 0.5) * 20;
      const py = center + (this.rng() - 0.5) * gap * 0.45;
      this.pearls.push({ x: px, y: py, radius: 8, collected: false, bonus: false });
    }
  }

  private terrainAt(x: number): { ceiling: number; floor: number } {
    const pts = this.points;
    if (x <= pts[0].x) return pts[0];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      if (x >= a.x && x <= b.x) {
        const t = smooth((x - a.x) / (b.x - a.x));
        return { ceiling: lerp(a.ceiling, b.ceiling, t), floor: lerp(a.floor, b.floor, t) };
      }
    }
    const last = pts[pts.length - 1];
    return { ceiling: last.ceiling, floor: last.floor };
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    const loop = (t: number) => {
      if (!this.running) return;
      const dt = Math.min(0.033, (t - this.lastTime) / 1000);
      this.lastTime = t;
      if (!this.dead) this.update(dt);
      this.render();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  destroy() {
    this.stop();
  }

  getStats() {
    return { score: Math.round(this.score), pearls: this.pearlCount, distance: Math.round(this.scrollX) };
  }

  quit() {
    this.dead = true;
    this.stop();
    return this.getStats();
  }

  continueAfterAd() {
    this.dead = false;
    this.invulnerableUntil = this.elapsed + 2.2;
    const clearFrom = this.scrollX;
    const clearTo = this.scrollX + 420;
    this.spikes.forEach((s) => {
      if (s.x > clearFrom && s.x < clearTo) s.alive = false;
    });
    this.jellies.forEach((j) => {
      if (j.x > clearFrom && j.x < clearTo) j.alive = false;
    });
    const terrain = this.terrainAt(this.scrollX + BOAT_X);
    this.boatY = (terrain.ceiling + terrain.floor) / 2;
    this.boatVY = 0;
    this.lastTime = performance.now();
    this.start();
  }

  private spawnBurst(x: number, y: number, color: string) {
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * (40 + Math.random() * 60),
        vy: Math.sin(angle) * (40 + Math.random() * 60),
        life: 0.5,
        maxLife: 0.5,
        color,
        size: 2 + Math.random() * 2,
      });
    }
  }

  private update(dt: number) {
    this.elapsed += dt;
    this.speed = 165 + Math.min(150, this.scrollX * 0.018);
    this.scrollX += this.speed * dt;

    if (this.holding) this.boatVY -= RISE_ACCEL * dt;
    else this.boatVY += FALL_ACCEL * dt;
    this.boatVY -= this.boatVY * Math.min(1, DAMPING * dt);
    this.boatVY = Math.max(-MAX_V, Math.min(MAX_V, this.boatVY));
    this.boatY += this.boatVY * dt;
    this.boatAngle = Math.max(-0.4, Math.min(0.4, this.boatVY / MAX_V));

    while (this.points[this.points.length - 1].x < this.scrollX + LOGICAL_W * 2.2) {
      this.generateSegment();
    }
    this.points = this.points.filter((p) => p.x > this.scrollX - SEGMENT_SPACING * 2);
    if (this.points.length > 0 && this.points[0].x > this.scrollX - SEGMENT_SPACING) {
      // keep at least one point behind for interpolation safety
    }
    this.spikes = this.spikes.filter((s) => s.x > this.scrollX - 100);
    this.jellies = this.jellies.filter((j) => j.x > this.scrollX - 100);
    this.pearls = this.pearls.filter((p) => p.x > this.scrollX - 100 && !(p.collected && p.x < this.scrollX - 90));

    const invulnerable = this.elapsed < this.invulnerableUntil;
    const worldBoatX = this.scrollX + BOAT_X;
    const terrain = this.terrainAt(worldBoatX);

    if (!invulnerable) {
      if (this.boatY - BOAT_R < terrain.ceiling || this.boatY + BOAT_R > terrain.floor) {
        this.triggerDeath();
        return;
      }
    }
    const wallClearance = Math.min(this.boatY - terrain.ceiling, terrain.floor - this.boatY);
    if (wallClearance < NEAR_MISS_BAND) this.registerNearMiss();

    for (const s of this.spikes) {
      if (!s.alive) continue;
      if (Math.abs(s.x - worldBoatX) > 60) continue;
      const tipY = s.side === "top" ? s.baseY + s.length : s.baseY - s.length;
      const dx = s.x - worldBoatX;
      const dy = tipY - this.boatY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (!invulnerable && dist < BOAT_R + 7) {
        this.triggerDeath();
        return;
      }
      if (dist < BOAT_R + 7 + NEAR_MISS_BAND && !s.nearMissDone) {
        s.nearMissDone = true;
        this.registerNearMiss();
      }
    }

    for (const j of this.jellies) {
      if (!j.alive) continue;
      if (Math.abs(j.x - worldBoatX) > 70) continue;
      const jy = j.baseY + Math.sin(this.elapsed * j.freq + j.phase) * j.amplitude;
      const dx = j.x - worldBoatX;
      const dy = jy - this.boatY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (!invulnerable && dist < BOAT_R + j.radius * 0.72) {
        this.triggerDeath();
        return;
      }
      if (dist < BOAT_R + j.radius * 0.72 + NEAR_MISS_BAND && !j.nearMissDone) {
        j.nearMissDone = true;
        this.registerNearMiss();
      }
    }

    for (const p of this.pearls) {
      if (p.collected) continue;
      if (Math.abs(p.x - worldBoatX) > 40) continue;
      const dx = p.x - worldBoatX;
      const dy = p.y - this.boatY;
      if (Math.sqrt(dx * dx + dy * dy) < BOAT_R + p.radius) {
        p.collected = true;
        const mult = this.comboMultiplier();
        const value = Math.round((p.bonus ? 3 : 1) * mult);
        this.pearlCount += value;
        this.score += value * 12;
        this.spawnBurst(p.x - this.scrollX, p.y, p.bonus ? "#fbbf24" : "#a5f3fc");
        playPearl(mult);
        this.cb.onPearlBurst?.();
      }
    }

    this.comboTimer -= dt;
    if (this.comboTimer <= 0) this.comboStreak = 0;

    this.particles.forEach((pt) => {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
    });
    this.particles = this.particles.filter((p) => p.life > 0);

    this.plankton.forEach((pl) => {
      pl.x -= pl.speed * dt * 0.35;
      if (pl.x < -10) {
        pl.x = LOGICAL_W + 10;
        pl.y = Math.random() * LOGICAL_H;
      }
    });

    this.score += dt * this.speed * 0.045;

    const now = performance.now();
    if (now - this.lastHudPush > 90) {
      this.lastHudPush = now;
      this.cb.onHud({
        score: Math.round(this.score),
        pearls: this.pearlCount,
        combo: this.comboMultiplier(),
        distance: Math.round(this.scrollX),
      });
    }
  }

  private registerNearMiss() {
    const before = this.comboMultiplier();
    this.comboStreak += 1;
    this.comboTimer = COMBO_WINDOW;
    const after = this.comboMultiplier();
    if (after > before) playCombo();
  }

  private comboMultiplier(): number {
    return Math.min(5, 1 + Math.floor(this.comboStreak / 2) * 0.5);
  }

  private triggerDeath() {
    this.dead = true;
    playHit();
    this.cb.onGameOver({ score: Math.round(this.score), pearls: this.pearlCount, distance: Math.round(this.scrollX) });
  }

  private render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.save();
    ctx.clearRect(0, 0, w, h);
    ctx.scale(w / LOGICAL_W, h / LOGICAL_H);

    const grad = ctx.createLinearGradient(0, 0, 0, LOGICAL_H);
    grad.addColorStop(0, this.theme.sky[0]);
    grad.addColorStop(0.55, this.theme.sky[1]);
    grad.addColorStop(1, this.theme.sky[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

    ctx.save();
    for (const pl of this.plankton) {
      const twinkle = 0.4 + 0.4 * Math.sin(this.elapsed * 1.6 + pl.phase);
      ctx.globalAlpha = Math.max(0.08, twinkle);
      ctx.fillStyle = this.theme.water[0];
      ctx.beginPath();
      ctx.arc(pl.x, pl.y + Math.sin(this.elapsed + pl.phase) * 4, pl.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    let first = true;
    for (const p of this.points) {
      const sx = p.x - this.scrollX;
      if (sx < -SEGMENT_SPACING || sx > LOGICAL_W + SEGMENT_SPACING) continue;
      if (first) {
        ctx.lineTo(sx, p.ceiling);
        first = false;
      } else {
        ctx.lineTo(sx, p.ceiling);
      }
    }
    ctx.lineTo(LOGICAL_W + 10, 0);
    ctx.closePath();
    ctx.fillStyle = "rgba(10,16,30,0.92)";
    ctx.shadowColor = this.theme.water[1];
    ctx.shadowBlur = 18;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-10, LOGICAL_H);
    for (const p of this.points) {
      const sx = p.x - this.scrollX;
      if (sx < -SEGMENT_SPACING || sx > LOGICAL_W + SEGMENT_SPACING) continue;
      ctx.lineTo(sx, p.floor);
    }
    ctx.lineTo(LOGICAL_W + 10, LOGICAL_H);
    ctx.closePath();
    ctx.fillStyle = "rgba(10,16,30,0.92)";
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.restore();

    // wall glow edges
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = this.theme.water[0];
    ctx.shadowColor = this.theme.water[0];
    ctx.shadowBlur = 14;
    ctx.beginPath();
    this.points.forEach((p, i) => {
      const sx = p.x - this.scrollX;
      if (i === 0) ctx.moveTo(sx, p.ceiling);
      else ctx.lineTo(sx, p.ceiling);
    });
    ctx.stroke();
    ctx.beginPath();
    this.points.forEach((p, i) => {
      const sx = p.x - this.scrollX;
      if (i === 0) ctx.moveTo(sx, p.floor);
      else ctx.lineTo(sx, p.floor);
    });
    ctx.stroke();
    ctx.restore();

    for (const s of this.spikes) {
      if (!s.alive) continue;
      const sx = s.x - this.scrollX;
      if (sx < -40 || sx > LOGICAL_W + 40) continue;
      const tipY = s.side === "top" ? s.baseY + s.length : s.baseY - s.length;
      ctx.save();
      ctx.fillStyle = "#fb7185";
      ctx.shadowColor = "#fb7185";
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(sx - 16, s.baseY);
      ctx.lineTo(sx + 16, s.baseY);
      ctx.lineTo(sx, tipY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    for (const j of this.jellies) {
      if (!j.alive) continue;
      const sx = j.x - this.scrollX;
      if (sx < -60 || sx > LOGICAL_W + 60) continue;
      const jy = j.baseY + Math.sin(this.elapsed * j.freq + j.phase) * j.amplitude;
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = "rgba(216,180,254,0.55)";
      ctx.shadowColor = "#d8b4fe";
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.ellipse(sx, jy, j.radius, j.radius * 0.82, 0, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = "rgba(216,180,254,0.65)";
      ctx.lineWidth = 2;
      for (let t = -1; t <= 1; t++) {
        ctx.beginPath();
        ctx.moveTo(sx + t * j.radius * 0.5, jy);
        ctx.quadraticCurveTo(
          sx + t * j.radius * 0.5 + Math.sin(this.elapsed * 3 + t) * 5,
          jy + j.radius * 1.4,
          sx + t * j.radius * 0.4,
          jy + j.radius * 2.1,
        );
        ctx.stroke();
      }
      ctx.restore();
    }

    for (const p of this.pearls) {
      if (p.collected) continue;
      const sx = p.x - this.scrollX;
      if (sx < -20 || sx > LOGICAL_W + 20) continue;
      const pulse = 1 + 0.15 * Math.sin(this.elapsed * 4 + p.x);
      ctx.save();
      ctx.fillStyle = p.bonus ? "#fde68a" : "#e0f2fe";
      ctx.shadowColor = p.bonus ? "#fbbf24" : "#67e8f9";
      ctx.shadowBlur = p.bonus ? 22 : 14;
      ctx.beginPath();
      ctx.arc(sx, p.y, p.radius * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const pt of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const invulnerable = this.elapsed < this.invulnerableUntil;
    const flashOn = invulnerable ? Math.floor(this.elapsed * 10) % 2 === 0 : true;
    if (flashOn) {
      ctx.save();
      ctx.translate(BOAT_X, this.boatY);
      ctx.rotate(this.boatAngle);

      const coneGrad = ctx.createLinearGradient(0, -40, 170, 0);
      coneGrad.addColorStop(0, "rgba(255,255,220,0.32)");
      coneGrad.addColorStop(1, "rgba(255,255,220,0)");
      ctx.fillStyle = coneGrad;
      ctx.beginPath();
      ctx.moveTo(4, 0);
      ctx.lineTo(190, -62);
      ctx.lineTo(190, 62);
      ctx.closePath();
      ctx.fill();

      const boatGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, BOAT_R + 6);
      boatGrad.addColorStop(0, "#ffffff");
      boatGrad.addColorStop(0.4, this.skin.colors[0]);
      boatGrad.addColorStop(1, this.skin.colors[1]);
      ctx.fillStyle = boatGrad;
      ctx.shadowColor = this.skin.glow;
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(0, 0, BOAT_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }
}
