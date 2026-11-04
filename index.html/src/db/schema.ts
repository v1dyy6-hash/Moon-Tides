import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// A "player" is identified by an anonymous device id generated on first
// visit and stored in localStorage on the client. No account/login needed.
export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull().unique(),
  nickname: text("nickname").notNull().default("Моряк"),

  // Spendable currency (shop, skins).
  pearlBank: integer("pearl_bank").notNull().default(0),
  // Lifetime meta-progress currency used to restore the Lighthouse.
  lighthouseXp: integer("lighthouse_xp").notNull().default(0),

  bestScoreEndless: integer("best_score_endless").notNull().default(0),
  bestScoreDaily: integer("best_score_daily").notNull().default(0),

  selectedSkin: text("selected_skin").notNull().default("default"),
  unlockedSkins: jsonb("unlocked_skins")
    .$type<string[]>()
    .notNull()
    .default(sql`'["default"]'::jsonb`),

  removeAds: boolean("remove_ads").notNull().default(false),

  streakCount: integer("streak_count").notNull().default(0),
  lastDailyDate: text("last_daily_date"),

  nextChestAt: timestamp("next_chest_at", { withTimezone: true })
    .notNull()
    .defaultNow(),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// One row per player per daily-tide date. Keeps only the best score.
export const dailyScores = pgTable(
  "daily_scores",
  {
    id: serial("id").primaryKey(),
    date: text("date").notNull(),
    deviceId: text("device_id").notNull(),
    nickname: text("nickname").notNull().default("Моряк"),
    score: integer("score").notNull().default(0),
    pearls: integer("pearls").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("daily_scores_date_device_idx").on(table.date, table.deviceId)],
);
