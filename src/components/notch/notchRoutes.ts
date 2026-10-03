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