"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LoginModal } from "@/components/login-modal";
import { isProductPath } from "@/lib/product-paths";

type AuthContextValue = {
  username: string | null;
  ready: boolean;
  openLogin: (next?: string) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [username, setUsername] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [nextPath, setNextPath] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((data: { username?: string | null }) => {
        if (!cancelled) setUsername(data.username ?? null);
      })
      .catch(() => {
        if (!cancelled) setUsername(null);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const openLogin = useCallback((next?: string) => {
    setNextPath(next && isProductPath(next) ? next : null);
    setLoginOpen(true);
  }, []);

  const closeLogin = useCallback(() => {
    setLoginOpen(false);
    setNextPath(null);

    const url = new URL(window.location.href);
    if (!url.searchParams.has("next")) return;
    url.searchParams.delete("next");
    const search = url.searchParams.toString();
    router.replace(search ? `${url.pathname}?${search}` : url.pathname);
  }, [router]);

  const login = useCallback(
    async (submittedUsername: string, password: string) => {
      let response: Response;
      try {
        response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: submittedUsername,
            password,
          }),
        });
      } catch {
        return "Sign-in is unavailable right now.";
      }

      if (response.status === 401) {
        return "Incorrect username or password.";
      }

      if (!response.ok) {
        return "Sign-in is unavailable right now.";
      }

      const data = (await response.json()) as { username?: string };
      setUsername(data.username ?? submittedUsername.trim());
      setLoginOpen(false);

      if (nextPath) {
        const destination = nextPath;
        setNextPath(null);
        router.push(destination);
      }

      return null;
    },
    [nextPath, router],
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUsername(null);
    setLoginOpen(false);
    setNextPath(null);
    if (isProductPath(pathname)) {
      router.push("/");
    }
  }, [pathname, router]);

  return (
    <AuthContext.Provider value={{ username, ready, openLogin, logout }}>
      <Suspense fallback={null}>
        <LoginFromQuery />
      </Suspense>
      {loginOpen ? <LoginModal onClose={closeLogin} onSubmit={login} /> : null}
      {children}
    </AuthContext.Provider>
  );
}

function LoginFromQuery() {
  const params = useSearchParams();
  const router = useRouter();
  const { username, ready, openLogin } = useAuth();
  const opened = useRef(false);

  useEffect(() => {
    if (!ready) return;

    const next = params.get("next");
    if (!next || !isProductPath(next)) return;

    if (username) {
      router.replace(next);
      return;
    }

    if (opened.current) return;
    opened.current = true;
    openLogin(next);
  }, [openLogin, params, ready, router, username]);

  return null;
}
