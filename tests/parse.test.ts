import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cleanRoomName, parseShows } from "@/lib/ingest/feed";

const feed = JSON.parse(
  readFileSync(new URL("./fixtures/lineup-2026-11-14.json", import.meta.url), "utf8"),
) as { show: { html: string } };
const parsed = parseShows("2026-11-14", feed.show.html);

describe("parseShows", () => {
  it("finds the shows of the night", () => {
    expect(parsed.length).toBeGreaterThan(0);
  });

  it("gives every show a time, a room and at least one comedian", () => {
    for (const show of parsed) {
      expect(show.showTime).not.toBe("");
      expect(show.roomRaw.trim()).not.toBe("");
      expect(show.comedians.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("keeps the listed date on an after-midnight show and starts it the next day", () => {
    const late = parsed.find((s) => s.showTime === "12:30 am");
    expect(late).toBeDefined();
    expect(late!.showDate).toBe("2026-11-14");
    expect(late!.startsAt.toISOString()).toBe("2026-11-15T05:30:00.000Z");
  });

  it("starts an evening show on its listed date", () => {
    const evening = parsed.find((s) => s.showTime === "9:00 pm");
    expect(evening!.startsAt.toISOString()).toBe("2026-11-15T02:00:00.000Z");
  });

  it("reads name, credits, website and headshot", () => {
    const first = parsed[0].comedians[0];
    expect(first.name).not.toBe("");
    expect(first.position).toBe(1);
    expect(first.headshotUrl).toMatch(/^https:\/\//);
  });

  it("returns no shows for an empty date", () => {
    expect(parseShows("2027-03-01", '<p class="no-shows">No Comedians added yet!</p>')).toEqual([]);
  });
});

describe("cleanRoomName", () => {
  it("removes a leading time", () => {
    expect(cleanRoomName("5:30pm Eric Neumann: Neu Material")).toBe(
      "Eric Neumann: Neu Material",
    );
  });

  it("collapses spaces and trims", () => {
    expect(cleanRoomName("Fat Black Pussycat Lounge ")).toBe("Fat Black Pussycat Lounge");
  });
});
