import { bookingUrl } from "@/lib/booking";
import { seatStatus } from "@/lib/queries/seat-status";

// Seat status text, empty when seat counts have not loaded.
export function SeatText({
  capacity,
  booked,
}: {
  capacity: number | null;
  booked: number | null;
}) {
  const status = seatStatus({ capacity, booked });
  if (status.kind === "unknown") return null;
  return (
    <span
      className={
        status.kind === "full"
          ? "text-red-600 dark:text-red-400"
          : "text-zinc-600 dark:text-zinc-400"
      }
    >
      {status.label}
    </span>
  );
}

// Book link, or standby details for a sold-out show.
export function BookLink({
  showDate,
  showTime,
  capacity,
  booked,
}: {
  showDate: string;
  showTime: string;
  capacity: number | null;
  booked: number | null;
}) {
  const full = seatStatus({ capacity, booked }).kind === "full";
  return (
    <a
      href={bookingUrl(showDate, showTime)}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-blue-700 underline dark:text-blue-400"
    >
      {full ? "Standby details" : "Book"}
    </a>
  );
}
