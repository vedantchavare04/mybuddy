import { AlarmClock } from "lucide-react";
import type { CompanionEvent } from "../../../events/eventTypes";
import {
  reminderIdOf,
  reminderService,
} from "../../../services/reminders/reminderService";
import { Button, ViewHeader } from "./parts";

type Props = {
  event: CompanionEvent;
  onCollapse: () => void;
  onMenu: () => void;
  onFinish: () => void;
};

const SNOOZES = [
  { minutes: 5, label: "5 min" },
  { minutes: 15, label: "15 min" },
  { minutes: 60, label: "1 hour" },
];

export function ReminderFiredView({ event, onCollapse, onMenu, onFinish }: Props) {
  const id = reminderIdOf(event);

  const run = (action: (id: string) => void) => () => {
    if (id) action(id);
    onFinish();
  };

  return (
    <div className="flex h-full flex-col px-6 pb-5 pt-5">
      <ViewHeader
        onClose={onCollapse}
        leading={
          <>
            <AlarmClock size={14} strokeWidth={1.8} className="text-white/70" />
            Reminder
          </>
        }
      />

      <h2 className="mt-3.5 line-clamp-2 text-[17px] font-semibold leading-[1.25] tracking-[-0.02em] text-white">
        {event.message}
      </h2>

      <div className="mt-auto flex flex-wrap items-center gap-1.5">
        <Button variant="primary" onClick={run((reminder) => reminderService.done(reminder))}>
          Done
        </Button>
        {SNOOZES.map((s) => (
          <Button
            key={s.minutes}
            onClick={run((reminder) => reminderService.snooze(reminder, s.minutes))}
          >
            {s.label}
          </Button>
        ))}
        <Button variant="quiet" className="ml-auto" onClick={onMenu}>
          Menu
        </Button>
      </div>
    </div>
  );
}