export type Route =
  | "event"
  | "home"
  | "music"
  | "calendar"
  | "calendar/new"
  | "reminders"
  | "reminders/new"
  | "notifications"
  | "tools"
  | "translate"
  | "speech"
  | "ai"
  | "settings"
  | "settings/ai";

export const PARENT: Record<Route, Route | null> = {
  event: null,
  home: null,
  music: "home",
  calendar: "home",
  "calendar/new": "calendar",
  reminders: "home",
  "reminders/new": "reminders",
  notifications: "home",
  tools: "home",
  translate: "tools",
  speech: "tools",
  ai: "tools",
  settings: "home",
  "settings/ai": "settings",
};