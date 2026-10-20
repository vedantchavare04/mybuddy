import { useEffect, useState } from "react";
import { AudioLines, Gauge, Pause, Play, Square } from "lucide-react";
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
import { BackLabel, Button, ViewHeader, textareaCls } from "./parts";
import { PremiumSelect } from "./premiumSelect";

type Props = { onBack: () => void; onCollapse: () => void };

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export function SpeechView({ onBack, onCollapse }: Props) {
  const sp = useSpeech();
  const { pending } = useSelection();
  const [draft, setDraft] = useState(sp.text);
  const [note, setNote] = useState<string | null>(null);

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

      <div className="mt-3.5 text-[12px] font-medium text-white/40">
        {status}
      </div>

      <textarea
        value={text}
        readOnly={active || sp.busy}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={`Select text anywhere and press ${SHORTCUTS.speak}, or type here`}
        className={`${textareaCls} mt-1.5 h-[76px] shrink-0`}
      />

      <div className="mt-3 flex shrink-0 items-center gap-1.5 mb-2">
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
        <PremiumSelect
          ariaLabel="Voice"
          value={sp.voiceId ?? ""}
          onChange={(value) => speechService.setVoice(value)}
          className="!w-auto !flex-1"
          options={sp.voices.map((voice) => ({
            value: voice.id,
            label: voice.name.replace(/^Microsoft /, ""),
            icon: <AudioLines size={15} className="text-white/55" />,
          }))}
        />
        <PremiumSelect
          ariaLabel="Speech speed"
          value={String(sp.rate)}
          onChange={(value) => speechService.setRate(Number(value))}
          className="!w-[84px] !flex-none"
          options={SPEEDS.map((speed) => ({
            value: String(speed),
            label: `${speed}x`,
            icon: <Gauge size={15} className="text-white/55" />,
          }))}
        />
      </div>
    </div>
  );
}
