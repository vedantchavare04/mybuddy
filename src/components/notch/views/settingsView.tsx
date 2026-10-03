import type { ReactNode } from "react";
import {
  settingsService,
  useSettings,
} from "../../../services/settings/settingsStore";
import ToggleSwitch from "../../ui/toggleSwitch";
import { BackLabel, ViewHeader, scrollCls } from "./parts";

type Props = { onBack: () => void; onCollapse: () => void };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="text-[12px] font-medium text-white/40">{title}</h3>
      <div className="mt-2 divide-y divide-white/[0.07] border-y border-white/[0.07]">
        {children}
      </div>
    </section>
  );
}

function SettingRow({
  title,
  description,
  control,
}: {
  title: string;
  description: string;
  control: ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-medium tracking-[-0.01em] text-white/90">
          {title}
        </div>
        <div className="mt-0.5 text-[12.5px] leading-[1.4] text-white/45">
          {description}
        </div>
      </div>
      {control}
    </div>
  );
}

export function SettingsView({ onBack, onCollapse }: Props) {
  const { spiderEnabled } = useSettings();

  return (
    <div className="flex h-full flex-col px-6 pb-5 pt-5">
      <ViewHeader
        onClose={onCollapse}
        leading={<BackLabel title="Settings" onBack={onBack} />}
      />

      <div className={`${scrollCls} mt-3.5`}>
        <Section title="Appearance">
          <SettingRow
            title="Spider Companion"
            description="Show the MyBuddy spider on screen"
            control={
              <ToggleSwitch
                size="sm"
                darkMode
                className="shrink-0"
                ariaLabel="Spider Companion"
                isActive={spiderEnabled}
                onChange={(on) => settingsService.set("spiderEnabled", on)}
              />
            }
          />
        </Section>
      </div>
    </div>
  );
}