"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthCard from "@/components/auth/AuthCard";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { authApi } from "@/lib/api";
import { storage } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      if (!res.success || !res.data) {
        setError(res.message ?? "Login failed");
        return;
      }
      storage.set("token", res.data.token);
      storage.set("user",  JSON.stringify(res.data.user));
      router.push("/chat");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to your BookAI account">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <ErrorMessage message={error} />

        <Input
          label="Email address"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        <Button type="submit" loading={loading} className="w-full mt-1">
          Sign in
        </Button>

        <p className="text-center text-sm text-gray-500">
          No account?{" "}
          <Link href="/signup" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
            Create one free
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
