import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL("https://mybuddy.vedant-chavare.xyz"),
  title: "MyBuddy — Your desktop, made more personal",
  description:
    "MyBuddy is a Windows desktop companion for personalizing your desktop, using everyday tools, and keeping gentle reminders close.",
  applicationName: "MyBuddy",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "MyBuddy — Your desktop, made more personal",
    description:
      "Personalize your Windows desktop with wallpapers, quick actions, gentle reminders, and more.",
    url: "https://mybuddy.vedant-chavare.xyz",
    siteName: "MyBuddy",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("h-full antialiased", "font-sans", geist.variable)}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
