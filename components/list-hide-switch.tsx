import Link from "next/link";

export function ListHideSwitch({ href, hide }: { href: string; hide: boolean }) {
  return (
    <Link
      href={href}
      role="switch"
      aria-checked={hide}
      className="flex w-fit items-center gap-2 text-sm"
    >
      <span
        className={`inline-flex h-5 w-9 items-center rounded-full p-0.5 ${
          hide ? "bg-zinc-900 dark:bg-zinc-100" : "bg-zinc-300 dark:bg-zinc-700"
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-white transition-transform dark:bg-zinc-900 ${
            hide ? "translate-x-4" : ""
          }`}
        />
      </span>
      Hide sold-out shows
    </Link>
  );
}
