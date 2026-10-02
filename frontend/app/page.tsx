import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 bg-gray-950">
      <div className="text-center max-w-lg">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600">
          <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor"
            strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-white mb-3">BookAI</h1>
        <p className="text-lg text-gray-400 mb-8">
          AI-powered appointment booking. Just chat — we handle the rest.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/login"
            className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition-colors">
            Sign in
          </Link>
          <Link href="/signup"
            className="inline-flex items-center justify-center rounded-xl border border-gray-700 px-6 py-3 text-sm font-semibold text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
            Create account
          </Link>
        </div>
      </div>
    </main>
  );
}
