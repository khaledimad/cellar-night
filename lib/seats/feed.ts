const BOOKING_PAGE = "https://www.comedycellar.com/reservations-newyork/";
const SHOWS_API = "https://www.comedycellar.com/reservations/api/getShows";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export type SeatToken = { cca: string; created: string };

export type SeatRecord = {
  time: string;
  description: string;
  max: number;
  totalGuests: number;
  soldout: boolean;
  timestamp: number;
};

export type SeatShowRow = { id: number; showDate: string; showTime: string };

export class SeatTokenExpired extends Error {}

// Reads the page token the booking page embeds for its own requests.
export async function fetchSeatToken(): Promise<SeatToken> {
  const res = await fetch(BOOKING_PAGE, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`Booking page returned ${res.status}`);
  const html = await res.text();
  const cca = html.match(/["']?cca["']?\s*:\s*["']([^"']+)["']/)?.[1];
  const created = html.match(/["']?created["']?\s*:\s*["']?(\d+)["']?/)?.[1];
  if (!cca || !created) throw new Error("Booking page has no seat token");
  return { cca, created };
}

// The show records for one listed date ("YYYY-MM-DD").
export async function fetchSeats(
  date: string,
  token: SeatToken,
): Promise<SeatRecord[]> {
  const res = await fetch(SHOWS_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Code-Localize": token.cca,
      "X-Page-Creation": token.created,
      "User-Agent": USER_AGENT,
      Referer: BOOKING_PAGE,
    },
    body: JSON.stringify({ date }),
  });
  if (res.status === 404) throw new SeatTokenExpired("Seat token expired");
  if (!res.ok) throw new Error(`Seats feed returned ${res.status} for ${date}`);
  const json = (await res.json()) as {
    data?: { showInfo?: { shows?: Array<Record<string, unknown>> } };
  };
  const shows = json.data?.showInfo?.shows ?? [];
  return shows.map((s) => ({
    time: String(s.time),
    description: String(s.description ?? ""),
    max: Number(s.max),
    totalGuests: Number(s.totalGuests),
    soldout: Boolean(s.soldout),
    timestamp: Number(s.timestamp),
  }));
}

// Minutes after midnight of a clock text: "21:30:00", "7:00 pm", "12:30 am".
export function clockMinutes(text: string): number | null {
  const m = text
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*(am|pm)?$/);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = Number(m[2] ?? 0);
  if (m[3] === "pm" && hour < 12) hour += 12;
  if (m[3] === "am" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

export type SeatMatch = { record: SeatRecord; row: SeatShowRow };

// Pairs each record with a show row (the rows are those of one listed date): the same clock
// minute first, otherwise the single row within 5 minutes, otherwise unmatched.
export function matchSeats(
  records: SeatRecord[],
  showRows: SeatShowRow[],
): { matched: SeatMatch[]; unmatched: SeatRecord[] } {
  const rows = showRows.flatMap((row) => {
    const minutes = clockMinutes(row.showTime);
    return minutes === null ? [] : [{ row, minutes }];
  });
  const matched: SeatMatch[] = [];
  const unmatched: SeatRecord[] = [];
  for (const record of records) {
    const at = clockMinutes(record.time);
    const same = at === null ? [] : rows.filter((r) => r.minutes === at);
    const near =
      at === null ? [] : rows.filter((r) => Math.abs(r.minutes - at) <= 5);
    const pick = same.length === 1 ? same : same.length === 0 ? near : [];
    if (pick.length === 1) matched.push({ record, row: pick[0].row });
    else unmatched.push(record);
  }
  return { matched, unmatched };
}
