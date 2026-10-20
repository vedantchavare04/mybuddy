import { useEffect, useRef, useState } from "react";
import { ArrowLeftRight, Check, Copy, Square, Volume2 } from "lucide-react";
import {
  selectionMessage,
  selectionService,
  SHORTCUTS,
  useSelection,
} from "../../../services/selection/selectionService";
import {
  speechService,
  useSpeech,
} from "../../../services/speech/speechService";
import {
  LANGUAGES,
  translateError,
  translationService,
} from "../../../services/translation/translationService";
import {
  BackLabel,
  Button,
  IconButton,
  ViewHeader,
  scrollCls,
  textareaCls,
} from "./parts";
import { PremiumSelect, type SelectOption } from "./premiumSelect";
import { LanguageFlag } from "./selectMarks";

type Props = { onBack: () => void; onCollapse: () => void };

function LangSelect({
  value,
  onChange,
  auto,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  auto?: boolean;
  label: string;
}) {
  const options: SelectOption[] = [
    ...(auto ? [{ value: "auto", label: "Detect language" }] : []),
    ...LANGUAGES.map((language) => ({
      value: language.code,
      label: language.name,
      icon: <LanguageFlag code={language.code} />,
    })),
  ];

  return (
    <PremiumSelect
      ariaLabel={label}
      value={value}
      options={options}
      onChange={onChange}
      placeholder={auto ? "Detect language" : "Choose language"}
      className="!w-auto !flex-1"
    />
  );
}

export function TranslateView({ onBack, onCollapse }: Props) {
  const { pending } = useSelection();
  const speech = useSpeech();

  const [source, setSource] = useState("auto");
  const [target, setTarget] = useState("en");
  const [original, setOriginal] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const request = useRef(0);

  const run = async (text: string, src: string, tgt: string) => {
    const t = text.trim();
    if (!t) return;
    if (src !== "auto" && src === tgt) {
      setResult(t);
      setStatus("idle");
      return;
    }
    const id = ++request.current;
    setStatus("loading");
    setError(null);
    try {
      const out = await translationService.translate(t, src, tgt);
      if (id !== request.current) return;
      setResult(out.text);
      setStatus("idle");
    } catch (e) {
      if (id !== request.current) return;
      setStatus("error");
      setError(translateError(String(e)));
    }
  };

  useEffect(() => {
    if (!pending || pending.intent !== "translate") return;
    selectionService.consume();
    if (pending.error || !pending.text) {
      setStatus("error");
      setError(selectionMessage(pending.error));
      return;
    }
    setOriginal(pending.text);
    setResult(null);
    void run(pending.text, source, target);
  }, [pending]);

  const swap = () => {
    if (source === "auto") return;
    const next = { s: target, t: source };
    setSource(next.s);
    setTarget(next.t);
    if (result) {
      setOriginal(result);
      void run(result, next.s, next.t);
    }
  };

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {}
  };

  const speakingThis = speech.state === "speaking" && speech.text === result;

  return (
    <div className="flex h-full flex-col px-6 pb-5 pt-5">
      <ViewHeader
        onClose={onCollapse}
        leading={<BackLabel title="Translate" onBack={onBack} />}
      />

      <div className="mt-3.5 flex items-center gap-2">
        <LangSelect label="From" value={source} onChange={setSource} auto />
        <IconButton
          label="Swap languages"
          disabled={source === "auto"}
          onClick={swap}
        >
          <ArrowLeftRight size={14} strokeWidth={1.8} />
        </IconButton>
        <LangSelect label="To" value={target} onChange={setTarget} />
      </div>

      <textarea
        value={original}
        onChange={(e) => setOriginal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            void run(original, source, target);
          }
        }}
        placeholder={`Select text anywhere and press ${SHORTCUTS.translate}, or type here`}
        className={`${textareaCls} mt-2.5 h-[60px] shrink-0`}
      />

      <div className="mt-3 text-[12px] font-medium text-white/35">
        Translation
      </div>
      <div className={`${scrollCls} mt-1 text-[13.5px] leading-[1.45]`}>
        {status === "loading" ? (
          <span className="text-white/35">Translating…</span>
        ) : status === "error" ? (
          <span className="text-white/55">{error}</span>
        ) : result ? (
          <span className="text-white/90">{result}</span>
        ) : (
          <span className="text-white/25">The translation appears here.</span>
        )}
      </div>

      <div className="mt-3 flex shrink-0 items-center gap-1.5">
        <Button variant="quiet" disabled={!result} onClick={() => void copy()}>
          {copied ? (
            <Check size={14} strokeWidth={1.9} />
          ) : (
            <Copy size={14} strokeWidth={1.8} />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button
          variant="quiet"
          disabled={!result || speech.backend === "unavailable"}
          onClick={() =>
            speakingThis
              ? speechService.stop()
              : result && speechService.speak(result, { lang: target })
          }
        >
          {speakingThis ? (
            <Square size={13} fill="currentColor" strokeWidth={0} />
          ) : (
            <Volume2 size={14} strokeWidth={1.8} />
          )}
          {speakingThis ? "Stop" : "Speak"}
        </Button>
        <Button
          variant="primary"
          className="ml-auto"
          disabled={!original.trim() || status === "loading"}
          onClick={() => void run(original, source, target)}
        >
          Translate
        </Button>
      </div>
    </div>
  );
}
