"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/components/session";
import { askGuarded } from "@/lib/chat/guard";

export async function askAction(
  messages: { role: "user" | "assistant"; content: string }[],
): Promise<{ answer?: string; error?: string }> {
  const user = await getCurrentUser();
  try {
    const result = await askGuarded(user.id, messages);
    if (result.followed) {
      revalidatePath("/");
      revalidatePath("/tonight");
    }
    return { answer: result.answer };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}
