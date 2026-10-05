import {
  CURSOR_SIZE_PX,
  ART_VIEWBOX,
  FINGERTIP,
} from "./cursorTokens";

export type CursorClick = {
  id: string;
  x: number;
  y: number;
  button: "left" | "right" | "middle";
};

export type CursorPosition = {
  x: number;
  y: number;
};

export type CursorButton = CursorClick["button"];

export type CursorClickBus = {
  emit: (click: CursorClick) => void;
  subscribe: (
    listener: (click: CursorClick) => void,
  ) => () => void;
};

export type CursorMoveBus = {
  emit: (position: CursorPosition) => void;
  subscribe: (
    listener: (position: CursorPosition) => void,
  ) => () => void;
};

export function createCursorClickBus(): CursorClickBus {
  const listeners = new Set<
    (click: CursorClick) => void
  >();

  return {
    emit(click) {
      listeners.forEach((listener) =>
        listener(click),
      );
    },

    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function createCursorMoveBus(): CursorMoveBus {
  const listeners = new Set<
    (position: CursorPosition) => void
  >();

  return {
    emit(position) {
      listeners.forEach((listener) =>
        listener(position),
      );
    },

    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}

let counter = 0;

export function makeCursorClick(
  x: number,
  y: number,
  button: CursorButton = "left",
): CursorClick {
  counter += 1;

  return {
    id: `cursor-click-${Date.now()}-${counter}`,
    x,
    y,
    button,
  };
}

export const ART_SCALE =
  CURSOR_SIZE_PX / ART_VIEWBOX.w;

export const CURSOR_HEIGHT_PX =
  ART_VIEWBOX.h * ART_SCALE;

export const FINGERTIP_OFFSET_PX = {
  x:
    (FINGERTIP.x - ART_VIEWBOX.x) *
    ART_SCALE,

  y:
    (FINGERTIP.y - ART_VIEWBOX.y) *
    ART_SCALE,
} as const;

export function isValidClick(
  click: CursorClick,
): boolean {
  return (
    Number.isFinite(click.x) &&
    Number.isFinite(click.y)
  );
}

export function isValidCursorPosition(
  position: CursorPosition,
): boolean {
  return (
    Number.isFinite(position.x) &&
    Number.isFinite(position.y)
  );
}