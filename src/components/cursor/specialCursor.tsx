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
    FINGERTIP_ORIGIN,
    HAND_DETAIL_PATHS,
    HAND_FOLD_PATHS,
    HAND_OUTLINE_PATH,
    HAND_SHADE_PATHS,
    MAX_CONCURRENT_EFFECTS,
    MOTION,
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
  
    return (
      <motion.div
        className="pointer-events-none fixed z-[9999]"
        style={{
          left: click.x,
          top: click.y,
          width: CURSOR_SIZE_PX,
          height: CURSOR_HEIGHT_PX,
          transform: "translate(-50%, -50%)",
        }}
        initial={{
          opacity: 1,
          scale: 1,
        }}
        animate={
            reducedMotion
              ? {
                  opacity: 0,
                }
              : {
                  opacity: [...MOTION.rays.opacity],
                  scale: [...MOTION.rays.scale],
                }
          }
        transition={
          reducedMotion
            ? {
                duration: 0.08,
              }
            : {
                duration: EFFECT_DURATION_S,
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
                stdDeviation="1.5"
                result="blur"
              />
            </filter>
          </defs>
  
          <g
            stroke={COLORS.ray}
            strokeWidth={RAY_WIDTH}
            strokeLinecap="round"
            filter={`url(#${filterId})`}
          >
            {RAYS.map(
              ([x1, y1, x2, y2], index) => (
                <line
                  key={index}
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
                  key={`sharp-${index}`}
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
            width: 18,
            height: 34,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 8,
              top: 2,
              width: 2,
              height: 30,
              borderRadius: 999,
              background: COLORS.outline,
            }}
          />
  
          <div
            style={{
              position: "absolute",
              left: 2,
              top: 2,
              width: 14,
              height: 2,
              borderRadius: 999,
              background: COLORS.outline,
            }}
          />
  
          <div
            style={{
              position: "absolute",
              left: 2,
              bottom: 2,
              width: 14,
              height: 2,
              borderRadius: 999,
              background: COLORS.outline,
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
    const [effects, setEffects] = useState<
      CursorClick[]
    >([]);
  
    const [buttonState, setButtonState] =
      useState<CursorButtonState | null>(
        null,
      );
  
    const [selectionMode, setSelectionMode] =
      useState(false);
  
    const reducedMotion =
      useReducedMotion();
  
    useEffect(() => {
      if (!enabled) {
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
  
        if (
          buttonState?.button === "left" &&
          buttonState.pressed &&
          position
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
      position,
    ]);
  
    useEffect(() => {
      if (!enabled) {
        return;
      }
  
      return bus.subscribe(() => {});
    }, [bus, enabled]);
  
    if (
      !enabled ||
      position === null
    ) {
      return null;
    }
  
    return (
      <>
        {!selectionMode && (
          <GloveCursor
            position={position}
            reducedMotion={
              reducedMotion === true
            }
          />
        )}
  
        {selectionMode && (
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
  
  export default memo(SpecialCursor);