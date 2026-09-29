import type { CompanionEvent } from "./eventTypes";

class CooldownManager {
  private lastShown = new Map<string, number>();

  private cooldowns: Record<string, number> = {
    battery: 5 * 60 * 1000,
    notification: 30 * 1000,
    download: 10 * 1000,
    music: 5 * 1000,
    meeting: 60 * 1000,
    focus: 30 * 1000,
  };

  shouldAllow(event: CompanionEvent): boolean {
    const now = Date.now();
    const lastTime = this.lastShown.get(event.type);
    const cooldown = this.cooldowns[event.type] ?? 30 * 1000;

    if (lastTime !== undefined && now - lastTime < cooldown) {
      return false;
    }

    this.lastShown.set(event.type, now);

    return true;
  }
}

export const cooldownManager = new CooldownManager();