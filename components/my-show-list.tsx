import { formatShowDate } from "@/components/format";
import { BookLink, SeatText } from "@/components/show-actions";
import type { MyShow } from "@/lib/queries/shows";

export function MyShowList({ shows }: { shows: MyShow[] }) {
  if (shows.length === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        None of your comedians are on an upcoming lineup yet.
      </p>
    );
  }
  return (
    <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
      {shows.map((s) => (
        <li key={s.id} className="flex flex-col gap-1 py-3">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-medium">
              {formatShowDate(s.showDate)}, {s.showTime}
            </span>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {s.room}
            </span>
          </div>
          <div className="text-sm">
            <span
              className="mr-1 text-amber-400"
              role="img"
              aria-label={`${s.names.length} of your comedian${s.names.length === 1 ? "" : "s"}`}
            >
              {"★".repeat(Math.min(s.names.length, 5))}
            </span>
            {s.names.join(", ")}
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
        </li>
      ))}
    </ul>
  );
}
