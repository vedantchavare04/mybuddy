import type { CompanionEvent } from "./eventTypes";

export const lowBatteryEvent: CompanionEvent = {
  id: "battery-1",
  type: "battery",
  title: "Battery is getting low",
  message: "You're at 18%. Maybe plug in your charger.",
  priority: 8,
};

export const meetingEvent: CompanionEvent = {
  id: "meeting-1",
  type: "meeting",
  title: "Meeting soon",
  message: "Your meeting starts in 10 minutes.",
  priority: 10,
};

export const downloadEvent: CompanionEvent = {
  id: "download-1",
  type: "download",
  title: "Download finished",
  message: "Your download is ready.",
  priority: 4,
};

export const musicEvent: CompanionEvent = {
  id: "music-1",
  type: "music",
  title: "Music changed",
  message: "Now playing your latest track.",
  priority: 2,
};