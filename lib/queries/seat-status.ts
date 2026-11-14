export type SeatStatus =
  | { kind: "unknown"; label: "" }
  | { kind: "full"; label: string }
  | { kind: "open"; label: string; left: number };

// capacity null means seat counts have not loaded: nothing is shown.
export function seatStatus(show: {
  capacity: number | null;
  booked: number | null;
}): SeatStatus {
  if (show.capacity === null) return { kind: "unknown", label: "" };
  const left = show.capacity - (show.booked ?? 0);
  if (left < 1) return { kind: "full", label: "Sold out: standby line only" };
  return { kind: "open", label: `${left} seats left`, left };
}
