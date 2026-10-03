import { useState } from "react";
import {
  calendarError,
  calendarService,
  nextHalfHourInput,
  todayInput,
  useCalendar,
} from "../../../services/calendar/calendarService";
import { BackLabel, Button, ViewHeader, inputCls, selectCls } from "./parts";

type Props = {
  onBack: () => void;
  onCollapse: () => void;
  onDone: () => void;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DURATIONS = [
  { min: 15, label: "15 min" },
  { min: 30, label: "30 min" },
  { min: 45, label: "45 min" },
  { min: 60, label: "1 hour" },
  { min: 120, label: "2 hours" },
];

export function CalendarCreateView({ onBack, onCollapse, onDone }: Props) {
  const cal = useCalendar();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayInput);
  const [time, setTime] = useState(nextHalfHourInput);
  const [duration, setDuration] = useState(30);
  const [location, setLocation] = useState("");
  const [attendees, setAttendees] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emails = attendees.split(/[\s,;]+/).filter(Boolean);
  const badEmail = emails.find((e) => !EMAIL.test(e));
  const connected = cal.status === "connected";
  const canSubmit = !!title.trim() && !!date && !!time && !badEmail && !busy && connected;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await calendarService.create({
        title: title.trim(),
        date,
        time,
        durationMin: duration,
        location: location.trim(),
        description: description.trim(),
        attendees: emails,
      });
      onDone();
    } catch (e) {
      setError(calendarError(String(e)));
    } finally {
      setBusy(false);
    }
  };

  const hint = !connected
    ? "Connect Google Calendar first."
    : badEmail
      ? `"${badEmail}" isn't a valid email.`
      : error;

  return (
    <div className="flex h-full flex-col px-6 pb-5 pt-5">
      <ViewHeader
        onClose={onCollapse}
        leading={<BackLabel title="New event" onBack={onBack} />}
      />

      <div className="mt-3.5 flex flex-col gap-2">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void submit()}
          placeholder="Title"
          aria-label="Title"
          className={inputCls}
        />

        <div className="flex gap-2">
          <input
            type="date"
            value={date}
            min={todayInput()}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Date"
            className={`${inputCls} flex-1`}
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            aria-label="Time"
            className={`${inputCls} !w-[104px]`}
          />
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            aria-label="Duration"
            className={`${selectCls} bg-white text-black !flex-none !w-[92px]`}
          >
            {DURATIONS.map((d) => (
              <option key={d.min} value={d.min}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location (optional)"
          aria-label="Location"
          className={inputCls}
        />
        <input
          value={attendees}
          onChange={(e) => setAttendees(e.target.value)}
          placeholder="Attendees: emails, comma separated (optional)"
          aria-label="Attendees"
          className={inputCls}
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          aria-label="Description"
          className={inputCls}
        />
      </div>

      <div className="mt-auto flex shrink-0 items-center gap-3">
        <p className="min-w-0 flex-1 truncate text-[11.5px] text-white/45">{hint}</p>
        <Button variant="quiet" onClick={onBack}>
          Cancel
        </Button>
        <Button variant="primary" disabled={!canSubmit} onClick={() => void submit()}>
          {busy ? "Creating…" : "Create"}
        </Button>
      </div>
    </div>
  );
}