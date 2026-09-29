import type { CompanionEvent } from "./eventTypes";
import { eventQueue } from "./eventQueue";

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
    eventQueue.add(event);
    
    this.listeners.forEach((listener) => {
      listener(event);
    });
  }
}

export const eventManager = new EventManager();
