import type { CompanionEvent } from "./eventTypes";

class EventQueue {
  private events: CompanionEvent[] = [];

  add(event: CompanionEvent) {
    this.events.push(event);
  }

  remove(eventId: string) {
    this.events = this.events.filter((event) => event.id !== eventId);
  }

  getNext(): CompanionEvent | null {
    if (this.events.length === 0) {
      return null;
    }

    this.events.sort((a, b) => b.priority - a.priority);

    return this.events.shift() ?? null;
  }
}

export const eventQueue = new EventQueue();
