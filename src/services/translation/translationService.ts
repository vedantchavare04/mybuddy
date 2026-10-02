/*
 * src/services/translation/translationService.ts
 *
 * TranslationService.translate(text, source, target). UI components never
 * know which provider is behind it, and no API keys exist in the frontend.
 * The provider is resolved in Rust (translate.rs). To add one, add a branch
 * there and change PROVIDER here.
 */

import { call } from "../tauri";

const PROVIDER = "mymemory";

export const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi" },
  { code: "mr", name: "Marathi" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" },
  { code: "bn", name: "Bengali" },
  { code: "gu", name: "Gujarati" },
  { code: "kn", name: "Kannada" },
  { code: "ml", name: "Malayalam" },
  { code: "pa", name: "Punjabi" },
  { code: "ur", name: "Urdu" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh-CN", name: "Chinese (Simplified)" },
  { code: "ar", name: "Arabic" },
] as const;

export type Translation = { text: string; detected?: string | null };

const ERRORS: Record<string, string> = {
  offline: "You're offline. Check your connection and try again.",
  too_long: "That's too long to translate in one go.",
  rate_limited: "The translation service is busy. Try again in a moment.",
  provider_error: "The translation service didn't respond. Try again.",
  unknown_provider: "No translation provider is configured.",
  unavailable: "Translation works in the MyBuddy desktop app.",
};

export const translateError = (code: string) =>
  ERRORS[code] ?? "Couldn't translate that. Try again.";

export const translationService = {
  translate(text: string, source: string, target: string): Promise<Translation> {
    return call<Translation>("translate", {
      text,
      source,
      target,
      provider: PROVIDER,
    });
  },
};