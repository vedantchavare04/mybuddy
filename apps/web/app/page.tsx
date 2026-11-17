"use client";

import { useEffect, useRef, useState } from "react";
import { Figtree, Instrument_Serif } from "next/font/google";
import FaqsSection from "../components/faqs";
import Footer from "../components/footer";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Command,
  Headphones,
  Heart,
  Image as ImageIcon,
  Layers3,
  LockKeyhole,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import NotchShell from "../../../src/components/notch/notchShell";
import { IdleCompact } from "../../../src/components/notch/views/idleViews";
import { HomeView } from "../../../src/components/notch/views/homeView";
import { SettingsView } from "../../../src/components/notch/views/settingsView";
import LauncherView from "../../../src/components/notch/views/launcherView";
import { RemindersView } from "../../../src/components/notch/views/remindersView";
import { useSettings } from "../../../src/services/settings/settingsStore";
import { RADIUS, SIZES } from "../../../src/components/notch/notchTokens";
import type { Route } from "../../../src/components/notch/notchRoutes";
import type { CompanionEvent } from "../../../src/events/eventTypes";
import DownloadButton from "../components/DownloadButton";
import FeaturesSection from "../components/FeaturesSection";
import styles from "./page.module.css";

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  // Italic is used for the headline accent.
  style: ["normal", "italic"],
  variable: "--font-display",
});
const body = Figtree({
  subsets: ["latin"],
  variable: "--font-body",
});

const DOWNLOAD_URL =
  "https://github.com/vedantchavare04/myBuddy-releases/releases/latest/download/MyBuddy-Setup.exe";

const wallpaper = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1050 200"><rect width="1050" height="200" fill="#d6d9bd"/><circle cx="810" cy="45" r="46" fill="#f4d993"/><path d="M0 130 190 40l146 98 133-74 185 136H0Z" fill="#9cae8a"/><path d="m387 200 229-130 148 91 133-55 153 94H387Z" fill="#788e77"/><path d="M0 164q155-45 287 9t256-3q187-50 507 7v23H0Z" fill="#b8c2a0"/><path d="M84 149q36-61 72 0m-32-1q29-44 58 0" fill="none" stroke="#697f70" stroke-width="5" stroke-linecap="round"/><path d="M887 146q31-51 62 0m-26 0q28-42 56 0" fill="none" stroke="#667c6a" stroke-width="5" stroke-linecap="round"/></svg>`)}`;

const previews = [
  {
    route: "settings" as Route,
    nav: "Wallpaper",
    title: "Your photo, in your Notch",
    detail: "Choose a photo, set your spider’s mood, and make it yours.",
    icon: ImageIcon,
  },
  {
    route: "launcher" as Route,
    nav: "Quick actions",
    title: "Quick actions",
    detail: "Your everyday tools without the extra window.",
    icon: Command,
  },
  {
    route: "reminders" as Route,
    nav: "Reminders",
    title: "Gentle reminders",
    detail: "Little reminders that help you keep your word.",
    icon: Bell,
  },
];

const featureCopy: Record<
  Route,
  {
    title: string;
    eyebrow: string;
    body: string;
    icon: typeof Sparkles;
    action: string;
  }
