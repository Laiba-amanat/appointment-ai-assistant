"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn, storage } from "@/lib/utils";
import type { User } from "@/types";

const navLinks = [
  { href: "/chat",         label: "AI Chat" },
  { href: "/appointments", label: "Appointments" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = storage.get("user");
    if (stored) {
      try { setUser(JSON.parse(stored) as User); } catch { /* ignore */ }
    }
  }, []);

  function handleLogout() {
    storage.remove("token");
    storage.remove("user");
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-gray-800 bg-gray-950/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">

        {/* Logo */}
        <Link href="/chat" className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600">
            <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor"
              strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-white">BookAI</span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                pathname.startsWith(href)
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* User + sign out */}
        <div className="flex items-center gap-3">
          {user && (
            <span className="hidden sm:block text-xs text-gray-500 truncate max-w-[120px]">
              {user.name}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="rounded-lg px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
