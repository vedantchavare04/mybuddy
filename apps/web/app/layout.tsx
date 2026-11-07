import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyBuddy — A calmer way to keep it together",
  description:
    "Meet MyBuddy, a thoughtful Windows desktop companion for reminders, promises, and the little things that matter.",
  applicationName: "MyBuddy",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
