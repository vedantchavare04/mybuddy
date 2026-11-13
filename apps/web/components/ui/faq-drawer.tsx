
"use client";

import { useId, type CSSProperties } from "react";

export type FaqCard = {
  id: string;
  tab: string;
  q: string;
  a: string;
  linkLabel?: string;
  linkHref?: string;
};

export type FaqDrawerProps = {
  label?: string;
  title?: string;
  lead?: string;
  drawer?: string;
  cards: FaqCard[];
  count?: number;
  open?: "none" | "1" | "2" | "3" | "4" | "5" | "6" | "7";
  single?: boolean;
  askNote?: string;
  askLabel?: string;
  askHref?: string;
  finish?: "auto" | "aluminium" | "graphite";
  className?: string;
  style?: CSSProperties;
};

const CSS = `
.fq {
  --fq-paper: #f0f1e8;
  --fq-paper-light: #fafbf5;
  --fq-paper-dark: #dce0d1;
  --fq-ink: #25271f;
  --fq-muted: #77796e;
  --fq-blue: #192d60;
  --fq-yellow: #ffd24a;
  --fq-shadow: 12 25 65;

  width: 100%;
  color: #fff;
  font-family: var(--font-body), 'Figtree', sans-serif;
  -webkit-font-smoothing: antialiased;
}

.fq *,
.fq *::before,
.fq *::after {
  box-sizing: border-box;
}

.fq-wrap {
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.25fr);
  align-items: start;
  gap: clamp(36px, 6vw, 90px);
  width: min(100% - 48px, 1240px);
  margin-inline: auto;
  padding-block: clamp(70px, 8vw, 112px);
}

.fq-head {
  position: sticky;
  top: 36px;
  padding-top: 24px;
}

.fq-label {
  margin: 0 0 18px;
  color: rgba(255,255,255,0.72);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.17em;
  text-transform: uppercase;
}

.fq-title {
  margin: 0;
  color: #fff;
  font-family: var(--font-display), Georgia, serif;
  font-size: clamp(42px, 5vw, 68px);
  font-weight: 400;
  line-height: 1.03;
  letter-spacing: -0.025em;
  text-wrap: balance;
}

.fq-lead {
  max-width: 37ch;
  margin: 22px 0 0;
  color: rgba(255,255,255,0.83);
  font-size: 16px;
  line-height: 1.75;
}

/* Drawer */

.fq-cabinet {
  min-width: 0;
}

.fq-drawer {
  position: relative;
  isolation: isolate;
  padding: 12px 12px 0;
  overflow: visible;
  border: 1px solid rgba(255,255,255,0.13);
  border-radius: 14px;
  background: #172a59;
  box-shadow:
    0 24px 65px rgba(12,25,66,0.23),
    inset 0 1px 0 rgba(255,255,255,0.12);
}

.fq-tray {
  display: grid;
  gap: 0;
  padding: 40px 12px 16px;
  overflow: visible;
  border-radius: 9px 9px 4px 4px;
  background:
    linear-gradient(180deg, #102047, #1a2d5c);
  box-shadow:
    inset 0 5px 12px rgba(0,0,0,0.22),
    inset 0 1px 0 rgba(255,255,255,0.07);
}

/* Cards */

.fq-card {
  position: relative;
  margin-inline: calc(var(--depth, 0) * 5px);
  border-radius: 4px 4px 1px 1px;
  background:
    linear-gradient(
      rgba(40,36,26,var(--shade,0)),
      rgba(40,36,26,var(--shade,0))
    ),
    var(--fq-paper);
  color: var(--fq-ink);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.95),
    0 -1px 0 rgba(0,0,0,0.1),
    0 -7px 10px -5px rgba(0,0,0,0.3);
  transition:
    transform 220ms cubic-bezier(0.2,0.7,0.2,1),
    box-shadow 220ms ease;
}

.fq-card:first-child {
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.95),
    0 -1px 0 rgba(0,0,0,0.08);
}

.fq-card:not([open]):hover {
  transform: translateY(-3px);
}

.fq-card[open] {
  z-index: 2;
  margin-top: 9px;
  transform: translateY(-10px);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.95),
    0 -5px 9px -5px rgba(0,0,0,0.3),
    0 22px 30px -16px rgba(0,0,0,0.3),
    0 2px 3px rgba(0,0,0,0.12);
}

/* Question */

.fq-edge {
  position: relative;
  display: grid;
  grid-template-columns: 5.2ch minmax(0,1fr) auto;
  align-items: center;
  column-gap: 12px;
  padding: 17px 18px 21px;
  border-radius: inherit;
  list-style: none;
  cursor: pointer;
  font-family: var(--font-body), 'Figtree', sans-serif;
  font-size: 14px;
  line-height: 1.55;
  -webkit-tap-highlight-color: transparent;
}

.fq-edge::-webkit-details-marker {
  display: none;
}

.fq-edge::marker {
  content: "";
}

.fq-edge:focus-visible {
  outline: 2px solid #315dcc;
  outline-offset: -5px;
}

.fq-no {
  color: var(--fq-muted);
  font-size: 11px;
  letter-spacing: 0.04em;
}

.fq-q {
  font-weight: 600;
  text-wrap: pretty;
}

.fq-mark {
  position: relative;
  width: 13px;
  height: 13px;
}

.fq-mark::before,
.fq-mark::after {
  content: "";
  position: absolute;
  top: 6px;
  left: 1px;
  right: 1px;
  height: 1.5px;
  background: var(--fq-muted);
}

.fq-mark::after {
  transform: rotate(90deg);
  transition: transform 220ms ease;
}

.fq-card[open] .fq-mark::after {
  transform: rotate(0deg);
}

/* Tabs */

.fq-tab {
  position: absolute;
  bottom: 100%;
  left: calc(var(--tab-at, 0) * 100%);
  height: 19px;
  padding: 3px 11px 0;
  border-radius: 5px 5px 0 0;
  background: var(--fq-paper);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.95),
    0 -4px 7px -4px rgba(0,0,0,0.3);
  color: var(--fq-muted);
  font-family: var(--font-body), sans-serif;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  pointer-events: none;
}

/* Answer */

.fq-face {
  margin: -7px 18px 0;
  padding: 16px 0 22px calc(5.2ch + 12px);
  border-top: 3px double rgba(38,37,31,0.3);
  font-size: 14px;
  line-height: 1.85;
}

.fq-a {
  max-width: 60ch;
  margin: 0;
  color: #45463e;
}

.fq-answer-link {
  display: inline-block;
  margin-top: 12px;
  color: #315dcc;
  font-size: 13px;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 4px;
}

.fq-filed {
  margin: 24px 0 0;
  color: #858579;
  font-size: 10px;
  letter-spacing: 0.07em;
  text-align: right;
}

/* Drawer front */

.fq-front {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 10px;
  margin: 0 -12px;
  padding: 16px 0 18px;
  border-radius: 0 0 14px 14px;
  background: linear-gradient(180deg, #21376d, #172a59);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.1),
    0 -1px 0 rgba(0,0,0,0.2);
}

.fq-holder {
  display: block;
  padding: 3px;
  border-radius: 3px;
  background: linear-gradient(#344b7c,#172a59);
  box-shadow:
    0 0 0 1px rgba(0,0,0,0.2),
    0 1px 0 rgba(255,255,255,0.12);
}

.fq-holder-card {
  display: block;
  min-width: 132px;
  padding: 4px 12px;
  border-radius: 1px;
  background: var(--fq-paper);
  color: var(--fq-ink);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-align: center;
  text-transform: uppercase;
}

.fq-pull {
  display: block;
  width: 108px;
  height: 22px;
  border-radius: 3px 3px 54px 54px / 3px 3px 22px 22px;
  background: #102047;
  box-shadow:
    inset 0 4px 6px rgba(0,0,0,0.35),
    0 1px 0 rgba(255,255,255,0.08);
}

/* GitHub link */

.fq-ask {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px 24px;
  margin-top: 26px;
  padding-inline: 4px;
}

.fq-note {
  max-width: 44ch;
  margin: 0;
  color: rgba(255,255,255,0.82);
  font-size: 14px;
  line-height: 1.7;
}

.fq-key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 23px;
  border-radius: 30px;
  background: linear-gradient(180deg,#ffe17b,#ffd24a);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.55),
    0 3px 0 #c99a1c,
    0 8px 16px rgba(12,28,75,0.2);
  color: #14234c;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  transition: transform 150ms ease, box-shadow 150ms ease;
}

.fq-key:hover {
  transform: translateY(-2px);
}

.fq-key:active {
  transform: translateY(2px);
}

.fq-key:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 4px;
}

/* Responsive */

@media (max-width: 959px) {
  .fq-wrap {
    grid-template-columns: minmax(0,1fr);
    gap: 40px;
  }

  .fq-head {
    position: static;
    padding-top: 0;
    max-width: 650px;
  }
}

@media (max-width: 559px) {
  .fq-wrap {
    width: calc(100% - 36px);
    padding-block: 65px;
    gap: 34px;
  }

  .fq-title {
    font-size: clamp(40px, 11vw, 54px);
  }

  .fq-drawer {
    padding: 8px 8px 0;
  }

  .fq-tray {
    padding: 34px 6px 12px;
  }

  .fq-card {
    margin-inline: calc(var(--depth,0) * 3px);
  }

  .fq-edge {
    grid-template-columns: minmax(0,1fr) auto;
    padding: 14px 14px 20px;
    font-size: 13px;
  }

  .fq-no {
    display: none;
  }

  .fq-tab {
    font-size: 9px;
    padding-inline: 8px;
  }

  .fq-face {
    margin-inline: 14px;
    padding-left: 0;
    font-size: 13px;
  }

  .fq-front {
    margin-inline: -8px;
  }

  .fq-ask {
    flex-direction: column;
    align-items: stretch;
  }

  .fq-key {
    width: fit-content;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fq-card,
  .fq-mark::after,
  .fq-key {
    transition: none;
  }

  .fq-card:not([open]):hover {
    transform: none;
  }
}
`;

