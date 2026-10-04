export type CompanionEventType =
  | "battery"
  | "notification"
  | "download"
  | "music"
  | "meeting"
  | "focus"
  | "reminder";

export type CompanionEvent = {
  id: string;
  type: CompanionEventType;
  title: string;
  message: string;
  priority: number;
};

