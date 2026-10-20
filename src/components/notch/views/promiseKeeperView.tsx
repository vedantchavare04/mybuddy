import { useEffect, useMemo, useState, type FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Check, Circle, Handshake, Pencil, Plus, Trash2, X } from "lucide-react";
import { BackLabel, ViewHeader, inputCls, scrollCls } from "./parts";
import { DateTimePicker } from "./dateTimePicker";
import "./promiseKeeper.css";

type PromiseRecord = {
  id: string;
  title: string;
  person: string;
  dueMs: number | null;
  note: string;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
};

type PromiseInput = {
  title: string;
  person: string;
  dueMs: number | null;
  note: string;
};

const emptyForm = { title: "", person: "", due: "", note: "" };

function dateValue(timestamp: number | null) {
  if (timestamp === null) return "";
  const date = new Date(timestamp);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function dueLabel(timestamp: number | null) {
  if (timestamp === null) return "No due date";
  return new Intl.DateTimeFormat(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  }).format(timestamp);
}

export default function PromiseKeeperView({
  onBack,
  onCollapse,
}: {
  onBack: () => void;
  onCollapse: () => void;
}) {
  const [items, setItems] = useState<PromiseRecord[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let unlisten: (() => void) | undefined;
    async function load() {
      try {
        const stop = await listen<PromiseRecord[]>("promise-keeper://changed", (event) => {
          if (mounted) setItems(event.payload);
        });
        if (!mounted) { stop(); return; }
        unlisten = stop;
        const initial = await invoke<PromiseRecord[]>("promises_list");
        if (mounted) setItems(initial);
      } catch (cause) {
        if (mounted) setError(typeof cause === "string" ? cause : "Could not load promises.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => { mounted = false; unlisten?.(); };
  }, []);

  const openItems = useMemo(() => items.filter((item) => !item.completed), [items]);
  const completedItems = useMemo(() => items.filter((item) => item.completed), [items]);

  function edit(item: PromiseRecord) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      person: item.person,
      due: dateValue(item.dueMs),
      note: item.note,
    });
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = form.title.trim();
    if (!title) { setError("Add a short description of the promise."); return; }
    const input: PromiseInput = {
      title,
      person: form.person.trim(),
      dueMs: form.due ? new Date(form.due).getTime() : null,
      note: form.note.trim(),
    };
    setSaving(true);
    setError(null);
    try {
      if (editingId) await invoke("promise_update", { id: editingId, input });
      else await invoke("promise_create", { input });
      resetForm();
    } catch (cause) {
      setError(typeof cause === "string" ? cause : "Could not save this promise.");
    } finally {
      setSaving(false);
    }
  }

  async function complete(item: PromiseRecord) {
    try {
      await invoke("promise_complete", { id: item.id, completed: !item.completed });
    } catch (cause) {
      setError(typeof cause === "string" ? cause : "Could not update this promise.");
    }
  }

  async function remove(item: PromiseRecord) {
    try {
      await invoke("promise_delete", { id: item.id });
      if (editingId === item.id) resetForm();
    } catch (cause) {
      setError(typeof cause === "string" ? cause : "Could not delete this promise.");
    }
  }

  function renderItem(item: PromiseRecord) {
    return (
      <article className={`pk-row ${item.completed ? "is-complete" : ""}`} key={item.id}>
        <button className="pk-check" type="button" aria-label={item.completed ? "Reopen promise" : "Mark promise complete"} onClick={() => void complete(item)}>
          {item.completed ? <Check size={15} /> : <Circle size={15} />}
        </button>
        <div className="pk-copy">
          <div className="pk-title">{item.title}</div>
          <div className="pk-meta">
            {item.person && <span>{item.person}</span>}
            <span>{dueLabel(item.dueMs)}</span>
          </div>
          {item.note && <div className="pk-note">{item.note}</div>}
        </div>
        <div className="pk-actions">
          <button type="button" aria-label="Edit promise" title="Edit" onClick={() => edit(item)}><Pencil size={14} /></button>
          <button type="button" aria-label="Delete promise" title="Delete" onClick={() => void remove(item)}><Trash2 size={14} /></button>
        </div>
      </article>
    );
  }

  return (
    <section className="pk">
      <ViewHeader onClose={onCollapse} leading={<BackLabel title="Promise Keeper" onBack={onBack} />} />
      <form className="pk-form" onSubmit={(event) => void save(event)}>
        <label className="sr-only" htmlFor="pk-title">Promise</label>
        <input id="pk-title" className={inputCls} maxLength={200} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="What did you promise?" />
        <div className="pk-form-row">
          <input className={inputCls} maxLength={200} value={form.person} onChange={(event) => setForm({ ...form, person: event.target.value })} placeholder="For whom?" aria-label="Person" />
          <DateTimePicker
            date={form.due.split("T")[0] ?? ""}
            time={form.due.split("T")[1] ?? ""}
            onChange={(date, time) => setForm({ ...form, due: date && time ? `${date}T${time}` : "" })}
            allowClear
            ariaLabel="Promise due date and time"
            className="pk-date"
          />
        </div>
        <div className="pk-form-row">
          <input className={inputCls} maxLength={4000} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="A note (optional)" aria-label="Note" />
          <button className="pk-submit" type="submit" disabled={saving || !form.title.trim()}>
            {editingId ? <Check size={14} /> : <Plus size={14} />}{editingId ? "Save" : "Add promise"}
          </button>
          {editingId && <button className="pk-cancel" type="button" onClick={resetForm} aria-label="Cancel editing"><X size={14} /></button>}
        </div>
      </form>
      {error && <div className="nx-error" role="alert">{error}</div>}
      <div className={`${scrollCls} pk-list`}>
        {loading ? <div className="pk-empty">Loading promises…</div> : openItems.length === 0 && completedItems.length === 0 ? (
          <div className="pk-empty"><Handshake size={20} strokeWidth={1.5} /><span>No promises yet</span><small>Capture a commitment here so it stays on your radar.</small></div>
        ) : (
          <>
            {openItems.length > 0 && <div className="pk-section">To keep</div>}
            {openItems.map(renderItem)}
            {completedItems.length > 0 && <div className="pk-section">Completed</div>}
            {completedItems.map(renderItem)}
          </>
        )}
      </div>
      <footer className="nx-footer">
        <span className="nx-footer-lead">
          {openItems.length} open {openItems.length === 1 ? "promise" : "promises"}
        </span>
        <span className="nx-hint" aria-label="Shortcut: Control Alt P">
          <kbd className="nx-kbd">Ctrl</kbd>
          <kbd className="nx-kbd">Alt</kbd>
          <kbd className="nx-kbd">P</kbd>
          Open Promise Keeper
        </span>
      </footer>
    </section>
  );
}
