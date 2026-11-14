import { and, asc, desc, eq, gt, lt, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { appearances, comedians, shows } from "@/lib/db/schema";
import { normalizeName } from "@/lib/names";

export type ComedianOption = { id: number; name: string; nameNorm: string };

// Comedians whose cleaned name contains the typed text, at most 8.
export async function searchComedians(text: string): Promise<ComedianOption[]> {
  const norm = normalizeName(text);
  if (!norm) return [];
  return db
    .select({
      id: comedians.id,
      name: comedians.name,
      nameNorm: comedians.nameNorm,
    })
    .from(comedians)
    .where(sql`${comedians.nameNorm} like ${"%" + norm + "%"}`)
    .orderBy(
      sql`case when ${comedians.nameNorm} like ${norm + "%"} then 0 else 1 end`,
      asc(comedians.name),
    )
    .limit(8);
}

// The 10 comedians on the most shows in the next 7 days.
export async function getTopComedians(): Promise<ComedianOption[]> {
  const now = new Date();
  const weekOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      id: comedians.id,
      name: comedians.name,
      nameNorm: comedians.nameNorm,
      shows: sql<number>`count(*)::int`,
    })
    .from(appearances)
    .innerJoin(shows, eq(shows.id, appearances.showId))
    .innerJoin(comedians, eq(comedians.id, appearances.comedianId))
    .where(
      and(
        gt(shows.startsAt, now),
        lt(shows.startsAt, weekOut),
        ne(comedians.nameNorm, "super secret pop up"),
      ),
    )
    .groupBy(comedians.id, comedians.name, comedians.nameNorm)
    .orderBy(desc(sql`count(*)`), asc(comedians.name))
    .limit(10);
  return rows.map(({ id, name, nameNorm }) => ({ id, name, nameNorm }));
}
