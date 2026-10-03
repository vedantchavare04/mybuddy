import { useEffect, useRef, useState } from "react";
import type { CompanionEvent } from "../../events/eventTypes";
import { calendarService } from "../../services/calendar/calendarService";
import { mediaService } from "../../services/media/mediaService";
import { notificationService } from "../../services/notifications/notificationStore";
import {
  selectionService,
  useSelection,
} from "../../services/selection/selectionService";
import { speechService } from "../../services/speech/speechService";
import NotchShell from "./notchShell";
import { useNotchDismiss } from "./useNotchDismiss";
import { useNotchNav } from "./useNotchNav";
import { RADIUS, SIZES, type NotchMode, type NotchView } from "./notchTokens";
import type { Route } from "./notchRoutes";
import { IdleCompact } from "./views/idleViews";
import { EventActive, EventExpanded } from "./views/eventViews";
import { HomeView } from "./views/homeView";
import { ToolsView } from "./views/toolsView";
import { MusicView } from "./views/musicView";
import { CalendarView } from "./views/calendarView";
import { CalendarCreateView } from "./views/calendarCreateView";
import { NotificationsView } from "./views/notificationsView";
import { TranslateView } from "./views/translateView";
import { SpeechView } from "./views/speechView";
import { SettingsView } from "./views/settingsView";

type NotchProps = {
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
  const nav = useNotchNav(expanded, event !== null);
  const { pending } = useSelection();

  useNotchDismiss(shellRef, expanded, onCollapse);

  useEffect(() => {
    mediaService.start();
    speechService.start();
    selectionService.start();
    notificationService.start();
    calendarService.start();
  }, []);

  useEffect(() => {
    if (!pending) return;
    onExpand();
    nav.go(pending.intent === "translate" ? "translate" : "speech");
  }, [pending?.nonce]);

  const mode: NotchMode = expanded ? "expanded" : event ? "active" : "compact";

  const view = resolveView();
  const size = mode === "compact" && hover ? SIZES.compactHover : view.size;

  function resolveView(): NotchView {
    const expandedView = (
      key: string,
      size: NotchView["size"],
      node: React.ReactNode,
    ): NotchView => ({
      key,
      size,
      radius: RADIUS.expanded,
      node,
    });

    if (mode === "expanded") {
      const route: Route = nav.route === "event" && !event ? "home" : nav.route;
      const back = nav.back;

      switch (route) {
        case "event":
          return expandedView(
            "event",
            SIZES.eventExpanded,
            <EventExpanded
              event={event!}
              onCollapse={onCollapse}
              onMenu={() => nav.go("home")}
              onAction={onAction}
              actionLabel={actionLabel}
            />,
          );
        case "music":
          return expandedView(
            "music",
            SIZES.music,
            <MusicView onBack={back} onCollapse={onCollapse} />,
          );
        case "calendar":
          return expandedView(
            "calendar",
            SIZES.calendar,
            <CalendarView
              onBack={back}
              onCollapse={onCollapse}
              onSchedule={() => nav.go("calendar/new")}
            />,
          );
        case "calendar/new":
          return expandedView(
            "calendar/new",
            SIZES.calendarCreate,
            <CalendarCreateView
              onBack={back}
              onCollapse={onCollapse}
              onDone={back}
            />,
          );
        case "notifications":
          return expandedView(
            "notifications",
            SIZES.notifications,
            <NotificationsView onBack={back} onCollapse={onCollapse} />,
          );
        case "tools":
          return expandedView(
            "tools",
            SIZES.tools,
            <ToolsView onBack={back} onCollapse={onCollapse} onOpen={nav.go} />,
          );
        case "translate":
          return expandedView(
            "translate",
            SIZES.translate,
            <TranslateView onBack={back} onCollapse={onCollapse} />,
          );
        case "speech":
          return expandedView(
            "speech",
            SIZES.speech,
            <SpeechView onBack={back} onCollapse={onCollapse} />,
          );
        case "settings":
          return expandedView(
            "settings",
            SIZES.settings,
            <SettingsView onBack={back} onCollapse={onCollapse} />,
          );
        case "home":
        default:
          return expandedView(
            "home",
            SIZES.home,
            <HomeView
              event={event}
              onOpen={nav.go}
              onSettings={() => nav.go("settings")}
              onBack={event ? back : undefined}
              onCollapse={onCollapse}
            />,
          );
      }
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

  return (
    <NotchShell
      shellRef={shellRef}
      mode={mode}
      size={size}
      contentSize={view.size}
      radius={view.radius}
      layerKey={view.key}
      direction={nav.direction}
      label={expanded ? (event?.title ?? "MyBuddy") : "Open MyBuddy"}
      onActivate={onExpand}
      onHoverChange={setHover}
    >
      {view.node}
    </NotchShell>
  );
}
