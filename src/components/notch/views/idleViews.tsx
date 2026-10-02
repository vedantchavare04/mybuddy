import { useEffect, useState } from "react";
import { Body, Title, ViewHeader } from "./parts";

const timeFmt = new Intl.DateTimeFormat([], {
  hour: "numeric",
  minute: "2-digit",
});

const dateFmt = new Intl.DateTimeFormat([], {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function useNow() {
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

export function IdleExpanded({ onCollapse }: { onCollapse: () => void }) {
  const now = useNow();
  return (
    <div className="flex h-full flex-col px-6 pt-5">
      <ViewHeader leading={dateFmt.format(now)} onClose={onCollapse} />
      <Title>All quiet</Title>
      <Body>Nothing needs your attention.</Body>
    </div>
  );
}