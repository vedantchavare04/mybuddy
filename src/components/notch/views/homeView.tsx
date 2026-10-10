import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlarmClock,
  Bell,
  Calendar,
  Music,
  Search,
  Settings,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { CompanionEvent } from "../../../events/eventTypes";
import { useNotifications } from "../../../services/notifications/notificationStore";
import type { Route } from "../notchRoutes";
import { dateFmt, useNow } from "./idleViews";
import { BackLabel, Body, Button, Title, ViewHeader } from "./parts";

const ITEMS: { route: Route; label: string; icon: LucideIcon }[] = [
  { route: "launcher", label: "Quick Actions", icon: Search },
  { route: "music", label: "Music", icon: Music },
  { route: "calendar", label: "Calendar", icon: Calendar },
  { route: "reminders", label: "Reminders", icon: AlarmClock },
  { route: "notifications", label: "Notifications", icon: Bell },
  { route: "tools", label: "Tools", icon: Wrench },
];

const HINTS = [
  "Launch any app without leaving what you're doing.",
  "Everything you copy is saved in Clipboard history.",
  "Plan your day and track tasks in one place.",
  "Keep notes, links and snippets in your memory vault.",
  "Translate text and use AI tools in a click.",
  "Reminders and notifications land here first.",
];

const HINT_INTERVAL_MS = 8000;

const timeFmt = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

function greeting(date: Date) {
  const hour = date.getHours();

  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 22) return "Good evening";
  return "Working late";
}

function RotatingHint() {
  const [index, setIndex] = useState(0);
  const reducedMotion = useReducedMotion() === true;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % HINTS.length);
    }, HINT_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="mt-2 flex h-4 shrink-0 items-center gap-2.5 overflow-hidden">
      <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-white/25">
        Tip
      </span>

      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={index}
          className="truncate text-[12.5px] leading-4 text-white/50"
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -5 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          {HINTS[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

type Props = {
  event: CompanionEvent | null;
  onOpen: (route: Route) => void;
  onSettings: () => void;
  onBack?: () => void;
  onCollapse: () => void;
};

export function HomeView({
  event,
  onOpen,
  onSettings,
  onBack,
  onCollapse,
}: Props) {
  const now = useNow();
  const { items } = useNotifications();
  const unread = items.filter((n) => !n.read).length;

  const status =
    unread > 0
      ? `${unread} unread ${unread === 1 ? "notification" : "notifications"}`
      : "You're all caught up";

  return (
    <div className="flex h-full flex-col px-6 pb-4 pt-5">
      <ViewHeader
        onClose={onCollapse}
        leading={
          onBack ? (
            <BackLabel title="Back" onBack={onBack} />
          ) : (
            dateFmt.format(now)
          )
        }
        trailing={
          <button
            type="button"
            aria-label="Settings"
            title="Settings"
            onClick={onSettings}
            className="flex h-6 w-6 items-center justify-center rounded-full text-white/30 outline-none transition-colors duration-150 hover:bg-white/[0.07] hover:text-white/75 focus-visible:ring-1 focus-visible:ring-white/30"
          >
            <Settings size={13} strokeWidth={1.8} />
          </button>
        }
      />

      <div className="shrink-0">
        {event ? (
          <>
            <Title>{event.title}</Title>
            <Body>{event.message}</Body>
          </>
        ) : (
          <>
            <Title>{greeting(now)}</Title>
            <Body>{`${timeFmt.format(now)} · ${status}`}</Body>
            <RotatingHint />
          </>
        )}
      </div>

      <div className="mt-auto shrink-0 pt-2">
        <div className="mb-3 h-px bg-white/[0.07]" />
        <nav className="flex flex-wrap gap-2" aria-label="MyBuddy">
          {ITEMS.map(({ route, label, icon: Icon }) => (
            <Button key={route} onClick={() => onOpen(route)}>
              <Icon size={14} strokeWidth={1.8} />
              {label}
              {route === "notifications" && unread > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-white/10 px-1 text-[10px] font-medium tabular-nums leading-none text-white/70">
                  {unread}
                </span>
              )}
            </Button>
          ))}
        </nav>
      </div>
    </div>
  );
}
