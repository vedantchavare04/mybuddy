import { useEffect, useState } from "react";

const timeFmt = new Intl.DateTimeFormat([], {
  hour: "numeric",
  minute: "2-digit",
});

export const dateFmt = new Intl.DateTimeFormat([], {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 10_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export function IdleCompact() {
  const now = useNow();
  return (
    <div className="flex h-full items-center justify-center text-[11.5px] font-medium tabular-nums tracking-[0.01em] text-white/45">
      {timeFmt.format(now)}
    </div>
  );
}
