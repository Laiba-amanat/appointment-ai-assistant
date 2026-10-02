import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export default function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4 py-16 text-center", className)}>
      {icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-800 text-gray-500">
          {icon}
        </div>
      )}
      <div>
        <p className="text-base font-medium text-gray-300">{title}</p>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
