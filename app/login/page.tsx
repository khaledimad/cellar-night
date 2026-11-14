import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-6 py-16">
      <div className="flex flex-col gap-3">
        <p aria-hidden className="text-sm tracking-[0.5em] text-amber">
          ★ ★ ★
        </p>
        <h1 className="neon-sign neon-sign-flicker text-6xl!">
          Who&apos;s at the Cellar
        </h1>
        <p className="text-chalk">
          Star your favourite comedians and get an email when they are added
          to a Comedy Cellar lineup.
        </p>
        <p className="text-sm italic text-dim">
          The lineup changes every day. We check it so you do not have to.
        </p>
      </div>
      <LoginForm />
    </main>
  );
}
