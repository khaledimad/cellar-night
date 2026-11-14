"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/components/session";
import { getAllComedians, searchComedians } from "@/lib/queries/comedians";
import {
  followByName,
  starComedian,
  unstarComedian,
} from "@/lib/queries/favourites";

function refresh() {
  revalidatePath("/");
  revalidatePath("/tonight");
}

export async function starComedianAction(comedianId: number): Promise<void> {
  const user = await getCurrentUser();
  await starComedian(user.id, Number(comedianId));
  refresh();
}

export async function unstarComedianAction(comedianId: number): Promise<void> {
  const user = await getCurrentUser();
  await unstarComedian(user.id, Number(comedianId));
  refresh();
}

export async function followByNameAction(
  rawName: string,
): Promise<{ name: string; upcomingShowCount: number }> {
  const user = await getCurrentUser();
  const { comedian, upcomingShowCount } = await followByName(
    user.id,
    String(rawName),
  );
  refresh();
  return { name: comedian.name, upcomingShowCount };
}

export async function searchComediansAction(
  text: string,
): Promise<{ id: number; name: string; nameNorm: string }[]> {
  await getCurrentUser();
  return searchComedians(String(text).slice(0, 100));
}

export async function listAllComediansAction(): Promise<
  { id: number; name: string; nameNorm: string }[]
> {
  await getCurrentUser();
  return getAllComedians();
}
