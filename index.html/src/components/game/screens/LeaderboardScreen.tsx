"use client";

import type { DailyScoreRow } from "@/lib/types";

interface LeaderboardScreenProps {
  date: string;
  scores: DailyScoreRow[];
  deviceId: string;
  loading: boolean;
  onBack: () => void;
}

export function LeaderboardScreen({ date, scores, deviceId, loading, onBack }: LeaderboardScreenProps) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col overflow-y-auto bg-gradient-to-b from-[#1a0a2a] to-[#02030f] px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
          ←
        </button>
        <h2 className="text-xl font-bold text-white">🏆 Дневной прилив</h2>
      </div>
      <div className="mt-1 text-xs text-white/40">{date}</div>

      <div className="mt-4 flex flex-col gap-2">
        {loading && <div className="text-center text-sm text-white/40">Загрузка…</div>}
        {!loading && scores.length === 0 && (
          <div className="rounded-xl bg-white/5 p-4 text-center text-sm text-white/50">
            Сегодня ещё никто не проплыл. Будь первым!
          </div>
        )}
        {scores.map((row, i) => {
          const mine = row.deviceId === deviceId;
          return (
            <div
              key={row.id}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 ring-1 ${
                mine ? "bg-cyan-400/10 ring-cyan-300/40" : "bg-white/5 ring-white/10"
              }`}
            >
              <div className="w-6 text-center text-sm font-bold text-white/60">
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
              </div>
              <div className="flex-1 truncate text-sm font-semibold text-white">{row.nickname}</div>
              <div className="text-sm font-bold text-amber-200">{row.score}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
