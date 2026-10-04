import { createStore, useStore } from "../createStore";
import { speechService } from "../speech/speechService";
import { subscribe } from "../tauri";

export const SHORTCUTS = {
  translate: "Ctrl+Alt+T",
  speak: "Ctrl+Alt+S",
  ai: "Ctrl+Shift+Space",
} as const;

export type Intent = "translate" | "speak" | "ai";

export type Pending = {
  intent: Intent;
  text: string;
  error?: string;
  nonce: number;
};

const store = createStore<{ pending: Pending | null }>({ pending: null });

const MESSAGES: Record<string, string> = {
  no_selection: "No text was selected. Select some text, then try again.",
  clipboard_busy: "Couldn't read the selection. The clipboard was busy.",
};

export const selectionMessage = (code?: string) =>
  (code && MESSAGES[code]) || "Couldn't read the selection.";

let started = false;

export const selectionService = {
  start() {
    if (started) return;
    started = true;
    void subscribe<{ intent: Intent; text: string; error?: string }>(
      "selection://captured",
      (p) => {
        store.set({ pending: { ...p, nonce: Date.now() } });
        if (p.intent === "speak" && p.text) speechService.speak(p.text);
      }
    );
  },

  consume() {
    store.set({ pending: null });
  },
};

export const useSelection = () => useStore(store);