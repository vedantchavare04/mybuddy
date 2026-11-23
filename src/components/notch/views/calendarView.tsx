import { useEffect, useMemo } from "react";
import { AlertCircle, Check, Plus } from "lucide-react";
import {
  calendarService,
  dayLabel,
  eventStart,
  formatTime,
  useCalendar,
  type CalEvent,
} from "../../../services/calendar/calendarService";
import {
  BackLabel,
  Body,
  Button,
  Title,
  ViewHeader,
  scrollCls,
} from "./parts";
import { GoogleButton } from "./googlebutton";

type Props = {
  onBack: () => void;
  onCollapse: () => void;
  onSchedule: () => void;
};

function group(events: CalEvent[]) {
  const map = new Map<string, CalEvent[]>();
  for (const e of events) {
    const label = dayLabel(eventStart(e));
    map.set(label, [...(map.get(label) ?? []), e]);
  }
  return [...map.entries()];
}

export function CalendarView({ onBack, onCollapse, onSchedule }: Props) {
  const cal = useCalendar();

  useEffect(() => {
    if (cal.status === "connected") void calendarService.refresh();
  }, [cal.status]);

  useEffect(() => {
    if (!cal.created) return;
    const id = window.setTimeout(() => calendarService.clearCreated(), 5000);
    return () => window.clearTimeout(id);
  }, [cal.created]);

  const groups = useMemo(() => group(cal.events ?? []), [cal.events]);

  const header = (
    <ViewHeader
      onClose={onCollapse}
      leading={<BackLabel title="Calendar" onBack={onBack} />}
    />
  );

  const errorLine = cal.error && (
    <p className="mt-2 flex items-start gap-2 text-[12px] leading-[1.4] text-white/55">
      <AlertCircle size={13} strokeWidth={1.8} className="mt-px shrink-0" />
      {cal.error}
    </p>
  );

  if (cal.status !== "connected") {
    let title = "Connect Google Calendar";
    let body = "See what's next and schedule events without leaving your desktop.";
    let action: React.ReactNode = (
      <GoogleButton onClick={() => void calendarService.connect()} />
    );

    if (cal.status === "loading") {
      title = "Calendar";
      body = "Checking your connection…";
      action = null;
    } else if (cal.status === "unavailable") {
      title = "Calendar unavailable";
      body = "Calendar works in the MyBuddy desktop app.";
      action = null;
    } else if (cal.status === "not_configured") {
      title = "Google Calendar isn't set up";
      body = "Add a Google client ID to enable it. See INTEGRATION.md.";
      action = null;
    } else if (cal.status === "connecting") {
      title = "Waiting for Google";
      body = "Finish signing in in your browser.";
      action = (
        <Button variant="quiet" onClick={() => calendarService.cancelConnect()}>
          Cancel
        </Button>
      );
    }

    return (
      <div className="flex h-full flex-col px-6 pb-5 pt-5">
        {header}
        <Title>{title}</Title>
        <Body>{body}</Body>
        {errorLine}
        <div className="mt-auto">{action}</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col px-6 pb-5 pt-5">
      {header}

      {cal.created && (
        <div className="mt-3 flex items-center gap-2.5 text-[12.5px]">
          <Check size={14} strokeWidth={2} className="shrink-0 text-white/70" />
          <span className="min-w-0 truncate text-white/55">
            <span className="font-medium text-white/90">Event scheduled</span>
            {" · "}
            {cal.created.title} · {cal.created.when}
          </span>
        </div>
      )}

      <div className={`${scrollCls} mt-3 notch-scrollbar`}>
        {cal.events === null ? (
          <p className="pt-6 text-center text-[13px] text-white/35">Loading…</p>
        ) : groups.length === 0 ? (
          <p className="pt-6 text-center text-[13px] text-white/40">
            Nothing coming up in the next 7 days.
          </p>
        ) : (
          groups.map(([label, events]) => (
            <section key={label} className="mb-3 last:mb-0">
              <h3 className="text-[12px] font-medium text-white/40">{label}</h3>
              {events.map((e) => (
                <div key={e.id} className="flex items-baseline gap-3 py-1.5">
                  <span className="w-[68px] shrink-0 text-[12px] tabular-nums text-white/40">
                    {e.allDay ? "All day" : formatTime(eventStart(e))}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13.5px] text-white/90">
                    {e.title}
                  </span>
                  {e.location && (
                    <span className="max-w-[110px] shrink-0 truncate text-[12px] text-white/30">
                      {e.location}
                    </span>
                  )}
                </div>
              ))}
            </section>
          ))
        )}
      </div>

      {errorLine}

      <div className="mt-3 flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-1 text-[11.5px] text-white/30">
          <span>Google Calendar · Connected</span>
          <Button
            variant="quiet"
            className="!h-6 !px-2 !text-[11.5px]"
            onClick={() => void calendarService.disconnect()}
          >
            Disconnect
          </Button>
        </div>
        <Button variant="primary" onClick={onSchedule}>
          <Plus size={14} strokeWidth={2} />
          Schedule
        </Button>
      </div>
    </div>
  );
}