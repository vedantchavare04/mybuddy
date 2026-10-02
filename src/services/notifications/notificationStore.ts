/*
 * src/services/notifications/notificationStore.ts
 *
 * NotificationService. Two sources feed one chronological list:
 *   1. MyBuddy's own events (battery, etc.). Always works.
 *   2. Windows app notifications, via Rust UserNotificationListener.
 *      Windows only grants this to packaged apps (MSIX). In the current
 *      unpackaged build the access state is "unsupported" and we say so
 *      honestly. Nothing is faked.
 */

import type { CompanionEvent } from "../../events/eventTypes";
import { createStore, useStore } from "../createStore";
import { call } from "../tauri";

export type AppNotification = {
  id: string;
  source: string;
  title: string;
  message: string;
  at: number;
  read: boolean;
  kind: "event" | "windows";
};

export type Access =
  | "unknown"
  | "unsupported"
  | "allowed"
  | "denied"
  | "unspecified";

type State = { items: AppNotification[]; access: Access };

const KEY = "mybuddy.notifications.v1";
const MAX = 60;

function load(): AppNotification[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AppNotification[]) : [];
  } catch {
    return [];
  }
}

const store = createStore<State>({ items: [], access: "unknown" });

function commit(items: AppNotification[]) {
  const trimmed = items.sort((a, b) => b.at - a.at).slice(0, MAX);
  store.set({ items: trimmed });
  try {
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    /* storage unavailable: keep in memory */
  }
}

const EVENT_LABELS: Record<string, string> = {
  battery: "Battery",
  notification: "Notification",
  download: "Download",
  music: "Now playing",
  meeting: "Calendar",
  focus: "Focus",
};

type WinNotification = {
  id: number;
  app: string;
  title: string;
  body: string;
  createdMs: number;
};

let started = false;
let pollTimer: number | undefined;

async function poll() {
  try {
    const list = await call<WinNotification[]>("notif_poll");
    const items = store.get().items;
    const known = new Set(items.map((i) => i.id));
    const fresh = list
      .map<AppNotification>((n) => ({
        id: `win:${n.id}:${n.createdMs}`,
        source: n.app || "Windows",
        title: n.title || n.app || "Notification",
        message: n.body,
        at: n.createdMs,
        read: false,
        kind: "windows",
      }))
      .filter((n) => !known.has(n.id));
    if (fresh.length) commit([...fresh, ...items]);
  } catch {
    /* transient: try again next tick */
  }
}

function startPolling() {
  if (pollTimer !== undefined) return;
  void poll();
  pollTimer = window.setInterval(() => void poll(), 5000);
}

function stopPolling() {
  if (pollTimer !== undefined) window.clearInterval(pollTimer);
  pollTimer = undefined;
}

function applyAccess(access: Access) {
  store.set({ access });
  if (access === "allowed") startPolling();
  else stopPolling();
}

export const notificationService = {
  start() {
    if (started) return;
    started = true;
    store.set({ items: load() });
    call<Access>("notif_status")
      .then(applyAccess)
      .catch(() => applyAccess("unsupported"));
  },

  recordEvent(event: CompanionEvent) {
    const items = store.get().items;
    const latest = items[0];
    // ignore double-fires of the same event
    if (latest && latest.id === `event:${event.id}` && Date.now() - latest.at < 30_000) {
      return;
    }
    commit([
      {
        id: `event:${event.id}`,
        source: EVENT_LABELS[event.type] ?? "MyBuddy",
        title: event.title,
        message: event.message,
        at: Date.now(),
        read: false,
        kind: "event",
      },
      ...items,
    ]);
  },

  markAllRead() {
    const items = store.get().items;
    if (items.some((i) => !i.read)) {
      commit(items.map((i) => ({ ...i, read: true })));
    }
  },

  clear() {
    commit([]);
  },

  async requestAccess() {
    try {
      applyAccess(await call<Access>("notif_request"));
    } catch {
      applyAccess("unsupported");
    }
  },
};

export const useNotifications = () => useStore(store);