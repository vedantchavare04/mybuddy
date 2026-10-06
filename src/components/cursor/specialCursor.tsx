import {
  memo,
  useEffect,
  useId,
  useState,
} from "react";
import {
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  ART_VIEWBOX,
  COLORS,
  CURSOR_SIZE_PX,
  DETAIL_WIDTH,
  EFFECT_DURATION_S,
  HAND_DETAIL_PATHS,
  HAND_FOLD_PATHS,
  HAND_OUTLINE_PATH,
  HAND_SHADE_PATHS,
  MAX_CONCURRENT_EFFECTS,
  OUTLINE_WIDTH,
  RAYS,
  RAY_WIDTH,
} from "./cursorTokens";
import {
  CURSOR_HEIGHT_PX,
  FINGERTIP_OFFSET_PX,
  isValidClick,
  isValidCursorPosition,
  type CursorButton,
  type CursorClick,
  type CursorClickBus,
  type CursorPosition,
} from "./cursorEffect";

type CursorButtonState = {
  button: CursorButton;
  pressed: boolean;
  x: number;
  y: number;
};

type SpecialCursorProps = {
  bus: CursorClickBus;
  position?: CursorPosition | null;
  enabled?: boolean;
};

type ClickEffectProps = {
  click: CursorClick;
  reducedMotion: boolean;
  onComplete: (id: string) => void;
};

