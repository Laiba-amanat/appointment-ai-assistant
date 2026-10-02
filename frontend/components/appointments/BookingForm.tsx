"use client";
import { useState } from "react";
import type { FallbackFormData } from "@/types";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { todayISO } from "@/lib/utils";

interface BookingFormProps {
  prefill?: FallbackFormData | null;
  onSubmit: (data: { appointment_date: string; appointment_time: string; reason: string }) => void;
  loading?: boolean;
  onDismiss?: () => void;
}

export default function BookingForm({ prefill, onSubmit, loading, onDismiss }: BookingFormProps) {
  const [date,   setDate]   = useState(prefill?.date   ?? "");
  const [time,   setTime]   = useState(prefill?.time   ?? "");
  const [reason, setReason] = useState(prefill?.reason ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!date)   errs.date   = "Date is required";
    if (!time)   errs.time   = "Time is required";
    if (!reason.trim()) errs.reason = "Reason is required";
    if (date && date < todayISO()) errs.date = "Date must be today or later";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({ appointment_date: date, appointment_time: time, reason: reason.trim() });
  }

  return (
    <div className="rounded-2xl border border-brand-600/40 bg-brand-600/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-200">Complete your booking</p>
        {onDismiss && (
          <button onClick={onDismiss} className="text-gray-500 hover:text-gray-300 text-xs">
            dismiss
          </button>
        )}
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          label="Date"
          type="date"
          min={todayISO()}
          value={date}
          onChange={e => setDate(e.target.value)}
          error={errors.date}
        />
        <Input
          label="Time"
          type="time"
          value={time}
          onChange={e => setTime(e.target.value)}
          error={errors.time}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bf-reason" className="text-sm font-medium text-gray-300">
            Reason
          </label>
          <textarea
            id="bf-reason"
            rows={2}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Brief reason for the appointment"
            className="w-full resize-none rounded-xl border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
          {errors.reason && <p className="text-xs text-red-400">{errors.reason}</p>}
        </div>
        <Button type="submit" loading={loading} className="w-full">
          Book appointment
        </Button>
      </form>
    </div>
  );
}
