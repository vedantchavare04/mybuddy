import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Rope, ropePath } from "../../physics/rope.ts";
import type { CompanionEvent } from "../../events/eventTypes";

type CharacterProps = {
  eventActive: boolean;
  event: CompanionEvent | null;
  onClick: () => void;
  islandOpen: boolean;
};

export type Phase =
  | "idle"
  | "waking"
  | "stretching"
  | "dropping"
  | "alert"
  | "returning";

const ANCHOR_Y = -18;

const TUNING = {
  segments: 18,
  gravity: 2600,
  damping: 0.982,
  iterations: 16,
  length: {
    idle: 86,
    waking: 96,
    stretching: 116,
    dropping: 300,
    alert: 300,
    returning: 86,
  } as Record<Phase, number>,
  descendEase: 0.11,
  climbEase: 0.042,
  islandEase: 0.12,
  islandLength: 22,
  grabEase: 0.32,
  maxFling: 40,
  cursorPull: 900,
  cursorRange: 420,
  breeze: 90,
  wakeDistance: 210,
};

const LEG_RIG = [
  { hx: 15, hy: 8, fa: -68, fl: 26, ta: 28, tl: 30, ph: 0 },
  { hx: 18, hy: 15, fa: -44, fl: 30, ta: 52, tl: 34, ph: 0.9 },
  { hx: 18, hy: 23, fa: -18, fl: 29, ta: 74, tl: 33, ph: 1.8 },
  { hx: 14, hy: 30, fa: 6, fl: 25, ta: 92, tl: 28, ph: 2.7 },
];