> = {
  home: {
    title: "A little room to think.",
    eyebrow: "YOUR DAY, AT A GLANCE",
    body: "A calm home for the small things you want close by.",
    icon: Heart,
    action: "Explore MyBuddy",
  },
  launcher: {
    title: "Your next move, closer.",
    eyebrow: "QUICK ACTIONS",
    body: "Find the tool you need and get back to what you were doing.",
    icon: Command,
    action: "Unlock quick actions",
  },
  music: {
    title: "Keep the good part playing.",
    eyebrow: "NOW PLAYING",
    body: "A tiny music control lives right where you need it.",
    icon: Headphones,
    action: "Unlock music controls",
  },
  calendar: {
    title: "A softer nudge for what’s next.",
    eyebrow: "COMING UP",
    body: "See the next thing on your calendar without opening another window.",
    icon: CalendarDays,
    action: "Unlock calendar",
  },
  reminders: {
    title: "Remember the little things.",
    eyebrow: "REMINDER",
    body: "A friendly tap on the shoulder, right when it matters.",
    icon: Bell,
    action: "Unlock reminders",
  },
  notifications: {
    title: "A quieter notification tray.",
    eyebrow: "NOTIFICATIONS",
    body: "Keep the useful updates within reach and the noise out of the way.",
    icon: Bell,
    action: "Unlock notifications",
  },
  tools: {
    title: "Useful things, one click away.",
    eyebrow: "YOUR TOOLKIT",
    body: "Bring your everyday helpers together in one small place.",
    icon: WandSparkles,
    action: "Unlock the toolkit",
  },
  settings: {
    title: "Make it feel like yours.",
    eyebrow: "PERSONAL DETAILS",
    body: "Your wallpaper and little face make the Notch your own.",
    icon: Layers3,
    action: "Personalize MyBuddy",
  },
  "calendar/new": {
    title: "Plan a moment.",
    eyebrow: "CALENDAR",
    body: "Add a little shape to the day, without losing your focus.",
    icon: CalendarDays,
    action: "Unlock calendar",
  },
  "reminders/new": {
    title: "Leave a note for later.",
    eyebrow: "REMINDERS",
    body: "Make room for the thought before it gets away.",
    icon: Bell,
    action: "Unlock reminders",
  },
  "settings/ai": {
    title: "Your tools, your way.",
    eyebrow: "PREFERENCES",
    body: "Set up a companion that fits your own flow.",
    icon: Sparkles,
    action: "Explore MyBuddy",
  },
  event: {
    title: "A little room to think.",
    eyebrow: "YOUR DAY, AT A GLANCE",
    body: "A calm home for the small things you want close by.",
    icon: Heart,
    action: "Explore MyBuddy",
  },
  memory: {
    title: "Keep a thought close.",
    eyebrow: "MEMORY",
    body: "Save links and snippets before they disappear into another tab.",
    icon: Layers3,
    action: "Unlock Memory",
  },
  clipboard: {
    title: "Your recent copy, remembered.",
    eyebrow: "CLIPBOARD",
    body: "Pick up where you left off with the things you copied.",
    icon: Layers3,
    action: "Unlock Clipboard",
  },
  promises: {
    title: "Make a promise to yourself.",
    eyebrow: "PROMISE KEEPER",
    body: "Give an intention a gentle place to land.",
    icon: Heart,
    action: "Unlock Promise Keeper",
  },
  tasks: {
    title: "A short list, a lighter mind.",
    eyebrow: "TASKS",
    body: "Keep the next few steps close and easy to see.",
    icon: Check,
    action: "Unlock tasks",
  },
  context: {
    title: "Save this for later.",
    eyebrow: "CONTEXT SAVER",
    body: "Keep the important details attached to the moment.",
    icon: Layers3,
    action: "Unlock Context Saver",
  },
  "flow-rescue": {
    title: "Find your way back in.",
    eyebrow: "FLOW RESCUE",
    body: "A quick reset can help you return to the thing that matters.",
    icon: Sparkles,
    action: "Unlock Flow Rescue",
  },
  "explain-later": {
    title: "Leave the explanation for later.",
    eyebrow: "EXPLAIN THIS LATER",
    body: "Save a question for the moment you have room to explore it.",
    icon: Sparkles,
    action: "Unlock this tool",
  },
  translate: {
    title: "Find the right words.",
    eyebrow: "TRANSLATE",
    body: "Translate selected text in a quick, focused panel.",
    icon: WandSparkles,
    action: "Unlock Translate",
  },
  speech: {
    title: "Let the words come to you.",
    eyebrow: "TEXT TO SPEECH",
    body: "Listen back while you keep your hands on the work.",
    icon: Headphones,
    action: "Unlock text to speech",
  },
  ai: {
    title: "A helping thought, close by.",
    eyebrow: "MYBUDDY AI",
    body: "A small space for quick questions and useful ideas.",
    icon: Sparkles,
    action: "Unlock AI tools",
  },
};

