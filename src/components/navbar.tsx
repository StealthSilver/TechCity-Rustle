"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { ProductLink } from "@/components/product-link";

const links = [
  { href: "/certificate", id: "certificate", label: "Certificate" },
  { href: "/offer-letter", id: "offer-letter", label: "Offer Letter" },
  {
    href: "/appreciation",
    id: "appreciation-letter",
    label: "Appreciation Letter",
  },
] as const;

export function BrandMark({
  className = "text-[2.85rem] sm:text-[3.55rem]",
}: {
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-baseline gap-[0.22em] leading-none text-ink ${className}`}
    >
      <img src="/techcity-logo.png" alt="" className="h-[1cap] w-auto" />
      <StudioWord />
    </span>
  );
}

function StudioWord() {
  return (
    <span className="text-[0.46em] font-semibold uppercase leading-none tracking-[0.06em]">
      STUDIO
    </span>
  );
}

export function Navbar({ current }: { current?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex min-h-14 max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:gap-6 sm:px-6 md:px-8">
        <Link href="/" aria-label="Techcity Studio" className="flex min-w-0 items-center">
          <BrandMark className="text-[2rem] sm:text-[2.35rem]" />
        </Link>

        <nav className="hidden items-center gap-4 lg:flex lg:gap-5" aria-label="Documents">
          {links.map((link) => (
            <ProductLink
              key={link.id}
              href={link.href}
              current={current === link.id}
              className="text-sm text-muted transition-colors hover:text-ink aria-[current=true]:text-ink"
            >
              {link.label}
            </ProductLink>
          ))}
          <AuthButton className="rounded-lg px-3 py-1.5 text-sm" />
        </nav>

        <div className="flex items-center gap-2 lg:hidden">
          <AuthButton
            className="rounded-lg px-3 py-1.5 text-sm"
            onDone={() => setOpen(false)}
          />
          <button
            type="button"
            className="grid size-10 shrink-0 place-items-center rounded-md border border-line text-ink"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((value) => !value)}
          >
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          aria-label="Documents"
          className="max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-t border-line px-4 py-2 sm:px-6 lg:hidden"
        >
          {links.map((link) => (
            <ProductLink
              key={link.id}
              href={link.href}
              current={current === link.id}
              className="block border-b border-line py-3.5 text-base text-ink"
              onNavigate={() => setOpen(false)}
            >
              {link.label}
            </ProductLink>
          ))}
          <AuthButton
            className="mt-1 block w-full rounded-lg px-3 py-3 text-left text-base"
            onDone={() => setOpen(false)}
          />
        </nav>
      ) : null}
    </header>
  );
}

function AuthButton({
  className,
  onDone,
}: {
  className?: string;
  onDone?: () => void;
}) {
  const { username, ready, openLogin, logout } = useAuth();

  if (!ready) {
    return <span className={`inline-block h-9 w-16 ${className ?? ""}`} aria-hidden="true" />;
  }

  if (username) {
    return (
      <button
        type="button"
        className={`border border-line text-ink transition-colors duration-200 ease-out hover:border-ink hover:bg-ink hover:text-white ${className ?? ""}`}
        onClick={() => {
          onDone?.();
          void logout();
        }}
      >
        Log out
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`bg-ink text-white transition-colors duration-200 ease-out hover:bg-[#3a3a3a] ${className ?? ""}`}
      onClick={() => {
        onDone?.();
        openLogin();
      }}
    >
      Log in
    </button>
  );
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M2.5 5h13M2.5 9h13M2.5 13h13" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
