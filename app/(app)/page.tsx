import { signOut } from "@/app/auth/actions";

export default function MyComediansPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-10">
      <h1 className="text-2xl font-semibold">My comedians</h1>
      <form action={signOut}>
        <button className="rounded border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700">
          Sign out
        </button>
      </form>
    </main>
  );
}
