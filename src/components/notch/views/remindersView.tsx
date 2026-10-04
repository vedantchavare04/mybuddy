import { useState, type ReactNode } from "react";
import { Check, Clock, Plus, Trash2 } from "lucide-react";
import {
  formatDue,
  reminderService,
  useReminders,
  type Reminder,
} from "../../../services/reminders/reminderService";
import { BackLabel, Button, ViewHeader, scrollCls } from "./parts";

type Props = { onBack: () => void; onCollapse: () => void; onNew: () => void };

const SNOOZES = [
  { minutes: 5, label: "5m" },
  { minutes: 15, label: "15m" },
  { minutes: 60, label: "1h" },
];

function RowAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded-full text-white/50 outline-none transition-colors duration-150 hover:bg-white/[0.08] hover:text-white focus-visible:ring-1 focus-visible:ring-white/30"
    >
      {children}
    </button>
  );
}

function Row({ reminder }: { reminder: Reminder }) {
  const [snoozing, setSnoozing] = useState(false);

  return (
    <div className="group py-2">
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1 truncate text-[13.5px] text-white/90">
          {reminder.title}
        </span>
        <span className="relative flex h-6 min-w-[72px] shrink-0 items-center justify-end">
          <span className="text-[12px] tabular-nums text-white/40 transition-opacity duration-150 group-focus-within:opacity-0 group-hover:opacity-0">
            {reminder.status === "fired" ? "Due" : formatDue(reminder.dueMs)}
          </span>
          <span className="absolute right-0 flex items-center gap-0.5 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100">
            <RowAction label="Done" onClick={() => reminderService.done(reminder.id)}>
              <Check size={14} strokeWidth={1.9} />
            </RowAction>
            <RowAction label="Snooze" onClick={() => setSnoozing((s) => !s)}>
              <Clock size={14} strokeWidth={1.8} />
            </RowAction>
            <RowAction label="Delete" onClick={() => reminderService.remove(reminder.id)}>
              <Trash2 size={14} strokeWidth={1.8} />
            </RowAction>
          </span>
        </span>
      </div>

      {snoozing && (
        <div className="mt-2 flex items-center gap-1.5">
          {SNOOZES.map((s) => (
            <Button
              key={s.minutes}
              onClick={() => {
                reminderService.snooze(reminder.id, s.minutes);
                setSnoozing(false);
              }}
            >
              {s.label}
            </Button>
          ))}
          <Button variant="quiet" onClick={() => setSnoozing(false)}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

function Group({ title, items }: { title: string; items: Reminder[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mb-3 last:mb-0">
      <h3 className="text-[12px] font-medium text-white/40">{title}</h3>
      <div className="mt-1 divide-y divide-white/[0.06]">
        {items.map((r) => (
          <Row key={r.id} reminder={r} />
        ))}
      </div>
    </section>
  );
}

export function RemindersView({ onBack, onCollapse, onNew }: Props) {
  const { items, available } = useReminders();

  const endOfToday = new Date().setHours(23, 59, 59, 999);
  const active = items
    .filter((r) => r.status !== "done")
    .sort((a, b) => a.dueMs - b.dueMs);
  const today = active.filter((r) => r.dueMs <= endOfToday);
  const upcoming = active.filter((r) => r.dueMs > endOfToday);

  return (
    <div className="flex h-full flex-col px-6 pb-5 pt-5">
      <ViewHeader
        onClose={onCollapse}
        leading={<BackLabel title="Reminders" onBack={onBack} />}
      />

      <div className={`${scrollCls} mt-3`}>
        {!available ? (
          <p className="pt-8 text-center text-[13px] text-white/40">
            Reminders work in the MyBuddy desktop app.
          </p>
        ) : active.length === 0 ? (
          <div className="pt-8 text-center">
            <div className="text-[15px] font-semibold tracking-[-0.015em] text-white/90">
              No reminders
            </div>
            <p className="mt-1 text-[13px] text-white/45">
              Add something you don't want to forget.
            </p>
          </div>
        ) : (
          <>
            <Group title="Today" items={today} />
            <Group title="Upcoming" items={upcoming} />
          </>
        )}
      </div>

      <div className="mt-3 flex shrink-0 justify-end">
        <Button variant="primary" disabled={!available} onClick={onNew}>
          <Plus size={14} strokeWidth={2} />
          New
        </Button>
      </div>
    </div>
  );
}