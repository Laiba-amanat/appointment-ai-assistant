"use client";
import type { Appointment } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";

interface AppointmentCardProps {
  appointment: Appointment;
  onCancel?: (id: string) => void;
  cancelling?: boolean;
}

const statusStyles: Record<string, string> = {
  SCHEDULED:  "bg-blue-950 text-blue-300 border-blue-800",
  COMPLETED:  "bg-green-950 text-green-300 border-green-800",
  CANCELLED:  "bg-gray-800 text-gray-400 border-gray-700",
};

const statusLabels: Record<string, string> = {
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export default function AppointmentCard({
  appointment,
  onCancel,
  cancelling,
}: AppointmentCardProps) {
  const { id, appointmentDate, appointmentTime, reason, status } = appointment;
  const isPast = new Date(appointmentDate) < new Date();
  const canCancel = status === "SCHEDULED" && !isPast;

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-gray-800 bg-gray-900 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-white">
            {formatDateTime(appointmentDate, appointmentTime)}
          </p>
          <p className="text-sm text-gray-400 line-clamp-2">{reason}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium",
            statusStyles[status] ?? statusStyles.SCHEDULED
          )}
        >
          {statusLabels[status] ?? status}
        </span>
      </div>

      {canCancel && onCancel && (
        <div className="border-t border-gray-800 pt-3">
          <Button
            variant="danger"
            size="sm"
            loading={cancelling}
            onClick={() => onCancel(id)}
          >
            Cancel appointment
          </Button>
        </div>
      )}
    </article>
  );
}
