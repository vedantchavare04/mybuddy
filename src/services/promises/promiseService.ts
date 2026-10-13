import type { CompanionEvent } from "../../events/eventTypes";
import { publishEvent } from "../reminders/publish";
import { call, subscribe } from "../tauri";

type PromiseDue = {
  id: string;
  title: string;
  person: string;
  dueMs: number | null;
  completed: boolean;
  notifiedAt: number | null;
};

const published = new Set<string>();
let started = false;

function present(promise: PromiseDue) {
  if (promise.completed || promise.notifiedAt !== null || promise.dueMs === null) {
    return;
  }

  const key = `${promise.id}:${promise.dueMs}`;
  if (published.has(key)) return;
  published.add(key);

  const event: CompanionEvent = {
    id: `promise:${key}`,
    type: "promise",
    title: "Promise due",
    message: promise.person
      ? `${promise.title} · ${promise.person}`
      : promise.title,
    priority: 9,
  };

  publishEvent(event, true);
  void call("promise_presented", { id: promise.id }).catch((error) => {
    console.error("Failed to mark promise notification as presented:", error);
  });
}

export const promiseService = {
  start() {
    if (started) return;
    started = true;

    void subscribe<PromiseDue>("promise-keeper://due", present).catch((error) => {
      console.error("Could not listen for due promises:", error);
    });

    void call<PromiseDue[]>("promises_list")
      .then((items) => {
        if (!Array.isArray(items)) return;
        const now = Date.now();
        items
          .filter(
            (promise) =>
              !promise.completed &&
              promise.notifiedAt === null &&
              promise.dueMs !== null &&
              promise.dueMs <= now,
          )
          .forEach(present);
      })
      .catch((error) => {
        console.error("Could not load due promises:", error);
      });
  },
};
