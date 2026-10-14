
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  AppWindow,
  BookmarkCheck,
  CalendarDays,
  Clipboard,
  CornerDownLeft,
  Download,
  FileText,
  Handshake,
  RotateCcw,
  CircleHelp,
  Search,
  type LucideIcon,
} from "lucide-react";
import { BackLabel, ViewHeader } from "./parts";
import "./launcher.css";

type InstalledApp = {
  id: string;
  name: string;
  path: string;
};

type LauncherAction = {
  id: string;
  title: string;
  description: string;
  keywords: string;
  icon: LucideIcon;
  shortcut?: string;
  run: () => void;
};

type LauncherViewProps = {
  onBack: () => void;
  onCollapse: () => void;
  onOpenApps?: () => void;
  onOpenPlanner: () => void;
  onOpenClipboard: () => void;
  onOpenMemory: () => void;
  onOpenTasks: () => void;
  onOpenContext: () => void;
  onOpenPromises: () => void;
  onOpenFlowRescue: () => void;
  onOpenExplainLater: () => void;
  onLaunched?: () => void;
};

export default function LauncherView({
  onBack,
  onCollapse,
  onOpenPlanner,
  onOpenClipboard,
  onOpenMemory,
  onOpenTasks,
  onOpenContext,
  onOpenPromises,
  onOpenFlowRescue,
  onOpenExplainLater,
  onLaunched,
}: LauncherViewProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showApps, setShowApps] = useState(false);
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);
  const launchingRef = useRef(false);

  const loadApps = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    setAppsLoading(true);
    setError(null);

    try {
      const result = await invoke<InstalledApp[]>("list_installed_apps");

      if (requestId === requestIdRef.current) {
        setApps(result);
      }
    } catch {
      if (requestId === requestIdRef.current) {
        setError("Could not load applications. Please try again.");
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setAppsLoading(false);
      }
    }
  }, []);

  const openApps = useCallback(() => {
    setShowApps(true);
    setQuery("");
    setSelectedIndex(0);
    setError(null);

    if (apps.length === 0) {
      void loadApps();
    }
  }, [apps.length, loadApps]);

  const backToActions = useCallback(() => {
    requestIdRef.current++;
    setShowApps(false);
    setQuery("");
    setSelectedIndex(0);
    setError(null);
    setAppsLoading(false);
    inputRef.current?.focus();
  }, []);

  const launchApp = useCallback(
    async (app: InstalledApp) => {
      if (launchingRef.current) return;

      launchingRef.current = true;
      setLaunchingId(app.id);
      setError(null);

      try {
        await invoke("launch_app", { path: app.path });
        onLaunched?.();
      } catch {
        setError(`Could not launch ${app.name}.`);
      } finally {
        launchingRef.current = false;
        setLaunchingId(null);
      }
    },
    [onLaunched],
  );

  const actions = useMemo<LauncherAction[]>(
    () => [
      {
        id: "apps",
        title: "Open an application",
        description: "Find and launch an installed app",
        keywords: "apps applications launch program windows",
        icon: AppWindow,
        run: openApps,
      },
      {
        id: "planner",
        title: "Day planner",
        description: "View tasks and reminders",
        keywords: "today tasks calendar reminders",
        icon: CalendarDays,
        run: onOpenPlanner,
      },
      {
        id: "clipboard",
        title: "Clipboard history",
        description: "Find copied text and snippets",
        keywords: "copy paste history snippets",
        icon: Clipboard,
        run: onOpenClipboard,
      },
      {
        id: "memory",
        title: "Memory vault",
        description: "Find saved notes and links",
        keywords: "notes saved links code memory",
        icon: FileText,
        run: onOpenMemory,
      },
      {
        id: "tasks",
        title: "Downloads & tasks",
        description: "Track downloads and background work",
        keywords: "downloads progress background tasks status",
        icon: Download,
        run: onOpenTasks,
      },
      {
        id: "context",
        title: "Context Saver",
        description: "Save your place and resume later",
        keywords: "checkpoint project progress resume work",
        icon: BookmarkCheck,
        run: onOpenContext,
      },
      {
        id: "promises",
        title: "Promise Keeper",
        description: "Keep track of promises and follow-ups",
        keywords: "promises commitments people follow up remember",
        icon: Handshake,
        run: onOpenPromises,
      },
      {
        id: "flow-rescue",
        title: "Flow Rescue",
        description: "Save your place and resume after an interruption",
        keywords: "interruption resume progress next step checkpoint",
        icon: RotateCcw,
        shortcut: "Ctrl + Alt + R",
        run: onOpenFlowRescue,
      },
      {
        id: "explain-later",
        title: "Explain This Later",
        description: "Save a question without losing your work",
        keywords: "question understand explain later learn",
        icon: CircleHelp,
        shortcut: "Ctrl + Alt + E",
        run: onOpenExplainLater,
      },
    ],
    [
      openApps,
      onOpenPlanner,
      onOpenClipboard,
      onOpenMemory,
      onOpenTasks,
      onOpenContext,
      onOpenPromises,
      onOpenFlowRescue,
      onOpenExplainLater,
    ],
  );

  const filteredActions = useMemo(() => {
    const search = query.trim().toLowerCase();

    if (!search) return actions;

    return actions.filter((action) =>
      `${action.title} ${action.description} ${action.keywords}`
        .toLowerCase()
        .includes(search),
    );
  }, [actions, query]);

  const filteredApps = useMemo(() => {
    const search = query.trim().toLowerCase();

    const matches = search
      ? apps.filter((app) => app.name.toLowerCase().includes(search))
      : apps;

    return [...matches].sort((a, b) => {
      const an = a.name.toLowerCase();
      const bn = b.name.toLowerCase();

      if (search) {
        const aStarts = an.startsWith(search);
        const bStarts = bn.startsWith(search);

        if (aStarts !== bStarts) return aStarts ? -1 : 1;
      }

      return an.localeCompare(bn);
    });
  }, [apps, query]);

  const itemCount = showApps ? filteredApps.length : filteredActions.length;
  const showLoading = showApps && appsLoading && apps.length === 0;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, showApps]);

  useEffect(() => {
    if (apps.length > 0) setError(null);
  }, [query, apps.length]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(".is-selected")
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex, filteredActions, filteredApps, showApps]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && showApps) {
        event.preventDefault();
        backToActions();
        return;
      }

      if (event.key === "ArrowDown" && itemCount > 0) {
        event.preventDefault();
        setSelectedIndex((index) => (index + 1) % itemCount);
      }

      if (event.key === "ArrowUp" && itemCount > 0) {
        event.preventDefault();
        setSelectedIndex((index) => (index - 1 + itemCount) % itemCount);
      }

      if (event.key === "Enter" && !event.isComposing) {
        const target = event.target;

        if (
          target instanceof HTMLElement &&
          target.closest("button:not([role='option'])")
        ) {
          return;
        }

        event.preventDefault();

        if (event.repeat) return;

        if (showApps) {
          const app = filteredApps[selectedIndex];

          if (app) void launchApp(app);
        } else {
          filteredActions[selectedIndex]?.run();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    showApps,
    itemCount,
    filteredApps,
    filteredActions,
    selectedIndex,
    launchApp,
    backToActions,
  ]);

  return (
    <section className="launcher">
      <ViewHeader
        onClose={onCollapse}
        leading={
          <BackLabel
            title={showApps ? "Applications" : "Quick Actions"}
            onBack={showApps ? backToActions : onBack}
          />
        }
      />

      <div className="nx-field">
        <Search size={16} strokeWidth={1.6} />

        <input
          ref={inputRef}
          autoFocus
          spellCheck={false}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={showApps ? "Search installed apps" : "Search actions"}
          aria-label={
            showApps ? "Search installed apps" : "Search MyBuddy actions"
          }
        />
      </div>

      <div
        className="launcher-results"
        role="listbox"
        aria-label={showApps ? "Installed applications" : "Quick actions"}
        ref={listRef}
      >
        {showApps ? (
          <>
            {showLoading && (
              <div className="launcher-empty">Loading applications...</div>
            )}

            {!showLoading && filteredApps.length === 0 && !error && (
              <div className="launcher-empty">
                {apps.length === 0
                  ? "No applications found"
                  : "No matching applications"}
              </div>
            )}

            {filteredApps.map((app, index) => {
              const selected = selectedIndex === index;

              return (
                <button
                  key={app.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`launcher-action ${selected ? "is-selected" : ""}`}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => void launchApp(app)}
                  disabled={launchingId !== null}
                >
                  <span className="launcher-action-icon">
                    <AppWindow size={17} strokeWidth={1.75} />
                  </span>

                  <span className="launcher-action-copy">
                    <span className="launcher-action-title">{app.name}</span>

                    <span className="launcher-action-description">
                      {launchingId === app.id
                        ? "Launching..."
                        : "Installed application"}
                    </span>
                  </span>

                  <span
                    className="launcher-action-hint"
                    aria-hidden="true"
                  >
                    <CornerDownLeft size={12} strokeWidth={2} />
                  </span>
                </button>
              );
            })}
          </>
        ) : filteredActions.length > 0 ? (
          filteredActions.map((action, index) => {
            const Icon = action.icon;
            const selected = selectedIndex === index;

            return (
              <button
                key={action.id}
                type="button"
                role="option"
                aria-selected={selected}
                className={`launcher-action ${selected ? "is-selected" : ""}`}
                onMouseEnter={() => setSelectedIndex(index)}
                onClick={action.run}
              >
                <span className="launcher-action-icon">
                  <Icon size={17} strokeWidth={1.75} />
                </span>

                <span className="launcher-action-copy">
                  <span className="launcher-action-title">
                    {action.title}
                  </span>

                  <span className="launcher-action-description">
                    {action.description}
                  </span>
                </span>

                {action.shortcut && (
                  <kbd className="launcher-action-shortcut" aria-label={`Shortcut ${action.shortcut}`}>
                    {action.shortcut}
                  </kbd>
                )}

                <span className="launcher-action-hint" aria-hidden="true">
                  <CornerDownLeft size={12} strokeWidth={2} />
                </span>
              </button>
            );
          })
        ) : (
          <div className="launcher-empty">No matching actions</div>
        )}
      </div>

      {error && (
        <div className="nx-error launcher-error" role="alert">
          <span>{error}</span>

          {showApps && !appsLoading && apps.length === 0 && (
            <button
              type="button"
              className="launcher-retry"
              onClick={() => void loadApps()}
            >
              Retry
            </button>
          )}
        </div>
      )}

      <footer className="nx-footer">
        <span className="nx-footer-lead">
          {showApps ? "Applications" : "MyBuddy"}
        </span>

        <span className="nx-hint">
          <kbd className="nx-kbd">↑↓</kbd>
          Navigate
        </span>

        <span className="nx-hint">
          <kbd className="nx-kbd">↵</kbd>
          {showApps ? "Launch" : "Select"}
        </span>

        {showApps && (
          <span className="nx-hint">
            <kbd className="nx-kbd">Esc</kbd>
            Back
          </span>
        )}
      </footer>
    </section>
  );
}
