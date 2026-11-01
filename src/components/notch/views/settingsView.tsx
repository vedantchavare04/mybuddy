import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ImagePlus, RotateCcw, Trash2, ChevronRight } from "lucide-react";
import { PROVIDERS, useAiConfig } from "../../../services/ai/aiConfig";
import {
  settingsService,
  useSettings,
} from "../../../services/settings/settingsStore";
import { prepareNotchWallpaper, wallpaperVeilOpacity } from "../../../services/settings/notchWallpaper";
import { IdleCompact } from "./idleViews";
import "./settingsView.css";
import ToggleSwitch from "../../ui/toggleSwitch";
import { BackLabel, ViewHeader, scrollCls } from "./parts";

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
  const {
    spiderEnabled, specialCursorEnabled, notchEnabled,
    notchWallpaper, notchWallpaperLuminance, notchText, notchTextPosition,
    spiderMood, spiderColor, notchWallpaperZoom, notchShowClock, notchSpiderEnabled,
  } = useSettings();
  const [launchAtStartup, setLaunchAtStartup] = useState(false);
  const [startupError, setStartupError] = useState("");
  const [wallpaperError, setWallpaperError] = useState("");
  const [wallpaperBusy, setWallpaperBusy] = useState(false);
  const wallpaperInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const textHandleRef = useRef<HTMLSpanElement>(null);
  const dragPointerRef = useRef<number | null>(null);
  const [draftPosition, setDraftPosition] = useState(notchTextPosition);

  useEffect(() => setDraftPosition(notchTextPosition), [notchTextPosition]);

  const placeText = (event: PointerEvent<HTMLSpanElement>) => {
    const preview = previewRef.current;
    if (!preview) return;
    const bounds = preview.getBoundingClientRect();
    const handle = textHandleRef.current?.getBoundingClientRect();
    const minX = handle ? handle.width / (2 * bounds.width) : 0.08;
    const maxX = 1 - minX;
    const minY = handle ? handle.height / (2 * bounds.height) : 0.2;
    const maxY = 1 - minY;
    const position = {
      x: Math.min(maxX, Math.max(minX, (event.clientX - bounds.left) / bounds.width)),
      y: Math.min(maxY, Math.max(minY, (event.clientY - bounds.top) / bounds.height)),
    };
    setDraftPosition(position);
    settingsService.set("notchTextPosition", position);
  };

  const onTextPointerDown = (event: PointerEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragPointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    placeText(event);
  };

  const onTextPointerMove = (event: PointerEvent<HTMLSpanElement>) => {
    if (dragPointerRef.current === event.pointerId) placeText(event);
  };

  const onTextPointerUp = (event: PointerEvent<HTMLSpanElement>) => {
    if (dragPointerRef.current === event.pointerId) dragPointerRef.current = null;
  };

  const onTextKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    const step = event.shiftKey ? 0.04 : 0.015;
    let dx = 0;
    let dy = 0;
    if (event.key === "ArrowLeft") dx = -step;
    else if (event.key === "ArrowRight") dx = step;
    else if (event.key === "ArrowUp") dy = -step;
    else if (event.key === "ArrowDown") dy = step;
    else return;
    event.preventDefault();
    const bounds = previewRef.current?.getBoundingClientRect();
    const handle = textHandleRef.current?.getBoundingClientRect();
    const minX = bounds && handle ? handle.width / (2 * bounds.width) : 0.08;
    const minY = bounds && handle ? handle.height / (2 * bounds.height) : 0.2;
    const position = {
      x: Math.min(1 - minX, Math.max(minX, draftPosition.x + dx)),
      y: Math.min(1 - minY, Math.max(minY, draftPosition.y + dy)),
    };
    setDraftPosition(position);
    settingsService.set("notchTextPosition", position);
  };

  const onChooseWallpaper = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setWallpaperBusy(true);
    setWallpaperError("");
    try {
      const prepared = await prepareNotchWallpaper(file);
      settingsService.set("notchWallpaper", prepared.dataUrl);
      settingsService.set("notchWallpaperLuminance", prepared.luminance);
    } catch (error) {
      setWallpaperError(error instanceof Error ? error.message : "Could not use that image.");
    } finally {
      setWallpaperBusy(false);
      input.value = "";
    }
  };

  const resetNotchStyle = () => {
    settingsService.set("notchWallpaper", null);
    settingsService.set("notchWallpaperLuminance", 0.2);
    settingsService.set("notchWallpaperZoom", 1);
    settingsService.set("notchText", "");
    const center = { x: 0.5, y: 0.5 };
    settingsService.set("notchTextPosition", center);
    setDraftPosition(center);
    setWallpaperError("");
  };

  useEffect(() => {
    let active = true;
    invoke<boolean>("startup_is_enabled")
      .then((enabled) => {
        if (active) setLaunchAtStartup(enabled);
      })
      .catch(() => {
        if (active) setStartupError("Could not read the Windows startup setting.");
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
            description={startupError || "Start MyBuddy automatically when you sign in to Windows"}
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
            title="Show clock in Notch"
            description="Display your local time beside the spider"
            control={
              <ToggleSwitch
                size="sm"
                darkMode
                className="shrink-0"
                ariaLabel="Show clock in Notch"
                isActive={notchShowClock}
                onChange={(on) => settingsService.set("notchShowClock", on)}
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

        <Section title="Notch personalization">
          <div className="py-3.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[14px] font-medium text-white/90">Make it yours</div>
                <div className="mt-0.5 text-[12px] text-white/45">Your photo stays on this device.</div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => wallpaperInputRef.current?.click()}
                  disabled={wallpaperBusy}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.055] px-3 text-[12px] font-medium text-white/85 transition-colors hover:bg-white/[0.1] disabled:opacity-50"
                >
                  <ImagePlus size={15} /> {wallpaperBusy ? "Preparing…" : notchWallpaper ? "Change photo" : "Choose photo"}
                </button>
                {notchWallpaper && (
                  <button
                    type="button"
                    aria-label="Remove Notch photo"
                    onClick={() => {
                      settingsService.set("notchWallpaper", null);
                      settingsService.set("notchWallpaperLuminance", 0.2);
                      settingsService.set("notchWallpaperZoom", 1);
                    }}
                    className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.12] text-white/55 transition-colors hover:bg-white/[0.08] hover:text-white"
                  ><Trash2 size={15} /></button>
                )}
              </div>
              <input ref={wallpaperInputRef} type="file" accept="image/*" className="hidden" onChange={onChooseWallpaper} />
            </div>

            <SettingRow
              title="Hanging spider"
              description="Show or hide it over your Notch photo"
              control={
                <ToggleSwitch
                  size="sm"
                  darkMode
                  className="shrink-0"
                  ariaLabel="Hanging spider in Notch"
                  isActive={notchSpiderEnabled}
                  onChange={(on) => settingsService.set("notchSpiderEnabled", on)}
                />
              }
            />

            <div
              className="relative mt-3 h-[80px] overflow-hidden rounded-[24px] border border-white/[0.12] bg-[#08080a] shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
              data-notch-ignore
            >
              {notchWallpaper && <div className="pointer-events-none absolute inset-[-8px] bg-cover bg-center" style={{ backgroundImage: `url("${notchWallpaper}")`, filter: "blur(10px) brightness(0.62)", transform: "scale(1.08)" }} />}
              {notchWallpaper && <div className="pointer-events-none absolute inset-0 bg-center bg-no-repeat" style={{ backgroundImage: `url("${notchWallpaper}")`, backgroundSize: `${notchWallpaperZoom * 100}% auto` }} />}
              {notchWallpaper && <div className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: wallpaperVeilOpacity(notchWallpaperLuminance) }} />}
              <div
                ref={previewRef}
                className="absolute left-1/2 top-1/2 h-[32px] w-[168px] -translate-x-1/2 -translate-y-1/2"
                style={{ transform: "translate(-50%, -50%) scale(2.4)", transformOrigin: "center" }}
              >
                <IdleCompact
                  customText={notchText || "Your text"}
                  textPosition={draftPosition}
                  spiderMood={spiderMood}
                  spiderColor={spiderColor}
                  showClock={notchShowClock}
                  spiderVisible={notchSpiderEnabled}
                  customTextInteraction={{
                    ref: textHandleRef,
                    role: "button",
                    tabIndex: 0,
                    ariaLabel: "Move your text. Drag to place it or use the arrow keys.",
                    onPointerDown: onTextPointerDown,
                    onPointerMove: onTextPointerMove,
                    onPointerUp: onTextPointerUp,
                    onPointerCancel: onTextPointerUp,
                    onKeyDown: onTextKeyDown,
                  }}
                />
              </div>
            </div>

            {notchWallpaper && (
              <div className="mt-3 flex items-center gap-3">
                <label htmlFor="notch-wallpaper-zoom" className="shrink-0 text-[11px] font-medium text-white/55">Photo size</label>
                <input
                  id="notch-wallpaper-zoom"
                  type="range"
                  min="0.6"
                  max="2.5"
                  step="0.05"
                  value={notchWallpaperZoom}
                  onChange={(event) => settingsService.set("notchWallpaperZoom", Number(event.currentTarget.value))}
                  className="notch-zoom-slider min-w-0 flex-1"
                  aria-label="Resize Notch photo"
                />
                <span className="w-9 text-right text-[10px] tabular-nums text-white/40">{Math.round(notchWallpaperZoom * 100)}%</span>
              </div>
            )}
            <label className="mt-3 block text-[11px] font-medium text-white/45" htmlFor="notch-custom-text">Custom text</label>
            <input
              id="notch-custom-text"
              value={notchText}
              maxLength={48}
              onChange={(event) => settingsService.set("notchText", event.currentTarget.value)}
              placeholder="A little note, status, or phrase"
              className="mt-1.5 h-10 w-full rounded-xl border border-white/[0.1] bg-white/[0.045] px-3 text-[13px] text-white outline-none placeholder:text-white/30 focus:border-white/25"
            />
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <span className="text-[10px] text-white/35">Drag the text in the preview to place it.</span>
              <button type="button" onClick={resetNotchStyle} className="inline-flex items-center gap-1 text-[10px] text-white/45 transition-colors hover:text-white/80">
                <RotateCcw size={11} /> Reset
              </button>
            </div>
            {wallpaperError && <p role="alert" className="mt-2 text-[11px] text-[#ffaaa3]">{wallpaperError}</p>}
          </div>
        </Section>

        <Section title="Spider personality">
          <div className="py-3.5">
            <div className="mb-2 text-[13px] font-medium text-white/85">How should it hang out?</div>
            <div className="grid grid-cols-2 gap-2">
              {([
                ["chill", "Chill", "A slow, easy swing"],
                ["curious", "Curious", "A little more lively"],
                ["sleepy", "Sleepy", "Soft, unhurried motion"],
                ["still", "Still", "Quiet and motionless"],
              ] as const).map(([mood, title, detail]) => {
                const selected = spiderMood === mood;
                return (
                  <button
                    key={mood}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => settingsService.set("spiderMood", mood)}
                    className={`rounded-xl border px-3 py-2 text-left transition-colors ${selected ? "border-[#cbb5ff]/45 bg-[#cbb5ff]/[0.09]" : "border-white/[0.09] bg-white/[0.025] hover:bg-white/[0.06]"}`}
                  >
                    <span className="block text-[12px] font-medium text-white/90">{title}</span>
                    <span className="mt-0.5 block text-[10px] text-white/45">{detail}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[12px] font-medium text-white/85">Spider colors</div>
                <div className="mt-0.5 text-[10px] text-white/40">Choose its accent palette.</div>
              </div>
              <div className="flex items-center gap-2">
                {([
                  ["lilac", "#b08af3", "Lilac"],
                  ["ocean", "#62a8ef", "Ocean"],
                  ["mint", "#54bd9c", "Mint"],
                  ["coral", "#e77c75", "Coral"],
                ] as const).map(([color, value, label]) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`${label} spider color`}
                    aria-pressed={spiderColor === color}
                    onClick={() => settingsService.set("spiderColor", color)}
                    className={`grid h-8 w-8 place-items-center rounded-full border transition-transform hover:scale-105 ${spiderColor === color ? "border-white/80" : "border-white/15"}`}
                  >
                    <span className="h-4 w-4 rounded-full" style={{ backgroundColor: value }} />
                  </button>
                ))}
              </div>
            </div>
          </div>
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
