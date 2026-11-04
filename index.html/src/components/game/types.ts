export type GameMode = "endless" | "daily";

export interface ControlPoint {
  x: number;
  ceiling: number;
  floor: number;
}

export interface Spike {
  x: number;
  side: "top" | "bottom";
  length: number;
  baseY: number;
  alive: boolean;
  nearMissDone: boolean;
}

export interface Jellyfish {
  x: number;
  baseY: number;
  amplitude: number;
  freq: number;
  phase: number;
  radius: number;
  alive: boolean;
  nearMissDone: boolean;
}

export interface Pearl {
  x: number;
  y: number;
  radius: number;
  collected: boolean;
  bonus: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface HudState {
  score: number;
  pearls: number;
  combo: number;
  distance: number;
}

export interface RunResult {
  score: number;
  pearls: number;
  distance: number;
}