const RAD = Math.PI / 180;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export default function Character({
  eventActive,
  event,
  onClick,
  islandOpen,
}: CharacterProps) {
  const [phase, setPhase] = useState<Phase>("idle");

  const threadRef = useRef<SVGPathElement>(null);
  const rigRef = useRef<SVGGElement>(null);
  const bodyRef = useRef<SVGGElement>(null);
  const femurRefs = useRef<(SVGPathElement | null)[]>([]);
  const tibiaRefs = useRef<(SVGPathElement | null)[]>([]);
  const eyesOpenRef = useRef<SVGGElement>(null);
  const eyesShutRef = useRef<SVGGElement>(null);
  const pupilRefs = useRef<(SVGGElement | null)[]>([]);
  const mouthSmileRef = useRef<SVGPathElement>(null);
  const mouthOhRef = useRef<SVGEllipseElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const settleRef = useRef({
    active: false,
    start: 0,
    energy: 0,
  });

  const ropeRef = useRef<Rope | null>(null);
  const pointer = useRef({ x: -9999, y: -9999 });
  const dragRef = useRef({
    active: false,
    moved: 0,
    start: 0,
  });
  const phaseRef = useRef<Phase>("idle");
  const phaseStart = useRef(0);
  const lengthRef = useRef(TUNING.length.idle);
  const blinkRef = useRef({
    until: 0,
    next: 0,
  });
  const poseRef = useRef({
    squash: 0,
    curl: 0,
    islandPulse: 0,
  });
  const clickRef = useRef(onClick);
  const islandOpenRef = useRef(islandOpen);

  clickRef.current = onClick;
  islandOpenRef.current = islandOpen;

  useEffect(() => {
    const go = (p: Phase) => {
      phaseRef.current = p;
      phaseStart.current = performance.now();
      setPhase(p);
    };

    if (!eventActive) {
      if (phaseRef.current !== "idle") {
        go("returning");

        const home = setTimeout(() => {
          go("idle");
        }, 1400);

        return () => clearTimeout(home);
      }

      return;
    }

    go("waking");

    const a = setTimeout(() => go("stretching"), 300);
    const b = setTimeout(() => go("dropping"), 720);
    const c = setTimeout(() => {
      const rope = ropeRef.current;

      if (rope) {
        const vy = rope.tip.y - rope.tip.py;

        settleRef.current = {
          active: true,
          start: performance.now(),
          energy: clamp(Math.abs(vy) / 18, 0, 1),
        };
      }

      go("alert");
    }, 1800);

    return () => {
      clearTimeout(a);
      clearTimeout(b);
      clearTimeout(c);
    };
  }, [eventActive]);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const prev = pointer.current;

      if (dragRef.current.active) {
        dragRef.current.moved += Math.hypot(
          e.clientX - prev.x,
          e.clientY - prev.y,
        );
      }

      pointer.current = {
        x: e.clientX,
        y: e.clientY,
      };
    };

    const up = () => {
      const drag = dragRef.current;

      if (!drag.active) {
        return;
      }

      drag.active = false;

      ropeRef.current?.releaseTip(TUNING.maxFling);

      const quick = performance.now() - drag.start < 400;

      if (drag.moved < 6 && quick) {
        clickRef.current();
      }
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);

    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);

  const handleGrab = (e: React.PointerEvent) => {
    e.preventDefault();

    (e.target as Element).setPointerCapture?.(e.pointerId);

    pointer.current = {
      x: e.clientX,
      y: e.clientY,
    };

    dragRef.current = {
      active: true,
      moved: 0,
      start: performance.now(),
    };
  };

  useEffect(() => {
    const rope = new Rope(
      {
        x: window.innerWidth / 2,
        y: ANCHOR_Y,
      },
      {
        segments: TUNING.segments,
        length: TUNING.length.idle,
        gravity: TUNING.gravity,
        damping: TUNING.damping,
        iterations: TUNING.iterations,
      },
    );

    ropeRef.current = rope;

    const FIXED = 1 / 60;

    let raf = 0;
    let last = performance.now();
    let acc = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);

      const t = now / 1000;

      acc += Math.min((now - last) / 1000, 0.05);

      last = now;

      const phase = phaseRef.current;

      const settle = settleRef.current;

      const settleTime = (now - settle.start) / 1000;

      const settlePulse =
        settle.active && settleTime < 0.72
          ? Math.sin(Math.min(settleTime / 0.72, 1) * Math.PI * 2.4) *
            settle.energy *
            Math.exp(-settleTime * 4.8)
          : 0;

      if (settle.active && settleTime >= 0.72) {
        settle.active = false;
      }
      const drag = dragRef.current;
      const cursor = pointer.current;
      const island = islandOpenRef.current;

      rope.setAnchor(window.innerWidth / 2, ANCHOR_Y);

      const phaseTarget = TUNING.length[phase];

      const target = island ? TUNING.islandLength : phaseTarget;

      const ease = island
        ? TUNING.islandEase
        : target > lengthRef.current
          ? TUNING.descendEase
          : TUNING.climbEase;

      lengthRef.current += (target - lengthRef.current) * ease;

      rope.setLength(lengthRef.current);

      const tip = rope.tip;

      if (drag.active) {
        rope.force.x = 0;
        rope.force.y = 0;
      } else {
        const dx = cursor.x - tip.x;
        const dy = cursor.y - tip.y;
        const dist = Math.hypot(dx, dy);

        const prox = Math.max(0, 1 - dist / TUNING.cursorRange);

        rope.force.x =
          Math.sign(dx) *
            Math.min(1, Math.abs(dx) / 220) *
            TUNING.cursorPull *
            prox *
            prox +
          Math.sin(t * 0.55) * TUNING.breeze;

        rope.force.y = 0;
      }

      let steps = 0;

      while (acc >= FIXED && steps < 5) {
        if (drag.active) {
          rope.holdTip(cursor.x, cursor.y, TUNING.grabEase);
        }

        rope.step(FIXED);

        acc -= FIXED;
        steps++;
      }

      if (steps === 5) {
        acc = 0;
      }

      const neck = rope.neck;

      threadRef.current?.setAttribute("d", ropePath(rope.points));

      const sx = tip.x - neck.x;
      const sy = tip.y - neck.y;

      const angle = Math.atan2(-sx, sy);

      const idleTilt = phase === "idle" ? Math.sin(t * 0.7) * 1.8 : 0;

      const vx = tip.x - tip.px;
      const vy = tip.y - tip.py;

      const speed = Math.hypot(vx, vy);

      const characterScale = island ? 0.72 : phase === "idle" ? 0.82 : 0.9;

      const islandLift = island ? -18 : 0;

      const pose = poseRef.current;

      const targetSquash = clamp(speed * 0.012, 0, 0.14);

      pose.squash += (targetSquash - pose.squash) * 0.18;

      pose.curl += ((drag.active ? 1 : 0) - pose.curl) * 0.12;

      pose.islandPulse += ((island ? 1 : 0) - pose.islandPulse) * 0.16;

      const islandPulse =
        Math.sin(clamp((now - phaseStart.current) / 360, 0, 1) * Math.PI) *
        0.045 *
        pose.islandPulse;

      const breatheX = Math.sin(t * 1.15) * 0.006;

      const breatheY = Math.sin(t * 1.15) * 0.014;

      const wakePulse =
        phase === "waking"
          ? Math.sin(clamp((now - phaseStart.current) / 380, 0, 1) * Math.PI)
          : 0;

      const wakeLift = wakePulse * -7;

      rigRef.current?.setAttribute(
        "transform",
        `translate(${tip.x.toFixed(2)} ${(
          tip.y +
          islandLift +
          wakeLift +
          settlePulse * 5
        ).toFixed(2)}) rotate(${(angle / RAD + idleTilt).toFixed(
          2,
        )}) scale(${characterScale.toFixed(3)})`,
      );

      const stretchPulse =
        phase === "stretching"
          ? Math.sin(clamp((now - phaseStart.current) / 520, 0, 1) * Math.PI) *
            0.09
          : 0;

      const scaleX = 1 - pose.squash + breatheX + stretchPulse + islandPulse;

      const scaleY =
        1 + pose.squash + breatheY + stretchPulse - islandPulse * 0.55;

      bodyRef.current?.setAttribute(
        "transform",
        `scale(${scaleX.toFixed(3)} ${scaleY.toFixed(3)})`,
      );

      const awake =
        phase !== "idle" ||
        Math.hypot(cursor.x - tip.x, cursor.y - tip.y) < TUNING.wakeDistance;

      const lenMul =
        1 -
        pose.curl * 0.2 +
        stretchPulse * 2.4 +
        (awake ? 0.02 : 0) +
        islandPulse * 0.7;

      const idleAmp = awake ? 1.05 : 0.42;

      const trailX = clamp(-vx * 1.5, -16, 16);

      const trailY = clamp(-vy * 0.9, -10, 12);

      for (let s = 0; s < 2; s++) {
        const side = s === 0 ? 1 : -1;

        for (let i = 0; i < 4; i++) {
          const cfg = LEG_RIG[i];
          const idx = s * 4 + i;

          const hipX = cfg.hx * side;

          const hipY = cfg.hy;

          const fa = (side === 1 ? cfg.fa : 180 - cfg.fa) * RAD;

          const ta = (side === 1 ? cfg.ta : 180 - cfg.ta) * RAD;

          const fl = cfg.fl * lenMul;

          const tl = cfg.tl * lenMul;

          const wob = Math.sin(t * 1.5 + cfg.ph + s * 0.7) * idleAmp;

          let kx = hipX + Math.cos(fa) * fl;

          let ky = hipY + Math.sin(fa) * fl;

          const fx = kx + Math.cos(ta) * tl + trailX + wob * 0.5;

          const fy = ky + Math.sin(ta) * tl + trailY + wob;

          kx += trailX * 0.35;

          ky += trailY * 0.35 + wob * 0.25;

          femurRefs.current[idx]?.setAttribute(
            "d",
            bow(hipX, hipY, kx, ky, 4 * side),
          );

          tibiaRefs.current[idx]?.setAttribute(
            "d",
            bow(kx, ky, fx, fy, 3 * side),
          );
        }
      }

      const blink = blinkRef.current;

      if (awake && now > blink.next) {
        blink.until = now + 110;

        blink.next = now + 2200 + Math.random() * 3800;
      }

      const shut = !awake || now < blink.until;

      eyesOpenRef.current?.setAttribute("opacity", shut ? "0" : "1");

      eyesShutRef.current?.setAttribute("opacity", shut ? "1" : "0");

      const ct = Math.cos(-angle);
      const st = Math.sin(-angle);

      const rx = cursor.x - tip.x;

      const ry = cursor.y - tip.y;

      const lx = rx * ct - ry * st;

      const ly = rx * st + ry * ct;

      for (let i = 0; i < 2; i++) {
        const ex = i === 0 ? -8.5 : 8.5;

        const ey = 16;

        const ddx = lx - ex;

        const ddy = ly - ey;

        const d = Math.hypot(ddx, ddy) || 1;

        pupilRefs.current[i]?.setAttribute(
          "transform",
          `translate(${((ddx / d) * 2.8).toFixed(2)} ${(
            (ddy / d) *
            2.8
          ).toFixed(2)})`,
        );
      }

      mouthSmileRef.current?.setAttribute(
        "opacity",
        (1 - pose.curl).toFixed(2),
      );

      mouthOhRef.current?.setAttribute("opacity", pose.curl.toFixed(2));

      if (bubbleRef.current) {
        const bx = clamp(tip.x + 54, 12, window.innerWidth - 365);

        bubbleRef.current.style.transform = `translate3d(${bx.toFixed(1)}px, ${(
          tip.y - 22
        ).toFixed(1)}px, 0)`;
      }
    };

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <radialGradient id="mb-body" cx="38%" cy="28%" r="78%">
            <stop offset="0%" stopColor="#2e2650" />
            <stop offset="55%" stopColor="#191331" />
            <stop offset="100%" stopColor="#0a0812" />
          </radialGradient>

          <linearGradient id="mb-silk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#b9a8ff" stopOpacity="0.18" />
            <stop offset="35%" stopColor="#e6dfff" stopOpacity="0.48" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.62" />
          </linearGradient>

          <linearGradient id="bubble-surface" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.99" />
            <stop offset="48%" stopColor="#f5f1ff" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#ddd5f5" stopOpacity="0.96" />
          </linearGradient>

          <linearGradient id="bubble-edge" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#b9a8d8" stopOpacity="0.55" />
          </linearGradient>

          <filter
            id="bubble-shadow"
            x="-20%"
            y="-30%"
            width="150%"
            height="170%"
          >
            <feDropShadow
              dx="0"
              dy="12"
              stdDeviation="12"
              floodColor="#000000"
              floodOpacity="0.28"
            />
          </filter>
        </defs>

        <path
          ref={threadRef}
          fill="none"
          stroke="url(#mb-silk)"
          strokeWidth="1.15"
          strokeLinecap="round"
        />

        <g ref={rigRef}>
          <g ref={bodyRef}>
            <g
              fill="none"
              stroke="#e7dfff"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {Array.from({
                length: 8,
              }).map((_, i) => (
                <path
                  key={`femur-${i}`}
                  ref={(el) => {
                    femurRefs.current[i] = el;
                  }}
                  strokeWidth={2.8}
                />
              ))}

              {Array.from({
                length: 8,
              }).map((_, i) => (
                <path
                  key={`tibia-${i}`}
                  ref={(el) => {
                    tibiaRefs.current[i] = el;
                  }}
                  strokeWidth={1.8}
                  opacity={0.78}
                />
              ))}
            </g>

            <ellipse
              cx="0"
              cy="20"
              rx="34"
              ry="32"
              fill="#7c5cff"
              opacity="0.055"
            />

            <ellipse
              cx="0"
              cy="3"
              rx="11.5"
              ry="8.8"
              fill="url(#mb-body)"
              stroke="#b9a8ff"
              strokeOpacity="0.35"
              strokeWidth="1"
            />

            <ellipse
              cx="0"
              cy="20"
              rx="22"
              ry="19"
              fill="url(#mb-body)"
              stroke="#c3b4ff"
              strokeOpacity="0.4"
              strokeWidth="1.1"
            />

            <ellipse
              cx="-7"
              cy="7"
              rx="7"
              ry="4.4"
              fill="#ffffff"
              opacity="0.12"
              transform="rotate(-22 -7 7)"
            />

            <g ref={eyesOpenRef} opacity="0">
              <ellipse cx="-8.5" cy="16" rx="6.4" ry="7.6" fill="#fbfaff" />

              <ellipse cx="8.5" cy="16" rx="6.4" ry="7.6" fill="#fbfaff" />

              <g
                ref={(el) => {
                  pupilRefs.current[0] = el;
                }}
              >
                <circle cx="-8.5" cy="16" r="3.15" fill="#120e1d" />

                <circle cx="-9.9" cy="14.4" r="1.25" fill="#ffffff" />
              </g>

              <g
                ref={(el) => {
                  pupilRefs.current[1] = el;
                }}
              >
                <circle cx="8.5" cy="16" r="3.15" fill="#120e1d" />

                <circle cx="7.1" cy="14.4" r="1.25" fill="#ffffff" />
              </g>
            </g>

            <g
              ref={eyesShutRef}
              fill="none"
              stroke="#e7dfff"
              strokeWidth="2.6"
              strokeLinecap="round"
            >
              <path d="M -14 15 Q -8.5 21 -3 15" />
              <path d="M 3 15 Q 8.5 21 14 15" />
            </g>

            <path
              ref={mouthSmileRef}
              d="M -5.5 29 Q 0 34 5.5 29"
              fill="none"
              stroke="#ff8fc4"
              strokeWidth="2.2"
              strokeLinecap="round"
            />

            <ellipse
              ref={mouthOhRef}
              cx="0"
              cy="30"
              rx="3"
              ry="3.6"
              fill="#ff8fc4"
              opacity="0"
            />

            <circle
              cx="0"
              cy="18"
              r="36"
              fill="transparent"
              className="pointer-events-auto cursor-grab active:cursor-grabbing"
              onPointerDown={handleGrab}
              role="button"
              tabIndex={0}
              aria-label="Open MyBuddy"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick();
                }
              }}
            />
          </g>
        </g>
      </svg>

      <div
        ref={bubbleRef}
        className="absolute left-0 top-0 z-10 will-change-transform"
      >
        <AnimatePresence>
          {phase === "alert" && event && !islandOpen && (
            <motion.div
              initial={{
                opacity: 0,
                x: -12,
                y: 8,
                scale: 0.92,
              }}
              animate={{
                opacity: 1,
                x: 0,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                x: -8,
                y: 5,
                scale: 0.94,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 24,
                mass: 0.72,
              }}
              className="relative h-[166px] w-[342px]"
            >
              <svg
                viewBox="0 0 342 166"
                className="absolute inset-0 h-full w-full overflow-visible"
                aria-hidden="true"
              >
                <path
                  d="
                      M 42 18
                      C 58 7, 84 8, 108 11
                      C 137 3, 171 7, 194 13
                      C 223 5, 253 10, 274 24
                      C 302 26, 325 45, 328 69
                      C 336 93, 323 119, 301 128
                      C 286 146, 256 151, 230 146
                      C 207 157, 177 155, 156 148
                      C 129 157, 99 153, 82 141
                      C 55 146, 30 132, 27 111
                      C 8 98, 10 73, 24 59
                      C 18 39, 27 25, 42 18
                      Z
                    "
                  fill="url(#bubble-surface)"
                  stroke="url(#bubble-edge)"
                  strokeWidth="1.2"
                  filter="url(#bubble-shadow)"
                />

                <path
                  d="
                      M 42 18
                      C 58 7, 84 8, 108 11
                      C 137 3, 171 7, 194 13
                      C 223 5, 253 10, 274 24
                    "
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.72"
                />

                <path
                  d="
                      M 28 111
                      C 34 120, 45 126, 58 128
                    "
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="1"
                  strokeLinecap="round"
                  opacity="0.45"
                />

                <path
                  d="
                      M 28 80
                      C 18 78, 9 81, 2 88
                      C 12 87, 20 91, 27 97
                    "
                  fill="url(#bubble-surface)"
                  stroke="#c5b9dc"
                  strokeWidth="1"
                  strokeLinejoin="round"
                />
              </svg>

              <div className="absolute inset-0 px-[57px] py-[27px]">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#74668e]">
                    {event.type}
                  </span>

                  <span className="h-[3px] w-[3px] rounded-full bg-[#b3a6c9]" />
                </div>

                <p className="mt-2 text-[17px] font-semibold leading-[1.18] tracking-[-0.025em] text-[#17131f]">
                  {event.title}
                </p>

                <p className="mt-2 max-w-[235px] text-[12.5px] leading-[1.48] text-[#686073]">
                  {event.message}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function bow(x1: number, y1: number, x2: number, y2: number, amount: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;

  const cx = (x1 + x2) / 2 + (-dy / len) * amount;

  const cy = (y1 + y2) / 2 + (dx / len) * amount;

  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} Q ${cx.toFixed(2)} ${cy.toFixed(
    2,
  )} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}
