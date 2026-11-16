"use client";

import { useState, type FormEvent } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";

export default function Feedback() {
  const [rating, setRating] = useState(0);
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileKey, setTurnstileKey] = useState(0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setStatus("");

    const form = event.currentTarget;
    const values = new FormData(form);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.get("name"),
          email: values.get("email"),
          rating,
          message: values.get("message"),
          turnstileToken,
        }),
      });

      const result: { error?: unknown; success?: unknown } = await response
        .json()
        .catch(() => ({}));

      if (!response.ok || result.success !== true) {
        setStatus(
          typeof result.error === "string"
            ? result.error
            : "Could not send feedback. Please try again.",
        );
        setTurnstileToken("");
        setTurnstileKey((key) => key + 1);
        return;
      }

      setStatus("Thanks, your feedback was sent.");
      form.reset();
      setRating(0);
      setTurnstileToken("");
      setTurnstileKey((key) => key + 1);
    } catch {
      setStatus("Could not send feedback. Please try again.");
      setTurnstileToken("");
      setTurnstileKey((key) => key + 1);
    } finally {
      setSending(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger className="cursor-pointer rounded-sm text-left text-white/90 transition-colors hover:text-[#ffd24a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffd24a]">
        Report a problem
      </DrawerTrigger>

      <DrawerContent className="max-h-[90dvh] overflow-y-auto border-white/15 bg-[#3f68d6] text-white">
        <div className="mx-auto w-full max-w-lg px-5 pb-6">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle className="text-2xl font-semibold">
              Help us improve MyBuddy
            </DrawerTitle>
            <DrawerDescription className="text-white/80">
              Tell us what happened. Add your email if you’d like us to follow
              up.
            </DrawerDescription>
          </DrawerHeader>

          <form onSubmit={handleSubmit} className="mt-5 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="feedback-name">Name (optional)</Label>
              <Input
                id="feedback-name"
                name="name"
                autoComplete="name"
                maxLength={100}
                placeholder="Your name"
                className="border-white/25 bg-white text-slate-900 placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-email">Email (optional)</Label>
              <Input
                id="feedback-email"
                name="email"
                type="email"
                autoComplete="email"
                maxLength={254}
                placeholder="you@example.com"
                className="border-white/25 bg-white text-slate-900 placeholder:text-slate-500"
              />
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Rating (optional)</legend>
              <div
                className="flex gap-1"
                role="group"
                aria-label="Rate your experience"
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    aria-label={`${value} star${value === 1 ? "" : "s"}`}
                    aria-pressed={rating === value}
                    className="rounded p-1 text-[#ffd24a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        rating >= value ? "fill-[#ffd24a]" : ""
                      }`}
                    />
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="space-y-2">
              <Label htmlFor="feedback-message">What happened?</Label>
              <Textarea
                id="feedback-message"
                name="message"
                required
                minLength={5}
                maxLength={2000}
                placeholder="Describe the problem or share your idea..."
                className="min-h-32 border-white/25 bg-white text-slate-900 placeholder:text-slate-500"
              />
            </div>

            <div className="flex justify-center">
              <Turnstile
                key={turnstileKey}
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                onSuccess={(token) => setTurnstileToken(token)}
                onExpire={() => setTurnstileToken("")}
                onError={() => setTurnstileToken("")}
              />
            </div>

            <p className="text-sm text-white/80" aria-live="polite">
              {status}
            </p>

            <DrawerFooter className="flex flex-col gap-3 px-0 sm:flex-row">
              <Button
                type="submit"
                disabled={sending || !turnstileToken}
                className="w-full bg-[#ffd24a] font-semibold text-[#17254d] hover:bg-[#ffe078]"
              >
                {sending ? "Sending..." : "Submit feedback"}
              </Button>
              <Button
                type="button"
                className="w-full border border-white bg-[#2449aa] text-white hover:bg-[#1d3d92] sm:flex-1"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
            </DrawerFooter>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
