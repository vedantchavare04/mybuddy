import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import {
  notificationService,
  useNotifications,
  type Access,
} from "../../../services/notifications/notificationStore";
import { BackLabel, Button, ViewHeader, scrollCls } from "./parts";

type Props = { onBack: () => void; onCollapse: () => void };

function ago(at: number): string {
  const m = Math.floor((Date.now() - at) / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return new Date(at).toLocaleDateString([], { day: "numeric", month: "short" });
}

function AccessNote({ access }: { access: Access }) {
  if (access === "allowed" || access === "unknown") return null;

  if (access === "unspecified") {
    return (
      <Button variant="ghost" onClick={() => void notificationService.requestAccess()}>
        Allow notification access
      </Button>
    );
  }

  const text =
    access === "denied"
      ? "Notification access is off. Enable it in Windows Settings › Privacy & security › Notifications."
      : "Windows app notifications need MyBuddy installed as a packaged app. Until then this shows MyBuddy's own events.";

  return (
    <p className="flex items-start gap-2 text-[11.5px] leading-[1.4] text-white/35">
      <Info size={13} strokeWidth={1.8} className="mt-px shrink-0" />
      {text}
    </p>
  );
}

export function NotificationsView({ onBack, onCollapse }: Props) {
  const { items, access } = useNotifications();

  const [unreadAtOpen] = useState(
    () => new Set(items.filter((n) => !n.read).map((n) => n.id))
  );
  useEffect(() => {
    notificationService.markAllRead();
  }, []);

  return (
    <div className="flex h-full flex-col px-6 pb-4 pt-5">
      <ViewHeader
        onClose={onCollapse}
        leading={<BackLabel title="Notifications" onBack={onBack} />}
        trailing={
          items.length > 0 ? (
            <Button
              variant="quiet"
              className="!h-6 !px-2.5 !text-[11.5px]"
              onClick={() => notificationService.clear()}
            >
              Clear
            </Button>
          ) : null
        }
      />

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="text-[15px] font-semibold tracking-[-0.015em] text-white/90">
            No notifications yet
          </div>
          <p className="mt-1 text-[13px] text-white/45">
            Events MyBuddy picks up will appear here.
          </p>
        </div>
      ) : (
        <ul className={`${scrollCls} mt-2`}>
          {items.map((n) => (
            <li
              key={n.id}
              className="flex gap-3 border-t border-white/[0.06] py-2.5 first:border-t-0"
            >
              <span
                className={`mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full ${
                  unreadAtOpen.has(n.id) ? "bg-white/80" : "bg-transparent"
                }`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3 text-[11.5px] text-white/35">
                  <span className="truncate">{n.source}</span>
                  <span className="shrink-0 tabular-nums">{ago(n.at)}</span>
                </div>
                <div className="mt-0.5 truncate text-[13.5px] font-medium tracking-[-0.01em] text-white/90">
                  {n.title}
                </div>
                {n.message && (
                  <div className="truncate text-[12.5px] text-white/45">{n.message}</div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 shrink-0">
        <AccessNote access={access} />
      </div>
    </div>
  );
}