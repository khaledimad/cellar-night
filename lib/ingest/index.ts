import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  appearances,
  comedians,
  ingestRuns,
  rooms,
  shows,
} from "@/lib/db/schema";
import { normalizeName } from "@/lib/names";
import { sendAlerts } from "@/lib/alerts";
import { cleanRoomName, fetchDate, parseShows, type ParsedShow } from "./feed";

export type IngestResult = {
  datesFetched: number;
  showsSeen: number;
  appearancesAdded: number;
  newAppearanceIds: number[];
  ok: boolean;
  error: string | null;
};

const MAX_AT_ONCE = 5;

function newYorkToday(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return new Date(`${parts}T00:00:00Z`);
}

function datesAhead(daysAhead: number): string[] {
  const start = newYorkToday();
  return Array.from({ length: daysAhead }, (_, i) => {
    const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  });
}

// Writes one date's shows. Returns the ids of appearances that did not exist.
async function saveShows(parsed: ParsedShow[]): Promise<number[]> {
  const added: number[] = [];

  for (const show of parsed) {
    const roomName = cleanRoomName(show.roomRaw);
    await db
      .insert(rooms)
      .values({ rawName: show.roomRaw, name: roomName })
      .onConflictDoNothing({ target: rooms.rawName });
    const [room] = await db
      .select({ id: rooms.id })
      .from(rooms)
      .where(eq(rooms.rawName, show.roomRaw));

    const [saved] = await db
      .insert(shows)
      .values({
        showDate: show.showDate,
        showTime: show.showTime,
        startsAt: show.startsAt,
        roomId: room.id,
        lineupId: show.lineupId,
      })
      .onConflictDoUpdate({
        target: [shows.showDate, shows.showTime, shows.roomId],
        set: {
          startsAt: show.startsAt,
          lineupId: show.lineupId,
          lastSeenAt: sql`now()`,
        },
      })
      .returning({ id: shows.id });

    const seen = new Set<string>();
    for (const c of show.comedians) {
      const nameNorm = normalizeName(c.name);
      if (!nameNorm || seen.has(nameNorm)) continue;
      seen.add(nameNorm);

      const [comedian] = await db
        .insert(comedians)
        .values({
          name: c.name,
          nameNorm,
          description: c.description,
          website: c.website,
          headshotUrl: c.headshotUrl,
        })
        .onConflictDoUpdate({
          target: comedians.nameNorm,
          set: {
            name: c.name,
            description: c.description,
            website: c.website,
            headshotUrl: c.headshotUrl,
          },
        })
        .returning({ id: comedians.id });

      const inserted = await db
        .insert(appearances)
        .values({
          showId: saved.id,
          comedianId: comedian.id,
          position: c.position,
        })
        .onConflictDoNothing({
          target: [appearances.showId, appearances.comedianId],
        })
        .returning({ id: appearances.id });
      for (const row of inserted) added.push(row.id);
    }
  }

  return added;
}

// Loads every upcoming date the feed holds, then emails starred-comedian alerts.
export async function ingestUpcoming(daysAhead = 35): Promise<IngestResult> {
  const result: IngestResult = {
    datesFetched: 0,
    showsSeen: 0,
    appearancesAdded: 0,
    newAppearanceIds: [],
    ok: false,
    error: null,
  };
  const problems: string[] = [];

  const [run] = await db
    .insert(ingestRuns)
    .values({})
    .returning({ id: ingestRuns.id });

  try {
    const dates = datesAhead(daysAhead);
    for (let i = 0; i < dates.length; i += MAX_AT_ONCE) {
      const batch = dates.slice(i, i + MAX_AT_ONCE);
      const pages = await Promise.all(
        batch.map(async (date) => {
          try {
            return { date, html: await fetchDate(date) };
          } catch (err) {
            problems.push(err instanceof Error ? err.message : String(err));
            return null;
          }
        }),
      );
      for (const page of pages) {
        if (!page) continue;
        try {
          const parsed = parseShows(page.date, page.html);
          result.showsSeen += parsed.length;
          result.newAppearanceIds.push(...(await saveShows(parsed)));
          result.datesFetched += 1;
        } catch (err) {
          problems.push(
            `${page.date}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }
    result.appearancesAdded = result.newAppearanceIds.length;
    result.ok = result.datesFetched > 0;
    if (!result.ok) problems.push("No dates could be loaded");
  } catch (err) {
    problems.push(err instanceof Error ? err.message : String(err));
  }

  if (result.ok && result.newAppearanceIds.length > 0) {
    try {
      await sendAlerts(result.newAppearanceIds);
    } catch (err) {
      problems.push(
        `Alerts: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  result.error = problems.length ? problems.join("; ") : null;
  await db
    .update(ingestRuns)
    .set({
      finishedAt: sql`now()`,
      datesFetched: result.datesFetched,
      showsSeen: result.showsSeen,
      appearancesAdded: result.appearancesAdded,
      ok: result.ok,
      error: result.error,
    })
    .where(eq(ingestRuns.id, run.id));

  return result;
}
