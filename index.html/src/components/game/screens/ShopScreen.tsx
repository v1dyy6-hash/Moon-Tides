"use client";

import { SKINS } from "@/lib/gameData";
import type { ClientPlayer } from "@/lib/types";

interface ShopScreenProps {
  player: ClientPlayer;
  onBack: () => void;
  onBuy: (skinId: string) => void;
  onSelect: (skinId: string) => void;
}

export function ShopScreen({ player, onBack, onBuy, onSelect }: ShopScreenProps) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col overflow-y-auto bg-gradient-to-b from-[#021124] to-[#02030f] px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
          ←
        </button>
        <h2 className="text-xl font-bold text-white">🎨 Лодки</h2>
        <div className="ml-auto rounded-full bg-white/5 px-3 py-1 text-sm font-semibold text-amber-200">
          🦪 {player.pearlBank}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {SKINS.map((skin) => {
          const unlocked = player.unlockedSkins.includes(skin.id);
          const selected = player.selectedSkin === skin.id;
          return (
            <div key={skin.id} className="rounded-2xl bg-white/5 p-3 text-center ring-1 ring-white/10">
              <div
                className="mx-auto h-14 w-14 rounded-full"
                style={{
                  background: `radial-gradient(circle at 35% 30%, #fff, ${skin.colors[0]} 40%, ${skin.colors[1]} 100%)`,
                  boxShadow: `0 0 18px ${skin.glow}`,
                }}
              />
              <div className="mt-2 text-sm font-semibold text-white">{skin.name}</div>
              {unlocked ? (
                <button
                  onClick={() => onSelect(skin.id)}
                  disabled={selected}
                  className={`mt-2 w-full rounded-lg py-1.5 text-xs font-bold ${
                    selected ? "bg-emerald-400/20 text-emerald-300" : "bg-cyan-400/90 text-slate-950"
                  }`}
                >
                  {selected ? "Выбрано" : "Экипировать"}
                </button>
              ) : (
                <button
                  onClick={() => onBuy(skin.id)}
                  disabled={player.pearlBank < skin.price}
                  className="mt-2 w-full rounded-lg bg-amber-400/90 py-1.5 text-xs font-bold text-amber-950 disabled:bg-white/10 disabled:text-white/30"
                >
                  🦪 {skin.price}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
