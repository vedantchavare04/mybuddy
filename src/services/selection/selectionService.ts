/*
 * src/services/selection/selectionService.ts
 *
 * MyBuddy cannot read arbitrary text from other apps on its own. The
 * reliable Windows approach is user-triggered: select text, press a global
 * shortcut, Rust copies the selection (preserving the clipboard) and emits
 * it here. Translate and Speak then pick it up.
 */

import { createStore, useStore } from "../createStore";
import { speechService } from "../speech/speechService";
import { subscribe } from "../tauri";

export const SHORTCUTS = {
  translate: "Ctrl+Alt+T",
  speak: "Ctrl+Alt+S",
} as const;

export type Pending = {
  intent: "translate" | "speak";
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
    void subscribe<{ intent: "translate" | "speak"; text: string; error?: string }>(
      "selection://captured",
      (p) => {
        store.set({ pending: { ...p, nonce: Date.now() } });
        // speaking needs no UI: start right away, the view just shows status
        if (p.intent === "speak" && p.text) speechService.speak(p.text);
      }
    );
  },

  consume() {
    store.set({ pending: null });
  },
};

export const useSelection = () => useStore(store);