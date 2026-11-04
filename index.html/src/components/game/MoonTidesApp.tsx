"use client";

import {
  CHEST_COOLDOWN_MS,
  SKINS,
  lighthouseProgress,
  themeForLevel,
  todayDateString,
} from "@/lib/gameData";
import type { ClientPlayer, DailyScoreRow } from "@/lib/types";
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { AdOverlay } from "./AdOverlay";
import { Hud } from "./Hud";
import { MoonTidesEngine, hashSeed } from "./engine";
import { isMuted, playChest, playClick, setMuted, startAmbient, stopAmbient } from "./sound";
import { GameOverOverlay } from "./screens/GameOverOverlay";
import { HomeScreen } from "./screens/HomeScreen";
import { LeaderboardScreen } from "./screens/LeaderboardScreen";
import { LighthouseScreen } from "./screens/LighthouseScreen";
import { ShopScreen } from "./screens/ShopScreen";
import type { GameMode } from "./types";

type Screen = "loading" | "home" | "playing" | "gameover" | "lighthouse" | "leaderboard" | "shop";

type AdJob = { kind: "rewarded" | "interstitial"; label: string; onDone: () => void };

const DEVICE_KEY = "moon_tides_device_id";

function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

function fallbackPlayer(deviceId: string): ClientPlayer {
  const now = new Date().toISOString();
  return {
    id: 0,
    deviceId,
    nickname: "Моряк",
    pearlBank: 0,
    lighthouseXp: 0,
    bestScoreEndless: 0,
    bestScoreDaily: 0,
    selectedSkin: "default",
    unlockedSkins: ["default"],
    removeAds: false,
    streakCount: 0,
    lastDailyDate: null,
    nextChestAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

export default function MoonTidesApp() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [player, setPlayer] = useState<ClientPlayer | null>(null);
  const [hud, setHud] = useState({ score: 0, pearls: 0, combo: 1, distance: 0 });
  const [runMode, setRunMode] = useState<GameMode>("endless");
  const [runResult, setRunResult] = useState<{ score: number; pearls: number; distance: number } | null>(null);
  const [continueUsed, setContinueUsed] = useState(false);
  const [doubleUsed, setDoubleUsed] = useState(false);
  const [rank, setRank] = useState<number | null>(null);
  const [adJob, setAdJob] = useState<AdJob | null>(null);
  const [muted, setMutedState] = useState(false);
  const [tick, setTick] = useState(0);
  const [chestReward, setChestReward] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<DailyScoreRow[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<MoonTidesEngine | null>(null);
  const deviceIdRef = useRef<string>("");
  const sessionStartRef = useRef<number>(Date.now());
  const deathsSinceAdRef = useRef(0);
  const interstitialThresholdRef = useRef(3 + Math.floor(Math.random() * 2));
  const offlineRef = useRef(false);

  // ---- bootstrap ----
  useEffect(() => {
    const id = getDeviceId();
    deviceIdRef.current = id;
    (async () => {
      try {
        const res = await fetch(`/api/player?deviceId=${encodeURIComponent(id)}`);
        if (!res.ok) throw new Error("bad response");
        const data = await res.json();
        setPlayer(data.player);
      } catch {
        offlineRef.current = true;
        setPlayer(fallbackPlayer(id));
      } finally {
        setScreen("home");
      }
    })();
  }, []);

  // 1s ticker for chest countdown display
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    return () => {
      engineRef.current?.destroy();
      stopAmbient();
    };
  }, []);

  const toggleMute = useCallback(() => {
    const next = !isMuted();
    setMuted(next);
    setMutedState(next);
  }, []);

  const startRun = useCallback(
    (mode: GameMode) => {
      if (!player) return;
      playClick();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const seed = mode === "daily" ? hashSeed(todayDateString()) : (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
      const skin = SKINS.find((s) => s.id === player.selectedSkin) ?? SKINS[0];
      const level = lighthouseProgress(player.lighthouseXp).level;
      const theme = themeForLevel(level);

      engineRef.current?.destroy();
      const engine = new MoonTidesEngine(canvas, skin, theme, mode, seed, {
        onHud: (h) => setHud(h),
        onGameOver: (result) => {
          stopAmbient();
          setRunResult(result);
          setScreen("gameover");
        },
      });
      engineRef.current = engine;
      engine.resize();
      engine.start();
      startAmbient();

      setRunMode(mode);
      setContinueUsed(false);
      setDoubleUsed(false);
      setRank(null);
      setRunResult(null);
      setHud({ score: 0, pearls: 0, combo: 1, distance: 0 });
      setScreen("playing");
    },
    [player],
  );

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (screen !== "playing") return;
      e.preventDefault();
      engineRef.current?.setHolding(true);
    },
    [screen],
  );

  const handlePointerUp = useCallback(() => {
    engineRef.current?.setHolding(false);
  }, []);

  const handleQuit = useCallback(() => {
    if (!engineRef.current) return;
    stopAmbient();
    const stats = engineRef.current.quit();
    setRunResult(stats);
    setContinueUsed(true); // no continuing a voluntary quit
    setScreen("gameover");
  }, []);

  useEffect(() => {
    const onResize = () => engineRef.current?.resize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const requestContinue = useCallback(() => {
    if (continueUsed) return;
    playClick();
    setAdJob({
      kind: "rewarded",
      label: "Продолжение заплыва…",
      onDone: () => {
        setAdJob(null);
        setContinueUsed(true);
        engineRef.current?.continueAfterAd();
        setScreen("playing");
      },
    });
  }, [continueUsed]);

  const requestDouble = useCallback(() => {
    if (doubleUsed) return;
    playClick();
    setAdJob({
      kind: "rewarded",
      label: "×2 жемчуга за заплыв…",
      onDone: () => {
        setAdJob(null);
        setDoubleUsed(true);
      },
    });
  }, [doubleUsed]);

  const proceedAfterGameOver = useCallback(
    (next: "home" | "retry", mode: GameMode) => {
      deathsSinceAdRef.current += 1;
      const sessionOk = Date.now() - sessionStartRef.current > 120_000;
      const adsAllowed = !player?.removeAds;
      const due = deathsSinceAdRef.current >= interstitialThresholdRef.current;

      const finish = () => {
        if (next === "retry") startRun(mode);
        else setScreen("home");
      };

      if (adsAllowed && sessionOk && due) {
        deathsSinceAdRef.current = 0;
        interstitialThresholdRef.current = 3 + Math.floor(Math.random() * 2);
        setAdJob({ kind: "interstitial", label: "Реклама между заплывами…", onDone: () => { setAdJob(null); finish(); } });
      } else {
        finish();
      }
    },
    [player, startRun],
  );

  const finishRun = useCallback(
    async (next: "home" | "retry") => {
      const mode = runMode;
      const result = runResult;
      if (!result) {
        setScreen("home");
        return;
      }
      if (!offlineRef.current) {
        try {
          const res = await fetch("/api/player/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              deviceId: deviceIdRef.current,
              nickname: player?.nickname,
              mode,
              score: result.score,
              pearls: result.pearls,
              doubled: doubleUsed,
            }),
          });
          const data = await res.json();
          if (data.player) setPlayer(data.player);
          if (typeof data.rank === "number") setRank(data.rank);
        } catch {
          // ignore network errors, keep local state
        }
      } else {
        setPlayer((p) => {
          if (!p) return p;
          const awarded = doubleUsed ? result.pearls * 2 : result.pearls;
          return {
            ...p,
            pearlBank: p.pearlBank + awarded,
            lighthouseXp: p.lighthouseXp + awarded,
            bestScoreEndless: mode === "endless" ? Math.max(p.bestScoreEndless, result.score) : p.bestScoreEndless,
            bestScoreDaily: mode === "daily" ? Math.max(p.bestScoreDaily, result.score) : p.bestScoreDaily,
          };
        });
      }
      setRunResult(null);
      proceedAfterGameOver(next, mode);
    },
    [runMode, runResult, player, doubleUsed, proceedAfterGameOver],
  );

  const claimChest = useCallback(() => {
    if (!player) return;
    const ready = new Date(player.nextChestAt).getTime() <= Date.now();
    if (!ready) return;
    playClick();
    setAdJob({
      kind: "rewarded",
      label: "Открываем сундук…",
      onDone: async () => {
        setAdJob(null);
        if (!offlineRef.current) {
          try {
            const res = await fetch("/api/player/update", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ deviceId: deviceIdRef.current, action: "claimChest" }),
            });
            const data = await res.json();
            if (data.player) {
              setPlayer(data.player);
              setChestReward(data.reward ?? null);
              playChest();
            }
          } catch {
            // ignore
          }
        } else {
          const reward = 60;
          setPlayer((p) =>
            p
              ? {
                  ...p,
                  pearlBank: p.pearlBank + reward,
                  lighthouseXp: p.lighthouseXp + reward,
                  nextChestAt: new Date(Date.now() + CHEST_COOLDOWN_MS).toISOString(),
                }
              : p,
          );
          setChestReward(reward);
          playChest();
        }
        setTimeout(() => setChestReward(null), 2600);
      },
    });
  }, [player]);

  const buyRemoveAds = useCallback(() => {
    playClick();
    (async () => {
      if (offlineRef.current) {
        setPlayer((p) => (p ? { ...p, removeAds: true } : p));
        return;
      }
      try {
        const res = await fetch("/api/player/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId: deviceIdRef.current, action: "removeAds" }),
        });
        const data = await res.json();
        if (data.player) setPlayer(data.player);
      } catch {
        // ignore
      }
    })();
  }, []);

  const buySkin = useCallback((skinId: string) => {
    (async () => {
      if (offlineRef.current || !player) return;
      try {
        const res = await fetch("/api/player/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId: deviceIdRef.current, action: "buySkin", skinId }),
        });
        const data = await res.json();
        if (data.player) setPlayer(data.player);
      } catch {
        // ignore
      }
    })();
  }, [player]);

  const selectSkin = useCallback((skinId: string) => {
    (async () => {
      if (offlineRef.current) {
        setPlayer((p) => (p ? { ...p, selectedSkin: skinId } : p));
        return;
      }
      try {
        const res = await fetch("/api/player/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId: deviceIdRef.current, action: "selectSkin", skinId }),
        });
        const data = await res.json();
        if (data.player) setPlayer(data.player);
      } catch {
        // ignore
      }
    })();
  }, []);

  const renamePlayer = useCallback((name: string) => {
    (async () => {
      setPlayer((p) => (p ? { ...p, nickname: name } : p));
      if (offlineRef.current) return;
      try {
        const res = await fetch("/api/player", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId: deviceIdRef.current, nickname: name }),
        });
        const data = await res.json();
        if (data.player) setPlayer(data.player);
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    if (screen !== "leaderboard") return;
    setLeaderboardLoading(true);
    fetch(`/api/leaderboard?date=${todayDateString()}`)
      .then((r) => r.json())
      .then((d) => setLeaderboard(d.scores ?? []))
      .catch(() => setLeaderboard([]))
      .finally(() => setLeaderboardLoading(false));
  }, [screen]);

  if (!player) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#02030f] text-cyan-100">
        Загрузка приливов…
      </div>
    );
  }

  const level = lighthouseProgress(player.lighthouseXp).level;
  const theme = themeForLevel(level);
  const chestReadyAt = new Date(player.nextChestAt).getTime();
  const chestReady = Date.now() >= chestReadyAt;
  const remainingMs = Math.max(0, chestReadyAt - Date.now());
  const remH = Math.floor(remainingMs / 3_600_000);
  const remM = Math.floor((remainingMs % 3_600_000) / 60_000);
  const remS = Math.floor((remainingMs % 60_000) / 1000);
  const chestCountdown = `${String(remH).padStart(2, "0")}:${String(remM).padStart(2, "0")}:${String(remS).padStart(2, "0")}`;
  void tick;

  const playedDailyToday = player.lastDailyDate === todayDateString();
  const best = runMode === "daily" ? player.bestScoreDaily : player.bestScoreEndless;
  const isNewBest = !!runResult && runResult.score >= best;

  return (
    <div
      className="relative mx-auto h-[100dvh] w-full max-w-[480px] select-none overflow-hidden bg-black text-white"
      style={{
        touchAction: "none",
        background:
          screen === "playing" || screen === "gameover"
            ? "black"
            : `linear-gradient(180deg, ${theme.sky[0]}, ${theme.sky[1]} 55%, ${theme.sky[2]})`,
      }}
    >
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 h-full w-full transition-opacity duration-300 ${
          screen === "playing" || screen === "gameover" ? "opacity-100" : "opacity-0"
        }`}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()}
      />

      {screen === "playing" && (
        <Hud score={hud.score} pearls={hud.pearls} combo={hud.combo} muted={muted} onQuit={handleQuit} onToggleMute={toggleMute} />
      )}

      {screen === "home" && (
        <HomeScreen
          player={player}
          streak={player.streakCount}
          playedDailyToday={playedDailyToday}
          chestReady={chestReady}
          chestCountdown={chestCountdown}
          muted={muted}
          onPlayEndless={() => startRun("endless")}
          onPlayDaily={() => startRun("daily")}
          onOpenLighthouse={() => setScreen("lighthouse")}
          onOpenShop={() => setScreen("shop")}
          onOpenLeaderboard={() => setScreen("leaderboard")}
          onClaimChest={claimChest}
          onBuyRemoveAds={buyRemoveAds}
          onToggleMute={toggleMute}
          onRename={renamePlayer}
        />
      )}

      {screen === "lighthouse" && <LighthouseScreen player={player} onBack={() => setScreen("home")} />}
      {screen === "shop" && <ShopScreen player={player} onBack={() => setScreen("home")} onBuy={buySkin} onSelect={selectSkin} />}
      {screen === "leaderboard" && (
        <LeaderboardScreen
          date={todayDateString()}
          scores={leaderboard}
          deviceId={deviceIdRef.current}
          loading={leaderboardLoading}
          onBack={() => setScreen("home")}
        />
      )}

      {screen === "gameover" && runResult && (
        <GameOverOverlay
          score={runResult.score}
          pearls={runResult.pearls}
          doubled={doubleUsed}
          continueAvailable={!continueUsed}
          doubleAvailable={!doubleUsed}
          best={best}
          isNewBest={isNewBest}
          mode={runMode}
          rank={rank}
          onContinue={requestContinue}
          onDouble={requestDouble}
          onRetry={() => finishRun("retry")}
          onHome={() => finishRun("home")}
        />
      )}

      {chestReward !== null && (
        <div className="absolute left-1/2 top-24 z-50 -translate-x-1/2 rounded-full bg-amber-400 px-5 py-2 text-sm font-bold text-amber-950 shadow-lg">
          🎁 +{chestReward} жемчуга!
        </div>
      )}

      {adJob && <AdOverlay kind={adJob.kind} label={adJob.label} onDone={adJob.onDone} />}
    </div>
  );
}
