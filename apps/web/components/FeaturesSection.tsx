"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, CalendarDays, Command, Image as ImageIcon } from "lucide-react";

const NOISE = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .1 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>`,
)}`;

function SpiderIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="14" r="3" />
      <circle cx="12" cy="9.6" r="1.5" />
      <path d="M12 2v6M9.3 12.6 5 9.5M9 14l-5 .6M9.4 15.8 6 19.5M10.8 16.6 9.6 21M14.7 12.6 19 9.5M15 14l5 .6M14.6 15.8l3.4 3.7M13.2 16.6l1.2 4.4" />
    </svg>
  );
}

function Sparkle({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M12 0c.8 7.5 4.5 11.2 12 12-7.5.8-11.2 4.5-12 12-.8-7.5-4.5-11.2-12-12C7.500 11.200 11.200 7.500 12 0Z"
      />
    </svg>
  );
}

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
        .ft-wrap {
          position: relative;
          width: 100%;
          overflow-x: clip;
        }
        .ft-section {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 1120px;
          margin: 0 auto;
          padding: 112px 24px 48px;
          font-family: var(--font-body), system-ui, sans-serif;
        }
        .ft-sky {
          position: absolute;
          z-index: 0;
          top: 40px;
          right: -90px;
          width: min(560px, 70vw);
          aspect-ratio: 800 / 440;
          background: url("/mybuddy-cloud-2.svg") center / 100% 100% no-repeat;
          opacity: 0.5;
          pointer-events: none;
        }

        .ft-head {
          position: relative;
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: end;
          gap: 24px 56px;
          margin-bottom: 56px;
        }
        .ft-title {
          margin: 0;
          display: flex;
          flex-direction: column;
          color: #ffffff;
          font-family: var(--font-display), Georgia, serif;
          font-weight: 400;
          font-size: clamp(52px, 9vw, 124px);
          line-height: 0.9;
          letter-spacing: -0.03em;
          text-shadow: 0 2px 30px rgba(20, 40, 120, 0.18);
        }
        .ft-title-2 {
          padding-left: clamp(0px, 6vw, 88px);
          font-style: italic;
          font-size: 0.82em;
          letter-spacing: -0.025em;
          color: #ffd24a;
        }
        .ft-title-2 i { font-style: normal; }
        .ft-sub {
          margin: 0;
          max-width: 28ch;
          padding-bottom: 10px;
          color: rgba(255, 255, 255, 0.9);
          font-size: clamp(16px, 1.5vw, 19px);
          line-height: 1.5;
        }
        .ft-star {
          position: absolute;
          pointer-events: none;
        }
        .ft-star.a { top: -26px; right: 36%; width: 26px; color: #ffd24a; }
        .ft-star.b { top: 34px; right: 31%; width: 13px; color: rgba(255, 255, 255, 0.85); }

        .ft-grid {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          grid-template-rows: 320px 320px 316px;
          gap: 16px;
        }
        .c-wall { grid-column: 1 / 8; grid-row: 1 / 3; }
        .c-spider { grid-column: 8 / 13; grid-row: 1; }
        .c-quick { grid-column: 8 / 13; grid-row: 2; }
        .c-cal { grid-column: 1 / 6; grid-row: 3; }
        .c-rem { grid-column: 6 / 13; grid-row: 3; }

        .ft-card {
          --line: rgba(20, 36, 107, 0.18);
          --line-2: rgba(20, 36, 107, 0.09);
          position: relative;
          display: flex;
          flex-direction: column;
          min-width: 0;
          overflow: hidden;
          border-radius: 28px;
          background: #ffffff;
          color: #14246b;
          box-shadow: 0 18px 40px rgba(10, 20, 80, 0.22);
          transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1),
            box-shadow 0.4s ease;
        }
        .ft-card::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          pointer-events: none;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);
        }
        .ft-card h3 {
          margin: 0;
          font-size: 19px;
          font-weight: 600;
          letter-spacing: -0.2px;
          line-height: 1.2;
        }
        .ft-card p {
          margin: 6px 0 0;
          color: #4a5578;
          font-size: 15px;
          line-height: 1.45;
          text-wrap: balance;
        }
        @media (hover: hover) {
          .ft-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 26px 48px rgba(10, 20, 80, 0.28);
          }
        }

        .c-quick { background: #ffd24a; --line: rgba(15, 27, 61, 0.28); --line-2: rgba(15, 27, 61, 0.14); color: #0f1b3d; }
        .c-quick p { color: rgba(15, 27, 61, 0.75); }
        .c-spider { background: #181a21; --line: rgba(255, 255, 255, 0.28); --line-2: rgba(255, 255, 255, 0.12); color: #ffffff; }
        .c-spider p { color: rgba(255, 255, 255, 0.72); }
        .c-spider::after { box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14); }
        .c-rem {
          background: linear-gradient(160deg, #1d3aa3 0%, #14246b 100%);
          --line: rgba(255, 255, 255, 0.3);
          --line-2: rgba(255, 255, 255, 0.14);
          color: #ffffff;
        }
        .c-rem p { color: rgba(255, 255, 255, 0.78); }
        .c-cal { background: #ffffff; }

        .ft-copy {
          display: flex;
          align-items: flex-start;
          gap: 18px;
          padding: 22px 26px 26px;
        }
        .ft-ring {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: none;
          width: 46px;
          height: 46px;
          margin: 4px 4px 0 4px;
          border-radius: 999px;
          border: 1px solid var(--line);
        }
        .ft-ring::before {
          content: "";
          position: absolute;
          inset: -7px;
          border-radius: 999px;
          border: 1px solid var(--line-2);
        }

        .ft-hang-vis {
          position: relative;
          flex: 1 1 auto;
          min-height: 190px;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 0 24px;
          overflow: hidden;
        }
        .ft-hang-vis img {
          position: relative;
          z-index: 2;
          display: block;
          width: 100%;
          max-width: 300px;
          height: auto;
          filter: drop-shadow(0 12px 18px rgba(10, 20, 80, 0.3));
          transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .ft-hang-vis img { transform-origin: 50% 0; }
        .ft-card:hover .ft-hang-vis img { transform: scale(1.035); }

        .c-wall .ft-hang-vis {
          min-height: 340px;
          background: linear-gradient(180deg, #7298ee 0%, #8fb0f3 58%, #c4d6fb 100%);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
        }
        .c-wall .ft-hang-vis img { max-width: 520px; }
        .ft-sun {
          position: absolute;
          z-index: 1;
          right: 9%;
          bottom: 22%;
          width: 108px;
          height: 108px;
          border-radius: 50%;
          background: radial-gradient(circle at 38% 34%, #ffe892, #ffd24a 70%);
          box-shadow:
            0 0 0 14px rgba(255, 255, 255, 0.22),
            0 0 0 30px rgba(255, 255, 255, 0.1),
            0 0 44px rgba(255, 226, 140, 0.65);
        }
        .ft-wall-cloud {
          position: absolute;
          z-index: 1;
          left: -60px;
          bottom: -46px;
          width: 440px;
          aspect-ratio: 800 / 440;
          background: url("/mybuddy-cloud-2.svg") center / 100% 100% no-repeat;
        }
        .ft-wall-cloud.two {
          left: auto;
          right: -80px;
          bottom: -70px;
          width: 380px;
          opacity: 0.9;
        }

        .c-quick .ft-hang-vis {
          background:
            radial-gradient(60% 70% at 50% 0%, rgba(255, 255, 255, 0.6), transparent 70%);
        }
        .ft-dash {
          position: absolute;
          z-index: 1;
          right: 18px;
          bottom: 10px;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          border: 1.5px dashed rgba(15, 27, 61, 0.28);
        }

        .ft-desk {
          position: relative;
          flex: 1 1 auto;
          min-height: 214px;
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
        .ft-toggle:focus-visible { outline: 2px solid #ffd24a; outline-offset: 2px; }
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

        .ft-split {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        .ft-split .ft-copy { padding-bottom: 0; }
        .ft-frame {
          position: relative;
          flex: 1;
          min-height: 0;
          margin: 22px 0 0 24px;
          padding: 30px 0 0 16px;
          border-left: 1px solid rgba(20, 36, 107, 0.16);
          border-top: 1px solid rgba(20, 36, 107, 0.16);
          border-top-left-radius: 16px;
          background: #eef2ff;
          overflow: hidden;
        }
        .c-rem .ft-frame {
          border-color: rgba(255, 255, 255, 0.22);
          background: rgba(255, 255, 255, 0.08);
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
        .c-rem .ft-dots i { border-color: rgba(255, 255, 255, 0.35); }
        .ft-frame img {
          display: block;
          width: 100%;
          max-width: none;
          height: auto;
          border-top-left-radius: 14px;
          box-shadow: 0 10px 24px rgba(10, 20, 80, 0.25);
          transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .c-cal .ft-frame img { width: 100%; }
        .ft-card:hover .ft-frame img { transform: translateY(-3px); }

        @media (max-width: 960px) {
          .ft-section { padding-top: 88px; }
          .ft-head { grid-template-columns: 1fr; margin-bottom: 40px; }
          .ft-sub { max-width: 36ch; padding-bottom: 0; }
          .ft-star.a { right: 12%; }
          .ft-star.b { right: 8%; }
          .ft-grid {
            grid-template-columns: 1fr 1fr;
            grid-template-rows: none;
            grid-auto-rows: auto;
          }
          .c-wall, .c-cal, .c-rem { grid-column: 1 / -1; grid-row: auto; }
          .c-spider, .c-quick { grid-column: auto; grid-row: auto; }
          .c-wall .ft-hang-vis { min-height: 380px; }
          .ft-desk { flex: none; height: 226px; }
          .ft-hang-vis { min-height: 220px; }
          .ft-frame { flex: none; }
        }

        @media (max-width: 640px) {
          .ft-section { padding: 72px 18px 32px; }
          .ft-grid { grid-template-columns: 1fr; gap: 14px; }
          .c-spider, .c-quick { grid-column: auto; }
          .ft-card { border-radius: 24px; }
          .ft-copy { padding: 20px 20px 24px; gap: 14px; }
          .c-wall .ft-hang-vis { min-height: 300px; padding: 0 16px; }
          .ft-sun { width: 76px; height: 76px; right: 6%; bottom: 20%; }
          .ft-wall-cloud { width: 320px; }
          .ft-wall-cloud.two { width: 280px; }
          .ft-frame { margin-left: 18px; padding-left: 12px; }
          .ft-star.a { right: 6%; top: -30px; }
          .ft-star.b { display: none; }
        }

        @media (prefers-reduced-motion: reduce) {
          .ft-card,
          .ft-hang-vis img,
          .ft-frame img,
          .ft-drop,
          .ft-switch,
          .ft-switch::after { transition: none !important; }
          .ft-card:hover,
          .ft-card:hover .ft-hang-vis img,
          .ft-card:hover .ft-frame img { transform: none; }
          .ft-card:hover .ft-drop.out .ft-spider { animation: none; }
        }
      `}</style>

      <div className="ft-wrap">
        <div className="ft-sky" aria-hidden="true" />
        <section className="ft-section" id="features" aria-labelledby="ft-title">
          <header className="ft-head">
            <Sparkle className="ft-star a" />
            <Sparkle className="ft-star b" />
            <h2 className="ft-title" id="ft-title">
              <span>Your desktop,</span>
              <span className="ft-title-2">
                made yours<i>.</i>
              </span>
            </h2>
            <p className="ft-sub">
              A friendly Notch with a few everyday tools, always one glance away.
            </p>
          </header>

          <div className="ft-grid">
            <article className="ft-card c-wall">
              <div className="ft-hang-vis">
                <span className="ft-sun" aria-hidden="true" />
                <span className="ft-wall-cloud" aria-hidden="true" />
                <span className="ft-wall-cloud two" aria-hidden="true" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/features/wallpaper.png"
                  alt="MyBuddy settings panel with a Change photo button and a wallpaper preview"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="ft-copy">
                <div className="ft-ring">
                  <ImageIcon size={20} strokeWidth={1.4} aria-hidden="true" />
                </div>
                <div>
                  <h3>Your wallpaper, in your Notch</h3>
                  <p>Pick a photo and make your desktop feel like your own.</p>
                </div>
              </div>
            </article>

            <article className="ft-card c-spider">
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
              <div className="ft-copy">
                <div className="ft-ring">
                  <SpiderIcon />
                </div>
                <div>
                  <h3>A friendly spider</h3>
                  <p>Hangs from your Notch, in a mood that suits you.</p>
                </div>
              </div>
            </article>

            <article className="ft-card c-quick">
              <div className="ft-hang-vis">
                <span className="ft-dash" aria-hidden="true" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/features/quick-actions.png"
                  alt="MyBuddy Quick Actions panel with a search box and a list of actions"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="ft-copy">
                <div className="ft-ring">
                  <Command size={20} strokeWidth={1.4} aria-hidden="true" />
                </div>
                <div>
                  <h3>Quick actions</h3>
                  <p>Open what you need without leaving what you’re doing.</p>
                </div>
              </div>
            </article>

            <article className="ft-card c-cal">
              <div className="ft-split">
                <div className="ft-copy">
                  <div className="ft-ring">
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

            <article className="ft-card c-rem">
              <div className="ft-split">
                <div className="ft-copy">
                  <div className="ft-ring">
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
      </div>
    </>
  );
}