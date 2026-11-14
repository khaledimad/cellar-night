import Anthropic from "@anthropic-ai/sdk";
import { nyToday } from "@/lib/queries/dates";
import { followByName } from "@/lib/queries/favourites";
import {
  getMyShows,
  searchShows,
  type ShowRow,
  type ShowWithLineup,
} from "@/lib/queries/shows";

export const CHAT_MODEL = "claude-haiku-5-5";
const MAX_ROUNDS = 4;

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ChatResult = {
  answer: string;
  followed: boolean;
  stopReasons: string[];
  toolsRun: string[];
  inputTokens: number;
  outputTokens: number;
};

const tools: Anthropic.Tool[] = [
  {
    name: "search_shows",
    description:
      "Search upcoming Comedy Cellar shows, soonest first, up to 20. Each show has its date, time, room, seats left (null when unknown) and its lineup with each comedian's credits text. Dates are YYYY-MM-DD.",
    input_schema: {
      type: "object",
      properties: {
        from: { type: "string", description: "First date, YYYY-MM-DD" },
        to: { type: "string", description: "Last date, YYYY-MM-DD" },
        comedian_name: { type: "string", description: "Only shows with this comedian" },
        only_with_seats: { type: "boolean", description: "Only shows that still have seats" },
      },
    },
  },
  {
    name: "whos_on",
    description:
      "Every comedian billed between two dates, most shows first: name, credits text, how many shows they are on, how many of those still have seats, and which nights. Use this for any question about a whole week or a range of days: who to check out, who appears most, who the bigger names are.",
    input_schema: {
      type: "object",
      properties: {
        from: { type: "string", description: "First date, YYYY-MM-DD" },
        to: { type: "string", description: "Last date, YYYY-MM-DD" },
      },
    },
  },
  {
    name: "my_shows",
    description:
      "The upcoming shows that include a comedian this user has starred, soonest first, with the starred names on each, plus a count per night of those shows and of the user's distinct comedians.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "follow_comedian",
    description:
      "Star a comedian for this user by name so they get an email when the comedian is added to a lineup. Works for a comedian who is not billed yet. Returns the comedian and how many upcoming shows they are on.",
    input_schema: {
      type: "object",
      properties: { name: { type: "string", description: "The comedian's name" } },
      required: ["name"],
    },
  },
];

function seatsLeft(s: ShowRow): number | null {
  if (s.capacity === null) return null;
  return Math.max(0, s.capacity - (s.booked ?? 0));
}

function showOut(s: ShowWithLineup) {
  return {
    date: s.showDate,
    weekday: weekday(s.showDate),
    time: s.showTime,
    room: s.room,
    seats_left: seatsLeft(s),
    lineup: s.lineup.map((l) => ({ name: l.name, credits: l.description })),
  };
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, 100) : undefined;
}

async function runTool(
  userId: string,
  name: string,
  input: unknown,
): Promise<string> {
  const args = (input && typeof input === "object" ? input : {}) as Record<
    string,
    unknown
  >;
  try {
    if (name === "search_shows") {
      const rows = await searchShows({
        from: str(args.from),
        to: str(args.to),
        comedianName: str(args.comedian_name),
        onlyWithSeats: args.only_with_seats === true,
      });
      return JSON.stringify(rows.map(showOut));
    }
    if (name === "whos_on") {
      const rows = await searchShows({
        from: str(args.from),
        to: str(args.to),
        limit: 300,
      });
      const people = new Map<
        string,
        { credits: string | null; shows: number; withSeats: number; nights: Set<string> }
      >();
      for (const s of rows) {
        const left = seatsLeft(s);
        for (const l of s.lineup) {
          const p = people.get(l.name) ?? {
            credits: l.description,
            shows: 0,
            withSeats: 0,
            nights: new Set<string>(),
          };
          p.shows += 1;
          if (left !== null && left > 0) p.withSeats += 1;
          p.nights.add(`${weekday(s.showDate)} ${s.showDate}`);
          people.set(l.name, p);
        }
      }
      return JSON.stringify({
        show_count: rows.length,
        comedians: [...people]
          .sort((a, b) => b[1].shows - a[1].shows || a[0].localeCompare(b[0]))
          .slice(0, 60)
          .map(([name, p]) => ({
            name,
            credits: p.credits,
            show_count: p.shows,
            shows_with_seats: p.withSeats,
            nights: [...p.nights],
          })),
      });
    }
    if (name === "my_shows") {
      const rows = await getMyShows(userId);
      const nights = new Map<string, { shows: number; names: Set<string> }>();
      for (const s of rows) {
        const night = nights.get(s.showDate) ?? { shows: 0, names: new Set() };
        night.shows += 1;
        for (const n of s.names) night.names.add(n);
        nights.set(s.showDate, night);
      }
      return JSON.stringify({
        nights: [...nights].map(([date, n]) => ({
          date,
          weekday: weekday(date),
          show_count: n.shows,
          your_comedians: [...n.names],
          your_comedian_count: n.names.size,
        })),
        shows: rows.map((s) => ({
          date: s.showDate,
          weekday: weekday(s.showDate),
          time: s.showTime,
          room: s.room,
          seats_left: seatsLeft(s),
          your_comedians: s.names,
        })),
      });
    }
    if (name === "follow_comedian") {
      const { comedian, upcomingShowCount } = await followByName(
        userId,
        str(args.name) ?? "",
      );
      return JSON.stringify({
        comedian: comedian.name,
        upcoming_show_count: upcomingShowCount,
      });
    }
    return JSON.stringify({ error: "Unknown tool" });
  } catch (e) {
    return JSON.stringify({
      error: e instanceof Error ? e.message : "The tool failed",
    });
  }
}

