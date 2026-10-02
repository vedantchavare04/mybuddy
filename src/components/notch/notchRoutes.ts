/*
 * src/components/notch/notchRoutes.ts
 * Every screen that can live inside the expanded notch.
 */

export type Route =
  | "event"
  | "home"
  | "music"
  | "calendar"
  | "calendar/new"
  | "notifications"
  | "tools"
  | "translate"
  | "speech";

/** where "Back" goes from each route */
export const PARENT: Record<Route, Route | null> = {
  event: null,
  home: null,
  music: "home",
  calendar: "home",
  "calendar/new": "calendar",
  notifications: "home",
  tools: "home",
  translate: "tools",
  speech: "tools",
};