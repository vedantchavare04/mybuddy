import { useState } from "react";
import {
  nextHalfHourInput,
  todayInput,
} from "../../../services/calendar/calendarService";
import {
  formatDue,
  reminderError,
  reminderService,
} from "../../../services/reminders/reminderService";
import { BackLabel, Button, ViewHeader, inputCls } from "./parts";
import { DateTimePicker } from "./dateTimePicker";

type Props = {
  onBack: () => void;
  onCollapse: () => void;
  onDone: () => void;
};

const QUICK = [5, 15, 30, 60];

const quickLabel = (minutes: number) => (minutes === 60 ? "1h" : `${minutes}m`);

export function ReminderNewView({ onBack, onCollapse, onDone }: Props) {
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<number | "custom">(15);
  const [date, setDate] = useState(todayInput);
  const [time, setTime] = useState(nextHalfHourInput);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dueFor = () =>
    mode === "custom"
      ? new Date(`${date}T${time}`).getTime()
      : Date.now() + mode * 60_000;

  const submit = async () => {
    if (!title.trim() || busy) return;
    const due = dueFor();
    if (Number.isNaN(due)) {
      setError("Pick a valid date and time.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await reminderService.create(title.trim(), due);
      onDone();
    } catch (e) {
      setError(reminderError(String(e)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col px-6 pb-5 pt-5">
      <ViewHeader
        onClose={onCollapse}
        leading={<BackLabel title="New reminder" onBack={onBack} />}
      />

      <div className="mt-3.5 flex flex-col gap-2.5">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void submit()}
          placeholder="Remind me to…"
          aria-label="Task"
          maxLength={200}
          className={inputCls}
        />

        <div className="flex items-center gap-1.5">
          {QUICK.map((m) => (
            <Button
              key={m}
              variant={mode === m ? "primary" : "ghost"}
              onClick={() => setMode(m)}
            >
              {quickLabel(m)}
            </Button>
          ))}
          <Button
            variant={mode === "custom" ? "primary" : "ghost"}
            onClick={() => setMode("custom")}
          >
            Custom
          </Button>
        </div>

        {mode === "custom" ? (
          <DateTimePicker
            date={date}
            time={time}
            minDate={todayInput()}
            onChange={(nextDate, nextTime) => { setDate(nextDate); setTime(nextTime); }}
            ariaLabel="Reminder date and time"
          />
        ) : (
          <p className="flex h-8 items-center text-[12.5px] text-white/45">
            Reminds you at {formatDue(Date.now() + mode * 60_000)}
          </p>
        )}
      </div>

      <div className="mt-auto flex shrink-0 items-center gap-3">
        <p className="min-w-0 flex-1 truncate text-[11.5px] text-white/45">{error}</p>
        <Button variant="quiet" onClick={onBack}>
          Cancel
        </Button>
        <Button variant="primary" disabled={!title.trim() || busy} onClick={() => void submit()}>
          {busy ? "Saving…" : "Set reminder"}
        </Button>
      </div>
    </div>
  );
}
