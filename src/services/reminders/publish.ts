import { eventManager } from "../../events/eventManager";
import type { CompanionEvent } from "../../events/eventTypes";

export function publishEvent(
  event: CompanionEvent,
  bypassCooldown = false,
) {
  eventManager.emit(event, bypassCooldown);
}
