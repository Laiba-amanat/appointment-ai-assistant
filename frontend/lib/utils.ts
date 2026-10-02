/** Merge Tailwind class names safely */
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Format ISO date string → "Dec 15, 2026" */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

/** Format ISO date string + HH:mm time → "Dec 15, 2026 at 10:00 AM" */
export function formatDateTime(date: string, time?: string): string {
  const d = new Date(date);
  const dateStr = d.toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
  if (!time) return dateStr;
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${dateStr} at ${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** Today's date as YYYY-MM-DD */
export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

/** localStorage helpers (safe for SSR) */
export const storage = {
  get: (key: string): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(key);
  },
  set: (key: string, value: string): void => {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, value);
  },
  remove: (key: string): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(key);
  },
};
