import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import Character from "./components/character/character";
import Island from "./components/island/island";
import { lowBatteryEvent } from "./events/mockEvents";

function App() {
  const [eventActive, setEventActive] = useState(false);
  const [islandOpen, setIslandOpen] = useState(false);

  const triggerBatteryEvent = () => {
    setEventActive(true);
  };

  const handleCharacterClick = () => {
    setIslandOpen(true);
  };

  const closeIsland = () => {
    setIslandOpen(false);
  };

  const dismissEvent = () => {
    setEventActive(false);
  };

  return (
    <main className="relative min-h-screen overflow-visible bg-zinc-950 text-white">
      <Character
        eventActive={eventActive}
        event={eventActive ? lowBatteryEvent : null}
        onClick={handleCharacterClick}
        islandOpen={islandOpen}
      />

      <AnimatePresence>
        {islandOpen && (
          <Island
            event={
              eventActive
                ? lowBatteryEvent
                : {
                    id: "mybuddy-home",
                    type: "notification",
                    title: "Hey, I'm MyBuddy",
                    message:
                      "Everything is quiet. I'm here if you need me.",
                    priority: 1,
                  }
            }
            onClose={closeIsland}
            onAction={eventActive ? dismissEvent : undefined}
            actionLabel={eventActive ? "Done" : undefined}
          />
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={triggerBatteryEvent}
        className="fixed bottom-6 left-6 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200 active:scale-95"
      >
        Test Event
      </button>
    </main>
  );
}

export default App;