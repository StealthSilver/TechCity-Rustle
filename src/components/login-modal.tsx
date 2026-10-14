"use client";

import { useEffect, useId, useState, type FormEvent } from "react";

export function LoginModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (username: string, password: string) => Promise<string | null>;
}) {
  const titleId = useId();
  const usernameId = useId();
  const passwordId = useId();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onClose();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    const message = await onSubmit(username, password);
    if (message) {
      setError(message);
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-ink/45"
        aria-label="Close login"
        disabled={pending}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-[22.5rem] rounded-2xl border border-line bg-card px-6 pt-6 pb-5 shadow-[0_24px_60px_rgba(17,17,17,0.16)]"
      >
        <button
          type="button"
          className="absolute top-4 right-4 grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-paper hover:text-ink disabled:opacity-40"
          aria-label="Close"
          disabled={pending}
          onClick={onClose}
        >
          <CloseIcon />
        </button>

        <h2 id={titleId} className="pr-8 text-xl font-medium tracking-tight text-ink">
          Log in
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          Sign in to open a certificate, offer letter, or appreciation letter.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
          <label className="block" htmlFor={usernameId}>
            <span className="text-xs text-muted">Username</span>
            <input
              id={usernameId}
              name="username"
              type="text"
              autoComplete="username"
              autoFocus
              required
              disabled={pending}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-1.5 h-11 w-full rounded-lg border border-line bg-white px-3 text-base text-ink outline-none transition-colors focus:border-ink disabled:opacity-60 sm:text-sm"
            />
          </label>

          <div>
            <label className="block text-xs text-muted" htmlFor={passwordId}>
              Password
            </label>
            <div className="relative mt-1.5">
              <input
                id={passwordId}
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                disabled={pending}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 w-full rounded-lg border border-line bg-white px-3 pr-11 text-base text-ink outline-none transition-colors focus:border-ink disabled:opacity-60 sm:text-sm"
              />
              <button
                type="button"
                className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted transition-colors hover:text-ink disabled:opacity-40"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                disabled={pending}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <p className="min-h-5 text-sm text-red-700" role="alert">
            {error}
          </p>

          <button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm text-white transition-opacity disabled:opacity-80"
          >
            {pending ? <Spinner /> : null}
            {pending ? "Signing in" : "Log in"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="size-4 animate-spin"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.6" />
      <path
        d="M14 8a6 6 0 0 0-6-6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M1.75 9S4.2 4.75 9 4.75 16.25 9 16.25 9 13.8 13.25 9 13.25 1.75 9 1.75 9Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle cx="9" cy="9" r="2.15" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M3.2 3.2 14.8 14.8M7.15 7.35A2.15 2.15 0 0 0 10.7 10.9M4.15 5.55C2.7 6.55 1.75 8.05 1.75 9c0 0 2.45 4.25 7.25 4.25 1.15 0 2.18-.28 3.08-.72M7.55 4.9c.46-.1.95-.15 1.45-.15 4.8 0 7.25 4.25 7.25 4.25-.4.7-1.05 1.55-1.9 2.3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3 3l8 8M11 3L3 11" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
