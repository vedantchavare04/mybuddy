import type { CompanionEvent } from "./eventTypes";
import { eventQueue } from "./eventQueue";
import { cooldownManager } from "./cooldownManager";
import { eventLifecycle } from "./eventLifecycle";

type EventListener = (event: CompanionEvent) => void;

class EventManager {
  private listeners = new Set<EventListener>();

  subscribe(listener: EventListener) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(event: CompanionEvent, bypassCooldown = false) {
    if (!cooldownManager.shouldAllow(event, bypassCooldown)) {
      return;
    }

    eventLifecycle.setQueued(event);
    eventQueue.add(event);

    this.listeners.forEach((listener) => {
      listener(event);
    });
  }

  cancel(eventId: string) {
    eventQueue.remove(eventId);
  }
}

export const eventManager = new EventManager();
