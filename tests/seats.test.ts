import { describe, expect, it } from "vitest";
import { matchSeats, type SeatRecord } from "@/lib/seats/feed";

function record(time: string): SeatRecord {
  return { time, description: "", max: 100, totalGuests: 40, soldout: false, timestamp: 0 };
}

const rows = [
  { id: 1, showDate: "2026-11-14", showTime: "7:00 pm" },
  { id: 2, showDate: "2026-11-14", showTime: "9:30 pm" },
  { id: 3, showDate: "2026-11-14", showTime: "12:30 am" },
];

describe("matchSeats", () => {
  it("matches a record to the row with the same clock minute", () => {
    const { matched, unmatched } = matchSeats([record("21:30:00")], rows);
    expect(matched.map((m) => m.row.id)).toEqual([2]);
    expect(unmatched).toHaveLength(0);
  });

  it("matches a record one minute off to the single nearby row", () => {
    const { matched } = matchSeats([record("19:01:00")], rows);
    expect(matched.map((m) => m.row.id)).toEqual([1]);
  });

  it("leaves a record unmatched when two rows are within 5 minutes and none is exact", () => {
    const close = [
      { id: 10, showDate: "2026-11-14", showTime: "8:00 pm" },
      { id: 11, showDate: "2026-11-14", showTime: "8:04 pm" },
    ];
    const { matched, unmatched } = matchSeats([record("20:02:00")], close);
    expect(matched).toHaveLength(0);
    expect(unmatched).toHaveLength(1);
  });

  it("leaves a record unmatched when no row is within 5 minutes", () => {
    const { matched, unmatched } = matchSeats([record("15:00:00")], rows);
    expect(matched).toHaveLength(0);
    expect(unmatched).toHaveLength(1);
  });

  it("matches an after-midnight show on the same listed date", () => {
    const { matched } = matchSeats([record("00:30:00")], rows);
    expect(matched.map((m) => m.row.id)).toEqual([3]);
  });
});
