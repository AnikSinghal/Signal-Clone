import { formatDistanceToNowStrict, format, isToday, isYesterday, differenceInDays } from "date-fns";

export function formatConversationTime(d: Date) {
  if (isToday(d)) {
    const mins = Math.floor((Date.now() - d.getTime()) / 60_000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    return format(d, "h:mm a");
  }
  if (isYesterday(d)) return "Yesterday";
  if (differenceInDays(new Date(), d) < 7) return format(d, "EEE");
  return format(d, "MMM d");
}

export function formatMessageTime(d: Date) {
  return format(d, "h:mm a");
}

export function formatDayDivider(d: Date) {
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, MMMM d");
}

export { formatDistanceToNowStrict };
