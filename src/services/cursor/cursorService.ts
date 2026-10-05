import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  createCursorClickBus,
  createCursorMoveBus,
  type CursorClick,
  type CursorPosition,
} from "../../components/cursor/cursorEffect";

type CursorClickPayload = {
  id: string;
  x: number;
  y: number;
  button: "left" | "right" | "middle";
};

type CursorMovePayload = {
  x: number;
  y: number;
};

type CursorButtonPayload = {
  x: number;
  y: number;
  button: "left" | "right" | "middle";
  pressed: boolean;
};

type CursorKeyboardPayload = {
  pressed: boolean;
  vk_code: number;
};

const clickBus =
  createCursorClickBus();

const moveBus =
  createCursorMoveBus();

let unlistenClick: UnlistenFn | null = null;
let unlistenMove: UnlistenFn | null = null;
let unlistenButton: UnlistenFn | null = null;
let unlistenKeyboard: UnlistenFn | null = null;

let started = false;

export const cursorService = {
  clickBus,
  moveBus,

  async start() {
    if (started) {
      return;
    }

    started = true;

    const appWindow =
      getCurrentWindow();

    unlistenClick =
      await listen<CursorClickPayload>(
        "cursor://click",
        async (event) => {
          const payload =
            event.payload;

          try {
            const [
              position,
              scaleFactor,
            ] = await Promise.all([
              appWindow.outerPosition(),
              appWindow.scaleFactor(),
            ]);

            const x =
              (payload.x -
                position.x) /
              scaleFactor;

            const y =
              (payload.y -
                position.y) /
              scaleFactor;

            const click: CursorClick = {
              id: payload.id,
              x,
              y,
              button: payload.button,
            };

            clickBus.emit(click);
          } catch {
            return;
          }
        },
      );

    unlistenMove =
      await listen<CursorMovePayload>(
        "cursor://move",
        async (event) => {
          const payload =
            event.payload;

          try {
            const [
              position,
              scaleFactor,
            ] = await Promise.all([
              appWindow.outerPosition(),
              appWindow.scaleFactor(),
            ]);

            const x =
              (payload.x -
                position.x) /
              scaleFactor;

            const y =
              (payload.y -
                position.y) /
              scaleFactor;

            const cursorPosition:
              CursorPosition = {
              x,
              y,
            };

            moveBus.emit(
              cursorPosition,
            );

            window.dispatchEvent(
              new CustomEvent(
                "mybuddy-cursor-move",
                {
                  detail:
                    cursorPosition,
                },
              ),
            );
          } catch {
            return;
          }
        },
      );

    unlistenButton =
      await listen<CursorButtonPayload>(
        "cursor://button",
        async (event) => {
          const payload =
            event.payload;

          try {
            const [
              position,
              scaleFactor,
            ] = await Promise.all([
              appWindow.outerPosition(),
              appWindow.scaleFactor(),
            ]);

            const x =
              (payload.x -
                position.x) /
              scaleFactor;

            const y =
              (payload.y -
                position.y) /
              scaleFactor;

            window.dispatchEvent(
              new CustomEvent(
                "mybuddy-cursor-button",
                {
                  detail: {
                    x,
                    y,
                    button:
                      payload.button,
                    pressed:
                      payload.pressed,
                  },
                },
              ),
            );
          } catch {
            return;
          }
        },
      );

    unlistenKeyboard =
      await listen<CursorKeyboardPayload>(
        "cursor://keyboard",
        (event) => {
          window.dispatchEvent(
            new CustomEvent(
              "mybuddy-cursor-keyboard",
              {
                detail: event.payload,
              },
            ),
          );
        },
      );
  },

  stop() {
    if (unlistenClick) {
      unlistenClick();
      unlistenClick = null;
    }

    if (unlistenMove) {
      unlistenMove();
      unlistenMove = null;
    }

    if (unlistenButton) {
      unlistenButton();
      unlistenButton = null;
    }

    if (unlistenKeyboard) {
      unlistenKeyboard();
      unlistenKeyboard = null;
    }

    started = false;
  },
};