import Link from "next/link";
import { Suspense } from "react";
import { signOut } from "@/app/auth/actions";
import { getCurrentUser } from "@/components/session";

async function UserBar() {
  const user = await getCurrentUser();
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="truncate text-zinc-600 dark:text-zinc-400">
        {user.email}
      </span>
      <form action={signOut}>
        <button className="rounded border border-zinc-300 px-3 py-1 dark:border-zinc-700">
          Sign out
        </button>
      </form>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex gap-4 text-sm font-medium">
            <Link href="/">My comedians</Link>
            <Link href="/tonight">Tonight</Link>
            <Link href="/ask">Ask the Cellar</Link>
          </nav>
          <Suspense fallback={null}>
            <UserBar />
          </Suspense>
        </div>
      </header>
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">{children}</div>
    </div>
  );
}
