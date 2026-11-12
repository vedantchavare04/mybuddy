"use client";

/**
 * MyBuddy · Features Section (Features 8 layout)
 * ───────────────────────────────────────────────
 * Top row:    Wallpaper · Spider · Quick actions   (3 cards, span 2 each)
 * Bottom row: Calendar · Reminders                 (2 wide cards, span 3 each)
 *
 * The spider card is a small interactive scene: the island sits at the top,
 * the spider drops from it on its thread when the card scrolls into view,
 * and a "Hanging spider" switch pulls it back up, like in the app.
 *
 * Images go in  public/features/ :
 *   wallpaper.png, spider-circle.jpg, spider.png, quick-actions.png,
 *   calendar.png, reminders.png
 *
 * Usage (page.tsx, between the hero and the footer):
 *   <FeaturesSection />
 */

import { useEffect, useRef, useState } from "react";
import { CalendarDays, Bell } from "lucide-react";

const NOISE = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .1 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>`,
)}`;

export default function FeaturesSection() {
  const deskRef = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  const [hang, setHang] = useState(true);

  useEffect(() => {
    const el = deskRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <style>{`
        .ft-section {
          width: 100%;
          max-width: 1040px;
          margin: 0 auto;
          padding: 96px 24px 40px;
          font-family: var(--font-body), system-ui, sans-serif;
        }

        /* heading */
        .ft-head { text-align: center; margin-bottom: 48px; }
        .ft-eyebrow {
          display: inline-block;
          margin-bottom: 14px;
          color: rgba(255, 255, 255, 0.75);
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .ft-title {
          margin: 0;
          color: #ffffff;
          font-family: var(--font-display), Georgia, serif;
          font-size: clamp(36px, 5vw, 56px);
          font-weight: 400;
          line-height: 1.05;
          letter-spacing: -0.01em;
        }
        .ft-sub {
          margin: 16px auto 0;
          max-width: 460px;
          color: rgba(255, 255, 255, 0.85);
          font-size: 17px;
          line-height: 1.5;
        }

        /* grid */
        .ft-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 16px;
        }

        .ft-card {
          position: relative;
          grid-column: span 2;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: #ffffff;
          border: 1px solid rgba(20, 36, 107, 0.08);
          border-radius: 24px;
          box-shadow: 0 16px 36px rgba(10, 20, 80, 0.2);
          color: #14246b;
        }
        .ft-card.wide { grid-column: span 3; }

        .ft-card h3 {
          margin: 0;
          font-size: 19px;
          font-weight: 600;
          letter-spacing: -0.2px;
        }
        .ft-card p {
          margin: 8px 0 0;
          color: #4a5578;
          font-size: 15px;
          line-height: 1.5;
        }

        /* ringed icon */
        .ft-ring {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid rgba(20, 36, 107, 0.16);
          flex-shrink: 0;
        }
        .ft-ring::before {
          content: "";
          position: absolute;
          inset: -8px;
          border-radius: 999px;
          border: 1px solid rgba(20, 36, 107, 0.08);
        }
        .ft-ring.sm { width: 48px; height: 48px; }

        /* A · screenshot hangs from the top edge, like the Notch */
        .ft-hang-vis {
          display: flex;
          align-items: flex-start;
          justify-content: center;
          height: 216px;
          padding: 0 24px;
          background: #eef2ff;
          overflow: hidden;
        }
        .ft-hang-vis img {
          display: block;
          width: 100%;
          max-width: 300px;
          height: auto;
          filter: drop-shadow(0 12px 18px rgba(10, 20, 80, 0.26));
          transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .ft-card:hover .ft-hang-vis img { transform: translateY(6px); }
        .ft-hang-copy { padding: 22px 26px 28px; }

        /* B · spider scene */
        .ft-desk {
          position: relative;
          height: 216px;
          overflow: hidden;
          isolation: isolate;
        }
        .ft-desk::before,
        .ft-desk::after {
          content: "";
          position: absolute;
          top: 46px;
          bottom: -24px;
          width: calc(50% - 88px);
          border-radius: 12px;
          background: #4b505a;
          box-shadow:
            inset 0 0 0 2px rgba(255, 255, 255, 0.14),
            inset 0 3px 8px rgba(0, 0, 0, 0.28),
            0 6px 14px rgba(0, 0, 0, 0.22);
          z-index: 0;
        }
        .ft-desk::before { left: 12px; }
        .ft-desk::after { right: 12px; }

        .ft-island {
          position: absolute;
          top: 0;
          left: 50%;
          width: 200px;
          height: 30px;
          margin-left: -100px;
          border-radius: 0 0 18px 18px;
          background-color: #050506;
          background-repeat: no-repeat;
          background-size: 100% auto;
          background-position: top center;
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.4);
          z-index: 3;
        }

        .ft-drop {
          position: absolute;
          top: 29px;
          left: 50%;
          width: 150px;
          margin-left: -75px;
          transform: translateY(-140px);
          transition: transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          z-index: 2;
        }
        .ft-drop.out { transform: translateY(0); }
        .ft-drop::before {
          content: "";
          position: absolute;
          left: 50%;
          width: 2px;
          margin-left: -1px;
          bottom: 67.5%;
          height: 420px;
          background: #d9dcf0;
          border-radius: 2px;
        }
        .ft-spider {
          display: block;
          width: 100%;
          height: auto;
          clip-path: inset(32% 0 0 0);
          transform-origin: 50% 32%;
          filter:
            drop-shadow(0 0 10px rgba(167, 150, 255, 0.45))
            drop-shadow(0 6px 6px rgba(0, 0, 0, 0.5));
        }
        .ft-card:hover .ft-drop.out .ft-spider {
          animation: ft-sway 2.8s ease-in-out infinite;
        }
        @keyframes ft-sway {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }

        .ft-toggle {
          position: absolute;
          right: 12px;
          bottom: 12px;
          z-index: 4;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 6px 8px 6px 12px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 999px;
          background: rgba(5, 5, 6, 0.8);
          color: #e9ebf5;
          font: inherit;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          -webkit-backdrop-filter: blur(6px);
          backdrop-filter: blur(6px);
        }
        .ft-toggle:focus-visible { outline: 2px solid #ffffff; outline-offset: 2px; }
        .ft-switch {
          position: relative;
          width: 30px;
          height: 18px;
          border-radius: 999px;
          background: #3a3d46;
          transition: background 0.3s ease;
        }
        .ft-switch::after {
          content: "";
          position: absolute;
          top: 2px;
          left: 2px;
          width: 14px;
          height: 14px;
          border-radius: 999px;
          background: #ffffff;
          transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .ft-toggle[aria-checked="true"] .ft-switch { background: #8b6df0; }
        .ft-toggle[aria-checked="true"] .ft-switch::after { transform: translateX(12px); }

        /* C · wide card: icon + text on top, framed screenshot bleeding off the edge */
        .ft-split {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 24px 0 0 24px;
        }
        .ft-split-copy {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 26px;
          padding-right: 24px;
        }
        .ft-frame {
          position: relative;
          margin-top: auto;
          padding: 30px 0 0 16px;
          border-left: 1px solid rgba(20, 36, 107, 0.16);
          border-top: 1px solid rgba(20, 36, 107, 0.16);
          border-top-left-radius: 16px;
          background: #eef2ff;
          overflow: hidden;
        }
        .ft-dots {
          position: absolute;
          left: 12px;
          top: 9px;
          display: flex;
          gap: 4px;
        }
        .ft-dots i {
          display: block;
          width: 8px;
          height: 8px;
          border-radius: 999px;
          border: 1px solid rgba(20, 36, 107, 0.2);
        }
        .ft-frame img {
          display: block;
          width: 100%;
          max-width: none;
          height: auto;
          border-top-left-radius: 14px;
          box-shadow: 0 10px 24px rgba(10, 20, 80, 0.25);
          transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .ft-card:hover .ft-frame img { transform: translateY(-3px); }

        /* responsive */
        @media (max-width: 900px) {
          .ft-section { padding-top: 72px; }
          .ft-grid { grid-template-columns: 1fr; }
          .ft-card, .ft-card.wide { grid-column: auto; }
          .ft-frame img { width: 160%; }
        }

        @media (prefers-reduced-motion: reduce) {
          .ft-hang-vis img,
          .ft-frame img,
          .ft-drop,
          .ft-switch,
          .ft-switch::after { transition: none !important; }
          .ft-card:hover .ft-hang-vis img,
          .ft-card:hover .ft-frame img { transform: none; }
          .ft-card:hover .ft-drop.out .ft-spider { animation: none; }
        }
      `}</style>

      <section className="ft-section" id="features" aria-labelledby="ft-title">
        <header className="ft-head">
          <span className="ft-eyebrow">What’s inside</span>
          <h2 className="ft-title" id="ft-title">
            Your desktop, made yours.
          </h2>
          <p className="ft-sub">
            A friendly Notch with a few everyday tools, always one glance away.
          </p>
        </header>

        <div className="ft-grid">
          <article className="ft-card">
            <div className="ft-hang-vis">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/features/wallpaper.png"
                alt="MyBuddy settings panel with a Change photo button and a wallpaper preview"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="ft-hang-copy">
              <h3>Your wallpaper, in your Notch</h3>
              <p>Pick a photo and make your desktop feel like your own.</p>
            </div>
          </article>

          <article className="ft-card">
            <div
              className="ft-desk"
              ref={deskRef}
              style={{
                backgroundColor: "#2a2d34",
                backgroundImage: `url("${NOISE}")`,
              }}
            >
              <div
                className="ft-island"
                style={{ backgroundImage: 'url("/features/spider-circle.jpg")' }}
              />
              <div className={`ft-drop${seen && hang ? " out" : ""}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="ft-spider"
                  src="/features/spider.png"
                  alt="A small spider hanging from the MyBuddy Notch"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={hang}
                className="ft-toggle"
                onClick={() => setHang((v) => !v)}
              >
                Hanging spider
                <span className="ft-switch" aria-hidden="true" />
              </button>
            </div>
            <div className="ft-hang-copy">
              <h3>A friendly spider</h3>
              <p>A little companion that hangs from your Notch, in a mood that suits you.</p>
            </div>
          </article>

          <article className="ft-card">
            <div className="ft-hang-vis">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/features/quick-actions.png"
                alt="MyBuddy Quick Actions panel with a search box and a list of actions"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="ft-hang-copy">
              <h3>Quick actions</h3>
              <p>Open what you need without leaving what you’re doing.</p>
            </div>
          </article>

          <article className="ft-card wide">
            <div className="ft-split">
              <div className="ft-split-copy">
                <div className="ft-ring sm">
                  <CalendarDays size={20} strokeWidth={1.4} aria-hidden="true" />
                </div>
                <div>
                  <h3>Calendar</h3>
                  <p>See what’s coming up, right from the Notch.</p>
                </div>
              </div>
              <div className="ft-frame">
                <span className="ft-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/features/calendar.png"
                  alt="MyBuddy Calendar panel showing an upcoming event"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>
          </article>

          <article className="ft-card wide">
            <div className="ft-split">
              <div className="ft-split-copy">
                <div className="ft-ring sm">
                  <Bell size={20} strokeWidth={1.4} aria-hidden="true" />
                </div>
                <div>
                  <h3>Reminders</h3>
                  <p>Gentle nudges for the things you want to remember.</p>
                </div>
              </div>
              <div className="ft-frame">
                <span className="ft-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/features/reminders.png"
                  alt="MyBuddy Reminders panel showing a reminder for today"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}