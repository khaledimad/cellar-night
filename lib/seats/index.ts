import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { shows } from "@/lib/db/schema";
import {
  fetchSeatToken,
  fetchSeats,
  matchSeats,
  SeatTokenExpired,
  type SeatToken,
} from "./feed";

export type SeatsResult = {
  datesFetched: number;
  showsMatched: number;
  showsUnmatched: number;
  ok: boolean;
  error: string | null;
};

const PARALLEL_DATES = 3;

const nyDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
});

// The calendar date in New York, as "YYYY-MM-DD".
function isoDate(d: Date): string {
  return nyDate.format(d);
}

// Reads seat counts from the booking feed and stores them on the show rows.
export async function refreshSeats(daysAhead = 14): Promise<SeatsResult> {
  const result: SeatsResult = {
    datesFetched: 0,
    showsMatched: 0,
    showsUnmatched: 0,
    ok: true,
    error: null,
  };
  const errors: string[] = [];

  try {
    const today = new Date();
    const last = new Date(today.getTime() + daysAhead * 86_400_000);
    const rows = await db
      .select({
        id: shows.id,
        showDate: shows.showDate,
        showTime: shows.showTime,
      })
      .from(shows)
      .where(and(gte(shows.showDate, isoDate(today)), lte(shows.showDate, isoDate(last))));

    const byDate = new Map<string, typeof rows>();
    for (const row of rows) {
      byDate.set(row.showDate, [...(byDate.get(row.showDate) ?? []), row]);
    }
    const dates = [...byDate.keys()].sort();

    let token: SeatToken = await fetchSeatToken();
    let reloading: Promise<SeatToken> | null = null;
    const refreshToken = (stale: SeatToken) => {
      if (token !== stale) return Promise.resolve(token);
      reloading ??= fetchSeatToken().then((t) => {
        token = t;
        reloading = null;
        return t;
      });
      return reloading;
    };

    const doDate = async (date: string) => {
      try {
        const used = token;
        let records;
        try {
          records = await fetchSeats(date, used);
        } catch (e) {
          if (!(e instanceof SeatTokenExpired)) throw e;
          records = await fetchSeats(date, await refreshToken(used));
        }
        result.datesFetched += 1;
        const { matched, unmatched } = matchSeats(records, byDate.get(date) ?? []);
        result.showsUnmatched += unmatched.length;
        const now = new Date();
        for (const { record, row } of matched) {
          await db
            .update(shows)
            .set({
              capacity: record.max,
              booked: record.soldout ? record.max : record.totalGuests,
              seatsCheckedAt: now,
            })
            .where(eq(shows.id, row.id));
          result.showsMatched += 1;
        }
      } catch (e) {
        errors.push(`${date}: ${e instanceof Error ? e.message : String(e)}`);
      }
    };

    for (let i = 0; i < dates.length; i += PARALLEL_DATES) {
      await Promise.all(dates.slice(i, i + PARALLEL_DATES).map(doDate));
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  if (errors.length > 0) {
    result.ok = false;
    result.error = errors.join("; ");
  }
  return result;
}
