import type { CompanionEvent } from "./eventTypes";
import { eventQueue } from "./eventQueue";
import { cooldownManager } from "./cooldownManager";

type EventListener = (event: CompanionEvent) => void;

class EventManager {
  private listeners = new Set<EventListener>();

  subscribe(listener: EventListener) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(event: CompanionEvent) {
    if (!cooldownManager.shouldAllow(event)) {
      return;
    }

    eventQueue.add(event);

    this.listeners.forEach((listener) => {
      listener(event);
    });
  }
}

export const eventManager = new EventManager();
