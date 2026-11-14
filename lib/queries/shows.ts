import {
  and,
  asc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  lte,
  max,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/lib/db";
import {
  appearances,
  comedians,
  favourites,
  ingestRuns,
  rooms,
  shows,
} from "@/lib/db/schema";
import { normalizeName } from "@/lib/names";
import { isIsoDate } from "./dates";

export type ShowRow = {
  id: number;
  showDate: string;
  showTime: string;
  startsAt: Date;
  room: string;
  capacity: number | null;
  booked: number | null;
};

export type LineupEntry = {
  comedianId: number;
  name: string;
  description: string | null;
  position: number;
};

export type ShowWithLineup = ShowRow & { lineup: LineupEntry[] };
export type MyShow = ShowRow & { names: string[] };

const showColumns = {
  id: shows.id,
  showDate: shows.showDate,
  showTime: shows.showTime,
  startsAt: shows.startsAt,
  room: rooms.name,
  capacity: shows.capacity,
  booked: shows.booked,
};

async function attachLineups(rows: ShowRow[]): Promise<ShowWithLineup[]> {
  if (rows.length === 0) return [];
  const entries = await db
    .select({
      showId: appearances.showId,
      comedianId: comedians.id,
      name: comedians.name,
      description: comedians.description,
      position: appearances.position,
    })
    .from(appearances)
    .innerJoin(comedians, eq(comedians.id, appearances.comedianId))
    .where(
      inArray(
        appearances.showId,
        rows.map((r) => r.id),
      ),
    )
    .orderBy(asc(appearances.showId), asc(appearances.position));

  const byShow = new Map<number, LineupEntry[]>();
  for (const { showId, ...entry } of entries) {
    const list = byShow.get(showId) ?? [];
    list.push(entry);
    byShow.set(showId, list);
  }
  return rows.map((row) => ({ ...row, lineup: byShow.get(row.id) ?? [] }));
}

// Upcoming shows that include a starred comedian, soonest first, with the
// matching names in bill order.
export async function getMyShows(userId: string): Promise<MyShow[]> {
  const rows = await db
    .select({
      ...showColumns,
      comedianName: comedians.name,
    })
    .from(shows)
    .innerJoin(rooms, eq(rooms.id, shows.roomId))
    .innerJoin(appearances, eq(appearances.showId, shows.id))
    .innerJoin(
      favourites,
      and(
        eq(favourites.comedianId, appearances.comedianId),
        eq(favourites.userId, userId),
      ),
    )
    .innerJoin(comedians, eq(comedians.id, appearances.comedianId))
    .where(gt(shows.startsAt, new Date()))
    .orderBy(asc(shows.startsAt), asc(shows.id), asc(appearances.position));

  const out: MyShow[] = [];
  const index = new Map<number, MyShow>();
  for (const { comedianName, ...show } of rows) {
    let entry = index.get(show.id);
    if (!entry) {
      entry = { ...show, names: [] };
      index.set(show.id, entry);
      out.push(entry);
    }
    entry.names.push(comedianName);
  }
  return out;
}

// Every show listed for one date ("YYYY-MM-DD"), with its lineup.
export async function getNight(date: string): Promise<ShowWithLineup[]> {
  if (!isIsoDate(date)) return [];
  const rows = await db
    .select(showColumns)
    .from(shows)
    .innerJoin(rooms, eq(rooms.id, shows.roomId))
    .where(eq(shows.showDate, date))
    .orderBy(asc(shows.startsAt), asc(shows.id));
  return attachLineups(rows);
}

// Up to 20 upcoming shows, soonest first, each with its lineup.
export async function searchShows(
  opts: {
    from?: string;
    to?: string;
    comedianName?: string;
    onlyWithSeats?: boolean;
  } = {},
): Promise<ShowWithLineup[]> {
  const conditions: (SQL | undefined)[] = [gt(shows.startsAt, new Date())];
  if (opts.from && isIsoDate(opts.from)) {
    conditions.push(gte(shows.showDate, opts.from));
  }
  if (opts.to && isIsoDate(opts.to)) {
    conditions.push(lte(shows.showDate, opts.to));
  }
  const norm = opts.comedianName ? normalizeName(opts.comedianName) : "";
  if (norm) {
    conditions.push(
      sql`exists (
        select 1 from appearances a
        join comedians c on c.id = a.comedian_id
        where a.show_id = ${shows.id} and c.name_norm like ${"%" + norm + "%"}
      )`,
    );
  }
  if (opts.onlyWithSeats) {
    conditions.push(
      isNotNull(shows.capacity),
      sql`${shows.capacity} - coalesce(${shows.booked}, 0) >= 1`,
    );
  }
  const rows = await db
    .select(showColumns)
    .from(shows)
    .innerJoin(rooms, eq(rooms.id, shows.roomId))
    .where(and(...conditions))
    .orderBy(asc(shows.startsAt), asc(shows.id))
    .limit(20);
  return attachLineups(rows);
}

// When the lineups were last refreshed successfully, or null.
export async function getLastRefresh(): Promise<Date | null> {
  const [row] = await db
    .select({ at: max(ingestRuns.finishedAt) })
    .from(ingestRuns)
    .where(eq(ingestRuns.ok, true));
  return row?.at ?? null;
}
