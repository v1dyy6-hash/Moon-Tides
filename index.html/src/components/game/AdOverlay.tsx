"use client";

import { useEffect, useState } from "react";

interface AdOverlayProps {
  kind: "rewarded" | "interstitial";
  label?: string;
  onDone: () => void;
}

// A stand-in for a real AdMob / Unity LevelPlay rewarded or interstitial ad.
// In a native wrapper (Capacitor/Cordova) this component would simply call
// the SDK and resolve `onDone` from its reward/close callback instead of a
// timer. Kept here so the full reward loop (continue / x2 pearls / chest /
// interstitial pacing) can be demoed end-to-end in the browser.
export function AdOverlay({ kind, label, onDone }: AdOverlayProps) {
  const duration = kind === "rewarded" ? 3.5 : 4.5;
  const [remaining, setRemaining] = useState(duration);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const elapsed = (performance.now() - start) / 1000;
      const left = Math.max(0, duration - elapsed);
      setRemaining(left);
      if (left <= 0) {
        onDone();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = Math.round(((duration - remaining) / duration) * 100);

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 px-8 text-center">
      <div className="mb-3 text-xs uppercase tracking-[0.3em] text-cyan-300/70">
        {kind === "rewarded" ? "Реклама за вознаграждение" : "Реклама"}
      </div>
      <div className="mb-6 text-2xl font-bold text-white">{label ?? "Загрузка видео…"}</div>
      <div className="h-2 w-56 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-violet-400 to-amber-300 transition-[width] duration-100"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-3 text-sm text-white/50">{Math.ceil(remaining)}с…</div>
    </div>
  );
}
