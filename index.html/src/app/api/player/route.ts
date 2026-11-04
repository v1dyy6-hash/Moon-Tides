import { db } from "@/db";
import { players } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function sanitizeNickname(raw: unknown): string {
  const s = typeof raw === "string" ? raw.trim().slice(0, 18) : "";
  return s.length > 0 ? s : "Моряк";
}

export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get("deviceId");
  if (!deviceId) {
    return Response.json({ error: "deviceId required" }, { status: 400 });
  }

  const existing = await db.select().from(players).where(eq(players.deviceId, deviceId)).limit(1);
  if (existing[0]) {
    return Response.json({ player: existing[0] });
  }

  const created = await db
    .insert(players)
    .values({ deviceId })
    .onConflictDoNothing()
    .returning();

  if (created[0]) {
    return Response.json({ player: created[0] });
  }

  const row = await db.select().from(players).where(eq(players.deviceId, deviceId)).limit(1);
  return Response.json({ player: row[0] });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const deviceId = typeof body.deviceId === "string" ? body.deviceId : null;
  if (!deviceId) {
    return Response.json({ error: "deviceId required" }, { status: 400 });
  }
  const nickname = sanitizeNickname(body.nickname);

  const existing = await db.select().from(players).where(eq(players.deviceId, deviceId)).limit(1);
  if (existing[0]) {
    const updated = await db
      .update(players)
      .set({ nickname, updatedAt: new Date() })
      .where(eq(players.deviceId, deviceId))
      .returning();
    return Response.json({ player: updated[0] });
  }

  const created = await db.insert(players).values({ deviceId, nickname }).returning();
  return Response.json({ player: created[0] });
}
