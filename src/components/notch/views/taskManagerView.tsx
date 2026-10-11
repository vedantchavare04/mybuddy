import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  Ban,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  LoaderCircle,
  XCircle,
} from "lucide-react";
import type { CompanionEvent } from "../../../events/eventTypes";
import { notificationService } from "../../../services/notifications/notificationStore";
import { BackLabel, ViewHeader } from "./parts";
import "./tasks.css";
type TaskRecord = {
  id: string;
  title: string;
  kind: "task" | "download";
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  progress: number | null;
  detail: string | null;
  outputPath: string | null;
  createdAt: number;
  updatedAt: number;
};
type UndoState = {
  label: string;
  hidden: string[];
};
type TaskManagerViewProps = {
  onBack: () => void;
  onCollapse: () => void;
};
const HIDDEN_KEY = "mybuddy.tasks.hidden";
const MAX_HIDDEN = 300;
const COPIED_MS = 1400;
const UNDO_MS = 5000;
const INTRO_MS = 420;
const EASE = [0.2, 0, 0, 1] as const;
const terminalStatuses = new Set<TaskRecord["status"]>([
  "completed",
  "failed",
  "cancelled",
]);
function isActive(task: TaskRecord) {
  return task.status === "queued" || task.status === "running";
}
function readHidden(): string[] {
  try {
    const raw = window.localStorage.getItem(HIDDEN_KEY);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}
function writeHidden(hidden: string[]) {
  try {
    window.localStorage.setItem(
      HIDDEN_KEY,
      JSON.stringify(hidden.slice(-MAX_HIDDEN)),
    );
  } catch {
    return;
  }
}
function timeAgo(timestamp: number, now: number) {
  const diff = Math.max(0, now - timestamp);
  if (diff < 45_000) return "Just now";
  const minutes = Math.max(1, Math.round(diff / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
function StatusIcon({ status }: { status: TaskRecord["status"] }) {
  if (status === "completed")
    return <CheckCircle2 size={16} strokeWidth={1.6} />;
  if (status === "failed") return <XCircle size={16} strokeWidth={1.6} />;
  if (status === "cancelled") return <Ban size={16} strokeWidth={1.6} />;
  if (status === "running") {
    return <LoaderCircle size={16} strokeWidth={1.8} className="tm-spin" />;
  }
  return <Clock3 size={16} strokeWidth={1.6} />;
}
function CheckMark({ animate }: { animate: boolean }) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <motion.path
        d="M2.4 6.4 4.9 8.9 9.7 3.4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={animate ? { pathLength: 0 } : false}
        animate={{ pathLength: 1 }}
        transition={{ duration: animate ? 0.22 : 0, ease: EASE }}
      />
    </svg>
  );
}
function metaParts(task: TaskRecord, now: number): string[] {
  const kind = task.kind === "download" ? "Download" : "Task";
  if (task.status === "queued") return ["Queued", kind];
  if (task.status === "running") {
    return [
      task.progress !== null ? `${Math.round(task.progress)}%` : "In progress",
      kind,
    ];
  }
  if (task.status === "failed") {
    return ["Failed", task.detail || "Something went wrong"];
  }
  const label = task.status === "completed" ? "Completed" : "Cancelled";
  return [label, kind, timeAgo(task.updatedAt, now)];
}
export default function TaskManagerView({
  onBack,
  onCollapse,
}: TaskManagerViewProps) {
  const reducedMotion = useReducedMotion() === true;
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [hidden, setHidden] = useState<string[]>(readHidden);
  const [url, setUrl] = useState("");
  const [filename, setFilename] = useState("");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [undo, setUndo] = useState<UndoState | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [introDone, setIntroDone] = useState(false);
  const notifiedRef = useRef(new Set<string>());
  const copiedTimer = useRef<number | null>(null);
  const undoTimer = useRef<number | null>(null);
  const hiddenRef = useRef(hidden);
  useEffect(() => {
    hiddenRef.current = hidden;
    writeHidden(hidden);
  }, [hidden]);
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    const intro = window.setTimeout(() => setIntroDone(true), INTRO_MS);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(intro);
    };
  }, []);
  useEffect(
    () => () => {
      for (const timer of [copiedTimer, undoTimer]) {
        if (timer.current !== null) window.clearTimeout(timer.current);
      }
    },
    [],
  );
  useEffect(() => {
    let mounted = true;
    let unlisten: (() => void) | undefined;
    const applyTask = (task: TaskRecord) => {
      setTasks((current) =>
        [task, ...current.filter((item) => item.id !== task.id)].sort(
          (a, b) => b.updatedAt - a.updatedAt,
        ),
      );
      if (
        terminalStatuses.has(task.status) &&
        !notifiedRef.current.has(`${task.id}:${task.status}`)
      ) {
        notifiedRef.current.add(`${task.id}:${task.status}`);
        if (task.status !== "cancelled") {
          const label = task.kind === "download" ? "Download" : "Task";
          const event: CompanionEvent = {
            id: `${task.id}:${task.status}`,
            type: "download",
            title:
              task.status === "completed"
                ? `${label} completed`
                : `${label} failed`,
            message:
              task.status === "completed"
                ? task.title
                : `${task.title}: ${task.detail || "Something went wrong."}`,
            priority: 2,
          };
          notificationService.recordEvent(event);
        }
      }
    };
    async function initialize() {
      try {
        const stop = await listen<TaskRecord>("tasks://updated", (event) => {
          if (mounted) applyTask(event.payload);
        });
        if (mounted) {
          unlisten = stop;
        } else {
          stop();
          return;
        }
      } catch {
        if (mounted) {
          setError("Could not subscribe to live task updates.");
        }
      }
      try {
        const result = await invoke<TaskRecord[]>("tasks_list");
        if (!mounted) return;
        setTasks((current) => {
          const merged = new Map<string, TaskRecord>();
          for (const task of result) {
            merged.set(task.id, task);
          }
          for (const task of current) {
            const snapshotTask = merged.get(task.id);
            if (!snapshotTask || task.updatedAt >= snapshotTask.updatedAt) {
              merged.set(task.id, task);
            }
          }
          return [...merged.values()].sort((a, b) => b.updatedAt - a.updatedAt);
        });
      } catch {
        if (mounted) setError("Could not load tasks.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void initialize();
    return () => {
      mounted = false;
      unlisten?.();
    };
  }, []);
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && (url || filename)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setUrl("");
        setFilename("");
      }
    }
    window.addEventListener("keydown", handleEscape, true);
    return () => window.removeEventListener("keydown", handleEscape, true);
  }, [url, filename]);
  const { active, finished } = useMemo(() => {
    const hiddenSet = new Set(hidden);
    const visible = tasks.filter(
      (task) => isActive(task) || !hiddenSet.has(task.id),
    );
    return {
      active: visible.filter(isActive),
      finished: visible.filter((task) => !isActive(task)),
    };
  }, [tasks, hidden]);
  const cleanUrl = url.trim();
  const canStart = cleanUrl.length > 0 && !starting;
  async function startDownload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cleanUrl) {
      setError("Enter a download link.");
      return;
    }
    if (!isValidUrl(cleanUrl)) {
      setError("Enter a valid http or https link.");
      return;
    }
    setStarting(true);
    setError(null);
    try {
      await invoke<TaskRecord>("download_start", {
        url: cleanUrl,
        filename: filename.trim() || null,
      });
      setUrl("");
      setFilename("");
    } catch (cause) {
      setError(
        typeof cause === "string"
          ? cause
          : "Could not start the download. Check the link and try again.",
      );
    } finally {
      setStarting(false);
    }
  }
  async function cancelDownload(task: TaskRecord) {
    setError(null);
    try {
      await invoke("task_cancel", { id: task.id });
    } catch (cause) {
      setError(
        typeof cause === "string" ? cause : "Could not cancel this download.",
      );
    }
  }
  async function copyPath(task: TaskRecord) {
    if (!task.outputPath) return;
    try {
      await invoke("clipboard_write_text", { text: task.outputPath });
    } catch {
      try {
        await navigator.clipboard.writeText(task.outputPath);
      } catch {
        setError("Could not copy the file path.");
        return;
      }
    }
    setCopiedId(task.id);
    if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => setCopiedId(null), COPIED_MS);
  }
  const clearFinished = useCallback(() => {
    const ids = finished.map((task) => task.id);
    if (ids.length === 0) return;
    setUndo({
      label: `Cleared ${ids.length} ${ids.length === 1 ? "task" : "tasks"}`,
      hidden: hiddenRef.current,
    });
    if (undoTimer.current !== null) window.clearTimeout(undoTimer.current);
    undoTimer.current = window.setTimeout(() => setUndo(null), UNDO_MS);
    setHidden((current) => [...new Set([...current, ...ids])]);
  }, [finished]);
  const performUndo = useCallback(() => {
    if (!undo) return;
    setHidden(undo.hidden);
    setUndo(null);
    if (undoTimer.current !== null) window.clearTimeout(undoTimer.current);
  }, [undo]);
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "z" &&
        undo
      ) {
        event.preventDefault();
        performUndo();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, performUndo]);
  const rowsEmpty = active.length === 0 && finished.length === 0;
  const showSections = active.length > 0 && finished.length > 0;
  const renderRow = (task: TaskRecord, index: number): ReactNode => {
    const running = task.status === "running";
    const showBar = running;
    const indeterminate = running && task.progress === null;
    const progress = Math.max(0, Math.min(100, task.progress ?? 0));
    const parts = metaParts(task, now);
    const copied = copiedId === task.id;
    const canCancel = task.kind === "download" && isActive(task);
    const canCopy = task.status === "completed" && Boolean(task.outputPath);
    return (
      <motion.div
        key={task.id}
        className="tm-row-wrap"
        layout={reducedMotion ? false : "position"}
        initial={reducedMotion ? false : { opacity: 0, y: -6 }}
        animate={{
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.22,
            ease: EASE,
            delay: introDone ? 0 : Math.min(index, 7) * 0.02,
          },
        }}
        exit={
          reducedMotion
            ? { opacity: 0, transition: { duration: 0 } }
            : {
                opacity: 0,
                height: 0,
                transition: { duration: 0.18, ease: EASE },
              }
        }
      >
        <div className="tm-row" title={task.outputPath ?? task.title}>
          <span className={`tm-lead is-${task.status}`}>
            <StatusIcon status={task.status} />
          </span>
          <div className="tm-main">
            <span className="tm-title">{task.title}</span>
            <span
              className={`tm-meta ${task.status === "failed" ? "is-failed" : ""} ${
                copied ? "is-notice" : ""
              }`}
            >
              {copied ? (
                <>
                  <CheckMark animate={!reducedMotion} />
                  Path copied
                </>
              ) : (
                parts.map((part, partIndex) => (
                  <span key={partIndex} className="tm-meta-text">
                    {partIndex > 0 && "· "}
                    {part}
                  </span>
                ))
              )}
            </span>
            <span
              className={`tm-bar ${showBar ? "is-on" : ""} ${
                indeterminate ? "is-indeterminate" : ""
              }`}
              role={showBar ? "progressbar" : undefined}
              aria-valuemin={showBar ? 0 : undefined}
              aria-valuemax={showBar ? 100 : undefined}
              aria-valuenow={
                showBar && !indeterminate ? Math.round(progress) : undefined
              }
            >
              {showBar && (
                <span
                  className="tm-bar-fill"
                  style={indeterminate ? undefined : { width: `${progress}%` }}
                />
              )}
            </span>
          </div>
          {canCancel ? (
            <button
              type="button"
              className="tm-act is-danger"
              onClick={() => void cancelDownload(task)}
              aria-label={`Cancel ${task.title}`}
              title="Cancel download"
            >
              <Ban size={14} strokeWidth={1.7} />
            </button>
          ) : canCopy ? (
            <button
              type="button"
              className="tm-act"
              onClick={() => void copyPath(task)}
              aria-label="Copy file path"
              title="Copy file path"
            >
              <Copy size={14} strokeWidth={1.7} />
            </button>
          ) : (
            <span style={{ width: 28, flex: "none" }} />
          )}
        </div>
      </motion.div>
    );
  };
  return (
    <section className="tm">
      <ViewHeader
        onClose={onCollapse}
        leading={<BackLabel title="Task Manager" onBack={onBack} />}
        trailing={
          <button
            type="button"
            className="tm-clear"
            onClick={clearFinished}
            disabled={finished.length === 0}
          >
            Clear
          </button>
        }
      />
      <form className="tm-compose" onSubmit={startDownload} noValidate>
        <div className="nx-field">
          <Download size={16} strokeWidth={1.6} />
          <input
            autoFocus
            spellCheck={false}
            inputMode="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="Paste a link to download"
            aria-label="Download link"
          />
          <button type="submit" className="tm-go" disabled={!canStart}>
            {starting ? (
              <LoaderCircle size={12} strokeWidth={2} className="tm-spin" />
            ) : null}
            {starting ? "Starting" : "Download"}
          </button>
        </div>
        <AnimatePresence initial={false}>
          {cleanUrl && (
            <motion.div
              className="tm-extra"
              initial={reducedMotion ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.18, ease: EASE }}
            >
              <label className="nx-field">
                <input
                  spellCheck={false}
                  value={filename}
                  onChange={(event) => setFilename(event.target.value)}
                  placeholder="Save as (optional)"
                  aria-label="File name"
                />
              </label>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
      <div className="tm-list">
        {loading && rowsEmpty ? (
          <div className="tm-empty">
            <span className="tm-empty-hint">Loading…</span>
          </div>
        ) : rowsEmpty ? (
          <div className="tm-empty">
            <span className="tm-empty-title">No downloads yet</span>
            <span className="tm-empty-hint">
              Paste a link above and press Enter
            </span>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {showSections && (
              <div key="label-active" className="tm-section">
                Active
              </div>
            )}
            {active.map((task, index) => renderRow(task, index))}
            {showSections && (
              <div key="label-finished" className="tm-section">
                Finished
              </div>
            )}
            {finished.map((task, index) =>
              renderRow(task, active.length + index),
            )}
          </AnimatePresence>
        )}
      </div>
      {error && (
        <div className="nx-error" role="alert">
          {error}
        </div>
      )}
      <footer className="nx-footer">
        <AnimatePresence mode="wait" initial={false}>
          {undo ? (
            <motion.div
              key="undo"
              className="tm-footer-row"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.12 }}
            >
              <span className="nx-footer-lead">{undo.label}</span>
              <button type="button" className="tm-undo" onClick={performUndo}>
                Undo
                <kbd className="nx-kbd">Ctrl Z</kbd>
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="hints"
              className="tm-footer-row"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.12 }}
            >
              <span className="nx-footer-lead">
                {active.length === 0
                  ? "No active tasks"
                  : `${active.length} active`}
              </span>
              <span className="nx-hint">
                <kbd className="nx-kbd">↵</kbd>
                Download
              </span>
              <span className="nx-hint">
                <kbd className="nx-kbd">Esc</kbd>
                Clear
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </footer>
    </section>
  );
}
