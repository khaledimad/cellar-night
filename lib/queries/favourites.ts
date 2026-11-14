import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { appearances, comedians, favourites, shows } from "@/lib/db/schema";
import { normalizeName } from "@/lib/names";

export type ComedianRef = { id: number; name: string; nameNorm: string };

// Stars a comedian. Starring twice changes nothing.
export async function starComedian(
  userId: string,
  comedianId: number,
): Promise<void> {
  await db
    .insert(favourites)
    .values({ userId, comedianId })
    .onConflictDoNothing();
}

export async function unstarComedian(
  userId: string,
  comedianId: number,
): Promise<void> {
  await db
    .delete(favourites)
    .where(
      and(eq(favourites.userId, userId), eq(favourites.comedianId, comedianId)),
    );
}

// The user's starred comedians, most recently starred first.
export async function getStarred(userId: string): Promise<ComedianRef[]> {
  return db
    .select({
      id: comedians.id,
      name: comedians.name,
      nameNorm: comedians.nameNorm,
    })
    .from(favourites)
    .innerJoin(comedians, eq(comedians.id, favourites.comedianId))
    .where(eq(favourites.userId, userId))
    .orderBy(sql`${favourites.createdAt} desc`, comedians.name);
}

// Finds the comedian by cleaned name, creates the row when none exists
// (not billed yet), stars it, and counts their upcoming shows.
export async function followByName(
  userId: string,
  rawName: string,
): Promise<{ comedian: ComedianRef; upcomingShowCount: number }> {
  const name = rawName.trim().replace(/\s+/g, " ").slice(0, 100);
  const nameNorm = normalizeName(name);
  if (!nameNorm) throw new Error("Enter a name to follow.");

  await db
    .insert(comedians)
    .values({ name, nameNorm })
    .onConflictDoNothing({ target: comedians.nameNorm });

  const [comedian] = await db
    .select({
      id: comedians.id,
      name: comedians.name,
      nameNorm: comedians.nameNorm,
    })
    .from(comedians)
    .where(eq(comedians.nameNorm, nameNorm));

  await starComedian(userId, comedian.id);

  const [{ n }] = await db
    .select({ n: sql<number>`count(distinct ${shows.id})::int` })
    .from(appearances)
    .innerJoin(shows, eq(shows.id, appearances.showId))
    .where(
      and(eq(appearances.comedianId, comedian.id), gt(shows.startsAt, new Date())),
    );

  return { comedian, upcomingShowCount: n };
}
