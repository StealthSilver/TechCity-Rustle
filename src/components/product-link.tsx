"use client";

import type { MouseEvent, ReactNode } from "react";
import { useAuth } from "@/components/auth-provider";
import { isProductPath } from "@/lib/product-paths";

export function ProductLink({
  href,
  className,
  children,
  onNavigate,
  current,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  onNavigate?: () => void;
  current?: boolean;
}) {
  const { username, ready, openLogin } = useAuth();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onNavigate?.();
    if (username || !ready || !isProductPath(href)) return;
    event.preventDefault();
    openLogin(href);
  }

  return (
    <a
      href={href}
      className={className}
      aria-current={current ? "true" : undefined}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}
