import type { CompanionEvent } from "./eventTypes";

class CooldownManager {
  private lastShown = new Map<string, number>();

  private cooldowns: Record<string, number> = {
    battery: 3 * 1000,
    notification: 3 * 1000,
    download: 3 * 1000,
    music: 3 * 1000,
    meeting: 3 * 1000,
    focus: 3 * 1000,
  };

  shouldAllow(event: CompanionEvent, bypassCooldown = false): boolean {
    if (bypassCooldown) {
      this.lastShown.set(event.type, Date.now());
      return true;
    }

    const now = Date.now();
    const lastTime = this.lastShown.get(event.type);
    const cooldown = this.cooldowns[event.type] ?? 3 * 1000;

    if (lastTime !== undefined && now - lastTime < cooldown) {
      return false;
    }

    this.lastShown.set(event.type, now);

    return true;
  }
}

export const cooldownManager = new CooldownManager();
