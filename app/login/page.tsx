import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Cellar Night</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Star your favourite comedians and get an email when they are added
          to a Comedy Cellar lineup.
        </p>
      </div>
      <LoginForm />
    </main>
  );
}
