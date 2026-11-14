import Link from "next/link";

// The name in the header. On a phone only the star shows, so the three page
// links and Sign out stay on one row.
export function BrandWordmark() {
  return (
    <Link
      href="/"
      aria-label="Who's at the Cellar, home"
      className="flex shrink-0 items-center gap-1.5"
    >
      <span aria-hidden className="text-lg leading-none text-amber">
        ★
      </span>
      <span className="neon-sign hidden pt-0.5 text-2xl leading-none sm:inline">
        Who&apos;s at the Cellar
      </span>
    </Link>
  );
}
