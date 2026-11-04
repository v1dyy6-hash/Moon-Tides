"use client";

import { lighthouseProgress } from "@/lib/gameData";
import type { ClientPlayer } from "@/lib/types";
import { useState } from "react";

interface HomeScreenProps {
  player: ClientPlayer;
  streak: number;
  playedDailyToday: boolean;
  chestReady: boolean;
  chestCountdown: string;
  muted: boolean;
  onPlayEndless: () => void;
  onPlayDaily: () => void;
  onOpenLighthouse: () => void;
  onOpenShop: () => void;
  onOpenLeaderboard: () => void;
  onClaimChest: () => void;
  onBuyRemoveAds: () => void;
  onToggleMute: () => void;
  onRename: (name: string) => void;
}

export function HomeScreen({
  player,
  streak,
  playedDailyToday,
  chestReady,
  chestCountdown,
  muted,
  onPlayEndless,
  onPlayDaily,
  onOpenLighthouse,
  onOpenShop,
  onOpenLeaderboard,
  onClaimChest,
  onBuyRemoveAds,
  onToggleMute,
  onRename,
}: HomeScreenProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(player.nickname);
  const progress = lighthouseProgress(player.lighthouseXp);
  const pct = Math.min(100, Math.round((progress.intoLevel / progress.needed) * 100));

  return (
    <div className="absolute inset-0 z-20 flex flex-col overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between">
        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setEditing(false);
              if (draft.trim()) onRename(draft.trim());
            }}
            className="flex items-center gap-2"
          >
            <input
              autoFocus
              value={draft}
              maxLength={18}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => setEditing(false)}
              className="w-32 rounded-full bg-white/10 px-3 py-1 text-sm text-white outline-none ring-1 ring-cyan-400/50"
            />
          </form>
        ) : (
          <button
            onClick={() => {
              setDraft(player.nickname);
              setEditing(true);
            }}
            className="rounded-full bg-white/5 px-3 py-1 text-sm text-cyan-100/90"
          >
            ✎ {player.nickname}
          </button>
        )}
        <button
          onClick={onToggleMute}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/80"
          aria-label="Звук"
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </div>

      <div className="mt-6 text-center">
        <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-[0_0_18px_rgba(103,232,249,0.55)]">
          🌙 Лунные Приливы
        </h1>
        <p className="mt-1 text-sm text-cyan-100/70">Веди фонарь-лодку сквозь ночное море</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/5 p-3 text-center ring-1 ring-white/10">
          <div className="text-xs uppercase tracking-wide text-white/50">Жемчуг</div>
          <div className="text-xl font-bold text-amber-200">🦪 {player.pearlBank}</div>
        </div>
        <div className="rounded-2xl bg-white/5 p-3 text-center ring-1 ring-white/10">
          <div className="text-xs uppercase tracking-wide text-white/50">Серия приливов</div>
          <div className="text-xl font-bold text-orange-300">🔥 {streak}</div>
        </div>
      </div>

      <button
        onClick={onOpenLighthouse}
        className="mt-3 rounded-2xl bg-white/5 p-3 text-left ring-1 ring-white/10 active:scale-[0.99]"
      >
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-violet-200">🏮 Маяк, уровень {progress.level}</span>
          <span className="text-white/50">{progress.intoLevel}/{progress.needed}</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </button>

      <div className="mt-5 flex flex-col gap-3">
        <button
          onClick={onPlayEndless}
          className="rounded-2xl bg-gradient-to-r from-cyan-400 to-teal-500 py-4 text-lg font-bold text-slate-950 shadow-[0_8px_24px_rgba(45,212,191,0.35)] active:scale-[0.98]"
        >
          ▶ Бесконечный заплыв
        </button>
        <button
          onClick={onPlayDaily}
          className="rounded-2xl bg-gradient-to-r from-violet-400 to-fuchsia-500 py-4 text-lg font-bold text-slate-950 shadow-[0_8px_24px_rgba(192,132,252,0.35)] active:scale-[0.98]"
        >
          🌊 Дневной прилив{playedDailyToday ? " · ещё раз (реклама)" : ""}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <button onClick={onOpenLighthouse} className="rounded-xl bg-white/5 py-3 ring-1 ring-white/10">
          🏮<div className="mt-1 text-white/70">Маяк</div>
        </button>
        <button onClick={onOpenShop} className="rounded-xl bg-white/5 py-3 ring-1 ring-white/10">
          🎨<div className="mt-1 text-white/70">Лодки</div>
        </button>
        <button onClick={onOpenLeaderboard} className="rounded-xl bg-white/5 py-3 ring-1 ring-white/10">
          🏆<div className="mt-1 text-white/70">Рекорды</div>
        </button>
      </div>

      <div className="mt-4 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-cyan-100">🎁 Бесплатный сундук</div>
          <span className="text-xs text-white/50">{chestReady ? "готов!" : chestCountdown}</span>
        </div>
        <button
          onClick={onClaimChest}
          disabled={!chestReady}
          className="mt-2 w-full rounded-xl bg-amber-400/90 py-2 text-sm font-bold text-amber-950 disabled:bg-white/10 disabled:text-white/30"
        >
          {chestReady ? "Открыть (реклама)" : "Ожидание…"}
        </button>
      </div>

      <div className="mt-auto pt-4">
        {!player.removeAds ? (
          <button
            onClick={onBuyRemoveAds}
            className="w-full rounded-xl bg-white/5 py-2 text-xs text-white/60 ring-1 ring-white/10"
          >
            ✨ Убрать рекламу (покупка)
          </button>
        ) : (
          <div className="w-full rounded-xl bg-white/5 py-2 text-center text-xs text-emerald-300/80 ring-1 ring-white/10">
            Реклама отключена ✓
          </div>
        )}
      </div>
    </div>
  );
}
