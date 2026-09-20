export type CompanionEventType =
  | "battery"
  | "notification"
  | "download"
  | "music"
  | "meeting"
  | "focus";

export type CompanionEvent = {
  id: string;
  type: CompanionEventType;
  title: string;
  message: string;
  priority: number;
};
