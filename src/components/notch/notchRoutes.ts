export type Route =
  | "event"
  | "home"
  | "launcher"
  | "memory"
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
  | "clipboard"
  |"tasks"
  | "context"
  | "promises"
  | "flow-rescue"
  | "explain-later"
  | "settings/ai";

export const PARENT: Record<Route, Route | null> = {
  event: null,
  home: null,
  launcher: "home",
  memory: "launcher",
  clipboard: "home",
  music: "home",
  calendar: "home",
  context: "launcher",
  promises: "launcher",
  "flow-rescue": "launcher",
  "explain-later": "launcher",
  "calendar/new": "calendar",
  reminders: "home",
  "reminders/new": "reminders",
  notifications: "home",
  tools: "home",
  translate: "tools",
  speech: "tools",
  ai: "tools",
  settings: "home",
  tasks: "launcher",
  "settings/ai": "settings",
};
