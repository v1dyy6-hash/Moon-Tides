"use client";

interface GameOverOverlayProps {
  score: number;
  pearls: number;
  doubled: boolean;
  continueAvailable: boolean;
  doubleAvailable: boolean;
  best: number;
  isNewBest: boolean;
  mode: "endless" | "daily";
  rank: number | null;
  onContinue: () => void;
  onDouble: () => void;
  onRetry: () => void;
  onHome: () => void;
}

export function GameOverOverlay({
  score,
  pearls,
  doubled,
  continueAvailable,
  doubleAvailable,
  best,
  isNewBest,
  mode,
  rank,
  onContinue,
  onDouble,
  onRetry,
  onHome,
}: GameOverOverlayProps) {
  const totalPearls = doubled ? pearls * 2 : pearls;

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/70 px-6 backdrop-blur-sm">
      <div className="w-full max-w-xs rounded-3xl bg-slate-950/90 p-6 text-center ring-1 ring-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <div className="text-sm uppercase tracking-[0.25em] text-rose-300/80">Лодка затонула</div>
        <div className="mt-2 text-4xl font-black text-white">{score}</div>
        {isNewBest && <div className="mt-1 text-xs font-semibold text-amber-300">🏅 Новый рекорд!</div>}
        <div className="mt-1 text-xs text-white/40">Лучший результат: {best}</div>

        <div className="mt-3 flex items-center justify-center gap-2 text-lg font-bold text-amber-200">
          🦪 +{totalPearls} {doubled && <span className="text-xs text-emerald-300">(×2)</span>}
        </div>

        {mode === "daily" && rank !== null && (
          <div className="mt-2 text-sm text-violet-200">Место в дневном рейтинге: #{rank}</div>
        )}

        <div className="mt-5 flex flex-col gap-2">
          {continueAvailable && (
            <button
              onClick={onContinue}
              className="rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 py-3 text-sm font-bold text-slate-950 active:scale-[0.98]"
            >
              ▶ Продолжить (реклама)
            </button>
          )}
          {doubleAvailable && (
            <button
              onClick={onDouble}
              className="rounded-xl bg-gradient-to-r from-amber-300 to-yellow-400 py-3 text-sm font-bold text-slate-950 active:scale-[0.98]"
            >
              🦪 ×2 жемчуг (реклама)
            </button>
          )}
          <div className="mt-1 flex gap-2">
            <button
              onClick={onRetry}
              className="flex-1 rounded-xl bg-white/10 py-3 text-sm font-semibold text-white active:scale-[0.98]"
            >
              ⟲ Заново
            </button>
            <button
              onClick={onHome}
              className="flex-1 rounded-xl bg-white/10 py-3 text-sm font-semibold text-white active:scale-[0.98]"
            >
              🏠 Домой
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
