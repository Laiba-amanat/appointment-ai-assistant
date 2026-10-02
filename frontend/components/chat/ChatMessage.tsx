import type { ChatMessage as ChatMessageType } from "@/types";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "USER";

  return (
    <div className={cn("flex gap-2.5 items-end", isUser ? "justify-end" : "justify-start")}>
      {/* Assistant avatar */}
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 mb-0.5">
          <svg className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor"
            strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
      )}

      <div className={cn(
        "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm",
        isUser
          ? "bg-brand-600 text-white rounded-br-sm"
          : "bg-gray-800 text-gray-100 rounded-bl-sm border border-gray-700/50"
      )}>
        {message.content}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-700 mb-0.5">
          <svg className="h-3.5 w-3.5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 10a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 1114 0H3z" />
          </svg>
        </div>
      )}
    </div>
  );
}
