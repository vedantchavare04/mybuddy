import type { CompanionEvent } from "./eventTypes";

export const lowBatteryEvent: CompanionEvent = {
  id: "battery-1",
  type: "battery",
  title: "Battery is getting low",
  message: "You're at 18%. Maybe plug in your charger.",
  priority: 8,
};