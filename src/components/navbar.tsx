"use client";

import { useEffect, useState } from "react";

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
      <span className="text-[0.42em] font-medium tracking-[0.08em]">STUDIO</span>
    </span>
  );
}

export function Navbar({ current }: { current?: string }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(current ?? "");

  useEffect(() => {
    if (current) return;

    const sections = links
      .map((link) => document.getElementById(link.id))
      .filter((section): section is HTMLElement => section !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target.id) {
          setActive(visible.target.id);
        }
      },
      { rootMargin: "-72px 0px -45% 0px", threshold: [0.1, 0.25, 0.5] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [current]);

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
        <a href="/" aria-label="STUDIO" className="flex min-w-0 items-center">
          <BrandMark />
        </a>

        <nav className="hidden items-center gap-5 md:flex lg:gap-6 xl:gap-8" aria-label="Documents">
          {links.map((link) => (
            <a
              key={link.id}
              href={link.href}
              aria-current={active === link.id ? "true" : undefined}
              className="text-sm text-muted transition-colors hover:text-ink aria-[current=true]:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <button
          type="button"
          className="grid size-10 shrink-0 place-items-center rounded-md border border-line text-ink md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          aria-label="Documents"
          className="max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-t border-line px-4 py-2 sm:px-6 md:hidden"
        >
          {links.map((link) => (
            <a
              key={link.id}
              href={link.href}
              aria-current={active === link.id ? "true" : undefined}
              className="block border-b border-line py-3.5 text-base text-ink last:border-b-0"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </nav>
      ) : null}
    </header>
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
