import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// A room or show title. raw_name is the billed text, name is the cleaned value.
export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  rawName: text("raw_name").notNull().unique(),
  name: text("name").notNull(),
}).enableRLS();

// A comedian. name is the latest billed text, name_norm is the matching key.
// A row can exist with no appearances: someone followed before they were billed.
export const comedians = pgTable("comedians", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameNorm: text("name_norm").notNull().unique(),
  description: text("description"),
  website: text("website"),
  headshotUrl: text("headshot_url"),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}).enableRLS();

// One show. show_date is the listed date and show_time the billed text;
// starts_at is the true start in New York, used for ordering and "upcoming".
// Seat columns stay null until the booking feed has been read.
export const shows = pgTable(
  "shows",
  {
    id: serial("id").primaryKey(),
    showDate: date("show_date").notNull(),
    showTime: text("show_time").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    roomId: integer("room_id")
      .notNull()
      .references(() => rooms.id),
    lineupId: text("lineup_id"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    capacity: integer("capacity"),
    booked: integer("booked"),
    seatsCheckedAt: timestamp("seats_checked_at", { withTimezone: true }),
  },
  (t) => [
    unique("shows_date_time_room_key").on(t.showDate, t.showTime, t.roomId),
    index("shows_starts_at_idx").on(t.startsAt),
    index("shows_show_date_idx").on(t.showDate),
  ],
).enableRLS();

// A comedian on a show. position is the order on the bill.
export const appearances = pgTable(
  "appearances",
  {
    id: serial("id").primaryKey(),
    showId: integer("show_id")
      .notNull()
      .references(() => shows.id, { onDelete: "cascade" }),
    comedianId: integer("comedian_id")
      .notNull()
      .references(() => comedians.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("appearances_show_comedian_key").on(t.showId, t.comedianId),
    index("appearances_comedian_idx").on(t.comedianId),
  ],
).enableRLS();

// A user's star on a comedian. A star is also the alert subscription.
// user_id is the Supabase Auth user id.
export const favourites = pgTable(
  "favourites",
  {
    userId: uuid("user_id").notNull(),
    comedianId: integer("comedian_id")
      .notNull()
      .references(() => comedians.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.comedianId] }),
    index("favourites_comedian_idx").on(t.comedianId),
  ],
).enableRLS();

// An alert already emailed, so the same show is never sent twice.
export const alertsSent = pgTable(
  "alerts_sent",
  {
    userId: uuid("user_id").notNull(),
    showId: integer("show_id")
      .notNull()
      .references(() => shows.id, { onDelete: "cascade" }),
    comedianId: integer("comedian_id")
      .notNull()
      .references(() => comedians.id, { onDelete: "cascade" }),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.showId, t.comedianId] })],
).enableRLS();

// One row per refresh.
export const ingestRuns = pgTable("ingest_runs", {
  id: serial("id").primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  datesFetched: integer("dates_fetched").notNull().default(0),
  showsSeen: integer("shows_seen").notNull().default(0),
  appearancesAdded: integer("appearances_added").notNull().default(0),
  ok: boolean("ok"),
  error: text("error"),
}).enableRLS();
