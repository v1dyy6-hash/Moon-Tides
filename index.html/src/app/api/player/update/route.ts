import { db } from "@/db";
import { players } from "@/db/schema";
import { CHEST_COOLDOWN_MS, SKINS, randomChestReward } from "@/lib/gameData";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

type UpdateBody = {
  deviceId?: string;
  action?: "selectSkin" | "buySkin" | "claimChest" | "removeAds";
  skinId?: string;
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as UpdateBody;
  const deviceId = typeof body.deviceId === "string" ? body.deviceId : null;
  if (!deviceId) return Response.json({ error: "deviceId required" }, { status: 400 });

  const rows = await db.select().from(players).where(eq(players.deviceId, deviceId)).limit(1);
  const player = rows[0];
  if (!player) return Response.json({ error: "player not found" }, { status: 404 });

  const unlocked: string[] = Array.isArray(player.unlockedSkins) ? (player.unlockedSkins as string[]) : ["default"];

  if (body.action === "selectSkin") {
    const skinId = body.skinId;
    if (!skinId || !unlocked.includes(skinId)) {
      return Response.json({ error: "skin not unlocked" }, { status: 400 });
    }
    const updated = await db
      .update(players)
      .set({ selectedSkin: skinId, updatedAt: new Date() })
      .where(eq(players.deviceId, deviceId))
      .returning();
    return Response.json({ player: updated[0] });
  }

  if (body.action === "buySkin") {
    const skin = SKINS.find((s) => s.id === body.skinId);
    if (!skin) return Response.json({ error: "unknown skin" }, { status: 400 });
    if (unlocked.includes(skin.id)) {
      return Response.json({ error: "already unlocked" }, { status: 400 });
    }
    if (player.pearlBank < skin.price) {
      return Response.json({ error: "not enough pearls" }, { status: 400 });
    }
    const nextUnlocked = [...unlocked, skin.id];
    const updated = await db
      .update(players)
      .set({
        pearlBank: player.pearlBank - skin.price,
        unlockedSkins: nextUnlocked,
        selectedSkin: skin.id,
        updatedAt: new Date(),
      })
      .where(eq(players.deviceId, deviceId))
      .returning();
    return Response.json({ player: updated[0] });
  }

  if (body.action === "claimChest") {
    const now = Date.now();
    const readyAt = player.nextChestAt ? new Date(player.nextChestAt).getTime() : 0;
    if (now < readyAt) {
      return Response.json({ error: "chest not ready", nextChestAt: player.nextChestAt }, { status: 400 });
    }
    const reward = randomChestReward();
    const updated = await db
      .update(players)
      .set({
        pearlBank: player.pearlBank + reward,
        lighthouseXp: player.lighthouseXp + reward,
        nextChestAt: new Date(now + CHEST_COOLDOWN_MS),
        updatedAt: new Date(),
      })
      .where(eq(players.deviceId, deviceId))
      .returning();
    return Response.json({ player: updated[0], reward });
  }

  if (body.action === "removeAds") {
    // Stub for a real App Store / Google Play IAP purchase flow. In a native
    // wrapper (e.g. Capacitor) this route would be called only after the
    // store receipt was validated server-side.
    const updated = await db
      .update(players)
      .set({ removeAds: true, updatedAt: new Date() })
      .where(eq(players.deviceId, deviceId))
      .returning();
    return Response.json({ player: updated[0] });
  }

  return Response.json({ error: "unknown action" }, { status: 400 });
}
