import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { AlignLeft, Code, Link2, Pin, Search, Trash2, X } from "lucide-react";
import { BackLabel, ViewHeader } from "./parts";
import "./clipboard.css";

type Entry = {
  id: string;
  text: string;
};

type BackendClipboardEntry = {
  id: number;
  text: string;
};

type Meta = {
  pinned: Record<string, string>;
  hidden: string[];
  seen: Record<string, number>;
};

type Kind = "link" | "code" | "color" | "text";

type Row = {
  id: string;
  key: string;
  text: string;
  kind: Kind;
  pinned: boolean;
  seenAt: number | null;
};

type UndoState = {
  label: string;
  entries: Entry[];
  meta: Meta;
};

type ClipboardViewProps = {
  onBack: () => void;
  onCollapse: () => void;
  onCopied?: () => void;
};

const META_KEY = "mybuddy.clipboard.meta";
const MAX_ENTRIES = 100;
const MAX_META = 500;
const COPIED_MS = 1400;
const UNDO_MS = 5000;
const INTRO_MS = 420;
const EASE = [0.2, 0, 0, 1] as const;
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

function hashText(text: string) {
  let hash = 5381;

  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  }

  return `${(hash >>> 0).toString(36)}:${text.length}`;
}

function emptyMeta(): Meta {
  return { pinned: {}, hidden: [], seen: {} };
}

function readMeta(): Meta {
  try {
    const raw = window.localStorage.getItem(META_KEY);

    if (!raw) return emptyMeta();

    const parsed = JSON.parse(raw) as Partial<Meta>;
    const pinned: Record<string, string> = {};

    if (parsed.pinned && typeof parsed.pinned === "object") {
      for (const [key, value] of Object.entries(parsed.pinned)) {
        if (typeof value === "string") pinned[key] = value;
      }
    }

    return {
      pinned,
      hidden: Array.isArray(parsed.hidden)
        ? parsed.hidden.filter((item) => typeof item === "string")
        : [],
      seen:
        parsed.seen && typeof parsed.seen === "object"
          ? (parsed.seen as Record<string, number>)
          : {},
    };
  } catch {
    return emptyMeta();
  }
}

function writeMeta(meta: Meta) {
  try {
    const seen = Object.entries(meta.seen)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_META);

    window.localStorage.setItem(
      META_KEY,
      JSON.stringify({
        pinned: meta.pinned,
        hidden: meta.hidden.slice(-MAX_META),
        seen: Object.fromEntries(seen),
      }),
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

function isColor(text: string) {
  if (
    !/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(text) &&
    !/^(?:rgb|hsl)a?\([^)]+\)$/i.test(text)
  ) {
    return false;
  }

  return typeof CSS === "undefined" || CSS.supports("color", text);
}

function detectKind(text: string): Kind {
  const value = text.trim();

  if (isColor(value)) return "color";

  if (/^(?:https?:\/\/|www\.)\S+$/i.test(value)) return "link";

  if (
    /(^|\n)\s*(?:const|let|var|function|import|export|return|def|class|async|await|if|for|while)\b/.test(
      value,
    ) ||
    /=>|[{};]\s*(?:\n|$)/.test(value) ||
    /^\s{2,}\S/m.test(value)
  ) {
    return "code";
  }

  return "text";
}

function splitLink(value: string) {
  try {
    const url = new URL(
      /^https?:\/\//i.test(value) ? value : `https://${value}`,
    );
    const path =
      (url.pathname === "/" ? "" : url.pathname) + url.search + url.hash;

    return { host: url.host.replace(/^www\./, ""), path };
  } catch {
    return null;
  }
}

function highlight(text: string, query: string): ReactNode {
  const needle = query.trim().toLowerCase();

  if (!needle) return text;

  const lower = text.toLowerCase();
  let index = lower.indexOf(needle);

  if (index === -1) return text;

  const parts: ReactNode[] = [];
  let from = 0;
  let key = 0;

  while (index !== -1) {
    if (index > from) parts.push(text.slice(from, index));

    parts.push(
      <mark key={key++}>{text.slice(index, index + needle.length)}</mark>,
    );

    from = index + needle.length;
    index = lower.indexOf(needle, from);
  }

  if (from < text.length) parts.push(text.slice(from));

  return parts;
}

function LeadIcon({ kind, text }: { kind: Kind; text: string }) {
  if (kind === "color") {
    return (
      <span
        className="cb-swatch"
        style={{ ["--swatch" as string]: text.trim() }}
      />
    );
  }

  if (kind === "link") return <Link2 size={16} strokeWidth={1.6} />;
  if (kind === "code") return <Code size={16} strokeWidth={1.6} />;

  return <AlignLeft size={16} strokeWidth={1.6} />;
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
        transition={{ duration: animate ? 0.22 : 0, ease: EASE_OUT }}
      />
    </svg>
  );
}

