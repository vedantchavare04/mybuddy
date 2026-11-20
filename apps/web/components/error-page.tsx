"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ErrorPageProps {
  reset: () => void;
}

export function ErrorPage({ reset }: ErrorPageProps) {
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    const recoveryKey = "mybuddy:error-home-redirect";
    let lastRedirect = 0;
    try {
      lastRedirect = Number(sessionStorage.getItem(recoveryKey));
    } catch {
      // Redirect even when browser storage is unavailable.
    }

    if (lastRedirect && Date.now() - lastRedirect < 10_000) {
      setShowFallback(true);
      return;
    }

    try {
      sessionStorage.setItem(recoveryKey, String(Date.now()));
    } catch {
      // The fallback below still works without a loop guard in this browser.
    }
    window.location.replace("/");
  }, []);

  if (!showFallback) return null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-16 text-center text-foreground">
      <h1 className="text-2xl font-semibold">MyBuddy couldn’t load this page.</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Please try again in a moment, or return to the home page.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-[#ffd24a] px-5 py-3 font-semibold text-[#17254d]"
        >
          Try again
        </button>
        <Link href="/" className="rounded-lg border border-border px-5 py-3">
          Home
        </Link>
      </div>
    </main>
  );
}
