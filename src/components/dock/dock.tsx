import {
    useEffect,
    useRef,
    useState,
    type KeyboardEvent,
    type PointerEvent,
  } from "react";
  import { motion } from "framer-motion";
  import { dockBridge } from "../../services/dock/dockBridge";
  import {
    settingsService,
    useSettings,
  } from "../../services/settings/settingsStore";
  import { SPRING_OPEN, SURFACE } from "../notch/notchTokens";
  
  const WIDTH = 60;
  const HEIGHT = 12;
  const EDGE = 8;
  const THRESHOLD = 5;
  const NUDGE = 24;
  const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
  
  const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
  
  const regionFor = (centerX: number) => ({
    x: centerX - WIDTH / 2,
    y: 0,
    w: WIDTH,
    h: HEIGHT,
  });
  
  type Press = {
    startX: number;
    startY: number;
    originX: number;
    moved: boolean;
  };
  
  export default function Dock() {
    const { dockX } = useSettings();
    const [viewport, setViewport] = useState(() => window.innerWidth);
    const [dragX, setDragX] = useState<number | null>(null);
    const [hover, setHover] = useState(false);
    const press = useRef<Press | null>(null);
  
    const min = WIDTH / 2 + EDGE;
    const max = Math.max(min, viewport - WIDTH / 2 - EDGE);
    const restX = clamp(dockX * viewport, min, max);
    const x = dragX ?? restX;
    const active = hover || dragX !== null;
  
    useEffect(() => {
      const onResize = () => setViewport(window.innerWidth);
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }, []);
  
    useEffect(() => {
      dockBridge.enter(regionFor(restX));
    }, [restX]);
  
    useEffect(() => () => dockBridge.leave(), []);
  
    const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      press.current = { startX: e.clientX, startY: e.clientY, originX: x, moved: false };
      dockBridge.hold(true);
    };
  
    const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
      const p = press.current;
      if (!p) return;
      const dx = e.clientX - p.startX;
      const dy = e.clientY - p.startY;
      if (!p.moved && Math.hypot(dx, dy) > THRESHOLD) p.moved = true;
      if (p.moved) setDragX(clamp(p.originX + dx, min, max));
    };
  
    const finish = (e: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
      const p = press.current;
      if (!p) return;
      press.current = null;
      dockBridge.hold(false);
  
      if (p.moved) {
        const finalX = clamp(p.originX + (e.clientX - p.startX), min, max);
        settingsService.set("dockX", finalX / viewport);
        setDragX(null);
        return;
      }
      if (!cancelled) settingsService.set("notchEnabled", true);
    };
  
    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        settingsService.set("notchEnabled", true);
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const next = clamp(restX + (e.key === "ArrowLeft" ? -NUDGE : NUDGE), min, max);
        settingsService.set("dockX", next / viewport);
      }
    };
  
    return (
      <motion.div
        role="button"
        tabIndex={0}
        aria-label="Show MyBuddy"
        title="Show MyBuddy"
        className={`fixed top-0 z-[70] touch-none select-none outline-none ${
          dragX !== null ? "cursor-grabbing" : "cursor-grab"
        }`}
        style={{ left: x - WIDTH / 2, width: WIDTH, height: HEIGHT }}
        initial={{ opacity: 0, y: -6 }}
        animate={{
          opacity: 1,
          y: 0,
          transition: { delay: 0.16, duration: 0.2, ease: EASE },
        }}
        exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => finish(e, false)}
        onPointerCancel={(e) => finish(e, true)}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        onKeyDown={onKeyDown}
      >
        <motion.div
          className="mx-auto flex items-center justify-center gap-1"
          style={{
            backgroundColor: SURFACE,
            borderRadius: "0 0 8px 8px",
            boxShadow:
              "inset 0 -1px 0 rgba(255,255,255,0.08), 0 4px 10px -4px rgba(0,0,0,0.5)",
          }}
          animate={{ width: active ? 56 : 48, height: active ? 10 : 7 }}
          transition={SPRING_OPEN}
        >
          <span className="h-px w-3 bg-white/15" />
          <span
            className={`h-[3px] w-[3px] rounded-full transition-colors duration-150 ${
              active ? "bg-white/80" : "bg-white/55"
            }`}
          />
          <span className="h-px w-3 bg-white/15" />
        </motion.div>
      </motion.div>
    );
  }