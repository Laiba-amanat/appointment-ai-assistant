import type { Appointment } from "@/types";
import { formatDateTime } from "@/lib/utils";

interface BookingConfirmationProps {
  appointment: Appointment;
}

export default function BookingConfirmation({ appointment }: BookingConfirmationProps) {
  return (
    <div className="my-2 flex justify-start">
      <div className="max-w-sm rounded-2xl rounded-tl-sm border border-green-800 bg-green-950/50 p-4">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
            <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor"
              strokeWidth={3} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-green-300">Appointment Booked</p>
        </div>
        <div className="flex flex-col gap-1 text-xs text-green-200/80">
          <p><span className="font-medium text-green-300">Date & Time:</span>{" "}
            {formatDateTime(appointment.appointmentDate, appointment.appointmentTime)}
          </p>
          <p><span className="font-medium text-green-300">Reason:</span>{" "}
            {appointment.reason}
          </p>
          <p><span className="font-medium text-green-300">Status:</span>{" "}
            {appointment.status}
          </p>
        </div>
      </div>
    </div>
  );
}
