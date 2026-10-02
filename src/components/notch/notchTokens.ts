/*
 * src/components/Notch/notchTokens.ts
 *
 * Every number that affects how the notch feels lives here.
 * Nothing else in the Notch folder hard-codes a size, radius or spring.
 */

import type { ReactNode } from "react";

export type NotchMode = "compact" | "active" | "expanded";

export type NotchSize = { width: number; height: number };

/**
 * One resolved face of the notch. Music, Calendar, Translate etc. will each
 * return one of these — the shell never needs to change to host them.
 */
export type NotchView = {
  key: string;
  size: NotchSize;
  /** bottom corner radius; the top is always flat against the screen edge */
  radius: number;
  node: ReactNode;
};

export const SIZES = {
  compact: { width: 168, height: 32 },
  compactHover: { width: 184, height: 34 },
  active: { width: 324, height: 44 },
  idleExpanded: { width: 468, height: 124 },
  eventExpanded: { width: 468, height: 176 },
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