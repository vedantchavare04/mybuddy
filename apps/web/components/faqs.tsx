
"use client";

import { FaqDrawer, type FaqCard } from "@/components/ui/faq-drawer";

const FAQ_CARDS: FaqCard[] = [
  {
    id: "what",
    tab: "About",
    q: "What is MyBuddy?",
    a: "MyBuddy is a Windows desktop companion with a customizable Notch and a friendly spider. It brings useful tools into your day: Google Calendar, AI help for quick questions, on-the-go translation, text-to-speech, reminders, notifications, and more. Its custom wallpaper helps make your desktop feel like yours.",
  },
  {
    id: "help",
    tab: "Features",
    q: "What can MyBuddy help me do?",
    a: "Use Quick Actions for everyday tasks, ask AI quick questions, translate text on the go, listen to text with text-to-speech, and keep up with your calendar, reminders, and notifications—all from MyBuddy.",
  },
  {
    id: "remember",
    tab: "Memory",
    q: "How does MyBuddy help me remember things and pick up where I left off?",
    a: "Memory Vault keeps useful links and information close at hand. Context Saver helps you save your place, while Flow Rescue helps you resume after an interruption. Explain This Later can save a question for later, and Promise Keeper helps track follow-ups.",
  },
  {
    id: "personalize",
    tab: "Wallpaper",
    q: "Can I personalize my wallpaper and Notch?",
    a: "Yes. Customizable wallpaper is a key part of MyBuddy. You can personalize the Notch and change your spider’s appearance or mood, too.",
  },
  {
    id: "calendar",
    tab: "Calendar",
    q: "Does MyBuddy connect to Google Calendar?",
    a: "Yes. MyBuddy connects to Google Calendar so you can keep your calendar close at hand.",
  },
  {
    id: "privacy",
    tab: "Privacy",
    q: "Does MyBuddy collect my data or photos?",
    a: "No. MyBuddy does not collect your personal data or photos. Saved information stays in local storage on your laptop. MyBuddy is open source, so you can view its source code on GitHub.",
    linkLabel: "View source code on GitHub",
    linkHref: "https://github.com/vedantchavare04/mybuddy",
  },
  {
    id: "free",
    tab: "Pricing",
    q: "Is MyBuddy free?",
    a: "Yes. MyBuddy is currently free.",
  },
];

export default function FaqsSection() {
  return (
    <FaqDrawer
      label="A LITTLE HELP"
      title="Answers before you ask."
      lead="The things you might want to know before bringing MyBuddy to your desktop."
      drawer="MyBuddy · FAQ"
      cards={FAQ_CARDS}
      count={7}
      open="none"
      single
      finish="aluminium"
      askNote="Still have a question? Explore the project and join us on GitHub."
      askLabel="Visit GitHub ↗"
      askHref="https://github.com/vedantchavare04/mybuddy"
    />
  );
}