const ClickEffect = memo(function ClickEffect({
  click,
  reducedMotion,
  onComplete,
}: ClickEffectProps) {
  const filterId = useId();

  const left =
    click.x - FINGERTIP_OFFSET_PX.x;

  const top =
    click.y - FINGERTIP_OFFSET_PX.y;

  return (
    <motion.div
      className="pointer-events-none fixed z-[9999]"
      style={{
        left,
        top,
        width: CURSOR_SIZE_PX,
        height: CURSOR_HEIGHT_PX,
      }}
      initial={{
        opacity: 0,
        scale: 0.72,
      }}
      animate={
        reducedMotion
          ? {
              opacity: 0,
              scale: 1,
            }
          : {
              opacity: [0, 1, 1, 0],
              scale: [0.72, 1, 1.08, 1.18],
            }
      }
      transition={
        reducedMotion
          ? {
              duration: 0.08,
            }
          : {
              duration: Math.max(
                EFFECT_DURATION_S,
                0.42,
              ),
              times: [0, 0.12, 0.45, 1],
              ease: "easeOut",
            }
      }
      onAnimationComplete={() => {
        onComplete(click.id);
      }}
    >
      <svg
        width={CURSOR_SIZE_PX}
        height={CURSOR_HEIGHT_PX}
        viewBox={`${ART_VIEWBOX.x} ${ART_VIEWBOX.y} ${ART_VIEWBOX.w} ${ART_VIEWBOX.h}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{
          overflow: "visible",
        }}
      >
        <defs>
          <filter
            id={filterId}
            x="-100%"
            y="-100%"
            width="300%"
            height="300%"
          >
            <feGaussianBlur
              stdDeviation="1.2"
            />
          </filter>
        </defs>

        <g
          stroke={COLORS.ray}
          strokeWidth={RAY_WIDTH}
          strokeLinecap="round"
          opacity={0.28}
          filter={`url(#${filterId})`}
        >
          {RAYS.map(
            ([x1, y1, x2, y2], index) => (
              <line
                key={`blur-${index}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
              />
            ),
          )}
        </g>

        <g
          stroke={COLORS.ray}
          strokeWidth={RAY_WIDTH}
          strokeLinecap="round"
        >
          {RAYS.map(
            ([x1, y1, x2, y2], index) => (
              <line
                key={`ray-${index}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
              />
            ),
          )}
        </g>
      </svg>
    </motion.div>
  );
});

type GloveCursorProps = {
  position: CursorPosition;
  reducedMotion: boolean;
};

const GloveCursor = memo(function GloveCursor({
  position,
  reducedMotion,
}: GloveCursorProps) {
  const transformX =
    position.x - FINGERTIP_OFFSET_PX.x;

  const transformY =
    position.y - FINGERTIP_OFFSET_PX.y;

  return (
    <motion.div
      className="pointer-events-none fixed z-[10000]"
      style={{
        left: transformX,
        top: transformY,
        width: CURSOR_SIZE_PX,
        height: CURSOR_HEIGHT_PX,
      }}
      initial={false}
      animate={{
        x: 0,
        y: 0,
      }}
      transition={
        reducedMotion
          ? {
              duration: 0,
            }
          : {
              type: "spring",
              stiffness: 900,
              damping: 45,
              mass: 0.2,
            }
      }
    >
      <svg
        width={CURSOR_SIZE_PX}
        height={CURSOR_HEIGHT_PX}
        viewBox={`${ART_VIEWBOX.x} ${ART_VIEWBOX.y} ${ART_VIEWBOX.w} ${ART_VIEWBOX.h}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d={HAND_OUTLINE_PATH}
          fill={COLORS.glove}
          stroke={COLORS.outline}
          strokeWidth={OUTLINE_WIDTH}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {HAND_SHADE_PATHS.map(
          (path, index) => (
            <path
              key={`shade-${index}`}
              d={path}
              fill={COLORS.gloveShade}
              stroke={COLORS.outline}
              strokeWidth={DETAIL_WIDTH}
              strokeLinejoin="round"
            />
          ),
        )}

        {HAND_FOLD_PATHS.map(
          (path, index) => (
            <path
              key={`fold-${index}`}
              d={path}
              fill="none"
              stroke={COLORS.outline}
              strokeWidth={DETAIL_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ),
        )}

        {HAND_DETAIL_PATHS.map(
          (path, index) => (
            <path
              key={`detail-${index}`}
              d={path}
              fill="none"
              stroke={COLORS.outline}
              strokeWidth={DETAIL_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ),
        )}
      </svg>
    </motion.div>
  );
});

type IBeamCursorProps = {
  position: CursorPosition;
};

const IBeamCursor = memo(function IBeamCursor({
  position,
}: IBeamCursorProps) {
  const [isDark, setIsDark] = useState(() =>
    window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      "(prefers-color-scheme: dark)",
    );

    const handleThemeChange = (
      event: MediaQueryListEvent,
    ) => {
      setIsDark(event.matches);
    };

    mediaQuery.addEventListener(
      "change",
      handleThemeChange,
    );

    return () => {
      mediaQuery.removeEventListener(
        "change",
        handleThemeChange,
      );
    };
  }, []);

  const cursorColor = isDark
    ? "#ffffff"
    : "#0d0d0d";

  return (
    <div
      className="pointer-events-none fixed z-[10000]"
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div
        style={{
          position: "relative",
          width: 10,
          height: 20,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 8,
            top: 2,
            width: 2,
            height: 15,
            borderRadius: 999,
            background: cursorColor,
          }}
        />

        <div
          style={{
            position: "absolute",
            left: 2,
            top: 2,
            width: 12,
            height: 2,
            borderRadius: 999,
            background: cursorColor,
          }}
        />

        <div
          style={{
            position: "absolute",
            left: 2,
            bottom: 2,
            width: 12,
            height: 2,
            borderRadius: 999,
            background: cursorColor,
          }}
        />
      </div>
    </div>
  );
});

function SpecialCursor({
  bus,
  position = null,
  enabled = true,
}: SpecialCursorProps) {
  const [effects, setEffects] =
    useState<CursorClick[]>([]);

  const [buttonState, setButtonState] =
    useState<CursorButtonState | null>(
      null,
    );

  const [selectionMode, setSelectionMode] =
    useState(false);

  const [typing, setTyping] =
    useState(false);

  const reducedMotion =
    useReducedMotion();

  useEffect(() => {
    if (!enabled) {
      setEffects([]);
      return;
    }

    return bus.subscribe((click) => {
      if (!isValidClick(click)) {
        return;
      }

      setEffects((current) => {
        const next = [
          ...current,
          click,
        ];

        if (
          next.length >
          MAX_CONCURRENT_EFFECTS
        ) {
          return next.slice(
            next.length -
              MAX_CONCURRENT_EFFECTS,
          );
        }

        return next;
      });
    });
  }, [bus, enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleButton = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<CursorButtonState>;

      const next =
        customEvent.detail;

      setButtonState(next);

      if (
        next.button === "left" &&
        next.pressed === false
      ) {
        setSelectionMode(false);
      }
    };

    window.addEventListener(
      "mybuddy-cursor-button",
      handleButton,
    );

    return () => {
      window.removeEventListener(
        "mybuddy-cursor-button",
        handleButton,
      );
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleMove = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<CursorPosition>;

      const next =
        customEvent.detail;

      if (
        !isValidCursorPosition(next)
      ) {
        return;
      }

      setTyping(false);

      if (
        buttonState?.button === "left" &&
        buttonState.pressed
      ) {
        const dx =
          next.x - buttonState.x;

        const dy =
          next.y - buttonState.y;

        const distance =
          Math.sqrt(
            dx * dx +
              dy * dy,
          );

        if (distance > 5) {
          setSelectionMode(true);
        }
      }
    };

    window.addEventListener(
      "mybuddy-cursor-move",
      handleMove,
    );

    return () => {
      window.removeEventListener(
        "mybuddy-cursor-move",
        handleMove,
      );
    };
  }, [
    enabled,
    buttonState,
  ]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyboard = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<{
          pressed: boolean;
          vk_code: number;
        }>;

      const keyboard =
        customEvent.detail;

      if (keyboard.pressed) {
        setTyping(true);
        setSelectionMode(false);
      }
    };

    window.addEventListener(
      "mybuddy-cursor-keyboard",
      handleKeyboard,
    );

    return () => {
      window.removeEventListener(
        "mybuddy-cursor-keyboard",
        handleKeyboard,
      );
    };
  }, [enabled]);

  if (
    !enabled ||
    position === null
  ) {
    return null;
  }

  return (
    <>
      {!typing &&
        !selectionMode && (
          <GloveCursor
            position={position}
            reducedMotion={
              reducedMotion === true
            }
          />
        )}

      {!typing &&
        selectionMode && (
          <IBeamCursor
            position={position}
          />
        )}

      {effects.map((click) => (
        <ClickEffect
          key={click.id}
          click={click}
          reducedMotion={
            reducedMotion === true
          }
          onComplete={(id) => {
            setEffects((current) =>
              current.filter(
                (item) =>
                  item.id !== id,
              ),
            );
          }}
        />
      ))}
    </>
  );
}

export default memo(
  SpecialCursor,
);