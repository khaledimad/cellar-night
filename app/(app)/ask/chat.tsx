"use client";

import { useState, useTransition } from "react";
import { askAction } from "@/app/actions/ask";

type Message = { role: "user" | "assistant"; content: string };

const examples = [
  "Which night this week has the most of my comedians?",
  "Who should I check out this week?",
  "Who are the bigger names on this week?",
  "Anything good tonight with seats left?",
  "Follow Mike Birbiglia for me",
];

// Turns web addresses in an answer into links that open in a new tab.
function linkify(text: string) {
  return text.split(/(https:\/\/[^\s]+)/g).map((part, i) =>
    part.startsWith("https://") ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-blue-700 underline"
      >
        Book this show
      </a>
    ) : (
      part
    ),
  );
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function send(question: string) {
    const q = question.trim();
    if (!q || pending) return;
    const next: Message[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setText("");
    setError("");
    startTransition(async () => {
      const res = await askAction(next);
      if (res.answer) {
        setMessages([...next, { role: "assistant", content: res.answer }]);
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {messages.length === 0 && (
        <div className="flex flex-col items-start gap-2">
          {examples.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => send(e)}
              className="rounded border border-zinc-300 px-3 py-1 text-left text-sm"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {messages.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setMessages([]);
            setText("");
            setError("");
          }}
          disabled={pending}
          className="self-end rounded border border-zinc-300 px-3 py-1 text-sm disabled:opacity-50"
        >
          New chat
        </button>
      )}

      <ul className="flex flex-col gap-3">
        {messages.map((m, i) => (
          <li
            key={i}
            className={
              m.role === "user"
                ? "self-end rounded bg-zinc-100 px-3 py-2 text-sm"
                : "whitespace-pre-wrap text-sm"
            }
          >
            {m.role === "assistant" ? linkify(m.content) : m.content}
          </li>
        ))}
        {pending && <li className="text-sm text-zinc-500">Thinking</li>}
      </ul>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
        className="flex gap-2"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          placeholder="Ask about the lineups"
          aria-label="Your question"
          className="min-w-0 flex-1 rounded border border-zinc-300 bg-transparent px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending || !text.trim()}
          className="rounded border border-zinc-300 px-3 py-2 text-sm disabled:opacity-50"
        >
          Ask
        </button>
      </form>
    </div>
  );
}
