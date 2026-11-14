"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type AuthState } from "@/app/auth/actions";

const initial: AuthState = { error: null };

type Mode = "signin" | "signup";

const COPY: Record<
  Mode,
  { heading: string; button: string; busy: string; prompt: string; switchTo: string }
> = {
  signin: {
    heading: "Sign in",
    button: "Sign in",
    busy: "Signing in",
    prompt: "New here?",
    switchTo: "Create an account",
  },
  signup: {
    heading: "Create account",
    button: "Create account",
    busy: "Creating account",
    prompt: "Already have an account?",
    switchTo: "Sign in",
  },
};

export function LoginForm() {
  const [signInState, signInAction, signingIn] = useActionState(signIn, initial);
  const [signUpState, signUpAction, signingUp] = useActionState(signUp, initial);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [errorCleared, setErrorCleared] = useState(false);

  const busy = signingIn || signingUp;
  const state = mode === "signin" ? signInState : signUpState;
  const error = errorCleared || busy ? null : state.error;
  const copy = COPY[mode];

  function switchMode() {
    setMode(mode === "signin" ? "signup" : "signin");
    setErrorCleared(true);
  }

  return (
    <section className="flex w-full flex-col gap-4 rounded-lg border border-line bg-panel/70 p-5">
      <h2 className="font-display text-2xl uppercase tracking-wider text-chalk">
        {copy.heading}
      </h2>
      <form
        action={mode === "signin" ? signInAction : signUpAction}
        onSubmit={() => setErrorCleared(false)}
        className="flex w-full flex-col gap-3"
      >
        <label className="flex flex-col gap-1 text-sm text-dim">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded border border-line px-3 py-2 text-base"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-dim">
          Password
          <input
            key={mode}
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            className="rounded border border-line px-3 py-2 text-base"
          />
          {mode === "signup" ? (
            <span className="text-xs">At least 6 characters.</span>
          ) : null}
        </label>
        {error ? (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="mt-1 rounded bg-neon px-4 py-2.5 font-semibold text-ink transition hover:brightness-110 disabled:opacity-50"
        >
          {busy ? copy.busy : copy.button}
        </button>
      </form>
      <p className="text-sm text-dim">
        {copy.prompt}{" "}
        <button
          type="button"
          onClick={switchMode}
          disabled={busy}
          className="font-medium text-neon underline underline-offset-2"
        >
          {copy.switchTo}
        </button>
      </p>
    </section>
  );
}
