import { Languages, Volume2, type LucideIcon } from "lucide-react";
import { SHORTCUTS } from "../../../services/selection/selectionService";
import type { Route } from "../notchRoutes";
import { BackLabel, ViewHeader } from "./parts";

type Props = {
  onBack: () => void;
  onCollapse: () => void;
  onOpen: (route: Route) => void;
};

function ToolRow({
  icon: Icon,
  title,
  hint,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-mx-2 flex h-12 w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 text-left outline-none transition-colors duration-150 hover:bg-white/[0.05] focus-visible:ring-1 focus-visible:ring-white/30"
    >
      <Icon size={16} strokeWidth={1.8} className="shrink-0 text-white/60" />
      <span className="flex-1 text-[14px] font-medium tracking-[-0.01em] text-white/90">
        {title}
      </span>
      <span className="text-[11.5px] tabular-nums text-white/30">{hint}</span>
    </button>
  );
}

export function ToolsView({ onBack, onCollapse, onOpen }: Props) {
  return (
    <div className="flex h-full flex-col px-6 pb-4 pt-5">
      <ViewHeader
        onClose={onCollapse}
        leading={<BackLabel title="Tools" onBack={onBack} />}
      />
      <div className="mt-3">
        <ToolRow
          icon={Languages}
          title="Translate"
          hint={SHORTCUTS.translate}
          onClick={() => onOpen("translate")}
        />
        <ToolRow
          icon={Volume2}
          title="Text to speech"
          hint={SHORTCUTS.speak}
          onClick={() => onOpen("speech")}
        />
      </div>
    </div>
  );
}