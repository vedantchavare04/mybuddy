/*
 * src/services/tauri.ts
 *
 * The only file that touches @tauri-apps/api. Rust commands reject with a
 * short error code string (e.g. "offline", "revoked"); services translate
 * those into human messages. Raw errors never reach the UI.
 */

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export const inTauri = () =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export async function call<T>(
  command: string,
  args?: Record<string, unknown>
): Promise<T> {
  if (!inTauri()) throw "unavailable";
  try {
    return await invoke<T>(command, args);
  } catch (e) {
    const msg = typeof e === "string" ? e : "failed";
    // command not registered yet (partial integration) = unavailable
    throw /not found|not allowed/i.test(msg) ? "unavailable" : msg;
  }
}

export async function subscribe<T>(
  event: string,
  handler: (payload: T) => void
): Promise<() => void> {
  if (!inTauri()) return () => {};
  return listen<T>(event, (e) => handler(e.payload));
}