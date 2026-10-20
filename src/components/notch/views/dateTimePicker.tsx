import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, Minus, Plus } from "lucide-react";

type Props = {
  date: string;
  time: string;
  onChange: (date: string, time: string) => void;
  minDate?: string;
  allowClear?: boolean;
  className?: string;
  ariaLabel?: string;
};

const pad = (number: number) => String(number).padStart(2, "0");
const validDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00`);
  return !Number.isNaN(parsed.getTime()) && dateString(parsed) === value;
};
const dateString = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

function dateLabel(date: string, time: string) {
  if (!validDate(date)) return "Choose date & time";
  const selected = new Date(`${date}T${time || "12:00"}:00`);
  return new Intl.DateTimeFormat(undefined, {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  }).format(selected);
}

function TimeNumber({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(pad(value));
  useEffect(() => setDraft(pad(value)), [value]);

  const commit = (text: string) => {
    setDraft(text);
    if (!/^\d{1,2}$/.test(text) || text.length < 2) return;
    const number = Number(text);
    if (number < min || number > max) return;
    onChange(number);
  };

  const clampDraft = () => {
    const parsed = Number(draft);
    const next = Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : value;
    setDraft(pad(next));
    onChange(next);
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[9px] font-semibold uppercase tracking-[0.13em] text-white/35">{label}</span>
      <button type="button" aria-label={`Increase ${label.toLowerCase()}`} onClick={() => onChange(value >= max ? min : value + 1)} className="grid h-5 w-8 place-items-center rounded-md text-white/40 transition hover:bg-white/[0.08] hover:text-white"><Plus size={12} /></button>
      <input
        type="text"
        inputMode="numeric"
        aria-label={label}
        value={draft}
        onChange={(event) => commit(event.target.value)}
        onBlur={clampDraft}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp") { event.preventDefault(); onChange(value >= max ? min : value + 1); }
          if (event.key === "ArrowDown") { event.preventDefault(); onChange(value <= min ? max : value - 1); }
        }}
        className="h-9 w-11 rounded-[9px] border border-white/[0.1] bg-white/[0.06] text-center font-mono text-[15px] font-medium text-white outline-none transition focus:border-white/25 focus:bg-white/[0.09]"
      />
      <button type="button" aria-label={`Decrease ${label.toLowerCase()}`} onClick={() => onChange(value <= min ? max : value - 1)} className="grid h-5 w-8 place-items-center rounded-md text-white/40 transition hover:bg-white/[0.08] hover:text-white"><Minus size={12} /></button>
    </div>
  );
}

export function DateTimePicker({
  date,
  time,
  onChange,
  minDate,
  allowClear = false,
  className = "",
  ariaLabel = "Date and time",
}: Props) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => {
    const initial = validDate(date) ? new Date(`${date}T12:00:00`) : new Date();
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hour24 = Number(time.slice(0, 2)) || 0;
  const minute = Number(time.slice(3, 5)) || 0;
  const hour12 = hour24 % 12 || 12;
  const period = hour24 >= 12 ? "PM" : "AM";

  const firstWeekday = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const dayCount = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); triggerRef.current?.focus(); }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [open]);

  const updateTime = (hour: number, minuteValue: number, periodValue = period) => {
    const normalizedHour = (hour % 12) + (periodValue === "PM" ? 12 : 0);
    onChange(date, `${pad(normalizedHour)}:${pad(minuteValue)}`);
  };

  const chooseDate = (day: number) => {
    const nextDate = new Date(month.getFullYear(), month.getMonth(), day);
    const formatted = dateString(nextDate);
    if (minDate && formatted < minDate) return;
    onChange(formatted, time || "09:00");
  };

  const position = triggerRef.current?.getBoundingClientRect();
  const panelWidth = Math.min(324, window.innerWidth - 20);
  const panelLeft = position ? Math.max(10, Math.min(position.left, window.innerWidth - panelWidth - 10)) : 10;
  const panelHeight = 346;
  const panelTop = position
    ? position.bottom + panelHeight + 10 < window.innerHeight
      ? position.bottom + 7
      : Math.max(10, position.top - panelHeight - 7)
    : 10;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (!open) {
            const initial = validDate(date) ? new Date(`${date}T12:00:00`) : new Date();
            setMonth(new Date(initial.getFullYear(), initial.getMonth(), 1));
          }
          setOpen((value) => !value);
        }}
        className={`flex h-8 min-w-0 items-center gap-2 rounded-[10px] bg-white/[0.05] px-2.5 text-left text-[12px] text-white/75 outline-none ring-1 ring-inset ring-white/[0.07] transition hover:bg-white/[0.08] hover:ring-white/[0.13] focus-visible:ring-2 focus-visible:ring-white/25 ${className}`}
      >
        <CalendarDays size={14} className="shrink-0 text-white/45" />
        <span className="min-w-0 flex-1 truncate">{dateLabel(date, time)}</span>
        <ChevronDown size={13} className={`shrink-0 text-white/35 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && createPortal(
        <div
          ref={panelRef}
          data-notch-ignore
          role="dialog"
          aria-label="Choose date and time"
          className="fixed z-[10000] rounded-[16px] border border-white/[0.1] bg-[#171719]/[0.98] p-3.5 text-white shadow-[0_18px_55px_rgba(0,0,0,0.66),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-2xl"
          style={{ left: panelLeft, top: panelTop, width: panelWidth }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13px] font-semibold tracking-[-0.01em]">Pick a moment</div>
              <div className="mt-0.5 text-[10.5px] text-white/40">Choose a date and set any minute</div>
            </div>
            {allowClear && validDate(date) && <button type="button" onClick={() => { onChange("", ""); setOpen(false); }} className="rounded-full px-2 py-1 text-[10px] text-white/45 transition hover:bg-white/[0.07] hover:text-white/80">Clear</button>}
          </div>

          <div className="mt-3 grid grid-cols-[1fr_104px] gap-3">
            <div>
              <div className="mb-2 flex h-7 items-center justify-between">
                <button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="grid h-7 w-7 place-items-center rounded-full text-white/45 transition hover:bg-white/[0.08] hover:text-white"><ChevronLeft size={15} /></button>
                <span className="text-[11.5px] font-medium text-white/80">{new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(month)}</span>
                <button type="button" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="grid h-7 w-7 place-items-center rounded-full text-white/45 transition hover:bg-white/[0.08] hover:text-white"><ChevronRight size={15} /></button>
              </div>
              <div className="grid grid-cols-7 text-center">
                {["S", "M", "T", "W", "T", "F", "S"].map((weekday, index) => <span key={`${weekday}-${index}`} className="grid h-6 place-items-center text-[9px] font-semibold text-white/30">{weekday}</span>)}
                {Array.from({ length: Math.ceil((firstWeekday + dayCount) / 7) * 7 }, (_, index) => {
                  const number = index - firstWeekday + 1;
                  const isCurrentMonth = number > 0 && number <= dayCount;
                  if (!isCurrentMonth) return <span key={`blank-${index}`} className="h-7" />;
                  const dateObj = new Date(month.getFullYear(), month.getMonth(), number);
                  const formatted = dateString(dateObj);
                  const selected = date === formatted;
                  const today = formatted === dateString(new Date());
                  const disabled = !!minDate && formatted < minDate;
                  return (
                    <button
                      key={`day-${index}`}
                      type="button"
                      disabled={!isCurrentMonth || disabled}
                      onClick={() => chooseDate(number)}
                      className={`relative mx-auto grid h-7 w-7 place-items-center rounded-[8px] text-[10.5px] transition disabled:pointer-events-none disabled:opacity-20 ${selected ? "bg-white text-[#111113] font-semibold shadow-sm" : today ? "bg-white/[0.1] text-white" : "text-white/70 hover:bg-white/[0.1] hover:text-white"}`}
                    >
                      {number}
                      {today && !selected && <span className="absolute bottom-[3px] h-[2px] w-[2px] rounded-full bg-white/70" />}
                    </button>
                  );
                })}
              </div>
              <button type="button" onClick={() => { const now = new Date(); setMonth(new Date(now.getFullYear(), now.getMonth(), 1)); chooseDate(now.getDate()); }} className="mt-1 rounded-md px-1.5 py-1 text-[10px] font-medium text-white/45 transition hover:bg-white/[0.07] hover:text-white/80">Today</button>
            </div>

            <div className="rounded-[12px] border border-white/[0.07] bg-white/[0.025] px-2 py-2">
              <div className="mb-2 flex items-center justify-center gap-1 text-white/35"><Clock3 size={11} /><span className="text-[9px] font-semibold uppercase tracking-[0.12em]">Time</span></div>
              <div className="flex items-center justify-center gap-1">
                <TimeNumber label="Hour" value={hour12} min={1} max={12} onChange={(next) => updateTime(next, minute)} />
                <span className="-mt-1 text-[15px] text-white/45">:</span>
                <TimeNumber label="Minute" value={minute} min={0} max={59} onChange={(next) => updateTime(hour12, next)} />
              </div>
              <button type="button" onClick={() => updateTime(hour12, minute, period === "AM" ? "PM" : "AM")} className="mt-2.5 flex h-7 w-full items-center justify-center gap-1 rounded-[8px] border border-white/[0.07] bg-white/[0.045] text-[10px] font-semibold tracking-[0.08em] text-white/65 transition hover:bg-white/[0.09] hover:text-white">
                {period}<ChevronDown size={11} />
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-white/[0.07] pt-2.5">
            <div className="text-[10px] text-white/40">{validDate(date) ? dateLabel(date, time) : "No date selected"}</div>
            <button type="button" onClick={() => setOpen(false)} className="flex h-7 items-center gap-1.5 rounded-full bg-white px-3 text-[10.5px] font-semibold text-[#111113] transition hover:bg-white/90"><Check size={12} />Done</button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
