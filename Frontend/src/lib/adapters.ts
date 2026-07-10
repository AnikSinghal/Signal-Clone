import type {
  BackendConversation,
  BackendMessage,
  BackendUser,
} from "./backend";

export type UIUser = {
  id: string;
  name: string;
  avatarColor: string;
  initials: string;
  online: boolean;
  avatarUrl?: string | null;
  lastSeen?: string;
  phone?: string;
  about?: string;
};

export type UIReaction = { emoji: string; count: number; byMe?: boolean };

export type UIAttachment = {
  id: string;
  url: string;
  mimeType: string;
  fileName: string;
  fileSize: number;
};

export type UIMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: Date;
  status: "sent" | "delivered" | "read";
  reactions?: UIReaction[];
  replyToId?: string;
  replyToContent?: string;
  replyToSender?: { id: number; name: string; username: string };
  edited?: boolean;
  attachments?: UIAttachment[];
  expiresAt?: Date;
};

export type UIConversation = {
  id: string;
  type: "dm" | "group";
  name: string;
  participantIds: string[];
  avatarColor: string;
  initials: string;
  avatarUrl?: string | null;
  lastMessage: string;
  lastMessageAt: Date;
  unread: number;
  pinned?: boolean;
  archived?: boolean;
  typing?: boolean;
  muted?: boolean;
  disappearingDuration?: number;
};

export function toUIUser(user: BackendUser): UIUser {
  return {
    id: String(user.id),
    name: user.name ?? `${user.username}`,
    avatarColor: user.avatar_color || "#999999",
    initials: user.initials ?? initialsFromName(user.name ?? user.username),
    online: Boolean(user.profile?.is_online),
    avatarUrl: user.profile?.avatar ?? undefined,
    lastSeen: user.profile?.last_seen ?? undefined,
    phone: user.phone || undefined,
    about: user.about || user.profile?.bio || undefined,
  };
}

export function toUIMessage(
  message: BackendMessage,
  participantIds?: string[],
  currentUserId?: string,
): UIMessage {
  const readReceiptUserIds = new Set(message.read_receipts.map((r) => String(r.user)));
  let status: UIMessage["status"] = "sent";

  if (participantIds && currentUserId) {
    const otherIds = participantIds.filter((id) => id !== currentUserId && id !== String(message.sender.id));
    if (otherIds.length > 0) {
      const allRead = otherIds.every((id) => readReceiptUserIds.has(id));
      const someRead = otherIds.some((id) => readReceiptUserIds.has(id));
      if (allRead) status = "read";
      else if (someRead) status = "delivered";
    } else {
      status = readReceiptUserIds.size > 0 ? "read" : "sent";
    }
  } else {
    status = readReceiptUserIds.size > 0 ? "read" : "sent";
  }

  const attachments = message.attachments?.map((a) => ({
    id: a.id,
    url: a.file,
    mimeType: a.mime_type,
    fileName: a.file_name,
    fileSize: a.file_size,
  }));

  return {
    id: message.id,
    conversationId: message.conversation,
    senderId: String(message.sender.id),
    content: message.content,
    timestamp: new Date(message.created_at),
    status,
    replyToId: message.reply_to_id ?? undefined,
    replyToContent: (message as any).reply_to_content ?? undefined,
    replyToSender: (message as any).reply_to_sender ?? undefined,
    edited: Boolean(message.edited_at),
    reactions: aggregateReactions(message.reactions),
    attachments: attachments?.length ? attachments : undefined,
    expiresAt: (message as any).expires_at ? new Date((message as any).expires_at) : undefined,
  };
}

export function toUIConversation(conversation: BackendConversation, currentUserId?: string): UIConversation {
  const members = conversation.members.map((member) => String(member.user.id));
  const counterpart = conversation.members.find((member) => String(member.user.id) !== currentUserId);
  return {
    id: conversation.id,
    type: conversation.conversation_type,
    name: conversation.display_title || conversation.title,
    participantIds: members,
    avatarColor: counterpart?.user.avatar_color || "#3A76F0",
    initials: initialsFromName(conversation.display_title || conversation.title),
    avatarUrl: counterpart?.user.profile?.avatar ?? undefined,
    lastMessage: conversation.last_message?.content || "",
    lastMessageAt: new Date(conversation.last_message_at || conversation.created_at),
    unread: conversation.members.find((member) => String(member.user.id) === currentUserId)?.unread_count || 0,
    pinned: conversation.members.find((member) => String(member.user.id) === currentUserId)?.is_pinned || false,
    archived: conversation.members.find((member) => String(member.user.id) === currentUserId)?.is_archived || false,
    muted: conversation.is_muted,
    disappearingDuration: (conversation as any).disappearing_duration ?? 0,
    typing: false,
  };
}

function aggregateReactions(reactions: BackendMessage["reactions"]): UIReaction[] | undefined {
  if (!reactions?.length) return undefined;
  const map = new Map<string, UIReaction>();
  for (const reaction of reactions) {
    const existing = map.get(reaction.emoji);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(reaction.emoji, { emoji: reaction.emoji, count: 1, byMe: false });
    }
  }
  return Array.from(map.values());
}

function initialsFromName(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (!parts.length) return "??";
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
