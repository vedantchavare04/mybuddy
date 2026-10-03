/*
 * src/components/character/spiderLayer.tsx
 *
 * Shows or hides the spider WITHOUT touching Character.tsx.
 *
 * OFF: the whole assembly (silk + spider) lifts up out of the screen and
 *      fades, then Character is unmounted. Unmounting is deliberate:
 *      its rAF physics loop and listeners are cleaned up, and its hit area
 *      is removed from the DOM, so nothing invisible can capture the mouse
 *      or block the desktop.
 * ON:  Character mounts fresh and the assembly descends back in. If an event
 *      is pending, Character's existing wake / stretch / drop sequence runs
 *      by itself because eventActive is already true when it mounts.
 *
 * initial={false}: at app launch the spider appears exactly as before, with
 * no extra entrance animation.
 */

import type { ComponentProps } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Character from "./character";

type Props = ComponentProps<typeof Character> & { enabled: boolean };

export default function SpiderLayer({ enabled, ...character }: Props) {
  return (
    <AnimatePresence initial={false}>
      {enabled && (
        <motion.div
          key="spider"
          className="pointer-events-none fixed inset-0 z-50"
          initial={{ opacity: 0, y: -96 }}
          animate={{
            opacity: 1,
            y: 0,
            transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
          }}
          exit={{
            opacity: 0,
            y: -96,
            transition: { duration: 0.38, ease: [0.4, 0, 1, 1] },
          }}
        >
          <Character {...character} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}