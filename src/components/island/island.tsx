import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BatteryLow,
  Bell,
  Download,
  Music,
  Calendar,
  Timer,
  X,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";
import type { CompanionEvent } from "../../events/eventTypes";

type IslandProps = {
  event: CompanionEvent;
  onClose: () => void;
  onAction?: () => void;
  actionLabel?: string;
};

type EventLook = {
  icon: LucideIcon;
  accent: string;
  label: string;
};

const EVENT_LOOK: Record<string, EventLook> = {
  battery: {
    icon: BatteryLow,
    accent: "#F2B866",
    label: "Battery",
  },
  notification: {
    icon: Bell,
    accent: "#A99BFF",
    label: "Notification",
  },
  download: {
    icon: Download,
    accent: "#73D8B0",
    label: "Download",
  },
  music: {
    icon: Music,
    accent: "#E99BC2",
    label: "Music",
  },
  meeting: {
    icon: Calendar,
    accent: "#BFA4EA",
    label: "Meeting",
  },
  focus: {
    icon: Timer,
    accent: "#79C8E8",
    label: "Focus",
  },
};

const surfaceTransition = {
  type: "spring" as const,
  stiffness: 420,
  damping: 32,
  mass: 0.8,
};

export default function Island({
  event,
  onClose,
  onAction,
  actionLabel,
}: IslandProps) {
  const [time, setTime] = useState(() =>
    new Intl.DateTimeFormat([], {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date())
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTime(
        new Intl.DateTimeFormat([], {
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date())
      );
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const look =
    EVENT_LOOK[event.type] ?? EVENT_LOOK.notification;

  const Icon = look.icon;

  return (
    <div className="pointer-events-none fixed inset-0 z-60">
      <motion.div
        data-mybuddy-island="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.14 }}
        className="pointer-events-auto absolute inset-0"
        onClick={onClose}
      />

      <motion.div
        role="dialog"
        aria-label="MyBuddy"
        initial={{
          opacity: 0,
          y: -16,
          scaleX: 0.82,
          scaleY: 0.72,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scaleX: 1,
          scaleY: 1,
        }}
        exit={{
          opacity: 0,
          y: -10,
          scaleX: 0.88,
          scaleY: 0.76,
        }}
        transition={{
          type: "spring",
          stiffness: 390,
          damping: 30,
          mass: 0.72,
        }}
        style={{
          transformOrigin: "50% 0%",
        }}
        className="
          pointer-events-auto
          absolute
          left-1/2
          top-3
          flex
          h-[78px]
          w-[720px]
          -translate-x-1/2
          items-center
          overflow-hidden
          rounded-[24px]
          border
          border-white/[0.085]
          bg-[#090a0c]/[0.97]
          shadow-[0_14px_34px_rgba(0,0,0,0.32),0_32px_80px_rgba(0,0,0,0.26)]
          backdrop-blur-2xl
        "
      >
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-white/[0.13]" />

        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            delay: 0.04,
            duration: 0.22,
            ease: "easeOut",
          }}
          className="
            flex
            h-full
            w-[184px]
            shrink-0
            items-center
            gap-3.5
            px-5
          "
        >
          <div
            className="
              relative
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-[12px]
              bg-white/[0.045]
              ring-1
              ring-inset
              ring-white/[0.075]
            "
          >
            <span className="text-[17px] leading-none">
              🕷️
            </span>

            <span
              className="
                absolute
                bottom-[7px]
                right-[7px]
                h-[5px]
                w-[5px]
                rounded-full
                bg-[#9B86FF]
                shadow-[0_0_7px_rgba(155,134,255,0.7)]
              "
            />
          </div>

          <div className="min-w-0">
            <div className="text-[13px] font-semibold tracking-[-0.015em] text-white">
              MyBuddy
            </div>

            <div className="mt-[3px] text-[10px] tracking-[0.01em] text-white/35">
              Desktop companion
            </div>
          </div>
        </motion.div>

        <div className="h-9 w-px bg-white/[0.065]" />

        <motion.div
          initial={{ opacity: 0, x: -7 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            delay: 0.07,
            duration: 0.23,
            ease: "easeOut",
          }}
          className="
            flex
            min-w-0
            flex-1
            items-center
            gap-3.5
            px-5
          "
        >
          <div
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-[10px]
              bg-white/[0.045]
              ring-1
              ring-inset
              ring-white/[0.065]
            "
          >
            <Icon
              size={16}
              strokeWidth={1.8}
              color={look.accent}
            />
          </div>

          <div className="min-w-0">
            <div className="text-[10px] font-medium uppercase tracking-[0.11em] text-white/30">
              {look.label}
            </div>

            <div className="mt-[3px] truncate text-[14px] font-medium tracking-[-0.012em] text-white/90">
              {event.title}
            </div>
          </div>
        </motion.div>

        <div className="h-9 w-px bg-white/[0.065]" />

        <motion.div
          initial={{ opacity: 0, x: 7 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            delay: 0.1,
            duration: 0.23,
            ease: "easeOut",
          }}
          className="
            flex
            h-full
            w-[142px]
            shrink-0
            items-center
            justify-between
            px-5
          "
        >
          <div>
            <div className="text-[10px] uppercase tracking-[0.11em] text-white/25">
              Now
            </div>

            <div className="mt-[3px] font-mono text-[13px] tracking-[-0.02em] text-white/70">
              {time}
            </div>
          </div>

          <motion.span
            animate={{
              opacity: [0.45, 1, 0.45],
            }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="h-[5px] w-[5px] rounded-full"
            style={{
              backgroundColor: look.accent,
              boxShadow: `0 0 8px ${look.accent}`,
            }}
          />
        </motion.div>

        {onAction && actionLabel && (
          <motion.button
            initial={{
              opacity: 0,
              scale: 0.9,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            transition={{
              delay: 0.12,
              duration: 0.18,
            }}
            type="button"
            onClick={onAction}
            className="
              mr-2
              flex
              h-9
              shrink-0
              items-center
              gap-1.5
              rounded-full
              bg-white
              px-3.5
              text-[11px]
              font-semibold
              text-[#090a0c]
              transition-transform
              duration-150
              hover:scale-[1.025]
              active:scale-95
            "
          >
            {actionLabel}

            <ArrowUpRight
              size={12}
              strokeWidth={2}
            />
          </motion.button>
        )}

        <button
          type="button"
          aria-label="Close MyBuddy"
          onClick={onClose}
          className="
            mr-3
            flex
            h-8
            w-8
            shrink-0
            items-center
            justify-center
            rounded-full
            text-white/25
            transition
            duration-150
            hover:bg-white/[0.06]
            hover:text-white/70
          "
        >
          <X
            size={14}
            strokeWidth={1.7}
          />
        </button>
      </motion.div>
    </div>
  );
}
