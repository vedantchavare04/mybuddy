import { useEffect, useState, type FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { BookmarkPlus, Check, Trash2 } from "lucide-react";
import { BackLabel, ViewHeader, inputCls, scrollCls, textareaCls } from "./parts";

type FlowItem = { id: string; title: string; progress: string; nextStep: string; createdAt: number };
type ExplainItem = { id: string; question: string; context: string; createdAt: number };
type Props = { onBack: () => void; onCollapse: () => void };

function FlowRescueContent({ onBack, onCollapse }: Props) {
  const [items, setItems] = useState<FlowItem[]>([]);
  const [title, setTitle] = useState("");
  const [progress, setProgress] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let stop: (() => void) | undefined;
    void (async () => {
      const unlisten = await listen<FlowItem[]>("flow-rescue://changed", e => { if (active) setItems(e.payload); });
      if (!active) { unlisten(); return; }
      stop = unlisten;
      try { const rows = await invoke<FlowItem[]>("flow_list"); if (active) setItems(rows); }
      catch { if (active) setError("Could not load saved work."); }
    })();
    return () => { active = false; stop?.(); };
  }, []);
  async function save(e: FormEvent) {
    e.preventDefault(); setError("");
    try {
      const row = await invoke<FlowItem>("flow_save", { input: { title, progress, nextStep } });
      setItems(rows => [row, ...rows.filter(item => item.id !== row.id)]); setTitle(""); setProgress(""); setNextStep("");
    } catch (cause) { setError(typeof cause === "string" ? cause : "Could not save this checkpoint."); }
  }
  async function remove(id: string) {
    try { await invoke("flow_delete", { id }); setItems(rows => rows.filter(row => row.id !== id)); }
    catch { setError("Could not remove this checkpoint."); }
  }
  return <section className="flex h-full flex-col px-6 pb-4 pt-5">
    <ViewHeader onClose={onCollapse} leading={<BackLabel title="Flow Rescue" onBack={onBack} />} trailing={<kbd className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] text-white/45">Ctrl + Alt + R</kbd>} />
    <h2 className="mt-3 text-[16px] font-semibold text-white">Pick up where you left off</h2>
    <p className="mt-1 text-[12px] text-white/45">Save your progress and the next small step.</p>
    <form onSubmit={save} className="mt-3 grid shrink-0 gap-2">
      <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="What are you working on?" maxLength={160} required />
      <textarea className={`${textareaCls} h-12`} value={progress} onChange={e => setProgress(e.target.value)} placeholder="Where did you leave off?" maxLength={4000} />
      <div className="flex gap-2"><input className={inputCls} value={nextStep} onChange={e => setNextStep(e.target.value)} placeholder="Next step" maxLength={1000} /><button className="rounded-full bg-white px-4 text-[12px] font-medium text-black" type="submit">Save</button></div>
    </form>
    {error && <p role="alert" className="mt-2 text-[11px] text-red-300">{error}</p>}
    <div className={`${scrollCls} mt-3 space-y-2`}>
      {items.length === 0 ? <p className="py-3 text-center text-[12px] text-white/35">Your saved work will appear here.</p> : items.map(item => <article key={item.id} className="rounded-xl bg-white/[0.05] p-3 ring-1 ring-inset ring-white/[0.06]">
        <div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="truncate text-[12px] font-medium text-white/85">{item.title}</h3>{item.progress && <p className="mt-1 line-clamp-2 text-[11px] text-white/45">{item.progress}</p>}{item.nextStep && <p className="mt-1 text-[11px] text-white/65"><span className="text-white/35">Next:</span> {item.nextStep}</p>}</div><button aria-label="Delete checkpoint" className="p-1 text-white/35 hover:text-white" onClick={() => void remove(item.id)}><Trash2 size={13}/></button></div>
      </article>)}
    </div>
  </section>;
}

function ExplainLaterContent({ onBack, onCollapse }: Props) {
  const [items, setItems] = useState<ExplainItem[]>([]);
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true; let stop: (() => void) | undefined;
    void (async () => {
      const unlisten = await listen<ExplainItem[]>("explain-later://changed", e => { if (active) setItems(e.payload); });
      if (!active) { unlisten(); return; }
      stop = unlisten;
      try { const rows = await invoke<ExplainItem[]>("explain_list"); if (active) setItems(rows); }
      catch { if (active) setError("Could not load your saved questions."); }
    })();
    return () => { active = false; stop?.(); };
  }, []);
  async function save(e: FormEvent) {
    e.preventDefault(); setError("");
    try { const row = await invoke<ExplainItem>("explain_save", { input: { question, context } }); setItems(rows => [row, ...rows.filter(item => item.id !== row.id)]); setQuestion(""); setContext(""); }
    catch (cause) { setError(typeof cause === "string" ? cause : "Could not save this question."); }
  }
  async function finish(id: string) {
    try { await invoke("explain_delete", { id }); setItems(rows => rows.filter(row => row.id !== id)); }
    catch { setError("Could not remove this question."); }
  }
  return <section className="flex h-full flex-col px-6 pb-4 pt-5">
    <ViewHeader onClose={onCollapse} leading={<BackLabel title="Explain This Later" onBack={onBack} />} trailing={<kbd className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] text-white/45">Ctrl + Alt + E</kbd>} />
    <h2 className="mt-3 text-[16px] font-semibold text-white">Save it for a calmer moment</h2>
    <p className="mt-1 text-[12px] text-white/45">Capture what you want explained without losing your place.</p>
    <form onSubmit={save} className="mt-3 grid shrink-0 gap-2">
      <textarea className={`${textareaCls} h-14`} value={question} onChange={e => setQuestion(e.target.value)} placeholder="What would you like to understand?" maxLength={1000} required />
      <div className="flex gap-2"><input className={inputCls} value={context} onChange={e => setContext(e.target.value)} placeholder="Context (optional)" maxLength={4000} /><button className="rounded-full bg-white px-4 text-[12px] font-medium text-black" type="submit"><BookmarkPlus size={13}/></button></div>
    </form>
    {error && <p role="alert" className="mt-2 text-[11px] text-red-300">{error}</p>}
    <div className={`${scrollCls} mt-3 space-y-2`}>
      {items.length === 0 ? <p className="py-3 text-center text-[12px] text-white/35">Nothing waiting to be explained.</p> : items.map(item => <article key={item.id} className="flex items-start gap-2 rounded-xl bg-white/[0.05] p-3 ring-1 ring-inset ring-white/[0.06]"><div className="min-w-0 flex-1"><p className="text-[12px] font-medium text-white/85">{item.question}</p>{item.context && <p className="mt-1 line-clamp-2 text-[11px] text-white/40">{item.context}</p>}</div><button aria-label="Mark understood" title="Mark understood" className="p-1 text-white/35 hover:text-white" onClick={() => void finish(item.id)}><Check size={14}/></button></article>)}
    </div>
  </section>;
}

export function FlowRescueView(props: Props) { return <FlowRescueContent {...props} />; }
export function ExplainLaterView(props: Props) { return <ExplainLaterContent {...props} />; }
