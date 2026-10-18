import type { CompanionEvent } from "../../events/eventTypes";
import { dayLabel, formatTime } from "../calendar/calendarService";
import { createStore, useStore } from "../createStore";
import { call, subscribe } from "../tauri";
import { publishEvent } from "./publish";

export type Reminder = {
  id: string;
  title: string;
  dueMs: number;
  status: "pending" | "fired" | "done";
  presented: boolean;
  createdMs: number;
};

const MAX_TITLE_LENGTH = 200;
const MAX_REMINDER_AHEAD_MS =
  365 * 24 * 60 * 60 * 1000;

const store = createStore<{
  items: Reminder[];
  available: boolean;
}>({
  items: [],
  available: true,
});

const published = new Map<string, number>();

const MESSAGES: Record<string, string> = {
  in_past: "That time has already passed.",
  too_far: "That reminder is too far in the future.",
  bad_title: "Enter what you want to be reminded about.",
  bad_args: "The reminder settings are invalid.",
  too_many_reminders:
    "You have reached the maximum number of reminders.",
  already_done: "That reminder is already completed.",
  not_found: "That reminder no longer exists.",
  unavailable:
    "Reminders work in the MyBuddy desktop app.",
  serialize_failed:
    "Couldn't save the reminder. Try again.",
  write_failed:
    "Couldn't save the reminder. Try again.",
  rename_failed:
    "Couldn't save the reminder. Try again.",
};

export const reminderError = (code: string) =>
  MESSAGES[code] ??
  "Couldn't save that reminder. Try again.";

export const reminderEvent = (
  reminder: Reminder,
): CompanionEvent => ({
  id: `reminder:${reminder.id}:${reminder.dueMs}`,
  type: "reminder",
  title: "Reminder",
  message: reminder.title,
  priority: 9,
});

export const reminderIdOf = (
  event: CompanionEvent,
): string | null => {
  if (event.type !== "reminder") {
    return null;
  }

  const prefix = "reminder:";

  if (!event.id.startsWith(prefix)) {
    return null;
  }

  const rest = event.id.slice(prefix.length);
  const separator = rest.lastIndexOf(":");

  if (separator === -1) {
    return null;
  }

  const id = rest.slice(0, separator);

  if (!/^[a-f0-9]{32}$/i.test(id)) {
    return null;
  }

  return id;
};

export function formatDue(ms: number): string {
  if (!Number.isFinite(ms)) {
    return "Invalid time";
  }

  const date = new Date(ms);

  if (Number.isNaN(date.getTime())) {
    return "Invalid time";
  }

  const day = dayLabel(date);

  return day === "Today"
    ? formatTime(date)
    : `${day} ${formatTime(date)}`;
}

function validateTitle(title: string): string {
  const cleanTitle = title.trim();

  if (!cleanTitle) {
    throw new Error("bad_title");
  }

  if (cleanTitle.length > MAX_TITLE_LENGTH) {
    throw new Error("bad_title");
  }

  return cleanTitle;
}

function validateDueTime(dueMs: number): void {
  if (!Number.isFinite(dueMs)) {
    throw new Error("bad_args");
  }

  const now = Date.now();

  if (dueMs < now - 1000) {
    throw new Error("in_past");
  }

  if (dueMs > now + MAX_REMINDER_AHEAD_MS) {
    throw new Error("too_far");
  }
}

function cleanupPublished() {
  const cutoff = Date.now() - 60 * 60 * 1000;

  for (const [key, timestamp] of published) {
    if (timestamp < cutoff) {
      published.delete(key);
    }
  }
}

function present(reminder: Reminder) {
  cleanupPublished();

  const key = `${reminder.id}:${reminder.dueMs}`;

  if (published.has(key)) {
    return;
  }

  published.set(key, Date.now());

  publishEvent(reminderEvent(reminder));

  void call("reminder_presented", {
    id: reminder.id,
  }).catch((error) => {
    console.error(
      "Failed to mark reminder as presented:",
      error,
    );
  });
}

let started = false;

export const reminderService = {
  start() {
    if (started) {
      return;
    }

    started = true;

    void subscribe<Reminder[]>(
      "reminders://changed",
      (items) => {
        if (!Array.isArray(items)) {
          return;
        }

        store.set({
          items,
          available: true,
        });
      },
    );

    void subscribe<Reminder>(
      "reminder://due",
      (reminder) => {
        if (!reminder || typeof reminder !== "object") {
          return;
        }

        present(reminder);
      },
    );

    void call<Reminder[]>("reminders_list")
      .then((items) => {
        if (!Array.isArray(items)) {
          throw new Error("invalid_response");
        }

        store.set({
          items,
          available: true,
        });

        items
          .filter(
            (reminder) =>
              reminder.status === "fired" &&
              !reminder.presented,
          )
          .forEach(present);
      })
      .catch((error) => {
        console.error(
          "Failed to load reminders:",
          error,
        );

        store.set({
          available: false,
        });
      });
  },

  create(title: string, dueMs: number) {
    try {
      const cleanTitle = validateTitle(title);

      validateDueTime(dueMs);

      return call<void>("reminder_create", {
        title: cleanTitle,
        dueMs,
      });
    } catch (error) {
      return Promise.reject(error);
    }
  },

  done(id: string) {
    if (!/^[a-f0-9]{32}$/i.test(id)) {
      return;
    }

    void call("reminder_done", {
      id,
    }).catch((error) => {
      console.error(
        "Failed to complete reminder:",
        error,
      );
    });
  },

  remove(id: string) {
    if (!/^[a-f0-9]{32}$/i.test(id)) {
      return;
    }

    void call("reminder_delete", {
      id,
    }).catch((error) => {
      console.error(
        "Failed to delete reminder:",
        error,
      );
    });
  },

  snooze(id: string, minutes: number) {
    if (!/^[a-f0-9]{32}$/i.test(id)) {
      return;
    }

    if (
      !Number.isInteger(minutes) ||
      minutes < 1 ||
      minutes > 10_080
    ) {
      return;
    }

    void call("reminder_snooze", {
      id,
      minutes,
    }).catch((error) => {
      console.error(
        "Failed to snooze reminder:",
        error,
      );
    });
  },
};

export const useReminders = () => useStore(store);