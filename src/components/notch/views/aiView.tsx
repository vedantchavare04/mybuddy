import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import {
  CODE_ACTIONS,
  TEXT_ACTIONS,
  aiChat,
  looksLikeCode,
  useAiChat,
} from "../../../services/ai/aiChat";
import { PROVIDERS, setupOf, useAiConfig } from "../../../services/ai/aiConfig";
import { dayLabel, formatTime } from "../../../services/calendar/calendarService";
import {
  selectionMessage,
  selectionService,
  SHORTCUTS,
  useSelection,
} from "../../../services/selection/selectionService";
import {
  BackLabel,
  Body,
  Button,
  Title,
  ViewHeader,
  inputCls,
  scrollCls,
} from "./parts";

type Props = {
  onBack: () => void;
  onCollapse: () => void;
  onSetup: () => void;
};

export function AiView({ onBack, onCollapse, onSetup }: Props) {
  const cfg = useAiConfig();
  const chat = useAiChat();
  const { pending } = useSelection();
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const ready = setupOf(cfg) !== null;
  const providerName = PROVIDERS.find((p) => p.id === cfg.provider)?.name;

  useEffect(() => {
    if (!pending || pending.intent !== "ai") return;
    selectionService.consume();
    aiChat.setContext(pending.text);
    aiChat.setNote(pending.error ? selectionMessage(pending.error) : null);
    setInput("");
    inputRef.current?.focus();
  }, [pending]);

  const last = chat.messages[chat.messages.length - 1];
  const reply = last && last.role === "assistant" ? last.content : null;
  const actions = looksLikeCode(chat.context) ? CODE_ACTIONS : TEXT_ACTIONS;

  const submit = (question: string) => {
    const q = question.trim();
    if (!q) return;
    void aiChat.ask(q).then((ok) => {
      if (ok) setInput("");
    });
  };

  const copy = async () => {
    if (!reply) return;
    try {
      await navigator.clipboard.writeText(reply);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      return;
    }
  };

  const header = (
    <ViewHeader
      onClose={onCollapse}
      leading={<BackLabel title="Ask MyBuddy" onBack={onBack} />}
      trailing={
        providerName ? (
          <span className="mr-1 text-[11.5px] text-white/30">{providerName}</span>
        ) : null
      }
    />
  );

  if (!ready) {
    return (
      <div className="flex h-full flex-col px-6 pb-5 pt-5">
        {header}
        <Title>Connect an AI provider</Title>
        <Body>Ask about any text on your screen using your own AI account.</Body>
        <p className="mt-2 text-[12px] leading-[1.45] text-white/35">
          AI requests use your connected provider/account and may incur charges according
          to that provider's pricing.
        </p>
        <div className="mt-auto">
          <Button variant="primary" onClick={onSetup}>
            Set up AI
          </Button>
        </div>
      </div>
    );
  }

  const draftDate = chat.draft ? new Date(chat.draft.dueMs) : null;

  return (
    <div className="flex h-full flex-col px-6 pb-5 pt-5">
      {header}

      {chat.context && (
        <div className="mt-3 shrink-0">
          <div className="text-[12px] font-medium text-white/40">Selected text</div>
          <div
            className={`mt-1 rounded-[10px] bg-white/[0.05] px-3 py-2 text-[12.5px] leading-[1.4] text-white/70 ring-1 ring-inset ring-white/[0.06] ${
              chat.messages.length > 0
                ? "line-clamp-1"
                : "max-h-[64px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            }`}
          >
            {chat.context}
          </div>
        </div>
      )}

      {chat.context && chat.messages.length === 0 && !chat.busy && (
        <div className="mt-2.5 flex shrink-0 flex-wrap gap-1.5">
          {actions.map((a) => (
            <Button key={a.label} onClick={() => submit(a.prompt())}>
              {a.label}
            </Button>
          ))}
        </div>
      )}

      <div className={`${scrollCls} mt-3`}>
        {chat.busy ? (
          <p className="text-[13px] text-white/35">Thinking…</p>
        ) : chat.draft && draftDate ? (
          <div>
            <div className="text-[12px] font-medium text-white/40">Create reminder?</div>
            <div className="mt-1.5 text-[15px] font-semibold tracking-[-0.01em] text-white">
              {chat.draft.title}
            </div>
            <div className="mt-0.5 text-[13px] text-white/50">
              {dayLabel(draftDate)} at {formatTime(draftDate)}
            </div>
            <div className="mt-3 flex gap-1.5">
              <Button variant="primary" onClick={() => void aiChat.confirmDraft()}>
                Create
              </Button>
              <Button variant="quiet" onClick={() => aiChat.cancelDraft()}>
                Cancel
              </Button>
            </div>
          </div>
        ) : chat.error ? (
          <p className="text-[13px] leading-[1.45] text-white/60">{chat.error}</p>
        ) : reply ? (
          <>
            {chat.lastQuestion && (
              <p className="mb-1.5 line-clamp-1 text-[12px] text-white/35">{chat.lastQuestion}</p>
            )}
            <p className="whitespace-pre-wrap text-[13.5px] leading-[1.5] text-white/85">{reply}</p>
          </>
        ) : chat.note ? (
          <p className="text-[13px] leading-[1.45] text-white/55">{chat.note}</p>
        ) : (
          <p className="text-[13px] leading-[1.45] text-white/30">
            Select text anywhere and press {SHORTCUTS.ai}, or ask a question below.
          </p>
        )}
      </div>

      {reply && !chat.busy && (
        <div className="mt-2 flex shrink-0 items-center gap-1.5">
          <Button variant="quiet" onClick={() => void copy()}>
            {copied ? <Check size={14} strokeWidth={1.9} /> : <Copy size={14} strokeWidth={1.8} />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button variant="quiet" onClick={() => aiChat.reset()}>
            New
          </Button>
        </div>
      )}

      <div className="mt-3 flex shrink-0 gap-2">
        <input
          ref={inputRef}
          value={input}
          disabled={chat.busy}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit(input)}
          placeholder={reply ? "Ask a follow-up…" : "Ask anything…"}
          aria-label="Question"
          className={inputCls}
        />
        <Button
          variant="primary"
          disabled={chat.busy || !input.trim()}
          onClick={() => submit(input)}
        >
          Ask
        </Button>
      </div>
    </div>
  );
}