export default function ClipboardView({
  onBack,
  onCollapse,
  onCopied,
}: ClipboardViewProps) {
  const reducedMotion = useReducedMotion() === true;

  const [entries, setEntries] = useState<Entry[]>([]);
  const [meta, setMeta] = useState<Meta>(readMeta);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [altHeld, setAltHeld] = useState(false);
  const [undo, setUndo] = useState<UndoState | null>(null);
  const [introDone, setIntroDone] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const copiedTimer = useRef<number | null>(null);
  const copiedCallbackTimer = useRef<number | null>(null);
  const undoTimer = useRef<number | null>(null);
  const snapshot = useRef({ entries, meta });

  useEffect(() => {
    snapshot.current = { entries, meta };
  }, [entries, meta]);

  useEffect(() => {
    writeMeta(meta);
  }, [meta]);

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
      for (const timer of [copiedTimer, copiedCallbackTimer, undoTimer]) {
        if (timer.current !== null) window.clearTimeout(timer.current);
      }
    },
    [],
  );

  useEffect(() => {
    let active = true;
    let unlisten: (() => void) | undefined;

    async function loadHistory() {
      try {
        const items = await invoke<BackendClipboardEntry[]>(
          "clipboard_history_list",
        );

        if (!active) return;

        const loaded: Entry[] = [];
        const texts = new Set<string>();

        for (const item of items) {
          if (!item.text.trim() || texts.has(item.text)) continue;

          texts.add(item.text);
          loaded.push({ id: String(item.id), text: item.text });
        }

        setEntries((current) => {
          const liveOnly = current.filter((entry) => !texts.has(entry.text));

          return [...liveOnly, ...loaded].slice(0, MAX_ENTRIES);
        });

        setError(null);
      } catch (cause) {
        console.error("[clipboard] Could not load history:", cause);

        if (active) setError("Could not load clipboard history.");
      }
    }

    async function setupListener() {
      try {
        const stop = await listen<BackendClipboardEntry>(
          "clipboard://changed",
          (event) => {
            if (!active) return;

            const { id, text } = event.payload;

            if (!text.trim()) return;

            const key = hashText(text);

            setEntries((current) =>
              [
                { id: String(id), text },
                ...current.filter((entry) => entry.text !== text),
              ].slice(0, MAX_ENTRIES),
            );

            setMeta((current) => ({
              ...current,
              hidden: current.hidden.filter((item) => item !== key),
              seen: { ...current.seen, [key]: Date.now() },
            }));

            setError(null);
          },
        );

        if (active) {
          unlisten = stop;
        } else {
          stop();
        }
      } catch (cause) {
        console.error("[clipboard] Could not register listener:", cause);

        if (active) setError("Could not connect to clipboard monitoring.");
      }
    }

    void setupListener();
    void loadHistory();

    return () => {
      active = false;
      unlisten?.();
    };
  }, []);

  const { rows, total } = useMemo(() => {
    const hidden = new Set(meta.hidden);
    const search = query.trim().toLowerCase();
    const used = new Set<string>();
    const all: Row[] = [];

    const push = (id: string, text: string) => {
      const key = hashText(text);

      if (used.has(key)) return;

      used.add(key);

      all.push({
        id,
        key,
        text,
        kind: detectKind(text),
        pinned: meta.pinned[key] !== undefined,
        seenAt: meta.seen[key] ?? null,
      });
    };

    for (const entry of entries) {
      if (!hidden.has(hashText(entry.text))) push(entry.id, entry.text);
    }

    for (const [key, text] of Object.entries(meta.pinned)) {
      push(`pinned-${key}`, text);
    }

    const matching = search
      ? all.filter((row) => row.text.toLowerCase().includes(search))
      : all;

    return {
      total: all.length,
      rows: [
        ...matching.filter((row) => row.pinned),
        ...matching.filter((row) => !row.pinned),
      ],
    };
  }, [entries, meta, query]);

  const activeIndex = Math.min(selectedIndex, Math.max(rows.length - 1, 0));
  const hasPinned = rows.some((row) => row.pinned);
  const hasClearable = total > Object.keys(meta.pinned).length;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(".is-selected")
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, rows.length]);

  const armUndo = useCallback((label: string) => {
    const { entries: savedEntries, meta: savedMeta } = snapshot.current;

    setUndo({ label, entries: savedEntries, meta: savedMeta });

    if (undoTimer.current !== null) window.clearTimeout(undoTimer.current);

    undoTimer.current = window.setTimeout(() => setUndo(null), UNDO_MS);
  }, []);

  const performUndo = useCallback(() => {
    if (!undo) return;

    setEntries(undo.entries);
    setMeta(undo.meta);
    setUndo(null);

    if (undoTimer.current !== null) window.clearTimeout(undoTimer.current);
  }, [undo]);

  const copyRow = useCallback(
    async (row: Row) => {
      try {
        await invoke("clipboard_write_text", { text: row.text });

        setError(null);
        setCopiedKey(row.key);

        if (copiedTimer.current !== null)
          window.clearTimeout(copiedTimer.current);

        copiedTimer.current = window.setTimeout(
          () => setCopiedKey(null),
          COPIED_MS,
        );

        if (onCopied) {
          if (copiedCallbackTimer.current !== null) {
            window.clearTimeout(copiedCallbackTimer.current);
          }

          copiedCallbackTimer.current = window.setTimeout(onCopied, 520);
        }
      } catch (cause) {
        console.error("[clipboard] Could not copy text:", cause);
        setError("Could not copy this text.");
      }
    },
    [onCopied],
  );

  const togglePin = useCallback((row: Row) => {
    setMeta((current) => {
      const pinned = { ...current.pinned };

      if (pinned[row.key] !== undefined) {
        delete pinned[row.key];
      } else {
        pinned[row.key] = row.text;
      }

      return { ...current, pinned };
    });
  }, []);

  const deleteRow = useCallback(
    (row: Row) => {
      armUndo("Removed");

      setEntries((current) =>
        current.filter((entry) => entry.text !== row.text),
      );

      setMeta((current) => {
        const pinned = { ...current.pinned };

        delete pinned[row.key];

        return {
          ...current,
          pinned,
          hidden: current.hidden.includes(row.key)
            ? current.hidden
            : [...current.hidden, row.key],
        };
      });
    },
    [armUndo],
  );

  const clearHistory = useCallback(() => {
    const removable = snapshot.current.entries.filter(
      (entry) =>
        snapshot.current.meta.pinned[hashText(entry.text)] === undefined,
    );

    if (removable.length === 0) return;

    armUndo(
      `Cleared ${removable.length} ${removable.length === 1 ? "item" : "items"}`,
    );

    setMeta((current) => {
      const hidden = new Set(current.hidden);

      for (const entry of removable) hidden.add(hashText(entry.text));

      return { ...current, hidden: [...hidden] };
    });
  }, [armUndo]);

  useEffect(() => {
    function syncAlt(event: KeyboardEvent) {
      setAltHeld(event.altKey);
    }

    function clearAlt() {
      setAltHeld(false);
    }

    window.addEventListener("keydown", syncAlt);
    window.addEventListener("keyup", syncAlt);
    window.addEventListener("blur", clearAlt);

    return () => {
      window.removeEventListener("keydown", syncAlt);
      window.removeEventListener("keyup", syncAlt);
      window.removeEventListener("blur", clearAlt);
    };
  }, []);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && query) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setQuery("");
      }
    }

    window.addEventListener("keydown", handleEscape, true);

    return () => window.removeEventListener("keydown", handleEscape, true);
  }, [query]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target;
      const inField =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement;
      const onControl =
        target instanceof HTMLElement &&
        target.closest(".cb-actions, .cb-clear, .cb-undo, .cb-search-clear");

      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "z" &&
        undo
      ) {
        event.preventDefault();
        performUndo();
        return;
      }

      if (event.altKey && /^Digit[1-9]$/.test(event.code)) {
        event.preventDefault();

        const row = rows[Number(event.code.slice(5)) - 1];

        if (row) void copyRow(row);

        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p") {
        event.preventDefault();

        const row = rows[activeIndex];

        if (row) togglePin(row);

        return;
      }

      if (event.key === "ArrowDown" && rows.length > 0) {
        event.preventDefault();
        setSelectedIndex((index) => (index + 1) % rows.length);
        return;
      }

      if (event.key === "ArrowUp" && rows.length > 0) {
        event.preventDefault();
        setSelectedIndex((index) => (index - 1 + rows.length) % rows.length);
        return;
      }

      if (event.key === "Enter" && !event.isComposing) {
        if (onControl) return;

        event.preventDefault();

        if (event.repeat) return;

        const row = rows[activeIndex];

        if (row) void copyRow(row);

        return;
      }

      if (event.key === "Delete" && !query && !onControl) {
        const row = rows[activeIndex];

        if (row) {
          event.preventDefault();
          deleteRow(row);
        }

        return;
      }

      if (
        !inField &&
        event.key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        inputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    rows,
    activeIndex,
    query,
    undo,
    copyRow,
    togglePin,
    deleteRow,
    performUndo,
  ]);

  const searching = query.trim().length > 0;
  const countLabel = searching
    ? `${rows.length} of ${total}`
    : `${total} ${total === 1 ? "item" : "items"}`;

  let pinnedLabelShown = false;
  let recentLabelShown = false;

  return (
    <section className="cb">
      <ViewHeader
        onClose={onCollapse}
        leading={<BackLabel title="Clipboard" onBack={onBack} />}
        trailing={
          <button
            type="button"
            className="cb-clear"
            onClick={clearHistory}
            disabled={!hasClearable}
          >
            Clear
          </button>
        }
      />

      <label className="nx-field">
        <Search size={16} strokeWidth={1.6} />

        <input
          ref={inputRef}
          autoFocus
          spellCheck={false}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search clipboard"
          aria-label="Search clipboard history"
        />

        {searching && (
          <span className="cb-search-meta">
            <button
              type="button"
              className="cb-search-clear"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
            >
              <X size={11} strokeWidth={2} />
            </button>
          </span>
        )}
      </label>

      <div
        className="cb-list"
        role="listbox"
        aria-label="Clipboard history"
        ref={listRef}
      >
        {rows.length === 0 ? (
          <div className="cb-empty">
            <span className="cb-empty-title">
              {searching
                ? `No results for “${query.trim().slice(0, 24)}”`
                : "Nothing copied yet"}
            </span>

            {!searching && (
              <span className="cb-empty-hint">
                Press
                <kbd className="nx-kbd">Ctrl</kbd>
                <kbd className="nx-kbd">C</kbd>
                on any text and it lands here
              </span>
            )}
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {rows.map((row, index) => {
              const selected = activeIndex === index;
              const copied = copiedKey === row.key;
              const flat = row.text.replace(/\s+/g, " ").trim().slice(0, 300);
              const lineCount = row.text.trim().split(/\r?\n/).length;
              const link =
                row.kind === "link" ? splitLink(row.text.trim()) : null;
              const showIndex = altHeld && index < 9;

              const label =
                row.kind === "link"
                  ? "Link"
                  : row.kind === "code"
                    ? "Code"
                    : row.kind === "color"
                      ? "Color"
                      : "Text";

              const meta: string[] = [label];

              if (
                row.kind !== "link" &&
                row.kind !== "color" &&
                lineCount > 1
              ) {
                meta.push(`${lineCount} lines`);
              }

              if (row.seenAt !== null) meta.push(timeAgo(row.seenAt, now));

              let section: ReactNode = null;

              if (row.pinned && !pinnedLabelShown) {
                pinnedLabelShown = true;
                section = <div className="cb-section">Pinned</div>;
              } else if (!row.pinned && hasPinned && !recentLabelShown) {
                recentLabelShown = true;
                section = <div className="cb-section">Recent</div>;
              }

              return (
                <div key={row.key}>
                  {section}

                  <motion.div
                    className="cb-row-wrap"
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
                    <div
                      role="option"
                      aria-selected={selected}
                      className={`cb-row ${selected ? "is-selected" : ""} ${
                        copied ? "is-copied" : ""
                      }`}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <span
                        className={`cb-lead ${showIndex ? "is-index" : ""}`}
                      >
                        {showIndex ? (
                          index + 1
                        ) : (
                          <LeadIcon kind={row.kind} text={row.text} />
                        )}
                      </span>

                      <button
                        type="button"
                        className="cb-main"
                        onClick={() => void copyRow(row)}
                        title={flat}
                      >
                        <span
                          className={`cb-primary ${
                            row.kind === "code" || row.kind === "color"
                              ? "is-code"
                              : ""
                          }`}
                        >
                          {link ? (
                            <>
                              {highlight(link.host, query)}
                              {link.path && (
                                <span className="cb-path">
                                  {highlight(link.path, query)}
                                </span>
                              )}
                            </>
                          ) : (
                            highlight(flat, query)
                          )}
                        </span>

                        <span
                          className={`cb-meta ${copied ? "is-copied" : ""}`}
                        >
                          {copied ? (
                            <>
                              <CheckMark animate={!reducedMotion} />
                              Copied
                            </>
                          ) : (
                            meta.map((part, partIndex) => (
                              <span key={partIndex} className="cb-meta-part">
                                {partIndex > 0 && (
                                  <span className="cb-meta-dot"> · </span>
                                )}
                                {part}
                              </span>
                            ))
                          )}
                        </span>
                      </button>

                      <span className="cb-actions">
                        <button
                          type="button"
                          className={`cb-act ${row.pinned ? "is-active" : ""}`}
                          onClick={() => togglePin(row)}
                          aria-label={row.pinned ? "Unpin item" : "Pin item"}
                          aria-pressed={row.pinned}
                          title={row.pinned ? "Unpin" : "Pin  Ctrl P"}
                        >
                          <Pin
                            size={14}
                            strokeWidth={1.7}
                            fill={row.pinned ? "currentColor" : "none"}
                          />
                        </button>

                        <button
                          type="button"
                          className="cb-act is-danger"
                          onClick={() => deleteRow(row)}
                          aria-label="Delete item"
                          title="Delete  Del"
                        >
                          <Trash2 size={14} strokeWidth={1.7} />
                        </button>
                      </span>
                    </div>
                  </motion.div>
                </div>
              );
            })}
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
              className="cb-footer-row"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.12 }}
            >
              <span className="nx-footer-lead">{undo.label}</span>

              <button type="button" className="cb-undo" onClick={performUndo}>
                Undo
                <span>
                  <kbd className="nx-kbd">Ctrl</kbd>{" "}
                  <kbd className="nx-kbd">Z</kbd>
                </span>
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="hints"
              className="cb-footer-row"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.12 }}
            >
              <span className="nx-footer-lead">{countLabel}</span>

              <span className="nx-hint">
                <kbd className="nx-kbd">↑↓</kbd>
                Navigate
              </span>

              <span className="nx-hint">
                <kbd className="nx-kbd">↵</kbd>
                Copy
              </span>

              <span className="nx-hint">
                <kbd className="nx-kbd">Alt</kbd>
                1–9
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </footer>
    </section>
  );
}
