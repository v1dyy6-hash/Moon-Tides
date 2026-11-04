"use client";

interface HudProps {
  score: number;
  pearls: number;
  combo: number;
  muted: boolean;
  onQuit: () => void;
  onToggleMute: () => void;
}

export function Hud({ score, pearls, combo, muted, onQuit, onToggleMute }: HudProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <button
        onClick={onQuit}
        className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur"
        aria-label="Выйти из заплыва"
      >
        ✕
      </button>

      <div className="flex flex-col items-center gap-1">
        <div className="rounded-full bg-black/40 px-4 py-1 text-lg font-bold tabular-nums text-white backdrop-blur">
          {score}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full bg-black/40 px-3 py-0.5 text-sm font-semibold text-cyan-100 backdrop-blur">
            🦪 {pearls}
          </div>
          {combo > 1 && (
            <div className="rounded-full bg-amber-400/90 px-3 py-0.5 text-sm font-bold text-amber-950 shadow-[0_0_12px_rgba(251,191,36,0.8)]">
              ×{combo}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={onToggleMute}
        className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur"
        aria-label="Звук"
      >
        {muted ? "🔇" : "🔊"}
      </button>
    </div>
  );
}
