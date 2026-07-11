export const MAX_FILES_PER_MESSAGE = 5;
export const ACCEPTED_FILE_TYPES = "image/*,video/*,audio/*,.pdf,.doc,.docx,.txt";

export const DISAPPEARING_DURATIONS = [
  { value: 0, label: "Off" },
  { value: 30, label: "30 Seconds" },
  { value: 300, label: "5 Minutes" },
  { value: 3600, label: "1 Hour" },
  { value: 86400, label: "1 Day" },
] as const;
