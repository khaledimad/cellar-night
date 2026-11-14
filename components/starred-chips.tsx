import { unstarComedianAction } from "@/app/actions/favourites";

export function StarredChips({
  starred,
}: {
  starred: { id: number; name: string }[];
}) {
  if (starred.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {starred.map((c) => (
        <li
          key={c.id}
          className="flex items-center gap-1 rounded-full border border-zinc-300 py-1 pl-3 pr-1 text-sm dark:border-zinc-700"
        >
          <span>{c.name}</span>
          <form action={unstarComedianAction.bind(null, c.id)}>
            <button
              type="submit"
              aria-label={`Remove ${c.name}`}
              className="rounded-full px-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              &times;
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
