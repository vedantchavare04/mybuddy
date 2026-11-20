"use client";

/**
 * MyBuddy · Glossy Slider Download Button
 * ────────────────────────────────────────
 * A deep-navy pill with a yellow slider that expands on hover, swapping a
 * dotted arrow for a download icon while the label fades away.
 *
 * Zero JS, zero deps. Single file: styles live in the <style> tag below.
 *
 * Usage:
 *   <DownloadButton href={DOWNLOAD_URL} />
 *   <DownloadButton href={DOWNLOAD_URL} label="Download for Windows" />
 */

type Props = { href: string; label?: string };

export default function DownloadButton({
  href,
  label = "Download for Windows",
}: Props) {
  return (
    <>
      <style>{`
        .dl-btn {
          position: relative;
          isolation: isolate;
          display: flex;
          align-items: center;
          width: 253px;
          height: 52px;
          background: linear-gradient(180deg, #1a2d80 0%, #0f1b52 55%, #0b1640 100%);
          border: 1px solid rgba(140, 170, 255, 0.45);
          border-radius: 999px;
          overflow: hidden;
          text-decoration: none;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          font-family: inherit;
          box-shadow:
            inset 0 1px 0    rgba(255, 255, 255, 0.35),
            inset 0 3px 6px  rgba(0, 0, 0, 0.55),
            inset 0 -6px 12px rgba(63, 107, 219, 0.25),
            0 12px 24px      rgba(10, 20, 80, 0.35);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        /* soft glass sheen across the top half */
        .dl-btn::before {
          content: "";
          position: absolute;
          inset: 1px 12px 50% 12px;
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0));
          pointer-events: none;
          z-index: 3;
        }
        .dl-btn:hover {
          transform: translateY(-2px);
          box-shadow:
            inset 0 1px 0    rgba(255, 255, 255, 0.4),
            inset 0 3px 6px  rgba(0, 0, 0, 0.55),
            inset 0 -6px 12px rgba(63, 107, 219, 0.3),
            0 18px 32px      rgba(10, 20, 80, 0.42);
        }
        .dl-btn:active { transform: translateY(0); }
        .dl-btn:focus-visible {
          outline: 3px solid #ffffff;
          outline-offset: 3px;
        }
                .dl-btn:focus-visible {
                  outline: 3px solid #ffffff;
                  outline-offset: 3px;
                }

        .dl-btn .slider {
          position: absolute;
          left: 4px; top: 4px; bottom: 4px;
          width: 64px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 999px;
          background:
            radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.65), transparent 50%),
            linear-gradient(180deg, #ffe27a 0%, #ffd24a 55%, #fbbf24 100%);
          z-index: 2;
          transition: width 0.65s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.4s ease;
          box-shadow:
            inset 0  2px 3px rgba(255, 255, 255, 0.75),
            inset 0 -3px 5px rgba(0, 0, 0, 0.16),
            0 0 14px          rgba(255, 210, 74, 0.5),
            0 4px 10px        rgba(0, 0, 0, 0.3);
        }
        .dl-btn:hover .slider,
        .dl-btn:focus-visible .slider {
          width: calc(100% - 8px);
          box-shadow:
            inset 0  2px 3px rgba(255, 255, 255, 0.75),
            inset 0 -3px 5px rgba(0, 0, 0, 0.16),
            0 0 20px          rgba(255, 210, 74, 0.7),
            0 4px 10px        rgba(0, 0, 0, 0.3);
        }

        .dl-btn .icon-arrow {
          position: absolute;
          width: 24px; height: 24px;
          color: #1a1a1a;
          opacity: 1;
          transform: translateX(0);
          transition: opacity 0.40s ease, transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .dl-btn:hover .icon-arrow,
        .dl-btn:focus-visible .icon-arrow {
          opacity: 0;
          transform: translateX(40px);
        }

        .dl-btn .icon-download {
          position: absolute;
          width: 21px; height: 21px;
          color: #1a1a1a;
          opacity: 0;
          transform: translateX(-40px) scale(0.7);
          transition: opacity 0.45s ease 0.10s, transform 0.60s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .dl-btn:hover .icon-download,
        .dl-btn:focus-visible .icon-download {
          opacity: 1;
          transform: translateX(0) scale(1);
        }

        .dl-btn .text {
          position: absolute;
          left: 83px;
          color: #ffffff;
          font-size: 15px;
          font-weight: 500;
          letter-spacing: -0.2px;
          white-space: nowrap;
          z-index: 1;
          transition: opacity 0.35s ease, transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .dl-btn:hover .text,
        .dl-btn:focus-visible .text {
          opacity: 0;
          transform: translateX(-15px);
        }

        @media (prefers-reduced-motion: reduce) {
          .dl-btn *, .dl-btn .slider { transition: none !important; }
        }
      `}</style>

      <a className="dl-btn" href={href}>
        <span className="slider">
          {/* Dotted right-arrow (rest state) */}
          <svg
            className="icon-arrow"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            {/* Shaft */}
            <circle cx="6" cy="12" r="1.5" />
            <circle cx="10" cy="12" r="1.5" />
            <circle cx="14" cy="12" r="1.5" />
            <circle cx="18" cy="12" r="1.5" />
            {/* Top wing */}
            <circle cx="14" cy="8" r="1.5" />
            <circle cx="10" cy="4" r="1.5" />
            {/* Bottom wing */}
            <circle cx="14" cy="16" r="1.5" />
            <circle cx="10" cy="20" r="1.5" />
          </svg>

          {/* Download icon (hover state) */}
          <svg
            className="icon-download"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 3v12" />
            <path d="m7 10 5 5 5-5" />
            <path d="M5 21h14" />
          </svg>
        </span>
        <span className="text">{label}</span>
      </a>
    </>
  );
}
