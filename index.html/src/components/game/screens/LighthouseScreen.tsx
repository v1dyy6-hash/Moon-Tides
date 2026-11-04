"use client";

import { COMPANIONS, WATER_THEMES, lighthouseProgress } from "@/lib/gameData";
import type { ClientPlayer } from "@/lib/types";

interface LighthouseScreenProps {
  player: ClientPlayer;
  onBack: () => void;
}

export function LighthouseScreen({ player, onBack }: LighthouseScreenProps) {
  const progress = lighthouseProgress(player.lighthouseXp);
  const pct = Math.min(100, Math.round((progress.intoLevel / progress.needed) * 100));

  return (
    <div className="absolute inset-0 z-20 flex flex-col overflow-y-auto bg-gradient-to-b from-[#120a2a] to-[#02030f] px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
          ←
        </button>
        <h2 className="text-xl font-bold text-white">🏮 Маяк</h2>
      </div>

      <div className="mt-5 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
        <div className="flex items-center justify-between text-sm text-white/70">
          <span>Уровень {progress.level}</span>
          <span>{progress.intoLevel}/{progress.needed} XP</span>
        </div>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-400 via-fuchsia-300 to-amber-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-white/50">
          Каждая собранная жемчужина восстанавливает маяк. Открывайте новые зоны пещеры, цвета воды и
          морских компаньонов по мере роста уровня.
        </p>
      </div>

      <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-cyan-200/80">Цвета приливов</h3>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {WATER_THEMES.map((theme) => {
          const unlocked = progress.level >= theme.level;
          return (
            <div
              key={theme.name}
              className={`rounded-xl p-3 ring-1 ${unlocked ? "ring-white/20" : "ring-white/5 opacity-40"}`}
              style={{ background: `linear-gradient(135deg, ${theme.water[0]}33, ${theme.water[1]}33)` }}
            >
              <div className="h-6 w-full rounded-md" style={{ background: `linear-gradient(90deg, ${theme.water[0]}, ${theme.water[1]})` }} />
              <div className="mt-2 text-xs font-semibold text-white">{theme.name}</div>
              <div className="text-[10px] text-white/40">{unlocked ? "Открыто" : `Ур. ${theme.level}`}</div>
            </div>
          );
        })}
      </div>

      <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-cyan-200/80">Компаньоны</h3>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {COMPANIONS.map((c) => {
          const unlocked = progress.level >= c.level;
          return (
            <div
              key={c.id}
              className={`flex flex-col items-center rounded-xl p-3 text-center ring-1 ${
                unlocked ? "bg-white/5 ring-white/15" : "bg-white/[0.02] ring-white/5"
              }`}
            >
              <div className={`text-3xl ${unlocked ? "" : "opacity-20 grayscale"}`}>{c.emoji}</div>
              <div className="mt-1 text-[11px] font-semibold text-white/90">{unlocked ? c.name : "???"}</div>
              <div className="text-[10px] text-white/40">{unlocked ? c.description : `Ур. ${c.level}`}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
