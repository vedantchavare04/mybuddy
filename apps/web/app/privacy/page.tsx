import type { Metadata } from "next";
import Link from "next/link";
import { Figtree, Instrument_Serif } from "next/font/google";
import { ArrowLeft, CalendarDays, Check, KeyRound, ShieldCheck, X } from "lucide-react";
import Footer from "../../components/footer";
import styles from "./privacy.module.css";

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-display",
});
const body = Figtree({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Privacy Policy · MyBuddy",
  description:
    "How MyBuddy handles your Google Calendar data. It only views and schedules events, and your data stays on your device.",
};

const ISSUES_URL = "https://github.com/vedantchavare04/myBuddy-releases/issues";

const glance = [
  {
    icon: CalendarDays,
    title: "Only schedules",
    text: "MyBuddy shows your upcoming events and creates new ones. Nothing more.",
  },
  {
    icon: ShieldCheck,
    title: "Stays on your device",
    text: "Your calendar data goes between your computer and Google. It never reaches a MyBuddy server.",
  },
  {
    icon: KeyRound,
    title: "No passwords",
    text: "You sign in on Google’s own page. MyBuddy never sees your password.",
  },
];

const does = [
  "Shows your upcoming events (the next 7 days) inside the Notch.",
  "Creates an event when you press Create in the New event panel.",
  "Sends invitation emails through Google if you add attendees.",
];

const doesNot = [
  "Edit, move or delete your existing events.",
  "Read your emails, contacts, files or any other Google data.",
  "Send your calendar data to MyBuddy, advertisers or anyone else.",
  "Use your calendar data for ads, analytics, profiling or AI training.",
  "Keep a copy of your events on a server.",
];

export default function PrivacyPage() {
  return (
    <main className={`${styles.page} ${display.variable} ${body.variable}`}>
      <div className={styles.sky} aria-hidden="true" />

      <div className={styles.wrap}>
        <Link className={styles.back} href="/">
          <ArrowLeft size={15} strokeWidth={2.2} aria-hidden="true" />
          Back to MyBuddy
        </Link>

        <header className={styles.head}>
          <h1>
            Privacy,
            <span> kept simple.</span>
          </h1>
          <p className={styles.lede}>
            This page explains what MyBuddy does with your Google Calendar data.
            Short version: it shows your events and schedules new ones, and that
            is all.
          </p>
          <p className={styles.updated}>Last updated 21 November 2026</p>
        </header>

        <ul className={styles.glance}>
          {glance.map(({ icon: Icon, title, text }) => (
            <li key={title} className={styles.glanceCard}>
              <span className={styles.glanceIcon}>
                <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
              </span>
              <strong>{title}</strong>
              <p>{text}</p>
            </li>
          ))}
        </ul>

        <article className={styles.doc}>
          <section>
            <h2>What MyBuddy can access</h2>
            <p>
              If you choose to connect Google Calendar, MyBuddy asks for one
              permission: <em>See and edit events on all your calendars</em>{" "}
              (the <code>calendar.events</code> scope). MyBuddy uses it only to
              view and create events on your primary calendar.
            </p>
            <p>
              For each upcoming event, the app reads the title, start and end
              time, whether it lasts all day, and the location if there is one.
              That is what it needs to show your schedule in the Notch.
            </p>
          </section>

          <section>
            <h2>What it does, and what it doesn’t</h2>
            <div className={styles.split}>
              <div className={styles.yes}>
                <h3>MyBuddy does</h3>
                <ul>
                  {does.map((t) => (
                    <li key={t}>
                      <Check size={15} strokeWidth={2.6} aria-hidden="true" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={styles.no}>
                <h3>MyBuddy doesn’t</h3>
                <ul>
                  {doesNot.map((t) => (
                    <li key={t}>
                      <X size={15} strokeWidth={2.6} aria-hidden="true" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2>How sign-in works</h2>
            <p>
              Sign-in happens in your normal web browser on Google’s own page,
              using Google’s standard OAuth 2.0 flow with PKCE. When you finish,
              Google sends a one-time code back to a temporary address on your
              own computer. MyBuddy never sees or stores your Google password.
            </p>
          </section>

          <section>
            <h2>Where your data lives</h2>
            <ul className={styles.plain}>
              <li>
                <strong>Refresh token.</strong> The only thing MyBuddy keeps is
                a refresh token, stored in Windows Credential Manager on your
                computer. It lets the app stay connected without asking you to
                sign in again.
              </li>
              <li>
                <strong>Access token.</strong> Kept in memory only while the app
                runs and discarded when it closes. It is never passed to the
                app’s interface.
              </li>
              <li>
                <strong>Your events.</strong> Fetched from Google when needed
                and shown on your screen. MyBuddy has no server that receives
                them.
              </li>
            </ul>
          </section>

          <section>
            <h2>Sharing</h2>
            <p>
              MyBuddy doesn’t sell, rent or share your Google user data. The
              only party it talks to about your calendar is Google. If you add
              attendees to a new event, their email addresses are sent to Google
              Calendar so it can email them an invitation. You choose those
              addresses each time.
            </p>
          </section>

          <section>
            <h2>Your control</h2>
            <ul className={styles.plain}>
              <li>
                <strong>Disconnect in MyBuddy.</strong> Disconnecting revokes
                the token with Google and deletes it from your computer.
              </li>
              <li>
                <strong>Revoke from Google.</strong> You can remove MyBuddy’s
                access at any time at{" "}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noreferrer"
                >
                  myaccount.google.com/permissions
                </a>
                . The app will then ask you to reconnect before using your
                calendar again.
              </li>
              <li>
                <strong>Uninstall.</strong> Removing the app stops all access.
                Revoke access from Google as well if you want the permission
                gone from your account.
              </li>
            </ul>
          </section>

          <section>
            <h2>Google API Services User Data Policy</h2>
            <p>
              MyBuddy’s use and transfer to any other app of information
              received from Google APIs will adhere to the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noreferrer"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
          </section>

          <section>
            <h2>Changes and questions</h2>
            <p>
              If this policy changes, the date at the top of this page changes
              too. Questions or concerns? Open an issue on{" "}
              <a href={ISSUES_URL} target="_blank" rel="noreferrer">
                GitHub
              </a>
              .
            </p>
          </section>
        </article>
      </div>

      <Footer />
    </main>
  );
}