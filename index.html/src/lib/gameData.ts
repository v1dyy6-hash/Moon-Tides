// Shared game-balance data used by both the client (rendering/shop) and the
// server (validating rewards). Keeping it isomorphic avoids drift.

export type Skin = {
  id: string;
  name: string;
  price: number;
  colors: [string, string];
  glow: string;
};

export const SKINS: Skin[] = [
  { id: "default", name: "Жестянка", price: 0, colors: ["#7dd3fc", "#38bdf8"], glow: "#67e8f9" },
  { id: "amber", name: "Янтарь", price: 150, colors: ["#fde68a", "#f59e0b"], glow: "#fbbf24" },
  { id: "violet", name: "Аметист", price: 250, colors: ["#e9d5ff", "#a855f7"], glow: "#c084fc" },
  { id: "rose", name: "Коралл", price: 350, colors: ["#fecdd3", "#fb7185"], glow: "#fda4af" },
  { id: "emerald", name: "Изумруд", price: 450, colors: ["#bbf7d0", "#22c55e"], glow: "#4ade80" },
  { id: "gold", name: "Золото Маяка", price: 700, colors: ["#fff7cd", "#eab308"], glow: "#fde047" },
];

export type Companion = {
  id: string;
  name: string;
  emoji: string;
  level: number;
  description: string;
};

export const COMPANIONS: Companion[] = [
  { id: "crab", name: "Краб-фонарщик", emoji: "🦀", level: 1, description: "Освещает мелководье." },
  { id: "turtle", name: "Черепаха-страж", emoji: "🐢", level: 2, description: "Хранит старые карты течений." },
  { id: "seahorse", name: "Морской конёк", emoji: "🐠", level: 3, description: "Чувствует приближение жемчуга." },
  { id: "octopus", name: "Осьминог-механик", emoji: "🐙", level: 4, description: "Чинит шестерни маяка." },
  { id: "jelly", name: "Ручная медуза", emoji: "🎐", level: 5, description: "Больше не светится угрозой." },
  { id: "whale", name: "Кит-хранитель", emoji: "🐋", level: 7, description: "Легенда глубоких пещер." },
  { id: "dolphin", name: "Дельфин-разведчик", emoji: "🐬", level: 9, description: "Знает все короткие пути." },
  { id: "narwhal", name: "Нарвал света", emoji: "🦄", level: 12, description: "Несёт частицу луны." },
];

export type WaterTheme = {
  level: number;
  name: string;
  sky: [string, string, string];
  water: [string, string];
};

export const WATER_THEMES: WaterTheme[] = [
  { level: 0, name: "Бирюзовая бухта", sky: ["#021124", "#042f3d", "#031522"], water: ["#0ea5a0", "#0369a1"] },
  { level: 2, name: "Фиолетовый грот", sky: ["#130a2a", "#2a0a3d", "#0a0620"], water: ["#8b5cf6", "#5b21b6"] },
  { level: 4, name: "Золотая отмель", sky: ["#241406", "#3d2a04", "#190e03"], water: ["#f59e0b", "#b45309"] },
  { level: 6, name: "Розовый риф", sky: ["#250a16", "#3d0a28", "#1a0510"], water: ["#fb7185", "#be123c"] },
  { level: 9, name: "Изумрудная бездна", sky: ["#04240f", "#053d1c", "#021807"], water: ["#34d399", "#047857"] },
  { level: 12, name: "Лунное сияние", sky: ["#05081f", "#120a3d", "#02030f"], water: ["#e0e7ff", "#6366f1"] },
];

// Cumulative lighthouse xp required to reach a given level.
export function lighthouseLevelForXp(xp: number): number {
  let level = 0;
  let required = 0;
  while (xp >= required + xpForLevel(level + 1)) {
    required += xpForLevel(level + 1);
    level += 1;
  }
  return level;
}

export function xpForLevel(level: number): number {
  return 120 + (level - 1) * 55;
}

export function lighthouseProgress(xp: number): {
  level: number;
  intoLevel: number;
  needed: number;
} {
  let level = 0;
  let remaining = xp;
  while (remaining >= xpForLevel(level + 1)) {
    remaining -= xpForLevel(level + 1);
    level += 1;
  }
  return { level, intoLevel: remaining, needed: xpForLevel(level + 1) };
}

export function themeForLevel(level: number): WaterTheme {
  let theme = WATER_THEMES[0];
  for (const t of WATER_THEMES) {
    if (level >= t.level) theme = t;
  }
  return theme;
}

export function unlockedCompanions(level: number): Companion[] {
  return COMPANIONS.filter((c) => level >= c.level);
}

export function todayDateString(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function isYesterday(dateStr: string, today: string): boolean {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const t = new Date(`${today}T00:00:00Z`);
  const diff = (t.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
  return Math.round(diff) === 1;
}

export const CHEST_COOLDOWN_MS = 4 * 60 * 60 * 1000;

export function randomChestReward(rng: () => number = Math.random): number {
  return Math.round(40 + rng() * 60);
}
