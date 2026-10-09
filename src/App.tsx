import { useState, useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import {
  cursorPosition,
  getCurrentWindow,
} from "@tauri-apps/api/window";
import SpiderLayer from "./components/character/spiderLayer";
import Dock from "./components/dock/dock";
import Notch from "./components/notch/notch";
import type { CompanionEvent } from "./events/eventTypes";
import { eventManager } from "./events/eventManager";
import { eventQueue } from "./events/eventQueue";
import { eventLifecycle } from "./events/eventLifecycle";
import { startBatteryMonitor } from "./system/batteryMonitor";
import { positionMyBuddy } from "./system/windowPosition";
import { notificationService } from "./services/notifications/notificationStore";
import {
  settingsService,
  useSettings,
} from "./services/settings/settingsStore";
import SpecialCursor from "./components/cursor/specialCursor";
import { cursorService } from "./services/cursor/cursorService";
import type { CursorPosition } from "./components/cursor/cursorEffect";

function App() {
  const [activeEvent, setActiveEvent] =
    useState<CompanionEvent | null>(null);

  const [islandOpen, setIslandOpen] = useState(false);

  const [cursor, setCursor] =
    useState<CursorPosition | null>(null);

  const activeEventRef =
    useRef<CompanionEvent | null>(null);

  const transitioningRef = useRef(false);

  const {
    spiderEnabled,
    specialCursorEnabled,
    notchEnabled,
  } = useSettings();

  useEffect(() => {
    if (!notchEnabled) {
      setIslandOpen(false);
    }
  }, [notchEnabled]);

  useEffect(() => {
    if (spiderEnabled) {
      return;
    }

    const appWindow = getCurrentWindow();

    let mounted = true;
    let updating = false;

    const updateNotchCapture = async () => {
      if (!mounted || updating || !notchEnabled) {
        return;
      }

      updating = true;

      try {
        const [cursor, position, scale] =
          await Promise.all([
            cursorPosition(),
            appWindow.outerPosition(),
            appWindow.scaleFactor(),
          ]);

        const localX =
          (cursor.x - position.x) / scale;

        const localY =
          (cursor.y - position.y) / scale;

        const notch =
          document.querySelector<HTMLElement>(
            '[data-mybuddy-notch="true"]',
          );

        const insideNotch =
          notch !== null &&
          localX >= notch.offsetLeft &&
          localX <=
            notch.offsetLeft +
              notch.offsetWidth &&
          localY >= notch.offsetTop &&
          localY <=
            notch.offsetTop +
              notch.offsetHeight;

        const shouldCapture =
          islandOpen || insideNotch;

        await appWindow.setIgnoreCursorEvents(
          !shouldCapture,
        );
      } catch {
        return;
      } finally {
        updating = false;
      }
    };

    const interval =
      globalThis.setInterval(
        updateNotchCapture,
        50,
      );

    updateNotchCapture();

    return () => {
      mounted = false;

      globalThis.clearInterval(interval);

      void appWindow.setIgnoreCursorEvents(
        true,
      );
    };
  }, [spiderEnabled, islandOpen, notchEnabled]);

  useEffect(() => {
    positionMyBuddy();

    return eventManager.subscribe(() => {
      if (
        activeEventRef.current !== null ||
        transitioningRef.current
      ) {
        return;
      }

      const nextEvent =
        eventQueue.getNext();

      if (nextEvent) {
        eventLifecycle.setActive(nextEvent);

        activeEventRef.current =
          nextEvent;

        setActiveEvent(nextEvent);
      }
    });
  }, []);

  useEffect(() => {
    return startBatteryMonitor((eventId) => {
      if (
        eventId !== null &&
        activeEventRef.current?.id === eventId
      ) {
        eventLifecycle.setDismissed(
          activeEventRef.current,
        );

        activeEventRef.current = null;

        setActiveEvent(null);
      }
    });
  }, []);

  useEffect(() => {
    if (activeEvent) {
      notificationService.recordEvent(
        activeEvent,
      );
    }
  }, [activeEvent]);

  useEffect(() => {
    void cursorService.start();

    return () => {
      cursorService.stop();
    };
  }, []);

  useEffect(() => {
    return cursorService.moveBus.subscribe(
      (position) => {
        setCursor(position);
      },
    );
  }, []);

  useEffect(() => {
    void invoke(
      "set_special_cursor_enabled",
      {
        enabled: specialCursorEnabled,
      },
    );
  }, [specialCursorEnabled]);

  const handleCharacterClick = () => {
    setIslandOpen((open) => !open);
  };

  const closeIsland = () => {
    setIslandOpen(false);
  };

  const dismissEvent = () => {
    const currentEvent =
      activeEventRef.current;

    transitioningRef.current = true;

    if (currentEvent) {
      eventLifecycle.setDismissed(
        currentEvent,
      );
    }

    activeEventRef.current = null;

    setActiveEvent(null);

    window.setTimeout(() => {
      const nextEvent =
        eventQueue.getNext();

      if (nextEvent) {
        eventLifecycle.setActive(
          nextEvent,
        );

        activeEventRef.current =
          nextEvent;

        setActiveEvent(nextEvent);
      }

      transitioningRef.current = false;
    }, 300);
  };

  const handleDone = () => {
    dismissEvent();
    closeIsland();
  };

  return (
    <main className="relative min-h-screen overflow-visible text-white">
      <SpiderLayer
        enabled={spiderEnabled && notchEnabled}
        eventActive={activeEvent !== null}
        event={activeEvent}
        onClick={handleCharacterClick}
        islandOpen={islandOpen}
      />

      <SpecialCursor
        bus={cursorService.clickBus}
        position={cursor}
        enabled={specialCursorEnabled}
      />

      <Notch
        visible={notchEnabled}
        event={activeEvent}
        expanded={islandOpen}
        onExpand={() => {
          if (!notchEnabled) {
            settingsService.set("notchEnabled", true);
          }

          setIslandOpen(true);
        }}
        onCollapse={closeIsland}
        onAction={activeEvent ? handleDone : undefined}
        actionLabel={activeEvent ? "Done" : undefined}
      />

      <AnimatePresence>
        {!notchEnabled && <Dock />}
      </AnimatePresence>
    </main>
  );
}

export default App;