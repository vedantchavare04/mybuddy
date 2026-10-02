import { useState, useEffect, useRef } from "react";
import Character from "./components/character/character";
import Notch from "./components/notch/notch";
import type { CompanionEvent } from "./events/eventTypes";
import { eventManager } from "./events/eventManager";
import { eventQueue } from "./events/eventQueue";
import { eventLifecycle } from "./events/eventLifecycle";
import { startBatteryMonitor } from "./system/batteryMonitor";
import { positionMyBuddy } from "./system/windowPosition";
import { notificationService } from "./services/notifications/notificationStore";

function App() {
  const [activeEvent, setActiveEvent] = useState<CompanionEvent | null>(null);
  const [islandOpen, setIslandOpen] = useState(false);
  const activeEventRef = useRef<CompanionEvent | null>(null);
  const transitioningRef = useRef(false);

  useEffect(() => {
    if (activeEvent) notificationService.recordEvent(activeEvent);
  }, [activeEvent]);

  useEffect(() => {
    positionMyBuddy();
    return eventManager.subscribe(() => {
      if (activeEventRef.current !== null || transitioningRef.current) {
        return;
      }

      const nextEvent = eventQueue.getNext();

      if (nextEvent) {
        eventLifecycle.setActive(nextEvent);
        activeEventRef.current = nextEvent;
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
        eventLifecycle.setDismissed(activeEventRef.current);
        activeEventRef.current = null;
        setActiveEvent(null);
      }
    });
  }, []);

  const handleCharacterClick = () => {
    setIslandOpen((open) => !open);
  };

  const closeIsland = () => {
    setIslandOpen(false);
  };

  const dismissEvent = () => {
    const currentEvent = activeEventRef.current;

    transitioningRef.current = true;

    if (currentEvent) {
      eventLifecycle.setDismissed(currentEvent);
    }

    activeEventRef.current = null;
    setActiveEvent(null);

    window.setTimeout(() => {
      const nextEvent = eventQueue.getNext();

      if (nextEvent) {
        eventLifecycle.setActive(nextEvent);
        activeEventRef.current = nextEvent;
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
      <Character
        eventActive={activeEvent !== null}
        event={activeEvent}
        onClick={handleCharacterClick}
        islandOpen={islandOpen}
      />

      <Notch
        event={activeEvent}
        expanded={islandOpen}
        onExpand={() => setIslandOpen(true)}
        onCollapse={closeIsland}
        onAction={activeEvent ? handleDone : undefined}
        actionLabel={activeEvent ? "Done" : undefined}
      />
    </main>
  );
}

export default App;