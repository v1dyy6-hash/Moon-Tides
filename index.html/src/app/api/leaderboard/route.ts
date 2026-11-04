import { db } from "@/db";
import { dailyScores } from "@/db/schema";
import { todayDateString } from "@/lib/gameData";
import { desc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? todayDateString();
  const rows = await db
    .select()
    .from(dailyScores)
    .where(eq(dailyScores.date, date))
    .orderBy(desc(dailyScores.score))
    .limit(25);

  return Response.json({ date, scores: rows });
}
