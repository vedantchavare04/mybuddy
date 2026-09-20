import {useState} from "react";
import {AnimatePresence} from "framer-motion";
import Character from "./components/character/character";
import Island from "./components/island/island";
import { lowBatteryEvent } from "./events/mockEvents";

function App(){
  const [eventActive,setEventActive]=useState(false);
  const [islandOpen,setIslandOpen]=useState(false);


  const triggerBatteryEvent=()=>{
    setEventActive(true);
  };

  const handleCharacterClick = () => {
    if (eventActive) {
      setIslandOpen(true);
    }
  };

  const closeIsland = () => {
    setIslandOpen(false);
    setEventActive(false);
  };

  return(
    <main className="relative min-h-screen overflow-visible bg-zinc-950 text-white">
      <Character
        eventActive={eventActive}
        event={eventActive ? lowBatteryEvent : null}
        onClick={handleCharacterClick}
      />

      <AnimatePresence>
        {islandOpen && (
          <Island
            event={lowBatteryEvent}
            onClose={closeIsland}
          />
        )}
      </AnimatePresence>

      <button
        onClick={triggerBatteryEvent}
        className="fixed bottom-6 left-6 rounded-full bg-white px-4 py-2 text-sm text-black"
      >
        Test Event
      </button>
    </main>
  )
};

export default App;