function FeaturePanel({
  route,
  onBack,
  onClose,
}: {
  route: Route;
  onBack: () => void;
  onClose: () => void;
}) {
  const item = featureCopy[route] ?? featureCopy.home;
  const Icon = item.icon;
  const [done, setDone] = useState(false);
  return (
    <div className={styles.panel}>
      <div className={styles.panelTop}>
        <button
          className={styles.panelBack}
          type="button"
          onClick={onBack}
          aria-label="Back to MyBuddy home"
        >
          <ChevronLeft size={14} /> <span>MyBuddy</span>
        </button>
        <button
          className={styles.panelClose}
          type="button"
          onClick={onClose}
          aria-label="Close preview"
        >
          ×
        </button>
      </div>
      <div className={styles.panelContent}>
        <span className={styles.panelIcon}>
          <Icon size={17} strokeWidth={1.7} />
        </span>
        <span className={styles.panelEyebrow}>{item.eyebrow}</span>
        <strong>{item.title}</strong>
        <p>{item.body}</p>
        {route === "reminders" ? (
          <button
            type="button"
            className={styles.completeButton}
            onClick={() => setDone(!done)}
          >
            {done ? (
              <>
                <Check size={13} /> All set
              </>
            ) : (
              "Mark as done"
            )}
          </button>
        ) : null}
      </div>
      <a className={styles.panelDownload} href={DOWNLOAD_URL}>
        <LockKeyhole size={13} /> Unlock all the amazing features
        <ArrowUpRight size={12} />
      </a>
    </div>
  );
}

