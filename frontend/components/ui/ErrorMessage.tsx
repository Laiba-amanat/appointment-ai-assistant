import { cn } from "@/lib/utils";

interface ErrorMessageProps {
  message: string | null | undefined;
  className?: string;
}

export default function ErrorMessage({ message, className }: ErrorMessageProps) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-xl border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300",
        className
      )}
    >
      <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd" />
      </svg>
      <span>{message}</span>
    </div>
  );
}
