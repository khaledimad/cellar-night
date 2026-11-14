import { askCellar, type ChatMessage, type ChatResult } from "./index";

const LIMIT = 20;
const WINDOW_MS = 60 * 60 * 1000;
const asked = new Map<string, number[]>();

function underLimit(userId: string, now = Date.now()): boolean {
  const recent = (asked.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) {
    asked.set(userId, recent);
    return false;
  }
  recent.push(now);
  asked.set(userId, recent);
  return true;
}

function clean(messages: unknown): ChatMessage[] {
  if (!Array.isArray(messages)) return [];
  const out: ChatMessage[] = [];
  for (const m of messages.slice(-10)) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) continue;
    const content = String(m.content ?? "").trim().slice(0, 1000);
    if (content) out.push({ role: m.role, content });
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

// Rejects a missing user and a user over 20 questions an hour, then asks.
export async function askGuarded(
  userId: string | null | undefined,
  messages: unknown,
): Promise<ChatResult> {
  if (!userId) throw new Error("Not signed in");
  const convo = clean(messages);
  if (convo.length === 0 || convo[convo.length - 1].role !== "user") {
    throw new Error("Ask a question first.");
  }
  if (!underLimit(userId)) {
    throw new Error("You have asked 20 questions in the last hour. Try again later.");
  }
  return askCellar(userId, convo);
}
