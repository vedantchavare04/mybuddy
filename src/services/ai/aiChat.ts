import { createStore, useStore } from "../createStore";
import { call } from "../tauri";
import { reminderError, reminderService } from "../reminders/reminderService";
import { aiConfig, aiError, setupOf } from "./aiConfig";

export type ChatMsg = { role: "user" | "assistant"; content: string };

type Draft = { title: string; dueMs: number };

type State = {
  context: string;
  messages: ChatMsg[];
  lastQuestion: string;
  busy: boolean;
  error: string | null;
  note: string | null;
  draft: Draft | null;
};

const store = createStore<State>({
  context: "",
  messages: [],
  lastQuestion: "",
  busy: false,
  error: null,
  note: null,
  draft: null,
});

const SYSTEM =
  "You are MyBuddy, a concise assistant inside a desktop companion. Answer briefly and clearly in plain text. Avoid headings and heavy formatting. Use short code blocks only when code is needed.";

const REMINDER_INTENT = /^\s*(please\s+)?remind\s+me\b/i;

export const looksLikeCode = (text: string) =>
  /[{};]|=>|\b(function|const|let|var|class|def|import|return|public|private|void|catch|throw|Exception|Error)\b|\bat\s.+:\d+|\w+\(.*\)/.test(
    text
  );

function translatePrompt() {
  const code = navigator.language.split("-")[0];
  const language = new Intl.DisplayNames([navigator.language], { type: "language" }).of(code) ?? "English";
  return `Translate this into ${language}. If it is already in ${language}, translate it into English instead.`;
}

export const CODE_ACTIONS: { label: string; prompt: () => string }[] = [
  { label: "Explain", prompt: () => "Explain this clearly and briefly." },
  { label: "Find bug", prompt: () => "Find the bug or most likely cause of the problem and explain it." },
  { label: "Fix", prompt: () => "Fix the problem and show the corrected version." },
  { label: "Optimize", prompt: () => "Suggest optimizations and show the improved version." },
];

export const TEXT_ACTIONS: { label: string; prompt: () => string }[] = [
  { label: "Explain", prompt: () => "Explain this clearly and briefly." },
  { label: "Summarize", prompt: () => "Summarize this in a few sentences." },
  { label: "Rewrite", prompt: () => "Rewrite this to be clearer and better written. Keep the meaning." },
  { label: "Translate", prompt: translatePrompt },
];

async function send(messages: ChatMsg[], system: string): Promise<string> {
  const setup = setupOf(aiConfig.state());
  if (!setup) throw "not_configured";
  return call<string>("ai_ask", {
    provider: setup.provider,
    model: setup.model,
    baseUrl: setup.baseUrl,
    system,
    messages,
  });
}

function localNow() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return {
    iso: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`,
    weekday: d.toLocaleDateString("en-US", { weekday: "long" }),
    zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

function parseReminder(text: string): Draft | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const json = JSON.parse(match[0]) as { title?: unknown; due?: unknown };
    if (typeof json.title !== "string" || typeof json.due !== "string") return null;
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(json.due)) return null;
    const dueMs = new Date(json.due).getTime();
    const title = json.title.trim();
    if (!title || Number.isNaN(dueMs) || dueMs <= Date.now()) return null;
    return { title, dueMs };
  } catch {
    return null;
  }
}

async function askReminder(text: string): Promise<boolean> {
  store.set({ busy: true, error: null, note: null, draft: null, lastQuestion: text });
  const { iso, weekday, zone } = localNow();
  const system = `You turn a request into a reminder. The current local date and time is ${iso} (${weekday}), time zone ${zone}. Reply with JSON only and no other text: {"title": "<the task only, short, without the words remind me>", "due": "YYYY-MM-DDTHH:mm"} where due is the local date and time to remind the user. If no time can be determined use {"title": "<task>", "due": null}.`;
  try {
    const reply = await send([{ role: "user", content: text }], system);
    const draft = parseReminder(reply);
    if (!draft) {
      store.set({ busy: false, error: "I couldn't work out when to remind you. Try including a day and time." });
      return false;
    }
    store.set({ busy: false, draft });
    return true;
  } catch (e) {
    store.set({ busy: false, error: aiError(String(e)) });
    return false;
  }
}

export const aiChat = {
  setContext(text: string) {
    if (text === store.get().context && text) return;
    store.set({ context: text, messages: [], lastQuestion: "", error: null, note: null, draft: null, busy: false });
  },

  setNote(note: string | null) {
    store.set({ note });
  },

  reset() {
    store.set({ messages: [], lastQuestion: "", error: null, note: null, draft: null, busy: false });
  },

  async ask(question: string): Promise<boolean> {
    const s = store.get();
    const q = question.trim();
    if (!q || s.busy) return false;
    if (REMINDER_INTENT.test(q)) return askReminder(q);

    const content =
      s.messages.length === 0 && s.context
        ? `Selected text:\n"""\n${s.context}\n"""\n\n${q}`
        : q;
    const history: ChatMsg[] = [...s.messages, { role: "user", content }];
    store.set({ messages: history, lastQuestion: q, busy: true, error: null, note: null, draft: null });

    try {
      const reply = await send(history, SYSTEM);
      store.set({ messages: [...history, { role: "assistant", content: reply }], busy: false });
      return true;
    } catch (e) {
      store.set({ messages: s.messages, busy: false, error: aiError(String(e)) });
      return false;
    }
  },

  async confirmDraft() {
    const draft = store.get().draft;
    if (!draft) return;
    try {
      await reminderService.create(draft.title, draft.dueMs);
      store.set({ draft: null, note: "Reminder set." });
    } catch (e) {
      store.set({ error: reminderError(String(e)) });
    }
  },

  cancelDraft() {
    store.set({ draft: null });
  },
};

export const useAiChat = () => useStore(store);