const TAB_STATIONS = [0.04, 0.37, 0.7];

export function FaqDrawer({
  label = "Questions",
  title = "Frequently asked questions",
  lead = "",
  drawer = "MyBuddy · FAQ",
  cards,
  count,
  open = "none",
  single = true,
  askNote = "",
  askLabel = "Visit GitHub",
  askHref = "https://github.com/vedantchavare04/mybuddy",
  className,
  style,
}: FaqDrawerProps) {
  const uid = useId().replace(/:/g, "");
  const visibleCards = cards.slice(
    0,
    Math.max(1, Math.min(count ?? cards.length, cards.length))
  );

  const safeAskHref = /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(askHref)
    ? askHref
    : "https://github.com/vedantchavare04/mybuddy";

  return (
    <>
      <style>{CSS}</style>

      <section
        className={`fq ${className ?? ""}`}
        style={style}
        aria-labelledby={`${uid}-title`}
      >
        <div className="fq-wrap">
          <header className="fq-head">
            <p className="fq-label">{label}</p>

            <h2 className="fq-title" id={`${uid}-title`}>
              {title}
            </h2>

            {lead && <p className="fq-lead">{lead}</p>}
          </header>

          <div className="fq-cabinet">
            <div className="fq-drawer">
              <div className="fq-tray">
                {visibleCards.map((card, index) => (
                  <details
                    className="fq-card"
                    key={card.id}
                    name={single ? uid : undefined}
                    open={open === String(index + 1)}
                    style={{
                      "--depth":
                        visibleCards.length <= 1
                          ? 0
                          : (visibleCards.length - 1 - index) /
                            (visibleCards.length - 1),
                      "--tab-at": TAB_STATIONS[index % 3],
                      "--shade": `${
                        ((visibleCards.length - 1 - index) /
                          Math.max(visibleCards.length - 1, 1)) *
                        0.08
                      }`,
                    } as CSSProperties}
                  >
                    <summary className="fq-edge">
                      <span className="fq-tab" aria-hidden="true">
                        {card.tab}
                      </span>

                      <span className="fq-no" aria-hidden="true">
                        Q.{String(index + 1).padStart(2, "0")}
                      </span>

                      <span className="fq-q">{card.q}</span>

                      <span className="fq-mark" aria-hidden="true" />
                    </summary>

                    <div className="fq-face">
                      <p className="fq-a">{card.a}</p>

                      {card.linkLabel && card.linkHref && (
                        <a
                          className="fq-answer-link"
                          href={card.linkHref}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {card.linkLabel} ↗
                        </a>
                      )}

                      <p className="fq-filed" aria-hidden="true">
                        Filed under {card.tab} · Q.
                        {String(index + 1).padStart(2, "0")}
                      </p>
                    </div>
                  </details>
                ))}
              </div>

              <div className="fq-front" aria-hidden="true">
                <span className="fq-holder">
                  <span className="fq-holder-card">{drawer}</span>
                </span>

                <span className="fq-pull" />
              </div>
            </div>

            {(askNote || askLabel) && (
              <div className="fq-ask">
                {askNote && <p className="fq-note">{askNote}</p>}

                {askLabel && (
                  <a
                    className="fq-key"
                    href={safeAskHref}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {askLabel}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

export default FaqDrawer;
