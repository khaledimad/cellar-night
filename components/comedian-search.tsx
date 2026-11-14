"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  followByNameAction,
  listAllComediansAction,
  starComedianAction,
} from "@/app/actions/favourites";

type Option = { id: number; name: string; nameNorm: string };

const SECRET_NAME = "Super Secret Pop Up";
const SECRET_NORM = "super secret pop up";

export function ComedianSearch({
  starredIds,
  secretStarred,
}: {
  starredIds: number[];
  secretStarred: boolean;
}) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState<Option[] | null>(null);
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const box = useRef<HTMLDivElement>(null);
  const typed = text.trim();

  // Close the list on a tap or click outside it. A blur handler would close
  // it before a tap on a row registers on touch screens.
  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  function loadAll() {
    if (all !== null) return;
    listAllComediansAction().then(setAll);
  }

  const lowered = typed.toLowerCase();
  const results =
    all === null
      ? null
      : all.filter(
          (o) =>
            o.nameNorm !== SECRET_NORM &&
            (!lowered ||
              o.name.toLowerCase().includes(lowered) ||
              o.nameNorm.includes(lowered)),
        );

  function done(message: string) {
    setNotice(message);
    setText("");
    setOpen(false);
  }

  function star(option: Option) {
    startTransition(async () => {
      await starComedianAction(option.id);
      done(`Following ${option.name}.`);
    });
  }

  function follow(name: string, label: string) {
    startTransition(async () => {
      const r = await followByNameAction(name);
      done(
        r.upcomingShowCount > 0
          ? `Following ${label}. ${r.upcomingShowCount} upcoming shows.`
          : `Following ${label}. Not on an upcoming lineup yet.`,
      );
    });
  }

  const starred = new Set(starredIds);
  const item =
    "flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-zinc-100 disabled:opacity-60 dark:hover:bg-zinc-800";

  function renderOption(o: Option) {
    const on = starred.has(o.id);
    return (
      <li key={o.id}>
        <button
          type="button"
          disabled={on || pending}
          onClick={() => star(o)}
          className={item}
        >
          <span>{o.name}</span>
          <span className="text-xs text-zinc-500">{on ? "Following" : "☆ Follow"}</span>
        </button>
      </li>
    );
  }

  return (
    <div
      ref={box}
      className="relative"
    >
      <label htmlFor="comedian-search" className="sr-only">
        Search comedians
      </label>
      <input
        id="comedian-search"
        type="text"
        autoComplete="off"
        placeholder="Search comedians to follow"
        value={text}
        onFocus={() => {
          setOpen(true);
          loadAll();
        }}
        onChange={(e) => {
          setText(e.target.value);
          setNotice("");
          setOpen(true);
        }}
        className="w-full rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
      />
      <p aria-live="polite" className="mt-1 min-h-5 text-sm text-zinc-600 dark:text-zinc-400">
        {notice}
      </p>
      {open && (
        <ul className="absolute z-10 mt-1 max-h-[60vh] w-full overflow-auto rounded border border-zinc-300 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <li className="px-3 py-2 text-xs text-zinc-500">
            Everyone on a posted lineup. Not here? Type the name and follow them
            anyway.
          </li>
          {!typed && (
            <>
              <li>
                <button
                  type="button"
                  disabled={secretStarred || pending}
                  onClick={() => follow(SECRET_NAME, "secret pop-up shows")}
                  className={item}
                >
                  <span>Secret pop-up shows</span>
                  <span className="text-xs text-zinc-500">
                    {secretStarred ? "Following" : "☆ Follow"}
                  </span>
                </button>
              </li>
            </>
          )}
          {results === null && (
            <li className="px-3 py-2 text-sm text-zinc-500">Loading</li>
          )}
          {results !== null && results.map(renderOption)}
          {typed && results !== null && results.length === 0 && (
            <li>
              <button
                type="button"
                disabled={pending}
                onClick={() => follow(typed, typed)}
                className={item}
              >
                <span>Follow &ldquo;{typed}&rdquo; anyway</span>
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
