import { useEffect, useState, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ChevronRight } from "lucide-react";
import { check } from "@tauri-apps/plugin-updater";
import { PROVIDERS, useAiConfig } from "../../../services/ai/aiConfig";
import {
  settingsService,
  useSettings,
} from "../../../services/settings/settingsStore";
import ToggleSwitch from "../../ui/toggleSwitch";
import { BackLabel, Button, ViewHeader, scrollCls } from "./parts";

type Props = {
  onBack: () => void;
  onCollapse: () => void;
  onOpenAi: () => void;
};

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

export function SettingsView({ onBack, onCollapse, onOpenAi }: Props) {
  const { spiderEnabled, specialCursorEnabled, notchEnabled } = useSettings();
  const [launchAtStartup, setLaunchAtStartup] = useState(false);
  const [startupError, setStartupError] = useState("");
  const [updateAvailable, setUpdateAvailable] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState("Check whether a newer version is available");
  const [updateBusy, setUpdateBusy] = useState(false);

  useEffect(() => {
    let active = true;
    invoke<boolean>("startup_is_enabled")
      .then((enabled) => {
        if (active) setLaunchAtStartup(enabled);
      })
      .catch(() => {
        if (active)
          setStartupError("Could not read the Windows startup setting.");
      });
    return () => {
      active = false;
    };
  }, []);

  const setStartup = async (enabled: boolean) => {
    setStartupError("");
    try {
      await invoke("startup_set_enabled", { enabled });
      setLaunchAtStartup(enabled);
    } catch {
      setStartupError("Could not update the Windows startup setting.");
    }
  };

  const checkForUpdates = async () => {
    setUpdateBusy(true);
    setUpdateAvailable(null);
    setUpdateStatus("Checking for updates…");
    try {
      const update = await check();
      if (update) {
        setUpdateAvailable(update.version);
        setUpdateStatus(`MyBuddy ${update.version} is available`);
        await update.close();
      } else {
        setUpdateStatus("You’re using the latest version");
      }
    } catch {
      setUpdateStatus("Could not check right now. Try again later.");
    } finally {
      setUpdateBusy(false);
    }
  };

  const installUpdate = async () => {
    setUpdateBusy(true);
    setUpdateStatus("Preparing the update…");
    try {
      const update = await check();
      if (!update) {
        setUpdateAvailable(null);
        setUpdateStatus("You’re using the latest version");
        return;
      }
      setUpdateStatus(`Downloading MyBuddy ${update.version}…`);
      try {
        await update.downloadAndInstall((event) => {
          if (event.event === "Finished")
            setUpdateStatus("Installing update…");
        });
      } finally {
        await update.close().catch(() => undefined);
      }
    } catch {
      setUpdateStatus("The update couldn’t be installed. Try again later.");
    } finally {
      setUpdateBusy(false);
    }
  };

  const ai = useAiConfig();

  const id = ai.provider;

  const name = id ? PROVIDERS.find((p) => p.id === id)?.name : undefined;

  const connected = id ? !!ai.configured[id] : false;

  const summary = name
    ? `${name} · ${connected ? "Connected" : "Not connected"}`
    : "Not set up";

  return (
    <div className="flex h-full flex-col px-6 pb-5 pt-5">
      <ViewHeader
        onClose={onCollapse}
        leading={<BackLabel title="Settings" onBack={onBack} />}
      />

      <div className={`${scrollCls} mt-3.5 flex flex-col gap-4`}>
        <Section title="Appearance">
          <SettingRow
            title="Launch at startup"
            description={
              startupError ||
              "Start MyBuddy automatically when you sign in to Windows"
            }
            control={
              <ToggleSwitch
                size="sm"
                darkMode
                className="shrink-0"
                ariaLabel="Launch at startup"
                isActive={launchAtStartup}
                onChange={(on) => void setStartup(on)}
              />
            }
          />

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

          <SettingRow
            title="Show Notch"
            description="Turn off to collapse MyBuddy into a small dock"
            control={
              <ToggleSwitch
                size="sm"
                darkMode
                className="shrink-0"
                ariaLabel="Show Notch"
                isActive={notchEnabled}
                onChange={(on) => settingsService.set("notchEnabled", on)}
              />
            }
          />

          <SettingRow
            title="Special Cursor"
            description="Use the MyBuddy glove as your cursor"
            control={
              <ToggleSwitch
                size="sm"
                darkMode
                className="shrink-0"
                ariaLabel="Special Cursor"
                isActive={specialCursorEnabled}
                onChange={(on) =>
                  settingsService.set("specialCursorEnabled", on)
                }
              />
            }
          />
        </Section>

        <Section title="Updates">
          <SettingRow
            title="MyBuddy updates"
            description={updateStatus}
            control={
              <div className="flex shrink-0 items-center gap-2">
                {updateAvailable && (
                  <Button
                    variant="primary"
                    disabled={updateBusy}
                    onClick={() => void installUpdate()}
                  >
                    Install {updateAvailable}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  disabled={updateBusy}
                  onClick={() => void checkForUpdates()}
                >
                  {updateBusy ? "Please wait…" : "Check"}
                </Button>
              </div>
            }
          />
        </Section>

        <Section title="AI">
          <button
            type="button"
            onClick={onOpenAi}
            className="flex w-full items-center gap-4 py-3.5 text-left outline-none transition-colors duration-150 hover:bg-white/[0.03] focus-visible:ring-1 focus-visible:ring-white/30"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-medium tracking-[-0.01em] text-white/90">
                AI provider
              </div>

              <div className="mt-0.5 truncate text-[12.5px] leading-[1.4] text-white/45">
                {summary}
              </div>
            </div>

            <ChevronRight
              size={16}
              strokeWidth={1.8}
              className="shrink-0 text-white/30"
            />
          </button>
        </Section>
      </div>
    </div>
  );
}
