import { db } from "@/db";
import { dailyScores, players } from "@/db/schema";
import { isYesterday, todayDateString } from "@/lib/gameData";
import { and, eq, gt, sql } from "drizzle-orm";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

type RunBody = {
  deviceId?: string;
  nickname?: string;
  mode?: "endless" | "daily";
  date?: string;
  score?: number;
  pearls?: number;
  doubled?: boolean;
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as RunBody;
  const deviceId = typeof body.deviceId === "string" ? body.deviceId : null;
  if (!deviceId) return Response.json({ error: "deviceId required" }, { status: 400 });

  const mode = body.mode === "daily" ? "daily" : "endless";
  const score = Math.max(0, Math.min(1_000_000, Math.round(body.score ?? 0)));
  const rawPearls = Math.max(0, Math.min(5_000, Math.round(body.pearls ?? 0)));
  const finalPearls = body.doubled ? rawPearls * 2 : rawPearls;
  const nickname = typeof body.nickname === "string" && body.nickname.trim() ? body.nickname.trim().slice(0, 18) : null;
  const today = todayDateString();
  const date = mode === "daily" ? today : body.date ?? today;

  const existingRows = await db.select().from(players).where(eq(players.deviceId, deviceId)).limit(1);
  const player =
    existingRows[0] ??
    (await db.insert(players).values({ deviceId, nickname: nickname ?? undefined }).returning())[0];

  const nextPearlBank = player.pearlBank + finalPearls;
  const nextLighthouseXp = player.lighthouseXp + finalPearls;
  const nextBestEndless = mode === "endless" ? Math.max(player.bestScoreEndless, score) : player.bestScoreEndless;
  const nextBestDaily = mode === "daily" ? Math.max(player.bestScoreDaily, score) : player.bestScoreDaily;

  let streakCount = player.streakCount;
  let lastDailyDate = player.lastDailyDate;
  if (mode === "daily") {
    if (player.lastDailyDate === date) {
      // already played today, streak unchanged
    } else if (player.lastDailyDate && isYesterday(player.lastDailyDate, date)) {
      streakCount = player.streakCount + 1;
    } else {
      streakCount = 1;
    }
    lastDailyDate = date;
  }

  const updated = await db
    .update(players)
    .set({
      nickname: nickname ?? player.nickname,
      pearlBank: nextPearlBank,
      lighthouseXp: nextLighthouseXp,
      bestScoreEndless: nextBestEndless,
      bestScoreDaily: nextBestDaily,
      streakCount,
      lastDailyDate,
      updatedAt: new Date(),
    })
    .where(eq(players.deviceId, deviceId))
    .returning();

  let rank: number | null = null;
  if (mode === "daily") {
    const existingScore = await db
      .select()
      .from(dailyScores)
      .where(and(eq(dailyScores.date, date), eq(dailyScores.deviceId, deviceId)))
      .limit(1);

    if (existingScore[0]) {
      if (score > existingScore[0].score) {
        await db
          .update(dailyScores)
          .set({ score, pearls: finalPearls, nickname: nickname ?? existingScore[0].nickname, updatedAt: new Date() })
          .where(and(eq(dailyScores.date, date), eq(dailyScores.deviceId, deviceId)));
      }
    } else {
      await db.insert(dailyScores).values({
        date,
        deviceId,
        nickname: nickname ?? player.nickname,
        score,
        pearls: finalPearls,
      });
    }

    const bestForToday = Math.max(score, existingScore[0]?.score ?? 0);
    const better = await db
      .select({ count: sql<number>`count(*)` })
      .from(dailyScores)
      .where(and(eq(dailyScores.date, date), gt(dailyScores.score, bestForToday)));
    rank = Number(better[0]?.count ?? 0) + 1;
  }

  return Response.json({ player: updated[0], pearlsAwarded: finalPearls, rank });
}
