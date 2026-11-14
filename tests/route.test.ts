import { beforeEach, describe, expect, it, vi } from "vitest";

const ingestUpcoming = vi.hoisted(() => vi.fn());
const refreshSeats = vi.hoisted(() => vi.fn());
vi.mock("@/lib/ingest", () => ({ ingestUpcoming }));
vi.mock("@/lib/seats", () => ({ refreshSeats }));

import { POST } from "@/app/api/ingest/route";

beforeEach(() => {
  process.env.INGEST_SECRET = "route-test-secret";
  ingestUpcoming.mockReset();
  refreshSeats.mockReset();
});

describe("POST /api/ingest", () => {
  it("answers 401 without the secret header", async () => {
    const res = await POST(new Request("http://localhost/api/ingest", { method: "POST" }));
    expect(res.status).toBe(401);
    expect(ingestUpcoming).not.toHaveBeenCalled();
    expect(refreshSeats).not.toHaveBeenCalled();
  });

  it("answers 401 with the wrong secret", async () => {
    const res = await POST(
      new Request("http://localhost/api/ingest", {
        method: "POST",
        headers: { "x-ingest-secret": "nope" },
      }),
    );
    expect(res.status).toBe(401);
  });

  it("runs the refresh with the right secret", async () => {
    ingestUpcoming.mockResolvedValue({ ok: true });
    refreshSeats.mockResolvedValue({ ok: true, showsMatched: 3 });
    const res = await POST(
      new Request("http://localhost/api/ingest", {
        method: "POST",
        headers: { "x-ingest-secret": "route-test-secret" },
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      seats: { ok: true, showsMatched: 3 },
    });
  });
});
