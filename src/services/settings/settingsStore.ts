import { createStore, useStore } from "../createStore";

export type Settings = {
  spiderEnabled: boolean;
  specialCursorEnabled: boolean;
  notchEnabled: boolean;
  dockX: number;
  notchWallpaper: string | null;
  notchWallpaperLuminance: number;
  notchText: string;
  notchTextPosition: { x: number; y: number };
  spiderMood: "chill" | "curious" | "sleepy" | "still";
  spiderColor: "lilac" | "ocean" | "mint" | "coral";
  notchWallpaperZoom: number;
  notchShowClock: boolean;
  notchSpiderEnabled: boolean;
};

const KEY = "mybuddy.settings.v1";

const DEFAULTS: Settings = {
  notchEnabled: true,
  dockX: 0.5,
  spiderEnabled: true,
  specialCursorEnabled: true,
  notchWallpaper: null,
  notchWallpaperLuminance: 0.2,
  notchText: "",
  notchTextPosition: { x: 0.5, y: 0.5 },
  spiderMood: "chill",
  spiderColor: "lilac",
  notchWallpaperZoom: 1,
  notchShowClock: false,
  notchSpiderEnabled: true,
};

const MAX_WALLPAPER_LENGTH = 2_400_000;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);

    if (!raw) {
      return DEFAULTS;
    }

    const stored =
      JSON.parse(raw) as Partial<Settings>;

    return {
      spiderEnabled:
        typeof stored.spiderEnabled === "boolean"
          ? stored.spiderEnabled
          : DEFAULTS.spiderEnabled,

      specialCursorEnabled:
        typeof stored.specialCursorEnabled === "boolean"
          ? stored.specialCursorEnabled
          : DEFAULTS.specialCursorEnabled,

          notchEnabled:
          typeof stored.notchEnabled === "boolean"
            ? stored.notchEnabled
            : DEFAULTS.notchEnabled,
        
        dockX:
          typeof stored.dockX === "number" &&
          stored.dockX >= 0 &&
          stored.dockX <= 1
            ? stored.dockX
            : DEFAULTS.dockX,
      notchWallpaper:
        typeof stored.notchWallpaper === "string" &&
        stored.notchWallpaper.startsWith("data:image/webp;base64,") &&
        stored.notchWallpaper.length <= MAX_WALLPAPER_LENGTH
          ? stored.notchWallpaper
          : DEFAULTS.notchWallpaper,
      notchWallpaperLuminance:
        typeof stored.notchWallpaperLuminance === "number" &&
        Number.isFinite(stored.notchWallpaperLuminance)
          ? clamp(stored.notchWallpaperLuminance, 0, 1)
          : DEFAULTS.notchWallpaperLuminance,
      notchText: typeof stored.notchText === "string"
        ? stored.notchText.slice(0, 48)
        : DEFAULTS.notchText,
      notchTextPosition:
        stored.notchTextPosition &&
        typeof stored.notchTextPosition.x === "number" &&
        typeof stored.notchTextPosition.y === "number"
          ? {
              x: clamp(stored.notchTextPosition.x, 0.08, 0.92),
              y: clamp(stored.notchTextPosition.y, 0.2, 0.8),
            }
          : DEFAULTS.notchTextPosition,
      spiderMood:
        stored.spiderMood === "chill" || stored.spiderMood === "curious" ||
        stored.spiderMood === "sleepy" || stored.spiderMood === "still"
          ? stored.spiderMood
          : DEFAULTS.spiderMood,
      spiderColor:
        stored.spiderColor === "lilac" || stored.spiderColor === "ocean" ||
        stored.spiderColor === "mint" || stored.spiderColor === "coral"
          ? stored.spiderColor
          : DEFAULTS.spiderColor,
      notchWallpaperZoom:
        typeof stored.notchWallpaperZoom === "number" &&
        Number.isFinite(stored.notchWallpaperZoom)
          ? clamp(stored.notchWallpaperZoom, 0.6, 2.5)
          : DEFAULTS.notchWallpaperZoom,
      notchShowClock: typeof stored.notchShowClock === "boolean"
        ? stored.notchShowClock
        : DEFAULTS.notchShowClock,
      notchSpiderEnabled: typeof stored.notchSpiderEnabled === "boolean"
        ? stored.notchSpiderEnabled
        : DEFAULTS.notchSpiderEnabled,
    };
  } catch {
    return DEFAULTS;
  }
}

const store = createStore<Settings>(load());

export const settingsService = {
  set<K extends keyof Settings>(
    key: K,
    value: Settings[K],
  ) {
    store.set({
      [key]: value,
    } as Partial<Settings>);

    try {
      localStorage.setItem(
        KEY,
        JSON.stringify(store.get()),
      );
    } catch {
      // storage unavailable: the setting still applies for this session
    }
  },
};

export const useSettings = () =>
  useStore(store);
