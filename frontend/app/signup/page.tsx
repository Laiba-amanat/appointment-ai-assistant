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

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
}

export default function SignupPage() {
  const router = useRouter();
  const [name,        setName]        = useState("");
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [confirm,     setConfirm]     = useState("");
  const [error,       setError]       = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading,     setLoading]     = useState(false);

  function validate(): boolean {
    const errs: FieldErrors = {};
    if (!name.trim())            errs.name     = "Name is required";
    if (!email)                  errs.email    = "Email is required";
    if (password.length < 8)     errs.password = "Minimum 8 characters";
    else if (!/[A-Z]/.test(password)) errs.password = "Must contain an uppercase letter";
    else if (!/[0-9]/.test(password)) errs.password = "Must contain a number";
    if (password !== confirm)    errs.confirm  = "Passwords do not match";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await authApi.signup(name.trim(), email, password);
      if (!res.success || !res.data) {
        if (res.errors) {
          const fe: FieldErrors = {};
          res.errors.forEach(err => { (fe as Record<string, string>)[err.field] = err.message; });
          setFieldErrors(fe);
        } else {
          setError(res.message ?? "Signup failed");
        }
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
    <AuthCard title="Create account" subtitle="Start booking smarter with AI">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <ErrorMessage message={error} />

        <Input
          label="Full name"
          type="text"
          placeholder="Alice Johnson"
          value={name}
          onChange={e => setName(e.target.value)}
          error={fieldErrors.name}
          autoComplete="name"
          required
        />

        <Input
          label="Email address"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          error={fieldErrors.email}
          autoComplete="email"
          required
        />

        <div className="flex flex-col gap-1">
          <Input
            label="Password"
            type="password"
            placeholder="Min 8 chars, 1 uppercase, 1 number"
            value={password}
            onChange={e => setPassword(e.target.value)}
            error={fieldErrors.password}
            autoComplete="new-password"
            required
          />
          {/* Password strength hint */}
          {password.length > 0 && (
            <div className="flex gap-1 mt-1">
              {[
                password.length >= 8,
                /[A-Z]/.test(password),
                /[0-9]/.test(password),
              ].map((met, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${met ? "bg-green-500" : "bg-gray-700"}`} />
              ))}
            </div>
          )}
        </div>

        <Input
          label="Confirm password"
          type="password"
          placeholder="Repeat your password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          error={fieldErrors.confirm}
          autoComplete="new-password"
          required
        />

        <Button type="submit" loading={loading} className="w-full mt-1">
          Create account
        </Button>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
