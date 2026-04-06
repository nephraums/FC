"use client";

import { useActionState } from "react";
import {
  signInWithMagicLink,
  signInWithPassword,
  signUpWithPassword,
} from "@/app/actions/auth";

type State = { error?: string; success?: boolean } | null;

async function magicLinkAction(_prev: State, formData: FormData): Promise<State> {
  const email = (formData.get("email") as string) ?? "";
  return signInWithMagicLink(email);
}

async function passwordSignInAction(_prev: State, formData: FormData): Promise<State> {
  const email = (formData.get("email") as string) ?? "";
  const password = (formData.get("password") as string) ?? "";
  return signInWithPassword(email, password);
}

async function passwordSignUpAction(_prev: State, formData: FormData): Promise<State> {
  const email = (formData.get("email") as string) ?? "";
  const password = (formData.get("password") as string) ?? "";
  return signUpWithPassword(email, password);
}

export function LoginForm() {
  const [magicState, magicAction, magicPending] = useActionState(
    magicLinkAction,
    null,
  );
  const [signInState, signInAction, signInPending] = useActionState(
    passwordSignInAction,
    null,
  );
  const [signUpState, signUpAction, signUpPending] = useActionState(
    passwordSignUpAction,
    null,
  );

  return (
    <div className="flex w-full max-w-sm flex-col gap-6 text-left">
      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Password sign-in (recommended for now)
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Use this while magic link emails are rate-limited.
        </p>

        {signInState?.error ? (
          <p
            className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
            role="alert"
          >
            {signInState.error}
          </p>
        ) : null}

        <form action={signInAction} className="mt-4 flex flex-col gap-3">
          <div className="grid gap-1.5">
            <label
              htmlFor="email-signin"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Email
            </label>
            <input
              id="email-signin"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div className="grid gap-1.5">
            <label
              htmlFor="password-signin"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Password
            </label>
            <input
              id="password-signin"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <button
            type="submit"
            disabled={signInPending}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {signInPending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Create an account
        </h2>

        {signUpState?.error ? (
          <p
            className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
            role="alert"
          >
            {signUpState.error}
          </p>
        ) : null}
        {signUpState?.success ? (
          <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
            Account created. If email confirmation is enabled, check your inbox.
          </p>
        ) : null}

        <form action={signUpAction} className="mt-4 flex flex-col gap-3">
          <div className="grid gap-1.5">
            <label
              htmlFor="email-signup"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Email
            </label>
            <input
              id="email-signup"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div className="grid gap-1.5">
            <label
              htmlFor="password-signup"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Password
            </label>
            <input
              id="password-signup"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <button
            type="submit"
            disabled={signUpPending}
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            {signUpPending ? "Creating…" : "Sign up"}
          </button>
        </form>
      </section>

      <details className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <summary className="cursor-pointer text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Magic link (optional)
        </summary>
        {magicState?.error ? (
          <p
            className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
            role="alert"
          >
            {magicState.error}
          </p>
        ) : null}
        {magicState?.success ? (
          <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
            Check your email for the sign-in link.
          </p>
        ) : null}
        <form action={magicAction} className="mt-4 flex flex-col gap-3">
          <div className="grid gap-1.5">
            <label
              htmlFor="email-magic"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Email
            </label>
            <input
              id="email-magic"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <button
            type="submit"
            disabled={magicPending}
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            {magicPending ? "Sending…" : "Email me a magic link"}
          </button>
        </form>
      </details>
    </div>
  );
}
