import { asc, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { shows } from "@/lib/db/schema";

const NEW_YORK = "America/New_York";

// Today's date in New York as "YYYY-MM-DD".
export function nyToday(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: NEW_YORK,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

// The given date plus a number of days, as "YYYY-MM-DD".
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// The next `count` dates starting today in New York.
export function nextDates(count = 7, now: Date = new Date()): string[] {
  const today = nyToday(now);
  return Array.from({ length: count }, (_, i) => addDays(today, i));
}

export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

// Today in New York, then every later date that has at least one show.
export async function getShowDates(now: Date = new Date()): Promise<string[]> {
  const today = nyToday(now);
  const rows = await db
    .selectDistinct({ date: shows.showDate })
    .from(shows)
    .where(gte(shows.showDate, today))
    .orderBy(asc(shows.showDate));
  const dates = rows.map((r) => r.date).filter((d) => d !== today);
  return [today, ...dates];
}
