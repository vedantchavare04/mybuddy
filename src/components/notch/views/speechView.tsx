/*
 * src/components/notch/views/speechView.tsx
 * Minimal controls over native Windows speech: Speak / Pause / Resume / Stop,
 * plus voice and speed.
 */

import { useEffect, useState } from "react";
import { Pause, Play, Square } from "lucide-react";
import {
  selectionMessage,
  selectionService,
  SHORTCUTS,
  useSelection,
} from "../../../services/selection/selectionService";
import {
  speechErrorMessage,
  speechService,
  useSpeech,
} from "../../../services/speech/speechService";
import {
  BackLabel,
  Button,
  ViewHeader,
  selectCls,
  textareaCls,
} from "./parts";

type Props = { onBack: () => void; onCollapse: () => void };

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export function SpeechView({ onBack, onCollapse }: Props) {
  const sp = useSpeech();
  const { pending } = useSelection();
  const [draft, setDraft] = useState(sp.text);
  const [note, setNote] = useState<string | null>(null);

  // capture from Ctrl+Alt+S (speaking already started in the service)
  useEffect(() => {
    if (!pending || pending.intent !== "speak") return;
    selectionService.consume();
    if (pending.error || !pending.text) {
      setNote(selectionMessage(pending.error));
    } else {
      setDraft(pending.text);
      setNote(null);
    }
  }, [pending]);

  const active = sp.state === "speaking" || sp.state === "paused";
  const text = active || sp.busy ? sp.text : draft;
  const unavailable = sp.backend === "unavailable";

  const status = unavailable
    ? "Speech isn't available in this build."
    : sp.busy
      ? "Preparing…"
      : sp.state === "speaking"
        ? "Speaking"
        : sp.state === "paused"
          ? "Paused"
          : sp.state === "error"
            ? (speechErrorMessage(sp.error) ?? "Couldn't read that aloud.")
            : (note ?? (sp.state === "completed" ? "Finished" : "Ready"));

  return (
    <div className="flex h-full flex-col px-6 pb-5 pt-5">
      <ViewHeader
        onClose={onCollapse}
        leading={<BackLabel title="Text to speech" onBack={onBack} />}
      />

      <div className="mt-3.5 text-[12px] font-medium text-white/40">{status}</div>

      <textarea
        value={text}
        readOnly={active || sp.busy}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={`Select text anywhere and press ${SHORTCUTS.speak}, or type here`}
        className={`${textareaCls} mt-1.5 h-[76px] shrink-0`}
      />

      <div className="mt-3 flex shrink-0 items-center gap-1.5">
        {sp.state === "speaking" ? (
          <Button variant="primary" onClick={() => speechService.pause()}>
            <Pause size={13} fill="currentColor" strokeWidth={0} />
            Pause
          </Button>
        ) : sp.state === "paused" ? (
          <Button variant="primary" onClick={() => speechService.resume()}>
            <Play size={13} fill="currentColor" strokeWidth={0} />
            Resume
          </Button>
        ) : (
          <Button
            variant="primary"
            disabled={!draft.trim() || sp.busy || unavailable}
            onClick={() => speechService.speak(draft)}
          >
            <Play size={13} fill="currentColor" strokeWidth={0} />
            Speak
          </Button>
        )}
        <Button
          variant="quiet"
          disabled={!active && !sp.busy}
          onClick={() => speechService.stop()}
        >
          <Square size={12} fill="currentColor" strokeWidth={0} />
          Stop
        </Button>
      </div>

      <div className="mt-auto flex shrink-0 items-center gap-2">
        <select
          aria-label="Voice"
          value={sp.voiceId ?? ""}
          disabled={sp.voices.length === 0}
          onChange={(e) => speechService.setVoice(e.target.value)}
          className={selectCls}
        >
          {sp.voices.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name.replace(/^Microsoft /, "")}
            </option>
          ))}
        </select>
        <select
          aria-label="Speed"
          value={sp.rate}
          onChange={(e) => speechService.setRate(Number(e.target.value))}
          className={`${selectCls} !flex-none !w-[84px]`}
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}×
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}