"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import ChatMessageComponent from "@/components/chat/ChatMessage";
import TypingIndicator from "@/components/chat/TypingIndicator";
import BookingConfirmation from "@/components/chat/BookingConfirmation";
import BookingForm from "@/components/appointments/BookingForm";
import EmptyState from "@/components/ui/EmptyState";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Button from "@/components/ui/Button";
import { chatApi, appointmentsApi } from "@/lib/api";
import { storage } from "@/lib/utils";
import type { ChatMessage, ChatSession, Appointment, FallbackFormData } from "@/types";

interface RenderItem {
  type: "message";
  message: ChatMessage;
}
interface BookingItem {
  type: "booking";
  appointment: Appointment;
}
type ListItem = RenderItem | BookingItem;

export default function ChatPage() {
  const router    = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  const [sessions,        setSessions]        = useState<ChatSession[]>([]);
  const [activeSession,   setActiveSession]   = useState<ChatSession | null>(null);
  const [items,           setItems]           = useState<ListItem[]>([]);
  const [input,           setInput]           = useState("");
  const [sending,         setSending]         = useState(false);
  const [typing,          setTyping]          = useState(false);
  const [loadingSession,  setLoadingSession]  = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [error,           setError]           = useState("");
  const [bookingLoading,  setBookingLoading]  = useState(false);
  const [showForm,        setShowForm]        = useState(false);
  const [formPrefill,     setFormPrefill]     = useState<FallbackFormData | null>(null);
  const [sidebarOpen,     setSidebarOpen]     = useState(false);

  const token = storage.get("token");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items, typing]);

  const loadSession = useCallback(async (session: ChatSession) => {
    if (!token) return;
    setActiveSession(session);
    setLoadingSession(true);
    setError("");
    setShowForm(false);
    setSidebarOpen(false);
    try {
      const res = await chatApi.getMessages(token, session.id);
      if (res.success && res.data) {
        setItems(res.data.messages.map(m => ({ type: "message" as const, message: m })));
      }
    } catch {
      setError("Failed to load messages.");
    } finally {
      setLoadingSession(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    (async () => {
      setLoadingSessions(true);
      try {
        const res = await chatApi.listSessions(token);
        if (res.success && res.data) {
          setSessions(res.data.sessions);
          if (res.data.sessions.length > 0) {
            await loadSession(res.data.sessions[0]);
          }
        }
      } catch { /* silent */ }
      finally { setLoadingSessions(false); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleNewSession() {
    if (!token) return;
    setError("");
    try {
      const res = await chatApi.createSession(token, "New conversation");
      if (res.success && res.data) {
        const s = res.data.session;
        setSessions(prev => [s, ...prev]);
        setActiveSession(s);
        setItems([]);
        setShowForm(false);
        setSidebarOpen(false);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } catch {
      setError("Could not start a new conversation.");
    }
  }

  async function handleSend() {
    if (!input.trim() || !activeSession || !token) return;
    const content = input.trim();
    const currentSessionTitle = activeSession.title; // capture before any state updates
    setInput("");
    setError("");
    setSending(true);
    setTyping(true);
    setShowForm(false);

    const optimistic: ChatMessage = {
      id: `opt-${Date.now()}`,
      sessionId: activeSession.id,
      role: "USER",
      content,
      createdAt: new Date().toISOString(),
    };
    setItems(prev => [...prev, { type: "message", message: optimistic }]);

    try {
      const res = await chatApi.sendMessage(token, activeSession.id, content);
      setTyping(false);
      if (!res.success || !res.data) {
        setError(res.message ?? "Failed to send.");
        setItems(prev => prev.filter(i => !(i.type === "message" && i.message.id === optimistic.id)));
        return;
      }

      const { userMessage, assistantMessage, booking, fallbackForm } = res.data;

      // Update session title if still default — use first message content as title
      if (currentSessionTitle === "New conversation") {
        const shortTitle = content.length > 45 ? content.slice(0, 45) + "…" : content;
        setSessions(prev => prev.map(s =>
          s.id === activeSession.id ? { ...s, title: shortTitle } : s
        ));
        setActiveSession(prev => prev ? { ...prev, title: shortTitle } : prev);
      }

      // Move active session to top of sidebar (most recent first)
      setSessions(prev => {
        const updated = prev.map(s =>
          s.id === activeSession.id
            ? { ...s, updatedAt: new Date().toISOString() }
            : s
        );
        return [...updated].sort((a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      });

      setItems(prev => {
        const filtered = prev.filter(i => !(i.type === "message" && i.message.id === optimistic.id));
        const next: ListItem[] = [
          ...filtered,
          { type: "message", message: userMessage },
          { type: "message", message: assistantMessage },
        ];
        if (booking.status === "booked" && booking.appointment) {
          next.push({ type: "booking", appointment: booking.appointment });
        }
        return next;
      });

      if (
        (booking.status === "incomplete" ||
         booking.status === "ai_unavailable" ||
         booking.status === "conflict") &&
        fallbackForm
      ) {
        setFormPrefill(fallbackForm);
        setShowForm(true);
      }

    } catch {
      setTyping(false);
      setError("Network error. Please try again.");
      setItems(prev => prev.filter(i => !(i.type === "message" && i.message.id === optimistic.id)));
    } finally {
      setSending(false);
    }
  }

  async function handleBookingFormSubmit(data: {
    appointment_date: string;
    appointment_time: string;
    reason: string;
  }) {
    if (!token) return;
    setBookingLoading(true);
    setError("");
    try {
      const res = await appointmentsApi.create(token, data);
      if (!res.success || !res.data) { setError(res.message ?? "Booking failed."); return; }
      setShowForm(false);
      setFormPrefill(null);
      setItems(prev => [...prev, { type: "booking", appointment: res.data!.appointment }]);
      const confirmMsg: ChatMessage = {
        id: `conf-${Date.now()}`,
        sessionId: activeSession?.id ?? "",
        role: "ASSISTANT",
        content: `✅ Your appointment has been booked for ${data.appointment_date} at ${data.appointment_time}!`,
        createdAt: new Date().toISOString(),
      };
      setItems(prev => [...prev, { type: "message", message: confirmMsg }]);
    } catch {
      setError("Booking failed. Please try again.");
    } finally {
      setBookingLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  const msgCount = items.filter(i => i.type === "message").length;

  return (
    <div className="flex h-screen flex-col bg-gray-950 overflow-hidden">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">

        {/* ── Mobile sidebar overlay ─────────────────── */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/60 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Sidebar ───────────────────────────────── */}
        <aside className={`
          fixed md:relative z-30 md:z-auto
          flex flex-col h-full md:h-auto
          w-72 md:w-64 shrink-0
          bg-gray-900 border-r border-gray-800
          transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}>
          {/* Sidebar header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <span className="text-sm font-semibold text-white">Conversations</span>
            <button
              onClick={handleNewSession}
              title="New conversation"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {/* Session list */}
          <div className="flex-1 overflow-y-auto py-2 px-2">
            {loadingSessions ? (
              <div className="flex items-center gap-2 px-3 py-2">
                <div className="h-1.5 w-1.5 rounded-full bg-gray-600 animate-pulse" />
                <span className="text-xs text-gray-600">Loading...</span>
              </div>
            ) : sessions.length === 0 ? (
              <div className="px-3 py-4 text-center">
                <p className="text-xs text-gray-600">No conversations yet</p>
                <button
                  onClick={handleNewSession}
                  className="mt-2 text-xs text-brand-400 hover:text-brand-300"
                >
                  Start one →
                </button>
              </div>
            ) : (
              sessions.map(s => {
                const isActive = activeSession?.id === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => loadSession(s)}
                    className={`
                      w-full text-left rounded-xl px-3 py-2.5 mb-0.5
                      transition-colors group
                      ${isActive
                        ? "bg-brand-600/20 text-white border border-brand-600/30"
                        : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"}
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <svg className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-brand-400" : "text-gray-600"}`}
                        fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span className="block truncate text-sm">{s.title}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* New conversation button at bottom */}
          <div className="border-t border-gray-800 p-3">
            <button
              onClick={handleNewSession}
              className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New conversation
            </button>
          </div>
        </aside>

        {/* ── Chat area ─────────────────────────────── */}
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">

          {/* Chat header (mobile: shows hamburger + session title) */}
          <div className="flex items-center gap-3 border-b border-gray-800 bg-gray-900/50 px-4 py-2.5 md:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-sm font-medium text-gray-300 truncate">
              {activeSession?.title ?? "AI Chat"}
            </span>
            <button
              onClick={handleNewSession}
              className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
              {loadingSession ? (
                <LoadingSpinner />
              ) : !activeSession ? (
                <EmptyState
                  title="No conversation selected"
                  description="Start a new conversation to book an appointment."
                  icon={
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                    </svg>
                  }
                  action={<Button onClick={handleNewSession}>Start conversation</Button>}
                />
              ) : msgCount === 0 && !typing ? (
                /* Welcome state */
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                  <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600/15 border border-brand-600/20">
                    <svg className="h-8 w-8 text-brand-400" fill="none" stroke="currentColor"
                      strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold text-white mb-1">How can I help you?</h2>
                  <p className="text-sm text-gray-500 max-w-sm mb-6">
                    Tell me when and why you need an appointment. I&apos;ll handle the booking for you.
                  </p>
                  <div className="flex flex-col gap-2 w-full max-w-sm">
                    {[
                      "Book a dental checkup next Monday at 10am",
                      "I need an eye exam this Friday at 2pm",
                      "Schedule a general checkup for tomorrow",
                    ].map(s => (
                      <button
                        key={s}
                        onClick={() => { setInput(s); inputRef.current?.focus(); }}
                        className="text-left rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-2.5 text-sm text-gray-400 hover:border-brand-600/50 hover:text-brand-300 hover:bg-brand-600/5 transition-all"
                      >
                        &ldquo;{s}&rdquo;
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {items.map((item, i) => {
                    if (item.type === "message") {
                      return <ChatMessageComponent key={item.message.id ?? i} message={item.message} />;
                    }
                    if (item.type === "booking") {
                      return <BookingConfirmation key={`booking-${i}`} appointment={item.appointment} />;
                    }
                    return null;
                  })}
                  {typing && <TypingIndicator />}
                  {showForm && (
                    <div className="mt-2">
                      <BookingForm
                        prefill={formPrefill}
                        onSubmit={handleBookingFormSubmit}
                        loading={bookingLoading}
                        onDismiss={() => setShowForm(false)}
                      />
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-auto w-full max-w-2xl px-4 pb-2 sm:px-6">
              <ErrorMessage message={error} />
            </div>
          )}

          {/* Input bar */}
          {activeSession && (
            <div className="border-t border-gray-800 bg-gray-900 px-4 py-3 sm:px-6">
              <div className="mx-auto flex max-w-2xl items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => {
                    setInput(e.target.value);
                    // auto-resize
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe your appointment…"
                  rows={1}
                  disabled={sending}
                  className="flex-1 resize-none overflow-hidden rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:opacity-50 transition-colors"
                  style={{ minHeight: "42px", maxHeight: "120px" }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Send message"
                >
                  {sending ? (
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="mx-auto mt-1.5 max-w-2xl text-center text-xs text-gray-600">
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
