import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  BatteryLow,
  Bell,
  Download,
  Music,
  Calendar,
  Timer,
  type LucideIcon,
} from "lucide-react";
import type { CompanionEvent } from "../../events/eventTypes";

type IslandProps = {
  event: CompanionEvent;
  onClose: () => void;
  onAction?: () => void;
  actionLabel?: string;
};

const LOOK: Record<string, { icon: LucideIcon; tint: string }> = {
  battery: { icon: BatteryLow, tint: "#FFB454" },
  notification: { icon: Bell, tint: "#8FA8FF" },
  download: { icon: Download, tint: "#6FE3B0" },
  music: { icon: Music, tint: "#FF8FC4" },
  meeting: { icon: Calendar, tint: "#C9A2FF" },
  focus: { icon: Timer, tint: "#7FDCFF" },
};

const SURFACE = {
  type: "spring" as const,
  stiffness: 340,
  damping: 34,
  mass: 0.9,
};

export default function Island({
  event,
  onClose,
  onAction,
  actionLabel,
}: IslandProps) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  const look = LOOK[event.type] ?? { icon: Bell, tint: "#B9A8FF" };
  const Icon = look.icon;

  return (
    <div className="fixed inset-0 z-40">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
        onClick={onClose}
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
      />
      <motion.div
        role="dialog"
        aria-label={event.title}
        initial={{ y: -28, scaleY: 0.82, scaleX: 0.9, opacity: 0 }}
        animate={{ y: 0, scaleY: 1, scaleX: 1, opacity: 1 }}
        exit={{
          y: -22,
          scaleY: 0.86,
          scaleX: 0.92,
          opacity: 0,
          transition: { duration: 0.22, ease: [0.4, 0, 1, 1] },
        }}
        transition={SURFACE}
        style={{ transformOrigin: "50% 0%" }}
        className="
          absolute
          left-1/2
          top-3
          w-[456px]
          -translate-x-1/2
          overflow-hidden
          rounded-[30px]
          bg-[#08080B]
          shadow-[0_2px_4px_rgba(0,0,0,0.4),0_18px_40px_-8px_rgba(0,0,0,0.6),0_48px_90px_-24px_rgba(0,0,0,0.85)]
          ring-1
          ring-white/[0.07]
        "
      >
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

        <motion.div
          initial={{ opacity: 0, filter: "blur(7px)", y: 6 }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{ delay: 0.09, duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
          className="px-6 pb-6 pt-[22px]"
        >
          <div className="flex items-start gap-4">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-white/[0.06] ring-1 ring-inset ring-white/[0.08]"
              aria-hidden="true"
            >
              <Icon size={19} strokeWidth={1.9} color={look.tint} />
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-[19px] font-semibold leading-[1.25] tracking-[-0.021em] text-white">
                {event.title}
              </h1>
              <p className="mt-1.5 max-w-[42ch] text-[14px] leading-[1.5] tracking-[-0.005em] text-white/50">
                {event.message}
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2.5">
            {onAction && actionLabel && (
              <button
                onClick={onAction}
                className="
                  rounded-full bg-white px-[18px] py-[9px]
                  text-[13.5px] font-medium tracking-[-0.01em] text-[#08080B]
                  outline-none transition-colors duration-150
                  hover:bg-white/90
                  focus-visible:ring-2 focus-visible:ring-white/40
                "
              >
                {actionLabel}
              </button>
            )}

            <button
              onClick={onClose}
              className="
                rounded-full bg-white/[0.07] px-[18px] py-[9px]
                text-[13.5px] font-medium tracking-[-0.01em] text-white/70
                outline-none transition-colors duration-150
                hover:bg-white/[0.12] hover:text-white
                focus-visible:ring-2 focus-visible:ring-white/30
              "
            >
              Dismiss
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}