import { useEffect, useState, type CSSProperties, type PointerEventHandler, type KeyboardEventHandler, type Ref } from "react";
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

export function IdleCompact({
  customText = "",
  textPosition = { x: 0.5, y: 0.5 },
  spiderMood = "chill",
  spiderColor = "lilac",
  showClock = false,
  spiderVisible = true,
  customTextInteraction,
}: {
  customText?: string;
  textPosition?: { x: number; y: number };
  spiderMood?: "chill" | "curious" | "sleepy" | "still";
  spiderColor?: "lilac" | "ocean" | "mint" | "coral";
  showClock?: boolean;
  spiderVisible?: boolean;
  customTextInteraction?: {
    ref?: Ref<HTMLSpanElement>;
    onPointerDown?: PointerEventHandler<HTMLSpanElement>;
    onPointerMove?: PointerEventHandler<HTMLSpanElement>;
    onPointerUp?: PointerEventHandler<HTMLSpanElement>;
    onPointerCancel?: PointerEventHandler<HTMLSpanElement>;
    onKeyDown?: KeyboardEventHandler<HTMLSpanElement>;
    role?: "button";
    tabIndex?: number;
    ariaLabel?: string;
  };
}) {
  const palette = {
    lilac: { body: "#8b68d9", head: "#b08af3", line: "#cbb5ff", web: "#d4bfff", eye: "#17121f", face: "#4a345f", twinkle: "#f4b7e8" },
    ocean: { body: "#3978bf", head: "#62a8ef", line: "#9bcaff", web: "#b4d8ff", eye: "#071523", face: "#193b5b", twinkle: "#c4e4ff" },
    mint: { body: "#318e75", head: "#54bd9c", line: "#9de4c8", web: "#b6ead8", eye: "#071b17", face: "#174a3b", twinkle: "#c6f2df" },
    coral: { body: "#b95755", head: "#e77c75", line: "#ffb1a7", web: "#ffd0c7", eye: "#24100f", face: "#67302d", twinkle: "#ffd6b9" },
  }[spiderColor];
  const now = useNow();
  const clockText = new Intl.DateTimeFormat([], { hour: "numeric", minute: "2-digit" }).format(now);
  return (
    <div
      className={`idle-buddy idle-buddy--${spiderMood}${showClock ? " idle-buddy--clock" : ""}`}
      aria-hidden={customText || showClock ? undefined : true}
      style={{
        "--spider-body": palette.body,
        "--spider-head": palette.head,
        "--spider-line": palette.line,
        "--spider-web": palette.web,
        "--spider-eye": palette.eye,
        "--spider-face": palette.face,
        "--spider-twinkle": palette.twinkle,
      } as CSSProperties}
    >
      <div className="idle-buddy__brand">
      {spiderVisible && <svg className="idle-buddy__art" viewBox="0 0 46 32" fill="none">
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
      </svg>}
      {customText ? (
        <span
          className="idle-buddy__custom-text"
          {...(customTextInteraction ? {
            ref: customTextInteraction.ref,
            onPointerDown: customTextInteraction.onPointerDown,
            onPointerMove: customTextInteraction.onPointerMove,
            onPointerUp: customTextInteraction.onPointerUp,
            onPointerCancel: customTextInteraction.onPointerCancel,
            onKeyDown: customTextInteraction.onKeyDown,
            role: customTextInteraction.role,
            tabIndex: customTextInteraction.tabIndex,
            "aria-label": customTextInteraction.ariaLabel,
          } : {})}
          style={{ left: `${textPosition.x * 100}%`, top: `${textPosition.y * 100}%` }}
        >
          {customText}
        </span>
      ) : (
        <span className="idle-buddy__caption">
          just vibing<span className="idle-buddy__ellipsis" aria-hidden="true">...</span>
        </span>
      )}
      </div>
      {showClock && <time className="idle-buddy__clock" dateTime={now.toISOString()}>{clockText}</time>}
    </div>
  );
}
