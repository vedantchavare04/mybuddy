import { eventManager } from "../../events/eventManager";
import type { CompanionEvent } from "../../events/eventTypes";

export function publishEvent(event: CompanionEvent) {
  eventManager.emit(event);
}