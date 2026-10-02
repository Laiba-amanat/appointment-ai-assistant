import type { ReactNode } from "react";

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 bg-gray-950">
      <div className="w-full max-w-sm">
        {/* Logo mark */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600">
            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor"
              strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-gray-400">{subtitle}</p>}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
          {children}
        </div>
      </div>
    </main>
  );
}
