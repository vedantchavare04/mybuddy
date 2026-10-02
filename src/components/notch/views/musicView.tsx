/*
 * src/components/notch/views/musicView.tsx
 * Music inside the notch. Real Windows media session data only; controls the
 * session doesn't support are disabled. No fake data anywhere.
 */

import type { PointerEvent } from "react";
import { Music, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import {
  friendlySource,
  mediaService,
  useMedia,
  usePlaybackPosition,
} from "../../../services/media/mediaService";
import { BackLabel, IconButton, ViewHeader } from "./parts";

type Props = { onBack: () => void; onCollapse: () => void };

const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export function MusicView({ onBack, onCollapse }: Props) {
  const { state, artwork, backend } = useMedia();
  const position = usePlaybackPosition(state);

  const header = (
    <ViewHeader
      onClose={onCollapse}
      leading={<BackLabel title="Music" onBack={onBack} />}
    />
  );

  const hasTrack = !!state?.available && !!(state.title || state.artist);

  if (!hasTrack || !state) {
    const unavailable = backend === "unavailable";
    return (
      <div className="flex h-full flex-col px-6 pb-5 pt-5">
        {header}
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="text-[15px] font-semibold tracking-[-0.015em] text-white/90">
            {unavailable ? "Media controls unavailable" : "Nothing playing"}
          </div>
          <p className="mt-1 max-w-[30ch] text-[13px] leading-[1.45] text-white/45">
            {unavailable
              ? "Media controls work in the MyBuddy desktop app."
              : "Start music from Spotify, your browser, or another media app."}
          </p>
        </div>
      </div>
    );
  }

  const playing = state.status === "playing";
  const art = artwork && artwork.trackKey === state.trackKey ? artwork.url : null;
  const source = friendlySource(state.source);
  const canToggle = playing ? state.canPause : state.canPlay;
  const pct =
    state.durationMs > 0 ? Math.min(100, (position / state.durationMs) * 100) : 0;
  const canSeek = state.canSeek && state.durationMs > 0;

  const seek = (e: PointerEvent<HTMLDivElement>) => {
    if (!canSeek) return;
    const r = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    void mediaService.control("seek", Math.round(ratio * state.durationMs));
  };

  return (
    <div className="flex h-full flex-col px-6 pb-5 pt-5">
      {header}

      <div className="mt-4 flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-white/[0.06] ring-1 ring-inset ring-white/[0.07]">
          {art ? (
            <img src={art} alt="" className="h-full w-full object-cover" draggable={false} />
          ) : (
            <Music size={20} strokeWidth={1.6} className="text-white/25" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[16px] font-semibold leading-[1.25] tracking-[-0.015em] text-white">
            {state.title || "Unknown title"}
          </div>
          <div className="mt-0.5 truncate text-[13px] text-white/55">
            {state.artist || "Unknown artist"}
          </div>
          <div className="mt-1 truncate text-[11.5px] text-white/30">
            {source}
            {state.status === "paused" ? " · Paused" : ""}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 text-[11px] tabular-nums text-white/35">
        <span className="w-9 text-right">{fmt(position)}</span>
        <div
          className={`relative h-4 flex-1 ${canSeek ? "cursor-pointer" : ""}`}
          onPointerDown={seek}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={state.durationMs}
          aria-valuenow={position}
        >
          <div className="absolute top-1/2 h-[3px] w-full -translate-y-1/2 rounded-full bg-white/[0.12]" />
          <div
            className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-white/80 transition-[width] duration-200 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="w-9">{state.durationMs > 0 ? fmt(state.durationMs) : "--:--"}</span>
      </div>

      <div className="mt-auto flex items-center justify-center gap-3">
        <IconButton
          label="Previous"
          disabled={!state.canPrevious}
          onClick={() => void mediaService.control("previous")}
        >
          <SkipBack size={17} fill="currentColor" strokeWidth={0} />
        </IconButton>
        <button
          type="button"
          aria-label={playing ? "Pause" : "Play"}
          disabled={!canToggle}
          onClick={() => void mediaService.control("toggle")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#050506] outline-none transition duration-150 hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-white/40 disabled:pointer-events-none disabled:opacity-35 active:scale-95"
        >
          {playing ? (
            <Pause size={16} fill="currentColor" strokeWidth={0} />
          ) : (
            <Play size={16} fill="currentColor" strokeWidth={0} className="ml-0.5" />
          )}
        </button>
        <IconButton
          label="Next"
          disabled={!state.canNext}
          onClick={() => void mediaService.control("next")}
        >
          <SkipForward size={17} fill="currentColor" strokeWidth={0} />
        </IconButton>
      </div>
    </div>
  );
}