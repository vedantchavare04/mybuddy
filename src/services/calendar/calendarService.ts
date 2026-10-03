/*
 * src/services/calendar/calendarService.ts
 *
 * CalendarService over Google Calendar (all network + tokens live in Rust).
 * Status is never optimistic: "connected" only after Rust confirms a stored
 * refresh token, which exists only after a real OAuth success.
 */

import { createStore, useStore } from "../createStore";
import { call } from "../tauri";

export type CalEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string | null;
};

export type CalendarStatus =
  | "loading"
  | "unavailable"
  | "not_configured"
  | "disconnected"
  | "connecting"
  | "connected";

type State = {
  status: CalendarStatus;
  events: CalEvent[] | null;
  refreshing: boolean;
  error: string | null;
  created: { title: string; when: string } | null;
};

type GStatus = { configured: boolean; connected: boolean };

const store = createStore<State>({
  status: "loading",
  events: null,
  refreshing: false,
  error: null,
  created: null,
});

const MESSAGES: Record<string, string> = {
  offline: "You're offline. Check your connection and try again.",
  cancelled: "Sign-in was cancelled.",
  timeout: "Sign-in timed out. Try again.",
  auth_failed: "Google sign-in didn't complete. Try again.",
  scope_denied: "Calendar permission wasn't granted.",
  revoked: "Access was revoked. Connect again to continue.",
  not_connected: "Connect Google Calendar to continue.",
  expired: "Your session expired. Try again.",
  api_error: "Google Calendar isn't responding. Try again shortly.",
  not_configured: "Google Calendar isn't set up yet.",
  unavailable: "Calendar works in the MyBuddy desktop app.",
};

export const calendarError = (code: string) =>
  MESSAGES[code] ?? "Something went wrong. Try again.";


const timeFmt = new Intl.DateTimeFormat([], { hour: "numeric", minute: "2-digit" });
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const pad = (n: number) => String(n).padStart(2, "0");

export const eventStart = (e: CalEvent) =>
  e.allDay ? new Date(`${e.start}T00:00:00`) : new Date(e.start);

export const formatTime = (d: Date) => timeFmt.format(d);

export function dayLabel(d: Date, now = new Date()): string {
  const diff = Math.round((startOfDay(d) - startOfDay(now)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
}

export const todayInput = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const nextHalfHourInput = () => {
  const d = new Date(Date.now() + 30 * 60_000);
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const localIso = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;


export type NewEventInput = {
  title: string;
  date: string;
  time: string;
  durationMin: number;
  location: string;
  description: string;
  attendees: string[];
};

let started = false;

export const calendarService = {
  start() {
    if (started) return;
    started = true;
    call<GStatus>("google_status")
      .then((s) =>
        store.set({
          status: !s.configured
            ? "not_configured"
            : s.connected
              ? "connected"
              : "disconnected",
        })
      )
      .catch(() => store.set({ status: "unavailable" }));
  },

  async connect() {
    store.set({ status: "connecting", error: null });
    try {
      const s = await call<GStatus>("google_connect");
      store.set({ status: s.connected ? "connected" : "disconnected" });
    } catch (e) {
      store.set({ status: "disconnected", error: calendarError(String(e)) });
    }
  },

  cancelConnect() {
    void call("google_cancel").catch(() => {});
  },

  async disconnect() {
    try {
      await call<GStatus>("google_disconnect");
    } catch {
    }
    store.set({ status: "disconnected", events: null, error: null, created: null });
  },

  async refresh() {
    if (store.get().status !== "connected") return;
    store.set({ refreshing: true, error: null });
    try {
      const events = await call<CalEvent[]>("calendar_upcoming", { days: 7 });
      store.set({ events, refreshing: false });
    } catch (e) {
      const code = String(e);
      const lost = code === "revoked" || code === "not_connected";
      store.set({
        refreshing: false,
        error: calendarError(code),
        ...(lost ? { status: "disconnected" as const, events: null } : {}),
      });
    }
  },

  /** resolves on success, rejects with an error code */
  async create(input: NewEventInput) {
    const start = new Date(`${input.date}T${input.time}`);
    const end = new Date(start.getTime() + input.durationMin * 60_000);

    await call("calendar_create", {
      event: {
        title: input.title,
        start: localIso(start),
        end: localIso(end),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        location: input.location || null,
        description: input.description || null,
        attendees: input.attendees,
      },
    });

    store.set({
      created: {
        title: input.title,
        when: `${dayLabel(start)} · ${formatTime(start)}`,
      },
    });
    void calendarService.refresh();
  },

  clearCreated() {
    store.set({ created: null });
  },
};

export const useCalendar = () => useStore(store);