/*
 * src/services/speech/speechService.ts
 *
 * Native Windows TTS via Rust (speech.rs). The UI never talks to WinRT;
 * it calls this service and subscribes to speech://state.
 */

import { createStore, useStore } from "../createStore";
import { call, subscribe } from "../tauri";

export type Voice = { id: string; name: string; language: string };

export type SpeechPlayback = "idle" | "speaking" | "paused" | "completed" | "error";

type State = {
  state: SpeechPlayback;
  text: string;
  error?: string;
  busy: boolean;
  backend: "unknown" | "ready" | "unavailable";
  voices: Voice[];
  voiceId: string | null;
  rate: number;
};

const ERRORS: Record<string, string> = {
  unavailable: "Speech isn't available in this build.",
  synth_failed: "Couldn't read that aloud.",
  playback_failed: "Playback failed.",
};

export const speechErrorMessage = (code?: string) =>
  (code && ERRORS[code]) || undefined;

const store = createStore<State>({
  state: "idle",
  text: "",
  busy: false,
  backend: "unknown",
  voices: [],
  voiceId: null,
  rate: 1,
});

let started = false;

function voiceForLang(lang: string | undefined, voices: Voice[]): string | null {
  if (!lang || voices.length === 0) return null;
  const prefix = lang.toLowerCase().split("-")[0];
  const match =
    voices.find((v) => v.language.toLowerCase() === lang.toLowerCase()) ??
    voices.find((v) => v.language.toLowerCase().startsWith(prefix));
  return match?.id ?? null;
}

export const speechService = {
  start() {
    if (started) return;
    started = true;

    void subscribe<{ state: SpeechPlayback; message?: string }>("speech://state", (p) => {
      store.set({
        state: p.state,
        error: p.state === "error" ? p.message : undefined,
        busy: false,
        backend: "ready",
      });
    });

    call<Voice[]>("speech_voices")
      .then((voices) => {
        const current = store.get();
        store.set({
          voices,
          voiceId: current.voiceId ?? voices[0]?.id ?? null,
          backend: "ready",
        });
      })
      .catch(() => store.set({ backend: "unavailable" }));
  },

  speak(text: string, opts?: { lang?: string }) {
    const t = text.trim();
    if (!t) return;
    const { voices, voiceId, rate } = store.get();
    const id = voiceForLang(opts?.lang, voices) ?? voiceId;
    store.set({ text: t, busy: true, error: undefined, state: "idle" });
    call("speech_speak", { text: t, voiceId: id, rate })
      .then(() => store.set({ busy: false, backend: "ready" }))
      .catch((e) => {
        const code = String(e);
        store.set({
          busy: false,
          state: "error",
          error: code,
          backend: code === "unavailable" ? "unavailable" : store.get().backend,
        });
      });
  },

  pause() {
    void call("speech_pause").catch(() => {});
  },

  resume() {
    void call("speech_resume").catch(() => {});
  },

  stop() {
    void call("speech_stop")
      .then(() => store.set({ state: "idle", busy: false }))
      .catch(() => {});
  },

  setVoice(id: string) {
    store.set({ voiceId: id || null });
  },

  setRate(rate: number) {
    const next = Number.isFinite(rate) ? rate : 1;
    store.set({ rate: next });
    void call("speech_rate", { rate: next }).catch(() => {});
  },
};

export const useSpeech = () => useStore(store);
