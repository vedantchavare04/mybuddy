import { invoke } from "@tauri-apps/api/core";
import type { CompanionEvent } from "../events/eventTypes";
import { eventManager } from "../events/eventManager";

type BatteryStatus = {
  percentage: number;
  charging: boolean;
};

let batteryAlertSent = false;
let batteryEventId: string | null = null;

export async function checkBattery(
  onCharging: (eventId: string | null) => void,
  bypassCooldown = false,
) {
  try {
    const battery = await invoke<BatteryStatus>("get_battery_status");

    if (battery.charging) {
      if (batteryEventId !== null) {
        eventManager.cancel(batteryEventId);
        onCharging(batteryEventId);
      }

      batteryAlertSent = false;
      batteryEventId = null;

      return;
    }

    if (battery.percentage <= 100 && !batteryAlertSent) {
      const event: CompanionEvent = {
        id: `battery-${Date.now()}`,
        type: "notification",
        title: "Battery getting low",
        message: `Your battery is at ${battery.percentage}%. Consider plugging in your charger.`,
        priority: 10,
      };

      batteryEventId = event.id;
      batteryAlertSent = true;

      eventManager.emit(event, bypassCooldown);
    }
  } catch (error) {
    console.error("Failed to read battery status:", error);
  }
}

export function startBatteryMonitor(
  onCharging: (eventId: string | null) => void,
) {
  checkBattery(onCharging);

  const interval = window.setInterval(() => {
    checkBattery(onCharging);
  }, 3000);

  return () => {
    window.clearInterval(interval);
  };
}