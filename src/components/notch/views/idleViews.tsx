import { useEffect, useState } from "react";
import "./idleViews.css";

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
  return (
    <div className="idle-buddy" aria-hidden="true">
      <svg className="idle-buddy__art" viewBox="0 0 46 32" fill="none">
        <path className="idle-buddy__web" d="M23 0v5" />
        <g className="idle-buddy__swing">
          <g className="idle-buddy__legs">
            <path d="M19 13Q13 8 10 10M18 15Q11 12 8 15M18 17Q11 18 10 21M20 19Q16 23 15 25" />
            <path d="M27 13Q33 8 36 10M28 15Q35 12 38 15M28 17Q35 18 36 21M26 19Q30 23 31 25" />
          </g>
          <ellipse className="idle-buddy__body" cx="23" cy="19" rx="5.1" ry="4.1" />
          <circle className="idle-buddy__head" cx="23" cy="12.5" r="4.8" />
          <circle className="idle-buddy__eye" cx="21.4" cy="12.2" r="0.85" />
          <circle className="idle-buddy__eye" cx="24.6" cy="12.2" r="0.85" />
          <path className="idle-buddy__smile" d="M21.5 14.2q1.5 1.2 3 0" />
        </g>
        <path className="idle-buddy__twinkle" d="M40 8v5m-2.5-2.5h5M7 22v3m-1.5-1.5h3" />
      </svg>
      <span className="idle-buddy__caption">
        just vibing<span className="idle-buddy__ellipsis" aria-hidden="true">...</span>
      </span>
    </div>
  );
}

