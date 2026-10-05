import { createStore, useStore } from "../createStore";

export type Settings = {
  spiderEnabled: boolean;
  specialCursorEnabled: boolean;
};

const KEY = "mybuddy.settings.v1";

const DEFAULTS: Settings = {
  spiderEnabled: true,
  specialCursorEnabled: true,
};

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
        typeof stored.spiderEnabled ===
        "boolean"
          ? stored.spiderEnabled
          : DEFAULTS.spiderEnabled,

      specialCursorEnabled:
        typeof stored.specialCursorEnabled ===
        "boolean"
          ? stored.specialCursorEnabled
          : DEFAULTS.specialCursorEnabled,
    };
  } catch {
    return DEFAULTS;
  }
}

const store =
  createStore<Settings>(load());

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