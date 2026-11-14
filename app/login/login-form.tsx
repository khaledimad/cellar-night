"use client";

import { useActionState } from "react";
import { signIn, signUp, type AuthState } from "@/app/auth/actions";

const initial: AuthState = { error: null };

export function LoginForm() {
  const [signInState, signInAction, signingIn] = useActionState(signIn, initial);
  const [signUpState, signUpAction, signingUp] = useActionState(signUp, initial);
  const error = signInState.error ?? signUpState.error;
  const busy = signingIn || signingUp;

  return (
    <form className="flex w-full flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded border border-zinc-300 bg-transparent px-3 py-2 text-base dark:border-zinc-700"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Password
        <input
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="current-password"
          className="rounded border border-zinc-300 bg-transparent px-3 py-2 text-base dark:border-zinc-700"
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <div className="mt-2 flex gap-3">
        <button
          formAction={signInAction}
          disabled={busy}
          className="flex-1 rounded bg-foreground px-4 py-2 font-medium text-background disabled:opacity-50"
        >
          Sign in
        </button>
        <button
          formAction={signUpAction}
          disabled={busy}
          className="flex-1 rounded border border-zinc-300 px-4 py-2 font-medium disabled:opacity-50 dark:border-zinc-700"
        >
          Create account
        </button>
      </div>
    </form>
  );
}
