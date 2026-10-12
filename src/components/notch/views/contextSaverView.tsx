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
  import {
    ArrowUpRight,
    Bookmark,
    Check,
    ExternalLink,
    FolderOpen,
    LoaderCircle,
    Pencil,
    Plus,
    Search,
    Trash2,
    X,
  } from "lucide-react";
  import { BackLabel, ViewHeader } from "./parts";
  import "./contextSaver.css";
  
  type Checkpoint = {
    id: string;
    title: string;
    projectPath: string;
    progressNote: string;
    nextAction: string;
    links: string[];
    createdAt: number;
    updatedAt: number;
  };
  
  type CheckpointInput = {
    id?: string;
    title: string;
    projectPath: string;
    progressNote: string;
    nextAction: string;
    links: string[];
  };
  
  type View = "list" | "detail" | "form";
  
  type Props = {
    onBack: () => void;
    onCollapse: () => void;
  };
  
  const emptyForm = {
    title: "",
    projectPath: "",
    progressNote: "",
    nextAction: "",
    linksText: "",
  };
  
  const CONFIRM_MS = 3000;
  const INTRO_MS = 420;
  const EASE = [0.2, 0, 0, 1] as const;
  
  function formatDate(timestamp: number) {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(timestamp);
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
  
  function flatten(text: string) {
    return text.replace(/\s+/g, " ").trim().slice(0, 200);
  }
  
  export default function ContextSaverView({ onBack, onCollapse }: Props) {
    const reducedMotion = useReducedMotion() === true;
  
    const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
    const [view, setView] = useState<View>("list");
    const [activeId, setActiveId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [confirmId, setConfirmId] = useState<string | null>(null);
    const [introDone, setIntroDone] = useState(false);
  
    const listRef = useRef<HTMLDivElement>(null);
    const confirmTimer = useRef<number | null>(null);
  
    const loadCheckpoints = useCallback(async (silent = false) => {
      if (!silent) setLoading(true);
  
      try {
        const result = await invoke<Checkpoint[]>("context_list");
  
        setCheckpoints(result);
        setError("");
      } catch (cause) {
        setError(String(cause));
      } finally {
        setLoading(false);
      }
    }, []);
  
    useEffect(() => {
      void loadCheckpoints();
    }, [loadCheckpoints]);
  
    useEffect(() => {
      const intro = window.setTimeout(() => setIntroDone(true), INTRO_MS);
  
      return () => {
        window.clearTimeout(intro);
  
        if (confirmTimer.current !== null) window.clearTimeout(confirmTimer.current);
      };
    }, []);
  
    const rows = useMemo(() => {
      const search = query.trim().toLowerCase();
  
      return [...checkpoints]
        .filter((item) => {
          if (!search) return true;
  
          return [
            item.title,
            item.projectPath,
            item.progressNote,
            item.nextAction,
            ...item.links,
          ]
            .join(" ")
            .toLowerCase()
            .includes(search);
        })
        .sort((a, b) => b.updatedAt - a.updatedAt);
    }, [checkpoints, query]);
  
    const active = checkpoints.find((item) => item.id === activeId) ?? null;
    const activeIndex = Math.min(selectedIndex, Math.max(rows.length - 1, 0));
    const searching = query.trim().length > 0;
  
    useEffect(() => {
      setSelectedIndex(0);
    }, [query]);
  
    useEffect(() => {
      listRef.current
        ?.querySelector<HTMLElement>(".is-selected")
        ?.scrollIntoView({ block: "nearest" });
    }, [activeIndex, rows.length]);
  
    useEffect(() => {
      if (view === "detail" && !active && !loading) setView("list");
    }, [view, active, loading]);
  
    const openDetail = useCallback((item: Checkpoint) => {
      setActiveId(item.id);
      setView("detail");
      setError("");
    }, []);
  
    const backToList = useCallback(() => {
      setView("list");
      setConfirmId(null);
      setError("");
    }, []);
  
    const startNew = useCallback(() => {
      setForm({ ...emptyForm });
      setEditingId(null);
      setError("");
      setView("form");
    }, []);
  
    const startEdit = useCallback((item: Checkpoint) => {
      setForm({
        title: item.title,
        projectPath: item.projectPath,
        progressNote: item.progressNote,
        nextAction: item.nextAction,
        linksText: item.links.join("\n"),
      });
      setEditingId(item.id);
      setActiveId(item.id);
      setError("");
      setView("form");
    }, []);
  
    const cancelForm = useCallback(() => {
      setView(editingId ? "detail" : "list");
      setEditingId(null);
      setForm({ ...emptyForm });
      setError("");
    }, [editingId]);
  
    const submitForm = useCallback(async () => {
      if (saving) return;
  
      if (!form.title.trim()) {
        setError("Add a title for this checkpoint.");
        return;
      }
  
      const input: CheckpointInput = {
        ...(editingId ? { id: editingId } : {}),
        title: form.title.trim(),
        projectPath: form.projectPath.trim(),
        progressNote: form.progressNote.trim(),
        nextAction: form.nextAction.trim(),
        links: form.linksText
          .split("\n")
          .map((link) => link.trim())
          .filter(Boolean),
      };
  
      setSaving(true);
      setError("");
  
      try {
        const saved = await invoke<Checkpoint>("context_save", { input });
  
        setEditingId(null);
        setForm({ ...emptyForm });
        setActiveId(saved.id);
        setView("detail");
  
        await loadCheckpoints(true);
      } catch (cause) {
        setError(String(cause));
      } finally {
        setSaving(false);
      }
    }, [saving, form, editingId, loadCheckpoints]);
  
    function handleSubmit(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      void submitForm();
    }
  
    const deleteCheckpoint = useCallback(
      async (item: Checkpoint) => {
        if (confirmId !== item.id) {
          setConfirmId(item.id);
  
          if (confirmTimer.current !== null) window.clearTimeout(confirmTimer.current);
  
          confirmTimer.current = window.setTimeout(
            () => setConfirmId(null),
            CONFIRM_MS
          );
  
          return;
        }
  
        setConfirmId(null);
        setError("");
  
        try {
          await invoke("context_delete", { id: item.id });
  
          setCheckpoints((current) =>
            current.filter((checkpoint) => checkpoint.id !== item.id)
          );
  
          if (view === "detail" && activeId === item.id) setView("list");
        } catch (cause) {
          setError(String(cause));
        }
      },
      [confirmId, view, activeId]
    );
  
    async function openTarget(target: string) {
      setError("");
  
      try {
        await invoke("context_open_target", { target });
      } catch (cause) {
        setError(String(cause));
      }
    }
  
    useEffect(() => {
      function handleEscape(event: KeyboardEvent) {
        if (event.key !== "Escape") return;
  
        if (view === "form") {
          event.preventDefault();
          event.stopImmediatePropagation();
          cancelForm();
          return;
        }
  
        if (view === "detail") {
          event.preventDefault();
          event.stopImmediatePropagation();
          backToList();
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
    }, [view, query, cancelForm, backToList]);
  
    useEffect(() => {
      function handleKeyDown(event: KeyboardEvent) {
        const target = event.target;
        const inField =
          target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
        const onControl =
          target instanceof HTMLElement && target.closest("button:not(.cs-main)");
        const mod = event.ctrlKey || event.metaKey;
  
        if (view === "form") {
          if (mod && event.key === "Enter") {
            event.preventDefault();
            void submitForm();
          }
  
          return;
        }
  
        if (view === "detail") {
          if (mod && event.key.toLowerCase() === "e" && active) {
            event.preventDefault();
            startEdit(active);
          }
  
          return;
        }
  
        if (mod && event.key.toLowerCase() === "n") {
          event.preventDefault();
          startNew();
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
  
          if (row) openDetail(row);
  
          return;
        }
  
        if (!inField && event.key.length === 1 && !mod && !event.altKey) {
          document.querySelector<HTMLInputElement>(".cs .nx-field input")?.focus();
        }
      }
  
      window.addEventListener("keydown", handleKeyDown);
  
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [
      view,
      rows,
      activeIndex,
      active,
      submitForm,
      startNew,
      startEdit,
      openDetail,
    ]);
  
    const canSave = form.title.trim().length > 0 && !saving;
    const countLabel = searching
      ? `${rows.length} of ${checkpoints.length}`
      : `${checkpoints.length} ${checkpoints.length === 1 ? "checkpoint" : "checkpoints"}`;
  
    const headerTitle =
      view === "form"
        ? editingId
          ? "Edit checkpoint"
          : "New checkpoint"
        : view === "detail"
          ? "Checkpoint"
          : "Context Saver";
  
    const headerBack =
      view === "form" ? cancelForm : view === "detail" ? backToList : onBack;
  
    const trailing =
      view === "form" ? (
        <button
          type="button"
          className="cs-save"
          onClick={() => void submitForm()}
          disabled={!canSave}
        >
          {saving && <LoaderCircle size={12} strokeWidth={2} className="cs-spin" />}
          {saving ? "Saving" : "Save"}
        </button>
      ) : view === "detail" && active ? (
        <span className="cs-header-actions">
          <button
            type="button"
            className={`cs-icon is-danger ${confirmId === active.id ? "is-confirm" : ""}`}
            onClick={() => void deleteCheckpoint(active)}
            aria-label={confirmId === active.id ? "Confirm delete" : "Delete checkpoint"}
            title={confirmId === active.id ? "Click again to delete" : "Delete"}
          >
            {confirmId === active.id ? (
              <>
                <Check size={13} strokeWidth={2} />
                Delete
              </>
            ) : (
              <Trash2 size={14} strokeWidth={1.7} />
            )}
          </button>
  
          <button type="button" className="cs-new" onClick={() => startEdit(active)}>
            <Pencil size={12} strokeWidth={2} />
            Edit
          </button>
        </span>
      ) : view === "list" ? (
        <button type="button" className="cs-new" onClick={startNew}>
          <Plus size={13} strokeWidth={2} />
          New
        </button>
      ) : null;
  
    return (
      <section className="cs">
        <ViewHeader
          onClose={onCollapse}
          leading={<BackLabel title={headerTitle} onBack={headerBack} />}
          trailing={trailing}
        />
  
        {view === "list" && (
          <>
            <label className="nx-field">
              <Search size={16} strokeWidth={1.6} />
  
              <input
                spellCheck={false}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search checkpoints"
                aria-label="Search checkpoints"
              />
  
              {searching && (
                <button
                  type="button"
                  className="cs-search-clear"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                >
                  <X size={11} strokeWidth={2} />
                </button>
              )}
            </label>
  
            <div className="cs-list" role="listbox" aria-label="Checkpoints" ref={listRef}>
              {loading && rows.length === 0 ? (
                <div className="cs-empty">
                  <span className="cs-empty-hint">Loading…</span>
                </div>
              ) : rows.length === 0 ? (
                <div className="cs-empty">
                  <span className="cs-empty-title">
                    {searching
                      ? `No results for “${query.trim().slice(0, 24)}”`
                      : "Nothing saved yet"}
                  </span>
  
                  {!searching && (
                    <span className="cs-empty-hint">
                      Press
                      <kbd className="nx-kbd">Ctrl</kbd> <kbd className="nx-kbd">Shift</kbd> <kbd className="nx-kbd">K</kbd>
                      to save where you left off
                    </span>
                  )}
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {rows.map((item, index) => {
                    const selected = activeIndex === index;
                    const confirming = confirmId === item.id;
  
                    const metaKey = item.nextAction
                      ? "Next"
                      : item.progressNote
                        ? "Note"
                        : item.projectPath
                          ? "Folder"
                          : "Saved";
  
                    const metaText = flatten(
                      item.nextAction ||
                        item.progressNote ||
                        item.projectPath ||
                        formatDate(item.updatedAt)
                    );
  
                    return (
                      <motion.div
                        key={item.id}
                        className="cs-row-wrap"
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
                          className={`cs-row ${selected ? "is-selected" : ""}`}
                          onMouseEnter={() => setSelectedIndex(index)}
                        >
                          <span className="cs-lead">
                            <Bookmark size={16} strokeWidth={1.6} />
                          </span>
  
                          <button
                            type="button"
                            className="cs-main"
                            onClick={() => openDetail(item)}
                          >
                            <span className="cs-title">
                              {highlight(item.title, query)}
                            </span>
  
                            <span className="cs-meta">
                              <span className="cs-meta-key">{metaKey}</span>
                              <span className="cs-meta-text">{metaText}</span>
                            </span>
                          </button>
  
                          <span className="cs-actions">
                            <button
                              type="button"
                              className="cs-act"
                              onClick={() => startEdit(item)}
                              aria-label={`Edit ${item.title}`}
                              title="Edit"
                            >
                              <Pencil size={14} strokeWidth={1.7} />
                            </button>
  
                            <button
                              type="button"
                              className={`cs-act is-danger ${confirming ? "is-confirm" : ""}`}
                              onClick={() => void deleteCheckpoint(item)}
                              aria-label={
                                confirming
                                  ? `Confirm delete ${item.title}`
                                  : `Delete ${item.title}`
                              }
                              title={confirming ? "Click again to delete" : "Delete"}
                            >
                              {confirming ? (
                                <Check size={14} strokeWidth={2} />
                              ) : (
                                <Trash2 size={14} strokeWidth={1.7} />
                              )}
                            </button>
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </>
        )}
  
        {view === "detail" && active && (
          <div className="cs-detail">
            <div>
              <div className="cs-d-title">{active.title}</div>
              <div className="cs-d-meta">Updated {formatDate(active.updatedAt)}</div>
            </div>
  
            {active.progressNote && (
              <div className="cs-block">
                <span className="cs-block-label">Where you left off</span>
                <span className="cs-block-body">{active.progressNote}</span>
              </div>
            )}
  
            {active.nextAction && (
              <div className="cs-block">
                <span className="cs-block-label">Next</span>
  
                <div className="cs-next">
                  <ArrowUpRight size={14} strokeWidth={1.8} />
                  <span>{active.nextAction}</span>
                </div>
              </div>
            )}
  
            {active.projectPath && (
              <div className="cs-block">
                <span className="cs-block-label">Project</span>
  
                <div className="cs-targets">
                  <button
                    type="button"
                    className="cs-target"
                    onClick={() => void openTarget(active.projectPath)}
                    title="Open project folder"
                  >
                    <FolderOpen size={14} strokeWidth={1.6} />
                    <span>{active.projectPath}</span>
                    <ExternalLink
                      size={12}
                      strokeWidth={1.8}
                      className="cs-target-arrow"
                    />
                  </button>
                </div>
              </div>
            )}
  
            {active.links.length > 0 && (
              <div className="cs-block">
                <span className="cs-block-label">Links</span>
  
                <div className="cs-targets">
                  {active.links.map((link, index) => (
                    <button
                      key={`${active.id}-${index}`}
                      type="button"
                      className="cs-target"
                      onClick={() => void openTarget(link)}
                      title={link}
                    >
                      <ExternalLink size={14} strokeWidth={1.6} />
                      <span>{link}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
  
            {!active.progressNote &&
              !active.nextAction &&
              !active.projectPath &&
              active.links.length === 0 && (
                <span className="cs-block-body">
                  This checkpoint has no details yet. Press Edit to add some.
                </span>
              )}
          </div>
        )}
  
        {view === "form" && (
          <form className="cs-editor" onSubmit={handleSubmit}>
            <label className="cs-field">
              <span className="cs-label">Title</span>
  
              <span className="nx-field">
                <input
                  autoFocus
                  maxLength={120}
                  spellCheck={false}
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  placeholder="e.g. MyBuddy task tracking"
                />
              </span>
            </label>
  
            <label className="cs-field">
              <span className="cs-label">Project folder</span>
  
              <span className="nx-field">
                <FolderOpen size={16} strokeWidth={1.6} />
  
                <input
                  spellCheck={false}
                  value={form.projectPath}
                  onChange={(event) =>
                    setForm({ ...form, projectPath: event.target.value })
                  }
                  placeholder="C:\Projects\mybuddy"
                />
              </span>
            </label>
  
            <label className="cs-field">
              <span className="cs-label">Where did you leave off?</span>
  
              <textarea
                className="cs-textarea"
                rows={3}
                maxLength={10000}
                value={form.progressNote}
                onChange={(event) =>
                  setForm({ ...form, progressNote: event.target.value })
                }
                placeholder="What were you working on?"
              />
            </label>
  
            <label className="cs-field">
              <span className="cs-label">Next action</span>
  
              <textarea
                className="cs-textarea"
                rows={2}
                maxLength={2000}
                value={form.nextAction}
                onChange={(event) =>
                  setForm({ ...form, nextAction: event.target.value })
                }
                placeholder="What should you do when you return?"
              />
            </label>
  
            <label className="cs-field">
              <span className="cs-label">
                Links
                <span className="cs-label-note">Optional, one per line</span>
              </span>
  
              <textarea
                className="cs-textarea"
                rows={2}
                value={form.linksText}
                onChange={(event) =>
                  setForm({ ...form, linksText: event.target.value })
                }
                placeholder="A URL or local path"
              />
            </label>
  
            <button type="submit" hidden />
          </form>
        )}
  
        {error && (
          <div className="nx-error" role="alert">
            {error}
          </div>
        )}
  
        <footer className="nx-footer">
          <div className="cs-footer-row">
            {view === "list" && (
              <>
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
              </>
            )}
  
            {view === "detail" && (
              <>
                <span className="nx-footer-lead">Saved on this PC</span>
  
                <span className="nx-hint">
                  <kbd className="nx-kbd">Ctrl E</kbd>
                  Edit
                </span>
  
                <span className="nx-hint">
                  <kbd className="nx-kbd">Esc</kbd>
                  Back
                </span>
              </>
            )}
  
            {view === "form" && (
              <>
                <span className="nx-footer-lead">Saved on this PC</span>
  
                <span className="nx-hint">
                  <kbd className="nx-kbd">Ctrl ↵</kbd>
                  Save
                </span>
  
                <span className="nx-hint">
                  <kbd className="nx-kbd">Esc</kbd>
                  Cancel
                </span>
              </>
            )}
          </div>
        </footer>
      </section>
    );
  }