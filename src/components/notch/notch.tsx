import { useRef, useState } from "react";
import type { CompanionEvent } from "../../events/eventTypes";
import NotchShell from "./notchShell";
import { useNotchDismiss } from "./useNotchDismiss";
import { RADIUS, SIZES, type NotchMode, type NotchView } from "./notchTokens";
import { IdleCompact, IdleExpanded } from "./views/idleViews";
import { EventActive, EventExpanded } from "./views/eventViews";

type NotchProps = {
  /** pass null when there is nothing to show */
  event: CompanionEvent | null;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onAction?: () => void;
  actionLabel?: string;
};

export default function Notch({
  event,
  expanded,
  onExpand,
  onCollapse,
  onAction,
  actionLabel,
}: NotchProps) {
  const [hover, setHover] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);

  useNotchDismiss(shellRef, expanded, onCollapse);

  const mode: NotchMode = expanded ? "expanded" : event ? "active" : "compact";

  const view: NotchView = resolveView({
    mode,
    event,
    onCollapse,
    onAction,
    actionLabel,
  });

  // hover only nudges the idle notch; active and expanded already have presence
  const size = mode === "compact" && hover ? SIZES.compactHover : view.size;

  return (
    <NotchShell
      shellRef={shellRef}
      mode={mode}
      size={size}
      contentSize={view.size}
      radius={view.radius}
      layerKey={view.key}
      label={expanded ? event?.title ?? "MyBuddy" : "Open MyBuddy"}
      onActivate={onExpand}
      onHoverChange={setHover}
    >
      {view.node}
    </NotchShell>
  );
}

function resolveView({
  mode,
  event,
  onCollapse,
  onAction,
  actionLabel,
}: {
  mode: NotchMode;
  event: CompanionEvent | null;
  onCollapse: () => void;
  onAction?: () => void;
  actionLabel?: string;
}): NotchView {
  if (mode === "expanded") {
    return event
      ? {
          key: "event-expanded",
          size: SIZES.eventExpanded,
          radius: RADIUS.expanded,
          node: (
            <EventExpanded
              event={event}
              onCollapse={onCollapse}
              onAction={onAction}
              actionLabel={actionLabel}
            />
          ),
        }
      : {
          key: "idle-expanded",
          size: SIZES.idleExpanded,
          radius: RADIUS.expanded,
          node: <IdleExpanded onCollapse={onCollapse} />,
        };
  }

  if (mode === "active" && event) {
    return {
      key: "event-active",
      size: SIZES.active,
      radius: RADIUS.active,
      node: <EventActive event={event} />,
    };
  }

  return {
    key: "idle-compact",
    size: SIZES.compact,
    radius: RADIUS.compact,
    node: <IdleCompact />,
  };
}