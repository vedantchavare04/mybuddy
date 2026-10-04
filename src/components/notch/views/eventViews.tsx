import {
  AlarmClock,
  BatteryLow,
  Bell,
  Calendar,
  Download,
  Music,
  Timer,
  type LucideIcon,
} from "lucide-react";
import type { CompanionEvent } from "../../../events/eventTypes";
import { Body, Button, Title, ViewHeader } from "./parts";

type Look = { icon: LucideIcon; label: string; accent?: string };

const LOOK: Record<string, Look> = {
  battery: { icon: BatteryLow, label: "Battery", accent: "#E8B35C" },
  notification: { icon: Bell, label: "Notification" },
  download: { icon: Download, label: "Download" },
  music: { icon: Music, label: "Now playing" },
  meeting: { icon: Calendar, label: "Calendar" },
  focus: { icon: Timer, label: "Focus" },
  reminder: { icon: AlarmClock, label: "Reminder" },
};

const NEUTRAL = "rgba(255,255,255,0.7)";

export function lookFor(event: CompanionEvent): Look {
  return LOOK[event.type] ?? LOOK.notification;
}

export function EventActive({ event }: { event: CompanionEvent }) {
  const { icon: Icon, accent } = lookFor(event);
  const text =
    event.type === "reminder" ? `${event.title} · ${event.message}` : event.title;
  return (
    <div className="flex h-full items-center gap-3 px-[18px]">
      <Icon
        size={15}
        strokeWidth={1.8}
        color={accent ?? NEUTRAL}
        className="shrink-0"
      />
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium tracking-[-0.01em] text-white/90">
        {text}
      </span>
    </div>
  );
}

type ExpandedProps = {
  event: CompanionEvent;
  onCollapse: () => void;
  onMenu?: () => void;
  onAction?: () => void;
  actionLabel?: string;
};

export function EventExpanded({
  event,
  onCollapse,
  onMenu,
  onAction,
  actionLabel,
}: ExpandedProps) {
  const { icon: Icon, label, accent } = lookFor(event);

  return (
    <div className="flex h-full flex-col px-6 pb-5 pt-5">
      <ViewHeader
        onClose={onCollapse}
        leading={
          <>
            <Icon size={14} strokeWidth={1.8} color={accent ?? NEUTRAL} />
            {label}
          </>
        }
      />

      <Title>{event.title}</Title>
      <Body>{event.message}</Body>

      <div className="mt-auto flex items-center gap-1.5">
        {onAction && actionLabel && (
          <Button variant="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
        <Button variant="quiet" onClick={onCollapse}>
          Later
        </Button>
        {onMenu && (
          <Button variant="quiet" className="ml-auto" onClick={onMenu}>
            Menu
          </Button>
        )}
      </div>
    </div>
  );
}