import { useState, useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import Character from "./components/character/character";
import Island from "./components/island/island";
import type { CompanionEvent } from "./events/eventTypes";
import { eventManager } from "./events/eventManager";
import { eventQueue } from "./events/eventQueue";
import { eventLifecycle } from "./events/eventLifecycle";
import { startBatteryMonitor } from "./system/batteryMonitor";

type BatteryStatus = {
  percentage: number;
  charging: boolean;
};


function App() {
  const [activeEvent, setActiveEvent] = useState<CompanionEvent | null>(null);
  const [islandOpen, setIslandOpen] = useState(false);
  const activeEventRef = useRef<CompanionEvent | null>(null);
  const transitioningRef = useRef(false);
  const batteryAlertSentRef = useRef(false);

  useEffect(() => {
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
    setIslandOpen(true);
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

  return (
    <main className="relative min-h-screen overflow-visible bg-zinc-950 text-white">
      <Character
        eventActive={activeEvent !== null}
        event={activeEvent}
        onClick={handleCharacterClick}
        islandOpen={islandOpen}
      />

      <AnimatePresence>
        {islandOpen && (
          <Island
            event={
              activeEvent ?? {
                id: "mybuddy-home",
                type: "notification",
                title: "Hey, I'm MyBuddy",
                message: "Everything is quiet. I'm here if you need me.",
                priority: 1,
              }
            }
            onClose={closeIsland}
            onAction={activeEvent ? dismissEvent : undefined}
            actionLabel={activeEvent ? "Done" : undefined}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

export default App;
