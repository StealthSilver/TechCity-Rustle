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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const message = await onSubmit(username, password);
    if (message) {
      setError(message);
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center px-4 py-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-ink/40"
        aria-label="Close login"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-sm rounded-xl border border-line bg-card p-6"
      >
        <h2 id={titleId} className="text-lg font-medium tracking-tight">
          Log in
        </h2>
        <p className="mt-1 text-sm text-muted">Sign in to open a document.</p>
        <form onSubmit={handleSubmit} className="mt-5 grid gap-3">
          <label className="block">
            <span className="text-xs text-muted">Username</span>
            <input
              name="username"
              type="text"
              autoComplete="username"
              autoFocus
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-base text-ink outline-none transition-colors focus:border-ink sm:h-10 sm:text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted">Password</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-base text-ink outline-none transition-colors focus:border-ink sm:h-10 sm:text-sm"
            />
          </label>
          <p className="min-h-5 text-sm text-red-700" role="alert">
            {error}
          </p>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-ink px-4 text-sm text-white disabled:opacity-60"
          >
            {pending ? "Signing in…" : "Log in"}
          </button>
        </form>
      </div>
    </div>
  );
}
