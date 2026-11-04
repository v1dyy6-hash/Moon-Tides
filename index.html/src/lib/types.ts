import type { players } from "@/db/schema";
import type { InferSelectModel } from "drizzle-orm";

export type Player = InferSelectModel<typeof players>;

// The shape actually received on the client: Date columns are serialized to
// ISO strings by `Response.json`.
export type ClientPlayer = Omit<Player, "createdAt" | "updatedAt" | "nextChestAt"> & {
  createdAt: string;
  updatedAt: string;
  nextChestAt: string;
};

export interface DailyScoreRow {
  id: number;
  date: string;
  deviceId: string;
  nickname: string;
  score: number;
  pearls: number;
}
