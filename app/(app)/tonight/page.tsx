import Link from "next/link";
import { Suspense } from "react";
import { formatDayChip, minutesAgoLabel } from "@/components/format";
import { ListHideSwitch } from "@/components/list-hide-switch";
import { getCurrentUser } from "@/components/session";
import { BookLink, SeatText } from "@/components/show-actions";
import { StarToggle } from "@/components/star-toggle";
import { getStarred } from "@/lib/queries/favourites";
import { getShowDates } from "@/lib/queries/dates";
import { seatStatus } from "@/lib/queries/seat-status";
import { getLastRefresh, getNight } from "@/lib/queries/shows";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default function TonightPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Lineups</h1>
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading</p>}>
        <Night searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function nightHref(date: string, hide: boolean): string {
  const params = new URLSearchParams({ date });
  if (hide) params.set("hide", "1");
  return `/tonight?${params.toString()}`;
}

async function Night({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const dates = await getShowDates();
  const requested = one(params.date);
  const date = requested && dates.includes(requested) ? requested : dates[0];
  const hide = one(params.hide) === "1";

  const [night, starred, refreshed] = await Promise.all([
    getNight(date),
    getStarred(user.id),
    getLastRefresh(),
  ]);
  const starredIds = new Set(starred.map((c) => c.id));
  const hasSeatCounts = night.some((s) => s.capacity !== null);
  const visible = hide
    ? night.filter((s) => seatStatus(s).kind !== "full")
    : night;

  return (
    <>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {refreshed
          ? `Lineups updated ${minutesAgoLabel(refreshed)}`
          : "No lineups loaded yet"}
      </p>

      <nav aria-label="Nights" className="flex gap-1 overflow-x-auto pb-1">
        {dates.map((d) => {
          const chip = formatDayChip(d);
          const selected = d === date;
          return (
            <Link
              key={d}
              href={nightHref(d, hide)}
              aria-current={selected ? "date" : undefined}
              className={`flex min-w-10 flex-1 flex-col items-center rounded border px-1 py-1 text-sm sm:min-w-12 sm:flex-none sm:px-2 ${
                selected
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-300 dark:border-zinc-700"
              }`}
            >
              <span>{chip.weekday}</span>
              <span className="font-medium">{chip.day}</span>
            </Link>
          );
        })}
      </nav>

      {hasSeatCounts && (
        <ListHideSwitch href={nightHref(date, !hide)} hide={hide} />
      )}

      {visible.length === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">
          {night.length > 0
            ? "Every show this night is sold out."
            : refreshed
              ? "No shows listed for this night."
              : "No lineups loaded yet"}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
          {visible.map((s) => (
            <li key={s.id} className="flex flex-col gap-1 py-3">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium">{s.showTime}</span>
                <span className="text-sm">{s.room}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 text-sm">
                <SeatText capacity={s.capacity} booked={s.booked} />
                <BookLink
                  showDate={s.showDate}
                  showTime={s.showTime}
                  capacity={s.capacity}
                  booked={s.booked}
                />
              </div>
              {s.lineup.length > 0 && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-zinc-600 dark:text-zinc-400">
                    Lineup ({s.lineup.length})
                  </summary>
                  <ul className="mt-1 flex flex-col">
                    {s.lineup.map((c) => (
                      <li
                        key={c.comedianId}
                        className="flex items-start justify-between gap-3 py-0.5"
                      >
                        {c.description ? (
                          <details className="min-w-0">
                            <summary className="cursor-pointer">{c.name}</summary>
                            <p className="mb-1 mt-0.5 text-zinc-600">
                              {c.description}
                            </p>
                          </details>
                        ) : (
                          <span>{c.name}</span>
                        )}
                        <StarToggle
                          comedianId={c.comedianId}
                          name={c.name}
                          starred={starredIds.has(c.comedianId)}
                        />
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
