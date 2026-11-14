const NEW_YORK = "America/New_York";
const BOOKING_PAGE = "https://www.comedycellar.com/reservations-newyork/";

const nyClock = new Intl.DateTimeFormat("en-US", {
  timeZone: NEW_YORK,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

// Reads a billed time such as "7:00 pm", "12:30 am" or "7pm" as 24-hour parts.
function parseClock(showTime: string): { hour: number; minute: number } {
  const match = showTime
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*(am|pm)?$/);
  if (!match) {
    throw new Error(`Unreadable show time: "${showTime}"`);
  }
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  const half = match[3];
  if (half === "pm" && hour < 12) hour += 12;
  if (half === "am" && hour === 12) hour = 0;
  return { hour, minute };
}

// The wall clock in New York at a given instant, expressed as if it were UTC.
function nyWallAsUtcMs(instantMs: number): number {
  const parts: Record<string, number> = {};
  for (const part of nyClock.formatToParts(new Date(instantMs))) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
}

// Unix seconds of a listed date ("YYYY-MM-DD") and billed clock time,
// read as New York time, with no day shift.
export function nyEpochSeconds(showDate: string, showTime: string): number {
  const [year, month, day] = showDate.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error(`Unreadable show date: "${showDate}"`);
  }
  const { hour, minute } = parseClock(showTime);
  const wallMs = Date.UTC(year, month - 1, day, hour, minute);

  // Start from the wall time as if it were UTC, then correct by the New York
  // offset at that instant. The second pass settles days when the clocks change.
  let instantMs = wallMs;
  for (let i = 0; i < 2; i++) {
    instantMs = wallMs - (nyWallAsUtcMs(instantMs) - instantMs);
  }
  return Math.round(instantMs / 1000);
}

// The Cellar's own booking page, opened on this show.
export function bookingUrl(showDate: string, showTime: string): string {
  return `${BOOKING_PAGE}?showid=${nyEpochSeconds(showDate, showTime)}`;
}
