"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { storage } from "@/lib/utils";
import { authApi } from "@/lib/api";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/register"];

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * AuthGuard — wraps protected pages.
 *
 * On mount:
 *   1. Reads token from localStorage.
 *   2. If no token → redirect to /login.
 *   3. If token exists → calls GET /api/auth/me to validate it.
 *   4. If /me fails (expired/revoked) → clear auth → redirect /login.
 *
 * Also listens for the "auth:expired" custom event dispatched by the
 * API client on any 401 response, so mid-session expiry is handled.
 */
export default function AuthGuard({ children }: AuthGuardProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"));

  useEffect(() => {
    // Public pages don't need auth check
    if (isPublic) { setChecked(true); return; }

    const token = storage.get("token");
    if (!token) {
      router.replace("/login");
      return;
    }

    // Validate token is still accepted by backend
    authApi.me(token).then(res => {
      if (!res.success) {
        storage.remove("token");
        storage.remove("user");
        router.replace("/login");
      } else {
        // Refresh stored user in case profile changed
        if (res.data?.user) {
          storage.set("user", JSON.stringify(res.data.user));
        }
        setChecked(true);
      }
    }).catch(() => {
      // Network error — allow through; the page will handle its own error states
      setChecked(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Listen for mid-session 401 events from the API client
  useEffect(() => {
    function handleExpired() {
      router.replace("/login");
    }
    window.addEventListener("auth:expired", handleExpired);
    return () => window.removeEventListener("auth:expired", handleExpired);
  }, [router]);

  if (!isPublic && !checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <LoadingSpinner />
      </div>
    );
  }

  return <>{children}</>;
}
