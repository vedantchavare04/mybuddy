import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  EAR,
  RADIUS,
  SIZES,
  SPRING_CLOSE,
  SPRING_OPEN,
  SURFACE,
  type NotchMode,
  type NotchSize,
} from "./notchTokens";

type Props = {
  shellRef: Ref<HTMLDivElement>;
  mode: NotchMode;
  size: NotchSize;
  contentSize: NotchSize;
  radius: number;
  layerKey: string;
  /** 1 = navigating forward, -1 = back, 0 = no slide */
  direction: number;
  label: string;
  onActivate: () => void;
  onHoverChange: (hover: boolean) => void;
  children: ReactNode;
};

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const layerVariants: Variants = {
  enter: (d: number) => ({ opacity: 0, x: d * 14, filter: "blur(5px)" }),
  center: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: { delay: 0.07, duration: 0.22, ease: EASE },
  },
  exit: (d: number) => ({
    opacity: 0,
    x: d * -10,
    filter: "blur(3px)",
    transition: { duration: 0.09 },
  }),
};

export default function NotchShell({
  shellRef,
  mode,
  size,
  contentSize,
  radius,
  layerKey,
  direction,
  label,
  onActivate,
  onHoverChange,
  children,
}: Props) {
  const expanded = mode === "expanded";

  const area = size.width * size.height;
  const prevArea = useRef(0);
  const spring = area >= prevArea.current ? SPRING_OPEN : SPRING_CLOSE;

  useEffect(() => {
    prevArea.current = area;
  }, [area]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (expanded) return;

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onActivate();
    }
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center antialiased">
      <motion.div
        ref={shellRef}
        data-mybuddy-notch="true"
        className="pointer-events-auto relative"
        style={{ transformOrigin: "50% 0%" }}
        initial={{ width: SIZES.compact.width * 0.8, height: 0 }}
        animate={{ width: size.width, height: size.height }}
        exit={{
          width: SIZES.compact.width * 0.8,
          height: 0,
          opacity: 0,
        }}
        transition={spring}
        whileTap={expanded ? undefined : { scale: 0.97 }}
        onPointerEnter={() => onHoverChange(true)}
        onPointerLeave={() => onHoverChange(false)}
      >
        <Ear side="left" />
        <Ear side="right" />

        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-b-[30px] shadow-[0_28px_60px_-18px_rgba(0,0,0,0.6)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: expanded ? 1 : 0 }}
          transition={{ duration: 0.25 }}
        />

        <motion.div
          role={expanded ? "dialog" : "button"}
          aria-label={label}
          tabIndex={expanded ? -1 : 0}
          onClick={expanded ? undefined : onActivate}
          onKeyDown={onKeyDown}
          initial={{
            borderBottomLeftRadius: RADIUS.compact,
            borderBottomRightRadius: RADIUS.compact,
          }}
          animate={{
            borderBottomLeftRadius: radius,
            borderBottomRightRadius: radius,
          }}
          transition={spring}
          style={{ backgroundColor: SURFACE }}
          className={`
            absolute inset-0 overflow-hidden outline-none
            shadow-[0_8px_20px_-8px_rgba(0,0,0,0.5),inset_1px_0_0_rgba(255,255,255,0.04),inset_-1px_0_0_rgba(255,255,255,0.04),inset_0_-1px_0_rgba(255,255,255,0.07)]
            focus-visible:shadow-[0_8px_20px_-8px_rgba(0,0,0,0.5),0_0_0_2px_rgba(255,255,255,0.35)]
            ${expanded ? "cursor-default" : "cursor-pointer"}
          `}
        >
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={layerKey}
              custom={direction}
              variants={layerVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute top-0"
              style={{
                width: contentSize.width,
                height: contentSize.height,
                left: "50%",
                marginLeft: -contentSize.width / 2,
              }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
}

function Ear({ side }: { side: "left" | "right" }) {
  const w = EAR + 0.5;

  const d =
    side === "left"
      ? `M0 0H${w}V${EAR}H${EAR}Q${EAR} 0 0 0Z`
      : `M${w} 0H0V${EAR}H0.5Q0.5 0 ${w} 0Z`;

  return (
    <svg
      aria-hidden="true"
      width={w}
      height={EAR}
      viewBox={`0 0 ${w} ${EAR}`}
      className="pointer-events-none absolute top-0"
      style={
        side === "left"
          ? { right: "calc(100% - 0.5px)" }
          : { left: "calc(100% - 0.5px)" }
      }
    >
      <path d={d} fill={SURFACE} />
    </svg>
  );
}
