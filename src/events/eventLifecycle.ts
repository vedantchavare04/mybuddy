import type { CompanionEvent } from "./eventTypes";

export type EventStatus = "queued" | "active" | "dismissed" | "expired";

class EventLifecycle {
  private states = new Map<string, EventStatus>();

  setQueued(event: CompanionEvent) {
    this.states.set(event.id, "queued");
  }

  setActive(event: CompanionEvent) {
    this.states.set(event.id, "active");
  }

  setDismissed(event: CompanionEvent) {
    this.states.set(event.id, "dismissed");
  }

  setExpired(event: CompanionEvent) {
    this.states.set(event.id, "expired");
  }

  getStatus(event: CompanionEvent): EventStatus | null {
    return this.states.get(event.id) ?? null;
  }
}

export const eventLifecycle = new EventLifecycle();
