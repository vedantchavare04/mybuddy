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