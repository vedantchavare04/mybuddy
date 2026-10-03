import {
  Bell,
  Calendar,
  Music,
  Settings,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { CompanionEvent } from "../../../events/eventTypes";
import { useNotifications } from "../../../services/notifications/notificationStore";
import type { Route } from "../notchRoutes";
import { dateFmt, useNow } from "./idleViews";
import {
  BackLabel,
  Body,
  Button,
  IconButton,
  Title,
  ViewHeader,
} from "./parts";

const ITEMS: { route: Route; label: string; icon: LucideIcon }[] = [
  { route: "music", label: "Music", icon: Music },
  { route: "calendar", label: "Calendar", icon: Calendar },
  { route: "notifications", label: "Notifications", icon: Bell },
  { route: "tools", label: "Tools", icon: Wrench },
];

type Props = {
  event: CompanionEvent | null;
  onOpen: (route: Route) => void;
  onSettings: () => void;
  onBack?: () => void;
  onCollapse: () => void;
};

export function HomeView({
  event,
  onOpen,
  onSettings,
  onBack,
  onCollapse,
}: Props) {
  const now = useNow();
  const { items } = useNotifications();
  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="flex h-full flex-col px-6 pb-5 pt-5">
      <ViewHeader
        onClose={onCollapse}
        leading={
          onBack ? (
            <BackLabel title="Back" onBack={onBack} />
          ) : (
            dateFmt.format(now)
          )
        }
        trailing={
          <IconButton
            label="Settings"
            onClick={onSettings}
            className="!h-6 !w-6 !text-white/30 hover:!text-white/75"
          >
            <Settings size={13} strokeWidth={1.8} />
          </IconButton>
        }
      />

      <Title>{event ? event.title : "All quiet"}</Title>
      <Body>{event ? event.message : "Nothing needs your attention."}</Body>

      <div className="mt-auto">
        <div className="mb-4 h-px bg-white/[0.07]" />
        <nav className="flex gap-2" aria-label="MyBuddy">
          {ITEMS.map(({ route, label, icon: Icon }) => (
            <Button key={route} onClick={() => onOpen(route)}>
              <Icon size={14} strokeWidth={1.8} />
              {label}
              {route === "notifications" && unread > 0 && (
                <span className="tabular-nums text-white/45">{unread}</span>
              )}
            </Button>
          ))}
        </nav>
      </div>
    </div>
  );
}
