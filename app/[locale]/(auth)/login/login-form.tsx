"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export function LoginForm({ next }: { next: string | null }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {state.error ? (
        <p
          role="alert"
          aria-live="assertive"
          className="rounded-[10px] border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
        >
          {state.error}
        </p>
      ) : null}

      <div>
        <label htmlFor="login-email" className="mb-1.5 block text-sm font-semibold text-ink">
          Email
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="h-12 w-full rounded-[10px] border-[1.5px] border-line-input bg-white px-4 text-[15px] text-ink outline-none focus:border-accent"
        />
      </div>

      <div>
        <label htmlFor="login-password" className="mb-1.5 block text-sm font-semibold text-ink">
          Password
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-12 w-full rounded-[10px] border-[1.5px] border-line-input bg-white px-4 text-[15px] text-ink outline-none focus:border-accent"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-1 inline-flex h-12 items-center justify-center rounded-xl bg-accent font-bold text-white transition-colors hover:bg-accent-deep disabled:pointer-events-none disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
