"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { storage } from "@/lib/utils";
import type { User } from "@/types";

export function useAuth() {
  const [user,  setUser]  = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const storedToken = storage.get("token");
    const storedUser  = storage.get("user");
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser) as User);
      } catch {
        storage.remove("token");
        storage.remove("user");
      }
    }
    setReady(true);
  }, []);

  function saveAuth(u: User, t: string) {
    storage.set("token", t);
    storage.set("user", JSON.stringify(u));
    setUser(u);
    setToken(t);
  }

  function logout() {
    storage.remove("token");
    storage.remove("user");
    setUser(null);
    setToken(null);
    router.push("/login");
  }

  return { user, token, ready, saveAuth, logout };
}
