import type { Metadata } from "next";
import "./globals.css";
import AuthGuard from "@/components/layout/AuthGuard";

export const metadata: Metadata = {
  title: "BookAI — AI Appointment Booking",
  description: "Book appointments effortlessly with AI-powered assistance.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full">
        {/* AuthGuard validates token on every protected route, including page refresh */}
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}