function Sky() {
  return (
    <div className={styles.sky} aria-hidden="true">
      <span className={`${styles.cloud} ${styles.cloudA}`} />
      <span className={`${styles.cloud} ${styles.cloudB}`} />
      <span className={`${styles.cloud} ${styles.cloudC}`} />
    </div>
  );
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(true);
  const [route, setRoute] = useState<Route>("settings");
  const [slide, setSlide] = useState(0);
  const {
    notchWallpaper,
    notchWallpaperLuminance,
    notchWallpaperZoom,
    notchTextMode,
    notchText,
    notchTextPosition,
    notchShowClock,
    notchSpiderEnabled,
    spiderMood,
    spiderColor,
  } = useSettings();
  const shellRef = useRef<HTMLDivElement>(null);
  const homeEvent: CompanionEvent | null = null;
  const preview = previews[slide];

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const chooseSlide = (next: number) => {
    const index = (next + previews.length) % previews.length;
    setSlide(index);
    setRoute(previews[index].route);
    setOpen(true);
  };

  const openRoute = (next: Route) => {
    setRoute(next);
    setSlide(
      next === "reminders" || next === "calendar"
        ? 2
        : next === "launcher"
          ? 1
          : next === "settings"
            ? 0
            : 0,
    );
    setOpen(true);
  };

  return (
    <main className={`${styles.page} ${display.variable} ${body.variable}`}>
      {/* nav + hero share one positioned wrapper so the sky is sized to them */}
      <div className={styles.top}>
        <Sky />

        <header className={styles.nav}>
          <a className={styles.brand} href="#top" aria-label="MyBuddy home">
            <img
              className={styles.brandMark}
              src="/mybuddy-mark.svg"
              alt=""
              width={32}
              height={32}
            />
            <span>mybuddy</span>
          </a>

          <nav className={styles.navPill} aria-label="Feature preview">
            {previews.map((p, i) => (
              <button
                key={p.route}
                type="button"
                className={i === slide ? styles.navActive : undefined}
                aria-pressed={i === slide}
                onClick={() => chooseSlide(i)}
              >
                {p.nav}
              </button>
            ))}
          </nav>

          <a className={styles.navCta} href={DOWNLOAD_URL}>
            Get MyBuddy
          </a>
        </header>

        <section className={styles.hero} id="top">
          <div className={styles.heroCopy}>
            <h1>
              <span className={styles.hLead}>Your wallpaper,</span>
              <span className={styles.hRow}>
                <em className={styles.hItalic}>right in your</em>
                <span className={styles.hBig}>
                  Notch<i className={styles.hDot}>.</i>
                </span>
              </span>
            </h1>
            <p className={styles.intro}>
              MyBuddy brings a notch to your Windows laptop. Pick any photo, add
              a friendly spider, and keep gentle reminders one glance away.
            </p>
            <div className={styles.heroActions}>
              <DownloadButton href={DOWNLOAD_URL} />
              <button
                className={styles.previewLink}
                type="button"
                onClick={() => openRoute("settings")}
              >
                Try wallpaper customization
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className={styles.scene}>
            <div className={styles.stageOuter}>
              <div className={styles.stageInner}>
                <div className={styles.laptop}>
                  <div className={styles.lid}>
                    <div className={styles.screen}>
                      {mounted && (
                        <div className={styles.notchSlot}>
                          <NotchShell
                            wrapperClassName={styles.demoShell}
                            shellRef={shellRef}
                            mode={open ? "expanded" : "compact"}
                            size={
                              open
                                ? route === "settings"
                                  ? SIZES.settings
                                  : SIZES.home
                                : SIZES.compact
                            }
                            contentSize={
                              open
                                ? route === "settings"
                                  ? SIZES.settings
                                  : SIZES.home
                                : SIZES.compact
                            }
                            radius={open ? RADIUS.expanded : RADIUS.compact}
                            layerKey={open ? route : "idle-compact"}
                            direction={0}
                            label={
                              open ? "MyBuddy preview" : "Open MyBuddy preview"
                            }
                            onActivate={() => {
                              setRoute("home");
                              setOpen(true);
                            }}
                            onHoverChange={() => undefined}
                            wallpaper={
                              open ? null : (notchWallpaper ?? wallpaper)
                            }
                            wallpaperLuminance={
                              notchWallpaper ? notchWallpaperLuminance : 0.55
                            }
                            wallpaperZoom={
                              notchWallpaper ? notchWallpaperZoom : 1
                            }
                          >
                            {open ? (
                              route === "home" ? (
                                <HomeView
                                  event={homeEvent}
                                  onOpen={openRoute}
                                  onSettings={() => openRoute("settings")}
                                  onCollapse={() => setOpen(false)}
                                />
                              ) : route === "settings" ? (
                                <SettingsView
                                  onBack={() => openRoute("home")}
                                  onCollapse={() => setOpen(false)}
                                  onOpenAi={() => openRoute("settings/ai")}
                                  initialSection="notch-personalization"
                                  demoWallpaper={{
                                    dataUrl: wallpaper,
                                    luminance: 0.55,
                                  }}
                                />
                              ) : route === "launcher" ? (
                                <LauncherView
                                  onBack={() => openRoute("home")}
                                  onCollapse={() => setOpen(false)}
                                  onOpenPlanner={() => openRoute("calendar")}
                                  onOpenClipboard={() => openRoute("clipboard")}
                                  onOpenMemory={() => openRoute("memory")}
                                  onOpenTasks={() => openRoute("tasks")}
                                  onOpenContext={() => openRoute("context")}
                                  onOpenPromises={() => openRoute("promises")}
                                  onOpenFlowRescue={() =>
                                    openRoute("flow-rescue")
                                  }
                                  onOpenExplainLater={() =>
                                    openRoute("explain-later")
                                  }
                                />
                              ) : route === "reminders" ? (
                                <RemindersView
                                  onBack={() => openRoute("home")}
                                  onCollapse={() => setOpen(false)}
                                  onNew={() => openRoute("reminders/new")}
                                />
                              ) : (
                                <FeaturePanel
                                  route={route}
                                  onBack={() => openRoute("home")}
                                  onClose={() => setOpen(false)}
                                />
                              )
                            ) : (
                              <IdleCompact
                                textMode={notchTextMode}
                                customText={notchText}
                                textPosition={notchTextPosition}
                                spiderMood={spiderMood}
                                spiderColor={spiderColor}
                                showClock={notchShowClock}
                                spiderVisible={notchSpiderEnabled}
                              />
                            )}
                          </NotchShell>
                        </div>
                      )}

                      {open && (
                        <div className={styles.toast} aria-live="polite">
                          {preview.detail}
                        </div>
                      )}

                      <div className={styles.taskbar} aria-hidden="true">
                        <i />
                        <i />
                        <i />
                        <i />
                        <i />
                      </div>
                    </div>
                  </div>
                  <div className={styles.base} aria-hidden="true" />
                </div>
              </div>
            </div>

            <ul className={styles.cards}>
              {previews.map((p, i) => {
                const Icon = p.icon;
                return (
                  <li
                    key={p.route}
                    className={`${styles.card} ${styles[`card${i}`]}`}
                  >
                    <button
                      type="button"
                      className={i === slide ? styles.cardActive : undefined}
                      aria-pressed={i === slide}
                      onClick={() => chooseSlide(i)}
                    >
                      <span className={styles.cardIcon}>
                        <Icon size={18} strokeWidth={1.8} />
                      </span>
                      <span className={styles.cardText}>
                        <strong>{p.title}</strong>
                        <small>{p.detail}</small>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </div>

      <FeaturesSection />
      <FaqsSection />

      <Footer />
    </main>
  );
}
