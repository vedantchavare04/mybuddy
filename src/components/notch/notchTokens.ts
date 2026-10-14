import type { ReactNode } from "react";

export type NotchMode = "compact" | "active" | "expanded";
export type NotchSize = { width: number; height: number };

export type NotchView = {
  key: string;
  size: NotchSize;
  radius: number;
  node: ReactNode;
};

const W = 468;

export const SIZES = {
  compact: { width: 168, height: 32 },
  compactHover: { width: 184, height: 34 },
  active: { width: 324, height: 44 },

  eventExpanded: { width: W, height: 176 },
  home: { width: W, height: 236 },
  promises: { width: W, height: 300 },
  flowRescue: { width: W, height: 312 },
  explainLater: { width: W, height: 292 },
  tools: { width: W, height: 216 },
  music: { width: W, height: 226 },
  calendar: { width: W, height: 292 },
  calendarCreate: { width: W, height: 336 },
  reminders: { width: W, height: 292 },
  remindersNew: { width: W, height: 244 },
  notifications: { width: W, height: 292 },
  translate: { width: W, height: 300 },
  speech: { width: W, height: 248 },
  ai: { width: W, height: 384 },
  settings: { width: W, height: 276 },
  aiSettings: { width: W, height: 352 },
} satisfies Record<string, NotchSize>;

export const RADIUS = { compact: 16, active: 22, expanded: 30 };

export const SURFACE = "#050506";
export const EAR = 12;

export const SPRING_OPEN = {
  type: "spring",
  stiffness: 430,
  damping: 33,
  mass: 0.85,
} as const;

export const SPRING_CLOSE = {
  type: "spring",
  stiffness: 480,
  damping: 42,
  mass: 0.8,
} as const;