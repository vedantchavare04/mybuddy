/*
 * src/services/media/mediaService.ts
 *
 * MediaService: React <- Tauri events <- Rust <- Windows media sessions.
 * Started once for the app's lifetime. No polling: Rust pushes events when
 * playback, track or metadata change. Position is extrapolated locally and
 * only while the Music view is on screen.
 */

import { useEffect, useState } from "react";
import { createStore, useStore } from "../createStore";
import { call, subscribe } from "../tauri";

export type MediaState = {
  available: boolean;
  status: "playing" | "paused" | "stopped" | "changing" | "opened" | "closed";
  title: string;
  artist: string;
  album: string;
  source: string;
  positionMs: number;
  durationMs: number;
  positionUpdatedMs: number;
  canPlay: boolean;
  canPause: boolean;
  canNext: boolean;
  canPrevious: boolean;
  canSeek: boolean;
  trackKey: string;
};

type Artwork = { trackKey: string; url: string | null };

type State = {
  state: MediaState | null;
  artwork: Artwork | null;
  backend: "unknown" | "ready" | "unavailable";
};

const store = createStore<State>({
  state: null,
  artwork: null,
  backend: "unknown",
});

let started = false;

export const mediaService = {
  start() {
    if (started) return;
    started = true;

    void subscribe<MediaState>("media://state", (state) =>
      store.set({ state, backend: "ready" })
    );
    void subscribe<Artwork>("media://artwork", (artwork) =>
      store.set({ artwork })
    );

    call<{ state: MediaState; artwork: Artwork | null }>("media_snapshot")
      .then(({ state, artwork }) => store.set({ state, artwork, backend: "ready" }))
      .catch(() => store.set({ backend: "unavailable" }));
  },

  control(action: "toggle" | "next" | "previous" | "seek", positionMs?: number) {
    return call("media_control", { action, positionMs }).catch(() => {});
  },
};

export const useMedia = () => useStore(store);

/** current playback position, ticking only while the caller is mounted */
export function usePlaybackPosition(s: MediaState | null): number {
  const playing = s?.status === "playing";
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!playing) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [playing]);

  if (!s) return 0;
  const raw =
    s.positionMs + (playing ? Math.max(0, now - s.positionUpdatedMs) : 0);
  return s.durationMs > 0 ? Math.min(raw, s.durationMs) : raw;
}

export function friendlySource(id: string): string {
  const s = id.toLowerCase();
  if (s.includes("spotify")) return "Spotify";
  if (s.includes("msedge")) return "Edge";
  if (s.includes("chrome")) return "Chrome";
  if (s.includes("firefox")) return "Firefox";
  if (s.includes("brave")) return "Brave";
  if (s.includes("opera")) return "Opera";
  if (s.includes("zune")) return "Media Player";
  if (s.includes("applemusic") || s.includes("itunes")) return "Apple Music";
  if (s.includes("vlc")) return "VLC";
  return id.replace(/\.exe$/i, "").split("!")[0] || "Media";
}