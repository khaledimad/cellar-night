import { ingestUpcoming } from "@/lib/ingest";
import { refreshSeats } from "@/lib/seats";

export const maxDuration = 300;

// Refreshes the lineups, then the seat counts. A seats failure is reported
// in the reply and never fails the refresh.
export async function POST(request: Request) {
  const secret = process.env.INGEST_SECRET;
  const given = request.headers.get("x-ingest-secret");
  if (!secret || given !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await ingestUpcoming();
  const seats = await refreshSeats();
  return Response.json({ ...result, seats });
}
