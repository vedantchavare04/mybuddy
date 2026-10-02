import {
    BatteryLow,
    Bell,
    Calendar,
    Download,
    Music,
    Timer,
    type LucideIcon,
  } from "lucide-react";
  import type { CompanionEvent } from "../../../events/eventTypes";
  import { Body, Title, ViewHeader } from "./parts";
  
  type Look = { icon: LucideIcon; label: string; accent?: string };
  
  const LOOK: Record<string, Look> = {
    battery: { icon: BatteryLow, label: "Battery", accent: "#E8B35C" },
    notification: { icon: Bell, label: "Notification" },
    download: { icon: Download, label: "Download" },
    music: { icon: Music, label: "Now playing" },
    meeting: { icon: Calendar, label: "Calendar" },
    focus: { icon: Timer, label: "Focus" },
  };
  
  const NEUTRAL = "rgba(255,255,255,0.7)";
  
  function lookFor(event: CompanionEvent): Look {
    return LOOK[event.type] ?? LOOK.notification;
  }
  
  export function EventActive({ event }: { event: CompanionEvent }) {
    const { icon: Icon, accent } = lookFor(event);
    return (
      <div className="flex h-full items-center gap-3 px-[18px]">
        <Icon
          size={15}
          strokeWidth={1.8}
          color={accent ?? NEUTRAL}
          className="shrink-0"
        />
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium tracking-[-0.01em] text-white/90">
          {event.title}
        </span>
      </div>
    );
  }
  
  type ExpandedProps = {
    event: CompanionEvent;
    onCollapse: () => void;
    onAction?: () => void;
    actionLabel?: string;
  };
  
  export function EventExpanded({
    event,
    onCollapse,
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
            <button
              type="button"
              onClick={onAction}
              className="h-8 rounded-full bg-white px-4 text-[12.5px] font-medium tracking-[-0.005em] text-[#050506] outline-none transition duration-150 hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-white/40 active:scale-[0.97]"
            >
              {actionLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onCollapse}
            className="h-8 rounded-full px-3.5 text-[12.5px] font-medium tracking-[-0.005em] text-white/55 outline-none transition duration-150 hover:bg-white/[0.07] hover:text-white focus-visible:ring-1 focus-visible:ring-white/30"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }