"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import AppointmentCard from "@/components/appointments/AppointmentCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorMessage from "@/components/ui/ErrorMessage";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import { appointmentsApi } from "@/lib/api";
import { storage } from "@/lib/utils";
import type { Appointment } from "@/types";

export default function AppointmentsPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [cancelling,   setCancelling]   = useState<string | null>(null);

  const token = storage.get("token");

  const fetchAppointments = useCallback(async () => {
    if (!token) { router.push("/login"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await appointmentsApi.list(token);
      if (!res.success) { setError(res.message); return; }
      setAppointments(res.data?.appointments ?? []);
    } catch {
      setError("Failed to load appointments.");
    } finally {
      setLoading(false);
    }
  }, [token, router]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  async function handleCancel(id: string) {
    if (!token) return;
    setCancelling(id);
    try {
      const res = await appointmentsApi.cancel(token, id);
      if (res.success) {
        setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: "CANCELLED" } : a));
      } else {
        setError(res.message);
      }
    } catch {
      setError("Failed to cancel. Please try again.");
    } finally {
      setCancelling(null);
    }
  }

  const upcoming = appointments.filter(
    a => a.status === "SCHEDULED" && new Date(a.appointmentDate) >= new Date()
  );
  const past = appointments.filter(
    a => a.status !== "SCHEDULED" || new Date(a.appointmentDate) < new Date()
  );

  return (
    <div className="flex min-h-screen flex-col bg-gray-950">
      <Navbar />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:py-8 sm:px-6">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white">Appointments</h1>
            <p className="mt-0.5 text-sm text-gray-400">
              {loading ? "Loading…" : `${appointments.length} total · ${upcoming.length} upcoming`}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push("/chat")}
            className="shrink-0"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Book via AI
          </Button>
        </div>

        <ErrorMessage message={error} className="mb-4" />

        {loading ? (
          <LoadingSpinner />
        ) : appointments.length === 0 ? (
          <EmptyState
            title="No appointments yet"
            description="Chat with the AI assistant to book your first appointment."
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            }
            action={<Button onClick={() => router.push("/chat")}>Book with AI</Button>}
          />
        ) : (
          <div className="flex flex-col gap-6">

            {upcoming.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-2 w-2 rounded-full bg-blue-400" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Upcoming — {upcoming.length}
                  </h2>
                </div>
                <div className="flex flex-col gap-3">
                  {upcoming.map(appt => (
                    <AppointmentCard
                      key={appt.id}
                      appointment={appt}
                      onCancel={handleCancel}
                      cancelling={cancelling === appt.id}
                    />
                  ))}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-2 w-2 rounded-full bg-gray-600" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Past & Cancelled — {past.length}
                  </h2>
                </div>
                <div className="flex flex-col gap-3">
                  {past.map(appt => (
                    <AppointmentCard key={appt.id} appointment={appt} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
