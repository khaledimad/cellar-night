import * as cheerio from "cheerio";
import { nyEpochSeconds } from "@/lib/booking";

const FEED_URL = "https://www.comedycellar.com/lineup/api/";
const FEED_REFERER = "https://www.comedycellar.com/new-york-line-up/";
const SITE = "https://www.comedycellar.com";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

export type ParsedComedian = {
  name: string;
  description: string | null;
  website: string | null;
  headshotUrl: string | null;
  position: number;
};

export type ParsedShow = {
  showDate: string;
  showTime: string;
  startsAt: Date;
  roomRaw: string;
  lineupId: string | null;
  comedians: ParsedComedian[];
};

// Returns the show HTML the lineup feed holds for one "YYYY-MM-DD" date.
export async function fetchDate(date: string): Promise<string> {
  const body = new URLSearchParams({
    action: "cc_get_shows",
    json: JSON.stringify({ date, venue: "newyork", type: "lineup" }),
  });
  const res = await fetch(FEED_URL, {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      Referer: FEED_REFERER,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    throw new Error(`Lineup feed answered ${res.status} for ${date}`);
  }
  const data = (await res.json()) as { show?: { html?: string } };
  return data.show?.html ?? "";
}

// Removes a leading clock time such as "5:30pm " from a billed room title.
export function cleanRoomName(raw: string): string {
  return raw
    .replace(/^\s*\d{1,2}(?::\d{2})?\s*[ap]m\b\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function absolute(url: string | undefined): string | null {
  if (!url) return null;
  return url.startsWith("/") ? `${SITE}${url}` : url;
}

// The instant a show starts. A billed time before 5:00 am belongs to the
// night before, so it falls on the next calendar day.
function startOf(showDate: string, showTime: string): Date {
  const instant = new Date(nyEpochSeconds(showDate, showTime) * 1000);
  const match = showTime.trim().toLowerCase().match(/^(\d{1,2})(?::\d{2})?\s*(am|pm)?/);
  let hour = Number(match?.[1] ?? 12);
  if (match?.[2] === "pm" && hour < 12) hour += 12;
  if (match?.[2] === "am" && hour === 12) hour = 0;
  if (hour < 5) instant.setTime(instant.getTime() + 24 * 60 * 60 * 1000);
  return instant;
}

// Turns one date's show HTML into shows. Pure: no network, no database.
export function parseShows(date: string, html: string): ParsedShow[] {
  const $ = cheerio.load(html);
  const shows: ParsedShow[] = [];

  $("div.set-header").each((_, header) => {
    const head = $(header);
    const showTime = head
      .find("span.bold")
      .first()
      .contents()
      .filter((_, node) => node.type === "text")
      .text()
      .trim();
    const roomRaw = head.find("span.title").first().text();
    if (!showTime || !roomRaw.trim()) return;

    const lineupId = head.find("span.lineup-toggle").attr("data-lineup-id") ?? null;
    const lineup = head.parent().children("div.lineup").first();

    const comedians: ParsedComedian[] = [];
    lineup.find("div.set-content").each((_, el) => {
      const card = $(el);
      const nameEl = card.find("span.name").first();
      const name = nameEl.text().trim();
      if (!name) return;
      const paragraph = nameEl.parent();
      const rest = paragraph
        .text()
        .slice(paragraph.text().indexOf(nameEl.text()) + nameEl.text().length)
        .replace(/\s+/g, " ")
        .trim()
        .replace(/[,\s]+$/, "");
      comedians.push({
        name,
        description: rest || null,
        website: card.find("p.website a").first().attr("href") ?? null,
        headshotUrl: absolute(card.find("img").first().attr("src")),
        position: comedians.length + 1,
      });
    });

    shows.push({
      showDate: date,
      showTime,
      startsAt: startOf(date, showTime),
      roomRaw,
      lineupId,
      comedians,
    });
  });

  return shows;
}
