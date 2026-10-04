import { createStore, useStore } from "../createStore";
import { call } from "../tauri";

export type ProviderId =
  | "openai"
  | "anthropic"
  | "gemini"
  | "openrouter"
  | "ollama"
  | "custom";

export type ProviderInfo = {
  id: ProviderId;
  name: string;
  auth: "key" | "none" | "optional-key";
  endpoint: boolean;
  local: boolean;
  keyHint: string;
};

export const PROVIDERS: ProviderInfo[] = [
  { id: "openai", name: "OpenAI", auth: "key", endpoint: false, local: false, keyHint: "sk-…" },
  { id: "anthropic", name: "Anthropic", auth: "key", endpoint: false, local: false, keyHint: "sk-ant-…" },
  { id: "gemini", name: "Google Gemini", auth: "key", endpoint: false, local: false, keyHint: "AIza…" },
  { id: "openrouter", name: "OpenRouter", auth: "key", endpoint: false, local: false, keyHint: "sk-or-…" },
  { id: "ollama", name: "Local AI (Ollama)", auth: "none", endpoint: true, local: true, keyHint: "" },
  { id: "custom", name: "Custom OpenAI-compatible", auth: "optional-key", endpoint: true, local: false, keyHint: "API key (optional)" },
];

type Persisted = {
  provider: ProviderId | null;
  models: Partial<Record<ProviderId, string>>;
  bases: Partial<Record<ProviderId, string>>;
  verified: Partial<Record<ProviderId, boolean>>;
};

export type AiState = Persisted & {
  configured: Partial<Record<ProviderId, boolean>>;
  suggestions: string[];
  busy: boolean;
  error: string | null;
};

const KEY = "mybuddy.ai.v1";
const DEFAULT_BASES: Partial<Record<ProviderId, string>> = { ollama: "http://localhost:11434" };
const AUTO_MODEL = new Set<ProviderId>(["openai", "anthropic", "gemini", "ollama"]);

const ERRORS: Record<string, string> = {
  no_key: "No API key is saved for this provider.",
  invalid_key: "That API key was rejected. Check it and try again.",
  rate_limited: "Rate limit or quota reached on your provider account.",
  model_unavailable: "That model isn't available. Choose another in AI settings.",
  provider_down: "The provider isn't responding. Try again shortly.",
  offline: "You're offline. Check your connection.",
  timeout: "The request timed out. Try again.",
  unreachable_local: "Can't reach the local AI service. Is it running?",
  bad_endpoint: "Enter a valid http or https endpoint.",
  bad_request: "The provider couldn't process that request.",
  no_model: "Choose a model in AI settings.",
  empty: "The model returned an empty response.",
  empty_input: "Type a question first.",
  too_long: "That's too much text to send at once.",
  not_configured: "Connect an AI provider in Settings first.",
  unavailable: "AI works in the MyBuddy desktop app.",
};

export const aiError = (code: string) =>
  ERRORS[code] ?? "Something went wrong. Try again.";

function load(): Persisted {
  const empty: Persisted = { provider: null, models: {}, bases: {}, verified: {} };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const p = JSON.parse(raw) as Partial<Persisted>;
    return {
      provider: PROVIDERS.some((x) => x.id === p.provider) ? (p.provider as ProviderId) : null,
      models: p.models ?? {},
      bases: p.bases ?? {},
      verified: p.verified ?? {},
    };
  } catch {
    return empty;
  }
}

const store = createStore<AiState>({
  ...load(),
  configured: {},
  suggestions: [],
  busy: false,
  error: null,
});

function save() {
  const { provider, models, bases, verified } = store.get();
  try {
    localStorage.setItem(KEY, JSON.stringify({ provider, models, bases, verified }));
  } catch {
    return;
  }
}

export const baseOf = (s: AiState, id: ProviderId) => s.bases[id] ?? DEFAULT_BASES[id] ?? "";

export function setupOf(s: AiState) {
  const id = s.provider;
  if (!id || !s.configured[id]) return null;
  const model = (s.models[id] ?? "").trim();
  if (!model) return null;
  return { provider: id, model, baseUrl: baseOf(s, id) || null };
}

async function loadModels() {
  const s = store.get();
  if (!s.provider) return;
  try {
    const suggestions = await call<string[]>("ai_models", {
      provider: s.provider,
      baseUrl: baseOf(s, s.provider) || null,
    });
    store.set({ suggestions });
  } catch {
    store.set({ suggestions: [] });
  }
}

async function refresh() {
  const s = store.get();
  const id = s.provider;
  if (!id) return;
  try {
    const status = await call<{ configured: boolean }>("ai_status", {
      provider: id,
      baseUrl: baseOf(s, id) || null,
    });
    store.set({ configured: { ...store.get().configured, [id]: status.configured } });
    if (status.configured) await loadModels();
  } catch {
    store.set({ configured: { ...store.get().configured, [id]: false } });
  }
}

let started = false;

export const aiConfig = {
  state: () => store.get(),

  start() {
    if (started) return;
    started = true;
    void refresh();
  },

  select(id: ProviderId) {
    store.set({ provider: id, suggestions: [], error: null });
    save();
    void refresh();
  },

  setModel(id: ProviderId, model: string) {
    store.set({ models: { ...store.get().models, [id]: model } });
    save();
  },

  setBase(id: ProviderId, base: string) {
    store.set({ bases: { ...store.get().bases, [id]: base } });
    save();
  },

  async connect(apiKey: string | null) {
    const s = store.get();
    const id = s.provider;
    if (!id) return false;
    store.set({ busy: true, error: null });
    try {
      const conn = await call<{ verified: boolean; models: string[] }>("ai_connect", {
        provider: id,
        apiKey,
        baseUrl: baseOf(s, id) || null,
      });
      const cur = store.get();
      const model =
        cur.models[id] || (AUTO_MODEL.has(id) ? (conn.models[0] ?? "") : "");
      store.set({
        busy: false,
        configured: { ...cur.configured, [id]: true },
        verified: { ...cur.verified, [id]: conn.verified },
        models: { ...cur.models, [id]: model },
        suggestions: conn.models,
      });
      save();
      return true;
    } catch (e) {
      store.set({ busy: false, error: aiError(String(e)) });
      return false;
    }
  },

  async disconnect() {
    const s = store.get();
    const id = s.provider;
    if (!id) return;
    try {
      await call("ai_disconnect", { provider: id });
    } catch {
      return;
    }
    store.set({
      configured: { ...s.configured, [id]: false },
      verified: { ...s.verified, [id]: false },
      suggestions: [],
      error: null,
    });
    save();
  },
};

export const useAiConfig = () => useStore(store);