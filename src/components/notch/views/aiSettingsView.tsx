import { useState } from "react";
import {
  aiConfig,
  baseOf,
  PROVIDERS,
  useAiConfig,
  type ProviderId,
} from "../../../services/ai/aiConfig";
import {
  BackLabel,
  Button,
  ViewHeader,
  inputCls,
  scrollCls,
} from "./parts";

type Props = { onBack: () => void; onCollapse: () => void };

export function AiSettingsView({ onBack, onCollapse }: Props) {
  const cfg = useAiConfig();
  const [key, setKey] = useState("");

  const id = cfg.provider;
  const info = PROVIDERS.find((p) => p.id === id);
  const configured = !!id && !!cfg.configured[id];
  const verified = !!id && !!cfg.verified[id];
  const model = id ? (cfg.models[id] ?? "") : "";
  const base = id ? baseOf(cfg, id) : "";

  const needsKey = info?.auth === "key" && !configured;
  const showKey = needsKey || info?.auth === "optional-key";
  const showModel = !!info && (configured || info.id === "custom");
  const canConnect = info ? (info.auth === "key" ? !!key.trim() : true) : false;
  const hasAction =
    !!info && (needsKey || info.id === "custom" || info.id === "ollama");

  const connect = async () => {
    const ok = await aiConfig.connect(key.trim() || null);
    if (ok) setKey("");
  };

  let status: string | null = null;
  if (info && configured) {
    if (info.id === "ollama") {
      const n = cfg.suggestions.length;
      status = `Reachable · ${n} model${n === 1 ? "" : "s"}`;
    } else if (info.id === "custom") {
      status = verified ? "Endpoint reachable" : "Saved · not verified";
    } else {
      status = verified
        ? "Connected · key stored in Windows Credential Manager"
        : "Key saved · verified on first request";
    }
  } else if (info?.id === "ollama") {
    status = "Not reachable yet";
  }

  const note = info?.local
    ? "Runs locally. No cloud API required."
    : "AI requests use your connected provider/account and may incur charges according to that provider's pricing.";

  return (
    <div className="flex h-full flex-col px-6 pb-5 pt-5">
      <ViewHeader
        onClose={onCollapse}
        leading={<BackLabel title="AI" onBack={onBack} />}
      />

      <div className={`${scrollCls} mt-3.5 flex flex-col gap-2`}>
        <select
          aria-label="Provider"
          value={id ?? ""}
          onChange={(e) => aiConfig.select(e.target.value as ProviderId)}
          className="w-full rounded-xl border border-white/10 px-3 text-[13px] outline-none"
          style={{
            height: "36px",
            minHeight: "36px",
            color: "#ffffff",
            backgroundColor: "#171717",
          }}
        >
          <option
            value=""
            disabled
            style={{
              color: "#111827",
              backgroundColor: "#ffffff",
            }}
          >
            Choose provider
          </option>

          {PROVIDERS.map((p) => (
            <option
              key={p.id}
              value={p.id}
              style={{
                color: "#111827",
                backgroundColor: "#ffffff",
              }}
            >
              {p.name}
            </option>
          ))}
        </select>

        {info?.endpoint && id && (
          <input
            value={base}
            onChange={(e) => aiConfig.setBase(id, e.target.value)}
            placeholder={
              id === "ollama"
                ? "http://localhost:11434"
                : "https://your-endpoint/v1"
            }
            aria-label="Endpoint"
            spellCheck={false}
            className={inputCls}
          />
        )}

        {showKey && info && (
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && canConnect && void connect()}
            placeholder={info.auth === "key" ? "API key" : info.keyHint}
            aria-label="API key"
            autoComplete="off"
            spellCheck={false}
            className={inputCls}
          />
        )}

        {showModel && id && (
          <>
            <input
              list="mybuddy-ai-models"
              value={model}
              onChange={(e) => aiConfig.setModel(id, e.target.value)}
              placeholder="Model"
              aria-label="Model"
              spellCheck={false}
              className={inputCls}
            />
            <datalist id="mybuddy-ai-models">
              {cfg.suggestions.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </>
        )}

        {info && (
          <div className="mt-1 flex items-center gap-1.5">
            {hasAction && (
              <Button
                variant="primary"
                disabled={cfg.busy || !canConnect}
                onClick={() => void connect()}
              >
                {cfg.busy
                  ? "Checking…"
                  : info.id === "ollama"
                    ? "Check connection"
                    : info.id === "custom"
                      ? "Save"
                      : "Connect"}
              </Button>
            )}
            {configured && info.auth !== "none" && (
              <Button
                variant="quiet"
                onClick={() => void aiConfig.disconnect()}
              >
                Disconnect
              </Button>
            )}
          </div>
        )}

        {status && <p className="text-[12px] text-white/50">{status}</p>}
        {cfg.error && (
          <p className="text-[12px] leading-[1.4] text-white/60">{cfg.error}</p>
        )}

        <p className="mt-1 text-[11.5px] leading-[1.45] text-white/35">
          {info
            ? note
            : "Bring your own AI. Pick a provider and connect your own account or a local model."}
        </p>
      </div>
    </div>
  );
}
