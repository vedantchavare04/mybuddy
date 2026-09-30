import { useState, useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import Character from "./components/character/character";
import Island from "./components/island/island";
import {
  lowBatteryEvent,
  downloadEvent,
  meetingEvent,
  musicEvent,
} from "./events/mockEvents";
import type { CompanionEvent } from "./events/eventTypes";
import { eventManager } from "./events/eventManager";
import { eventQueue } from "./events/eventQueue";
import { eventLifecycle } from "./events/eventLifecycle";

const triggerMultipleEvents = () => {
  eventManager.emit(lowBatteryEvent);
  eventManager.emit(downloadEvent);
  eventManager.emit(meetingEvent);
  eventManager.emit(musicEvent);
};

function App() {
  const [activeEvent, setActiveEvent] = useState<CompanionEvent | null>(null);
  const [islandOpen, setIslandOpen] = useState(false);
  const activeEventRef = useRef<CompanionEvent | null>(null);
  const transitioningRef = useRef(false);

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

      <button
        type="button"
        onClick={triggerMultipleEvents}
        className="fixed bottom-6 left-32 rounded-full bg-white px-4 py-2 text-sm font-medium text-black"
      >
        Test Queue
      </button>
    </main>
  );
}

export default App;