function weekday(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
}

function systemPrompt(): string {
  return [
    "You are Ask the Cellar, a helper for fans of the Comedy Cellar in New York.",
    `Today in New York is ${weekday(nyToday())}, ${nyToday()}. Work out other dates from that.`,
    "Voice: a quick, dry regular at the bar who knows the room. Warm, a little wry, at most one light joke per answer, never corny, no puns on names, no emoji. The facts come first.",
    "Answer only from tool results; never invent a show, a name or a credit. You hold upcoming lineups only, with no past shows and no ticket sales history.",
    "Never mention tools, data or what you cannot see. When a question asks for something you do not hold (popularity, the biggest stars, who sells fastest, the past), answer the nearest thing you do hold without apology: who is on the most shows, whose credits stand out, which shows are already full. For a question only about the past, say in one short line that you only know what is coming up, then offer what is.",
    "For a question about a whole week or several days (who to check out, who is on most, the bigger names), call whos_on for that range and use the credits text and show counts. Use search_shows for one night or one comedian.",
    "Lineups are posted about a week ahead; for a date with nothing posted yet, say the lineup is not up yet.",
    "To follow a comedian, call follow_comedian, then say what happened and how many upcoming shows they are on.",
    "\"This week\" means today and the next 6 days. Use the weekday given with each date; do not work it out yourself.",
    "For a question about which night has the most of the user's comedians, call my_shows and read the counts from its nights list; do not count yourself.",
    "Keep answers under 120 words. When a night has many shows, summarize it: name the shows with seats left first and at most 8 comedians in total.",
    "Write plain text only: no markdown, no asterisks, no headings, no tables. For a list, put each item on its own line starting with a hyphen.",
  ].join(" ");
}

let client: Anthropic | null = null;

export async function askCellar(
  userId: string,
  messages: ChatMessage[],
): Promise<ChatResult> {
  client ??= new Anthropic();
  const convo: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
  const result: ChatResult = {
    answer: "",
    followed: false,
    stopReasons: [],
    toolsRun: [],
    inputTokens: 0,
    outputTokens: 0,
  };

  for (let round = 0; round <= MAX_ROUNDS; round++) {
    const res = await client.messages.create({
      model: CHAT_MODEL,
      max_tokens: 600,
      thinking: { type: "disabled" },
      system: systemPrompt(),
      tools,
      messages: convo,
    });
    result.inputTokens += res.usage.input_tokens;
    result.outputTokens += res.usage.output_tokens;
    result.stopReasons.push(String(res.stop_reason));

    const text = res.content
      .flatMap((b) => (b.type === "text" ? [b.text] : []))
      .join("\n")
      .trim();
    if (text) result.answer = text;

    if (res.stop_reason !== "tool_use" || round === MAX_ROUNDS) break;

    convo.push({ role: "assistant", content: res.content });
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const block of res.content) {
      if (block.type !== "tool_use") continue;
      result.toolsRun.push(block.name);
      if (block.name === "follow_comedian") result.followed = true;
      results.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: await runTool(userId, block.name, block.input),
      });
    }
    convo.push({ role: "user", content: results });
  }

  if (!result.answer) {
    result.answer = "I could not finish that answer. Please try asking again.";
  }
  return result;
}
