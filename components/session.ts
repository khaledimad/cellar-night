import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// The signed-in user, checked on the server. Signed-out visitors go to login.
export async function getCurrentUser(): Promise<{ id: string; email: string }> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return { id: data.user.id, email: data.user.email ?? "" };
}
