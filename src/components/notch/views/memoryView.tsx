import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
  } from "react";
  import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
  import { invoke } from "@tauri-apps/api/core";
  import {
    Code2,
    Copy,
    FileText,
    Hash,
    Link2,
    Pin,
    Plus,
    Search,
    Terminal,
    Trash2,
    X,
    type LucideIcon,
  } from "lucide-react";
  import { BackLabel, ViewHeader } from "./parts";
  import "./memory.css";
  
  type MemoryKind = "note" | "link" | "code" | "command";
  
  type MemoryEntry = {
    id: string;
    title: string;
    content: string;
    kind: MemoryKind;
    tags: string[];
    pinned: boolean;
    createdAt: number;
    updatedAt: number;
  };
  
  type UndoState = {
    label: string;
    entries: MemoryEntry[];
  };
  
  type MemoryViewProps = {
    onBack: () => void;
    onCollapse: () => void;
  };
  
  const STORAGE_KEY = "mybuddy.memory.v1";
  const COPIED_MS = 1400;
  const UNDO_MS = 5000;
  const INTRO_MS = 420;
  const EASE = [0.2, 0, 0, 1] as const;
  const EASE_OUT = [0.16, 1, 0.3, 1] as const;
  
  const KINDS: { id: MemoryKind; label: string; icon: LucideIcon }[] = [
    { id: "note", label: "Note", icon: FileText },
    { id: "link", label: "Link", icon: Link2 },
    { id: "code", label: "Code", icon: Code2 },
    { id: "command", label: "Command", icon: Terminal },
  ];
  
  const PLACEHOLDERS: Record<MemoryKind, string> = {
    note: "Write something worth remembering",
    link: "Paste a URL",
    code: "Paste your snippet",
    command: "Enter a command",
  };
  
  function readEntries(): MemoryEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
  
      if (!raw) return [];
  
      const value: unknown = JSON.parse(raw);
  
      if (!Array.isArray(value)) return [];
  
      return value.filter(
        (item): item is MemoryEntry =>
          item !== null &&
          typeof item === "object" &&
          typeof item.id === "string" &&
          typeof item.title === "string" &&
          typeof item.content === "string" &&
          ["note", "link", "code", "command"].includes(item.kind) &&
          Array.isArray(item.tags) &&
          typeof item.pinned === "boolean" &&
          typeof item.createdAt === "number" &&
          typeof item.updatedAt === "number"
      );
    } catch {
      return [];
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
  
      parts.push(<mark key={key++}>{text.slice(index, index + needle.length)}</mark>);
  
      from = index + needle.length;
      index = lower.indexOf(needle, from);
    }
  
    if (from < text.length) parts.push(text.slice(from));
  
    return parts;
  }
  
  function KindIcon({ kind }: { kind: MemoryKind }) {
    const Icon = KINDS.find((item) => item.id === kind)?.icon ?? FileText;
  
    return <Icon size={16} strokeWidth={1.6} />;
  }
  
  function CheckMark({ animate }: { animate: boolean }) {
    return (
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
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
  
  export default function MemoryView({ onBack, onCollapse }: MemoryViewProps) {
    const reducedMotion = useReducedMotion() === true;
  
    const [entries, setEntries] = useState<MemoryEntry[]>(readEntries);
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [editing, setEditing] = useState(false);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [kind, setKind] = useState<MemoryKind>("note");
    const [tagsText, setTagsText] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [undo, setUndo] = useState<UndoState | null>(null);
    const [introDone, setIntroDone] = useState(false);
  
    const listRef = useRef<HTMLDivElement>(null);
    const copiedTimer = useRef<number | null>(null);
    const undoTimer = useRef<number | null>(null);
    const entriesRef = useRef(entries);
  
    useEffect(() => {
      entriesRef.current = entries;
  
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      } catch {
        setError("Could not save. Local storage may be full.");
      }
    }, [entries]);
  
    useEffect(() => {
      const intro = window.setTimeout(() => setIntroDone(true), INTRO_MS);
  
      return () => window.clearTimeout(intro);
    }, []);
  
    useEffect(
      () => () => {
        for (const timer of [copiedTimer, undoTimer]) {
          if (timer.current !== null) window.clearTimeout(timer.current);
        }
      },
      []
    );
  
    const rows = useMemo(() => {
      const search = query.trim().toLowerCase();
  
      return entries
        .filter((entry) => {
          if (!search) return true;
  
          return [entry.title, entry.content, ...entry.tags, entry.kind]
            .join(" ")
            .toLowerCase()
            .includes(search);
        })
        .sort(
          (a, b) =>
            Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt
        );
    }, [entries, query]);
  
    const activeIndex = Math.min(selectedIndex, Math.max(rows.length - 1, 0));
    const hasPinned = rows.some((row) => row.pinned);
    const searching = query.trim().length > 0;
    const canSave = title.trim().length > 0 && content.trim().length > 0;
  
    useEffect(() => {
      setSelectedIndex(0);
    }, [query]);
  
    useEffect(() => {
      listRef.current
        ?.querySelector<HTMLElement>(".is-selected")
        ?.scrollIntoView({ block: "nearest" });
    }, [activeIndex, rows.length]);
  
    const armUndo = useCallback((label: string) => {
      setUndo({ label, entries: entriesRef.current });
  
      if (undoTimer.current !== null) window.clearTimeout(undoTimer.current);
  
      undoTimer.current = window.setTimeout(() => setUndo(null), UNDO_MS);
    }, []);
  
    const performUndo = useCallback(() => {
      if (!undo) return;
  
      setEntries(undo.entries);
      setUndo(null);
  
      if (undoTimer.current !== null) window.clearTimeout(undoTimer.current);
    }, [undo]);
  
    const resetEditor = useCallback(() => {
      setActiveId(null);
      setEditing(false);
      setTitle("");
      setContent("");
      setKind("note");
      setTagsText("");
      setError(null);
    }, []);
  
    const startNew = useCallback(() => {
      setActiveId(null);
      setTitle("");
      setContent("");
      setKind("note");
      setTagsText("");
      setEditing(true);
      setError(null);
    }, []);
  
    const startEdit = useCallback((entry: MemoryEntry) => {
      setActiveId(entry.id);
      setTitle(entry.title);
      setContent(entry.content);
      setKind(entry.kind);
      setTagsText(entry.tags.join(", "));
      setEditing(true);
      setError(null);
    }, []);
  
    const saveEntry = useCallback(() => {
      const cleanTitle = title.trim();
      const cleanContent = content.trim();
  
      if (!cleanTitle || !cleanContent) {
        setError("Add a title and some content before saving.");
        return;
      }
  
      const tags = [
        ...new Set(
          tagsText
            .split(",")
            .map((tag) => tag.trim().replace(/^#/, ""))
            .filter(Boolean)
            .map((tag) => tag.slice(0, 32))
        ),
      ].slice(0, 20);
  
      const now = Date.now();
  
      if (activeId) {
        setEntries((current) =>
          current.map((entry) =>
            entry.id === activeId
              ? {
                  ...entry,
                  title: cleanTitle,
                  content: cleanContent,
                  kind,
                  tags,
                  updatedAt: now,
                }
              : entry
          )
        );
      } else {
        setEntries((current) => [
          {
            id: crypto.randomUUID(),
            title: cleanTitle,
            content: cleanContent,
            kind,
            tags,
            pinned: false,
            createdAt: now,
            updatedAt: now,
          },
          ...current,
        ]);
      }
  
      resetEditor();
    }, [title, content, tagsText, kind, activeId, resetEditor]);
  
    const togglePin = useCallback((entry: MemoryEntry) => {
      setEntries((current) =>
        current.map((item) =>
          item.id === entry.id ? { ...item, pinned: !item.pinned } : item
        )
      );
    }, []);
  
    const deleteEntry = useCallback(
      (entry: MemoryEntry) => {
        armUndo("Deleted");
        setEntries((current) => current.filter((item) => item.id !== entry.id));
      },
      [armUndo]
    );
  
    const markCopied = useCallback((id: string) => {
      setCopiedId(id);
  
      if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current);
  
      copiedTimer.current = window.setTimeout(() => setCopiedId(null), COPIED_MS);
    }, []);
  
    const copyEntry = useCallback(
      async (entry: MemoryEntry) => {
        try {
          await invoke("clipboard_write_text", { text: entry.content });
          markCopied(entry.id);
        } catch {
          try {
            await navigator.clipboard.writeText(entry.content);
            markCopied(entry.id);
          } catch {
            setError("Could not copy this entry.");
          }
        }
      },
      [markCopied]
    );
  
    useEffect(() => {
      function handleEscape(event: KeyboardEvent) {
        if (event.key !== "Escape") return;
  
        if (editing) {
          event.preventDefault();
          event.stopImmediatePropagation();
          resetEditor();
          return;
        }
  
        if (query) {
          event.preventDefault();
          event.stopImmediatePropagation();
          setQuery("");
        }
      }
  
      window.addEventListener("keydown", handleEscape, true);
  
      return () => window.removeEventListener("keydown", handleEscape, true);
    }, [editing, query, resetEditor]);
  
    useEffect(() => {
      function handleKeyDown(event: KeyboardEvent) {
        const target = event.target;
        const inField =
          target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
        const onControl =
          target instanceof HTMLElement &&
          target.closest("button:not(.mem-main)");
        const mod = event.ctrlKey || event.metaKey;
  
        if (editing) {
          if (mod && event.key === "Enter") {
            event.preventDefault();
            saveEntry();
          }
  
          return;
        }
  
        if (mod && event.key.toLowerCase() === "z" && undo) {
          event.preventDefault();
          performUndo();
          return;
        }
  
        if (mod && event.key.toLowerCase() === "n") {
          event.preventDefault();
          startNew();
          return;
        }
  
        if (mod && event.key.toLowerCase() === "p") {
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
  
          if (row) startEdit(row);
  
          return;
        }
  
        if (event.key === "Delete" && !query && !onControl) {
          const row = rows[activeIndex];
  
          if (row) {
            event.preventDefault();
            deleteEntry(row);
          }
  
          return;
        }
  
        if (
          !inField &&
          event.key.length === 1 &&
          !mod &&
          !event.altKey
        ) {
          document
            .querySelector<HTMLInputElement>(".mem .nx-field input")
            ?.focus();
        }
      }
  
      window.addEventListener("keydown", handleKeyDown);
  
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [
      editing,
      rows,
      activeIndex,
      query,
      undo,
      saveEntry,
      performUndo,
      startNew,
      startEdit,
      togglePin,
      deleteEntry,
    ]);
  
    const countLabel = searching
      ? `${rows.length} of ${entries.length}`
      : `${entries.length} ${entries.length === 1 ? "memory" : "memories"}`;
  
    let pinnedLabelShown = false;
    let recentLabelShown = false;
  
    return (
      <section className="mem">
        <ViewHeader
          onClose={onCollapse}
          leading={
            <BackLabel
              title={
                editing ? (activeId ? "Edit memory" : "New memory") : "Memory Vault"
              }
              onBack={editing ? resetEditor : onBack}
            />
          }
          trailing={
            editing ? (
              <button
                type="button"
                className="mem-save"
                onClick={saveEntry}
                disabled={!canSave}
              >
                Save
              </button>
            ) : (
              <button type="button" className="mem-new" onClick={startNew}>
                <Plus size={13} strokeWidth={2} />
                New
              </button>
            )
          }
        />
  
        {editing ? (
          <div className="mem-editor">
            <div className="mem-seg" role="radiogroup" aria-label="Memory type">
              {KINDS.map((option) => {
                const Icon = option.icon;
  
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={kind === option.id}
                    onClick={() => setKind(option.id)}
                  >
                    <Icon size={13} strokeWidth={1.75} />
                    {option.label}
                  </button>
                );
              })}
            </div>
  
            <label className="nx-field">
              <input
                autoFocus
                spellCheck={false}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Title"
                aria-label="Memory title"
                maxLength={120}
              />
            </label>
  
            <textarea
              className={`mem-textarea ${
                kind === "code" || kind === "command" ? "is-mono" : ""
              }`}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder={PLACEHOLDERS[kind]}
              aria-label="Memory content"
              spellCheck={kind === "note"}
            />
  
            <label className="nx-field mem-field-tags">
              <Hash size={14} strokeWidth={1.6} />
  
              <input
                spellCheck={false}
                value={tagsText}
                onChange={(event) => setTagsText(event.target.value)}
                placeholder="Tags, separated by commas"
                aria-label="Memory tags"
              />
            </label>
          </div>
        ) : (
          <>
            <label className="nx-field">
              <Search size={16} strokeWidth={1.6} />
  
              <input
                spellCheck={false}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search memories, content, tags"
                aria-label="Search memories"
              />
  
              {searching && (
                <button
                  type="button"
                  className="mem-search-clear"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                >
                  <X size={11} strokeWidth={2} />
                </button>
              )}
            </label>
  
            <div
              className="mem-list"
              role="listbox"
              aria-label="Memories"
              ref={listRef}
            >
              {rows.length === 0 ? (
                <div className="mem-empty">
                  <span className="mem-empty-title">
                    {searching
                      ? `No results for “${query.trim().slice(0, 24)}”`
                      : "Your vault is empty"}
                  </span>
  
                  {!searching && (
                    <span className="mem-empty-hint">
                      Press
                      <kbd className="nx-kbd">Ctrl N</kbd>
                      to save your first memory
                    </span>
                  )}
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {rows.map((entry, index) => {
                    const selected = activeIndex === index;
                    const copied = copiedId === entry.id;
                    const preview = entry.content
                      .replace(/\s+/g, " ")
                      .trim()
                      .slice(0, 200);
  
                    let section: ReactNode = null;
  
                    if (entry.pinned && !pinnedLabelShown) {
                      pinnedLabelShown = true;
                      section = <div className="mem-section">Pinned</div>;
                    } else if (!entry.pinned && hasPinned && !recentLabelShown) {
                      recentLabelShown = true;
                      section = <div className="mem-section">Recent</div>;
                    }
  
                    return (
                      <div key={entry.id}>
                        {section}
  
                        <motion.div
                          className="mem-row-wrap"
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
                            className={`mem-row ${selected ? "is-selected" : ""} ${
                              copied ? "is-copied" : ""
                            }`}
                            onMouseEnter={() => setSelectedIndex(index)}
                          >
                            <span className="mem-lead">
                              <KindIcon kind={entry.kind} />
                            </span>
  
                            <button
                              type="button"
                              className="mem-main"
                              onClick={() => startEdit(entry)}
                              title="Open to edit"
                            >
                              <span className="mem-title">
                                {highlight(entry.title, query)}
                              </span>
  
                              <span className={`mem-meta ${copied ? "is-copied" : ""}`}>
                                {copied ? (
                                  <>
                                    <CheckMark animate={!reducedMotion} />
                                    Copied
                                  </>
                                ) : (
                                  <>
                                    {entry.tags.slice(0, 2).map((tag) => (
                                      <span key={tag} className="mem-tag">
                                        #{tag}
                                      </span>
                                    ))}
                                    <span className="mem-preview">{preview}</span>
                                  </>
                                )}
                              </span>
                            </button>
  
                            <span className="mem-actions">
                              <button
                                type="button"
                                className={`mem-act ${entry.pinned ? "is-active" : ""}`}
                                onClick={() => togglePin(entry)}
                                aria-label={entry.pinned ? "Unpin memory" : "Pin memory"}
                                aria-pressed={entry.pinned}
                                title={entry.pinned ? "Unpin" : "Pin  Ctrl P"}
                              >
                                <Pin
                                  size={14}
                                  strokeWidth={1.7}
                                  fill={entry.pinned ? "currentColor" : "none"}
                                />
                              </button>
  
                              <button
                                type="button"
                                className="mem-act"
                                onClick={() => void copyEntry(entry)}
                                aria-label="Copy content"
                                title="Copy"
                              >
                                <Copy size={14} strokeWidth={1.7} />
                              </button>
  
                              <button
                                type="button"
                                className="mem-act is-danger"
                                onClick={() => deleteEntry(entry)}
                                aria-label="Delete memory"
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
          </>
        )}
  
        {error && (
          <div className="nx-error" role="alert">
            {error}
          </div>
        )}
  
        <footer className="nx-footer">
          <AnimatePresence mode="wait" initial={false}>
            {undo && !editing ? (
              <motion.div
                key="undo"
                className="mem-footer-row"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reducedMotion ? 0 : 0.12 }}
              >
                <span className="nx-footer-lead">{undo.label}</span>
  
                <button type="button" className="mem-undo" onClick={performUndo}>
                  Undo
                  <kbd className="nx-kbd">Ctrl Z</kbd>
                </button>
              </motion.div>
            ) : editing ? (
              <motion.div
                key="edit-hints"
                className="mem-footer-row"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reducedMotion ? 0 : 0.12 }}
              >
                <span className="nx-footer-lead">Stored locally</span>
  
                <span className="nx-hint">
                  <kbd className="nx-kbd">Ctrl ↵</kbd>
                  Save
                </span>
  
                <span className="nx-hint">
                  <kbd className="nx-kbd">Esc</kbd>
                  Cancel
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="list-hints"
                className="mem-footer-row"
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
                  Open
                </span>
  
                <span className="nx-hint">
                  <kbd className="nx-kbd">Ctrl N</kbd>
                  New
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </footer>
      </section>
    );
  }