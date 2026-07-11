import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { Video, Phone, Search, MoreVertical, Paperclip, Smile, Mic, Send, Check, CheckCheck, Reply, Trash2, SmilePlus, Users, X, FileText, Image as ImageIcon, Film, Download, Hourglass } from "lucide-react";
import { Avatar } from "./Avatar";
import type { UIConversation, UIMessage, UIUser, UIAttachment } from "@/lib/adapters";
import { formatMessageTime, formatDayDivider } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MAX_FILES_PER_MESSAGE, ACCEPTED_FILE_TYPES, DISAPPEARING_DURATIONS } from "@/lib/constants";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useChatWebSocket } from "@/hooks/useChatWebSocket";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🎉", "🔥"];

type ChatWindowProps = {
  conversation: UIConversation;
  messages: UIMessage[];
  currentUserId: string;
  getUser: (id: string) => UIUser;
  onBack?: () => void;
  onSendMessage: (content: string, files?: File[], replyTo?: string | null) => Promise<UIMessage | null>;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onReactMessage: (messageId: string, emoji: string) => Promise<void>;
  onTypingChange?: (isTyping: boolean) => Promise<void>;
  onMarkRead?: () => Promise<void>;
  onRefreshConversations?: () => void;
  onOpenGroupMembers?: () => void;
  onArchive?: () => Promise<void>;
  onSetDisappearing?: (duration: number) => Promise<void>;
  onComposerFocusChange?: (focused: boolean) => void;
};

export function ChatWindow({
  conversation,
  messages,
  currentUserId,
  getUser,
  onBack,
  onSendMessage,
  onDeleteMessage,
  onReactMessage,
  onTypingChange,
  onMarkRead,
  onRefreshConversations,
  onOpenGroupMembers,
  onArchive,
  onSetDisappearing,
  onComposerFocusChange,
}: ChatWindowProps) {
  const [localMessages, setLocalMessages] = useState<UIMessage[]>(() => messages);
  const [draft, setDraft] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [replyToMsg, setReplyToMsg] = useState<UIMessage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleWsMessage = useRef((msg: UIMessage) => {
    setLocalMessages((prev) => {
      const already = prev.some((m) => m.id === msg.id);
      if (already) return prev;
      return [...prev, msg];
    });
    if (msg.senderId !== currentUserId) {
      onMarkRead?.().catch(() => undefined);
    }
  }).current;

  const handleRefresh = useRef(() => {
    onRefreshConversations?.();
  }).current;

  useEffect(() => {
    const handleSearchEvent = () => setShowSearch((v) => !v);
    window.addEventListener("signal:toggle-search", handleSearchEvent);
    return () => window.removeEventListener("signal:toggle-search", handleSearchEvent);
  }, []);

  const handleReadReceipt = useRef(() => {
    onMarkRead?.().catch(() => undefined);
  }).current;

  const { remoteTyping, sendMessage: wsSend, sendTyping: wsSendTyping } = useChatWebSocket({
    conversationId: conversation.id,
    currentUserId,
    conversationName: conversation.name,
    isGroup: conversation.type === "group",
    onMessage: handleWsMessage,
    onRefresh: handleRefresh,
    onReadReceipt: handleReadReceipt,
  });

  useEffect(() => {
    setLocalMessages(messages);
  }, [conversation.id, messages]);

  useEffect(() => {
    onMarkRead?.().catch(() => undefined);
  }, [conversation.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [localMessages.length, conversation.id]);

  async function send() {
    const text = draft.trim();
    const hasFiles = pendingFiles.length > 0;
    const replyToId = replyToMsg?.id ?? null;
    if (!text && !hasFiles && !replyToId) return;
    const optimistic: UIMessage = {
      id: `local-${Date.now()}`,
      conversationId: conversation.id,
      senderId: currentUserId,
      content: text,
      timestamp: new Date(),
      status: "sent",
    };
    setLocalMessages((prev) => [...prev, optimistic]);
    setDraft("");
    setShowEmoji(false);
    setReplyToMsg(null);
    const filesToSend = [...pendingFiles];
    setPendingFiles([]);
    wsSendTyping(false);
    if (!hasFiles && !replyToId) {
      const wsSent = wsSend(text);
      if (wsSent) {
        return;
      }
    }
    try {
      setUploading(true);
      const created = await onSendMessage(text, hasFiles ? filesToSend : undefined, replyToId);
      if (created) {
        setLocalMessages((prev) => prev.map((m) => (m.id === optimistic.id ? created : m)));
      }
    } catch {
      toast.error("Failed to send message");
      setLocalMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setUploading(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length + pendingFiles.length > MAX_FILES_PER_MESSAGE) {
      toast.error(`Maximum ${MAX_FILES_PER_MESSAGE} files per message`);
      return;
    }
    setPendingFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  }

  function removePendingFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length + pendingFiles.length > MAX_FILES_PER_MESSAGE) {
      toast.error(`Maximum ${MAX_FILES_PER_MESSAGE} files per message`);
      return;
    }
    setPendingFiles((prev) => [...prev, ...files]);
  }

  async function addReaction(id: string, emoji: string) {
    await onReactMessage(id, emoji);
  }

  async function deleteMessage(id: string) {
    await onDeleteMessage(id);
    setLocalMessages((prev) => prev.filter((m) => m.id !== id));
    toast.success("Message deleted");
  }

  const visibleMessages = useMemo(() => {
    if (!searchQuery.trim()) return localMessages;
    const q = searchQuery.toLowerCase();
    return localMessages.filter((m) => m.content.toLowerCase().includes(q));
  }, [localMessages, searchQuery]);
  const grouped = useMemo(() => groupByDay(visibleMessages), [visibleMessages]);
  const typingVisible = conversation.typing || remoteTyping;

  const other = conversation.type === "dm"
    ? conversation.participantIds.find((p) => p !== currentUserId)
    : null;

  return (
    <div className="flex h-full flex-1 flex-col bg-signal-chat">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-signal-border bg-signal-panel/95 px-4 backdrop-blur">
        {onBack && (
          <button onClick={onBack} className="mr-1 rounded-lg p-2 text-signal-muted hover:bg-signal-hover md:hidden">←</button>
        )}
        <Avatar initials={conversation.initials} color={conversation.avatarColor} size={40} online={typingVisible} imageUrl={conversation.avatarUrl} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-signal-text">{conversation.name}</div>
          <div className="truncate text-xs text-signal-muted">
            {typingVisible ? <span className="text-signal-accent">typing…</span>
              : conversation.type === "group" ? `${conversation.participantIds.length} members`
              : other ? "Online" : "Offline"}
          </div>
        </div>
        <div className="flex items-center gap-1 text-signal-muted">
          <HeaderBtn label="Video call" onClick={() => toast("Video calling coming soon")}><Video size={18} /></HeaderBtn>
          <HeaderBtn label="Voice call" onClick={() => toast("Voice calling coming soon")}><Phone size={18} /></HeaderBtn>
          {conversation.type === "group" && onOpenGroupMembers && (
            <HeaderBtn label="Group info" onClick={onOpenGroupMembers}><Users size={18} /></HeaderBtn>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="grid h-9 w-9 place-items-center rounded-lg hover:bg-signal-hover"
                aria-label="Disappearing messages"
                title={conversation.disappearingDuration ? `Disappearing: ${conversation.disappearingDuration}s` : "Disappearing messages: Off"}
              >
                <Hourglass size={18} className={conversation.disappearingDuration ? "text-signal-accent" : ""} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-[10px] font-semibold uppercase text-signal-muted">Disappearing Messages</DropdownMenuLabel>
              {DISAPPEARING_DURATIONS.map((opt) => (
                <DropdownMenuItem key={opt.value} onSelect={() => onSetDisappearing?.(opt.value)}>
                  <span className="mr-2 w-4 text-center">{conversation.disappearingDuration === opt.value ? "✓" : ""}</span>
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <HeaderBtn label="Search" onClick={() => setShowSearch((v) => !v)}>
            <Search size={18} />
          </HeaderBtn>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <HeaderBtn label="More"><MoreVertical size={18} /></HeaderBtn>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onMarkRead?.()}>
                <CheckCheck size={14} className="mr-2" />Mark as read
              </DropdownMenuItem>
              {onArchive && (
                <DropdownMenuItem onSelect={() => onArchive?.()}>
                  Archive
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {showSearch && (
        <div className="flex items-center gap-2 border-b border-signal-border bg-signal-panel px-4 py-2">
          <Search size={16} className="shrink-0 text-signal-muted" />
          <input
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages…"
            className="flex-1 bg-transparent text-sm text-signal-text placeholder:text-signal-muted focus:outline-none"
          />
          {searchQuery && (
            <>
              <span className="text-xs text-signal-muted">
                {visibleMessages.length} of {localMessages.length}
              </span>
              <button onClick={() => setSearchQuery("")} className="text-xs text-signal-accent hover:underline">Clear</button>
            </>
          )}
          <button onClick={() => { setShowSearch(false); setSearchQuery(""); }} className="text-xs text-signal-muted hover:text-signal-text">✕</button>
        </div>
      )}
      <div ref={scrollRef} className="signal-chat-bg flex-1 overflow-y-auto px-4 py-4 md:px-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-1">
          {grouped.map((group) => (
            <div key={group.key}>
              <DayDivider label={group.label} />
              {group.items.map((m, i) => {
                const prev = group.items[i - 1];
                const showAuthor = conversation.type === "group" && m.senderId !== currentUserId && (!prev || prev.senderId !== m.senderId);
                return (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    isGroup={conversation.type === "group"}
                    showAuthor={showAuthor}
                    currentUserId={currentUserId}
                    getUser={getUser}
                    allMessages={visibleMessages}
                    onReact={(emoji) => addReaction(m.id, emoji)}
                    onDelete={() => deleteMessage(m.id)}
                    onReply={() => setReplyToMsg(m)}
                    onScrollToMessage={(id) => {
                      const el = scrollRef.current?.querySelector(`[data-message-id="${id}"]`);
                      el?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div
        className={cn("relative border-t border-signal-border bg-signal-panel px-4 py-3 md:px-8", dragOver && "ring-2 ring-signal-accent/50")}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {dragOver && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-signal-accent/10 text-sm font-medium text-signal-accent">
            Drop files here
          </div>
        )}
        {showEmoji && (
          <div className="absolute bottom-16 left-6 z-10 flex gap-1 rounded-2xl border border-signal-border bg-signal-panel p-2 shadow-lg">
            {EMOJIS.map((e) => (
              <button key={e} onClick={() => { setDraft((d) => d + e); }} className="rounded-lg p-1.5 text-xl hover:bg-signal-hover">
                {e}
              </button>
            ))}
          </div>
        )}
        {replyToMsg && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border-l-4 border-signal-accent bg-signal-bg px-3 py-2">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-signal-accent">Replying to {replyToMsg.senderId === currentUserId ? "yourself" : getUser(replyToMsg.senderId).name}</div>
              <div className="truncate text-xs text-signal-muted">{replyToMsg.content || (replyToMsg.attachments?.length ? "Attachment" : "")}</div>
            </div>
            <button onClick={() => setReplyToMsg(null)} className="rounded p-0.5 text-signal-muted hover:bg-signal-hover hover:text-signal-text">
              <X size={14} />
            </button>
          </div>
        )}
        {pendingFiles.length > 0 && (
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {pendingFiles.map((file, i) => (
              <div key={i} className="relative flex shrink-0 items-center gap-2 rounded-lg border border-signal-border bg-signal-bg px-3 py-2">
                {file.type.startsWith("image/") ? (
                  <img src={URL.createObjectURL(file)} alt={file.name} className="h-10 w-10 rounded object-cover" />
                ) : (
                  <FileIcon mimeType={file.type} />
                )}
                <div className="max-w-[120px]">
                  <div className="truncate text-xs font-medium text-signal-text">{file.name}</div>
                  <div className="text-[10px] text-signal-muted">{formatFileSize(file.size)}</div>
                </div>
                <button onClick={() => removePendingFile(i)} className="ml-1 rounded-full p-0.5 text-signal-muted hover:bg-signal-hover hover:text-signal-text">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <ComposerBtn label="Emoji" onClick={() => setShowEmoji((v) => !v)}><Smile size={20} /></ComposerBtn>
          <ComposerBtn label="Attach" onClick={() => fileInputRef.current?.click()}><Paperclip size={20} /></ComposerBtn>
          <input ref={fileInputRef} type="file" multiple accept={ACCEPTED_FILE_TYPES} className="hidden" onChange={handleFileSelect} />
          <div className="flex flex-1 items-center rounded-2xl bg-signal-bg px-3 py-2">
            <textarea
              rows={1}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                wsSendTyping(Boolean(e.target.value.trim()));
                onTypingChange?.(Boolean(e.target.value.trim())).catch(() => undefined);
              }}
              onFocus={() => onComposerFocusChange?.(true)}
              onBlur={() => onComposerFocusChange?.(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
              }}
              placeholder="Send a message"
              className="max-h-32 flex-1 resize-none bg-transparent text-sm text-signal-text placeholder:text-signal-muted focus:outline-none"
            />
          </div>
          {(draft.trim() || pendingFiles.length > 0) ? (
            <button
              onClick={send}
              disabled={uploading}
              className="grid h-10 w-10 place-items-center rounded-full bg-signal-accent text-white shadow-sm transition-transform active:scale-95 hover:bg-signal-accent/90 disabled:opacity-60"
              aria-label="Send"
            >
              {uploading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Send size={16} />}
            </button>
          ) : (
            <ComposerBtn label="Voice"><Mic size={20} /></ComposerBtn>
          )}
        </div>
      </div>
    </div>
  );
}

function HeaderBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick?: () => void }) {
  return <button onClick={onClick} aria-label={label} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-signal-hover">{children}</button>;
}

function ComposerBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} aria-label={label} className="grid h-10 w-10 place-items-center rounded-full text-signal-muted hover:bg-signal-hover">
      {children}
    </button>
  );
}

function DayDivider({ label }: { label: string }) {
  return (
    <div className="my-4 flex justify-center">
      <span className="rounded-full bg-signal-panel/80 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-signal-muted shadow-sm">
        {label}
      </span>
    </div>
  );
}

function MessageBubble({
  message,
  isGroup,
  showAuthor,
  currentUserId,
  getUser,
  allMessages,
  onReact,
  onDelete,
  onReply,
  onScrollToMessage,
}: {
  message: UIMessage;
  isGroup: boolean;
  showAuthor: boolean;
  currentUserId: string;
  getUser: (id: string) => UIUser;
  allMessages: UIMessage[];
  onReact: (emoji: string) => void;
  onDelete: () => void;
  onReply: () => void;
  onScrollToMessage?: (id: string) => void;
}) {
  const me = message.senderId === currentUserId;
  const user = getUser(message.senderId);
  const statusLabel = message.status === "read" ? "Read" : message.status === "delivered" ? "Delivered" : message.status === "sent" ? "Sent" : "Sending";

  const replyRef = message.replyToId ? allMessages.find((m) => m.id === message.replyToId) : null;

  return (
    <div className={cn("group flex w-full", me ? "justify-end" : "justify-start")} data-message-id={message.id}>
      <div className={cn("flex max-w-[75%] flex-col", me ? "items-end" : "items-start")}>
        {showAuthor && (
          <span className="mb-0.5 ml-3 text-[11px] font-semibold" style={{ color: user.avatarColor }}>
            {user.name}
          </span>
        )}
        <div className="flex items-center gap-1.5">
          {me && <MessageActions onReact={onReact} onDelete={onDelete} onReply={onReply} status={statusLabel} content={message.content} left />}
          <div
            className={cn(
              "relative rounded-2xl px-3.5 py-2 text-[14px] leading-snug shadow-sm",
              message.reactions?.length ? "mb-5" : "",
              me
                ? "bg-signal-accent text-white rounded-br-md"
                : "bg-signal-received text-signal-text rounded-bl-md",
            )}
          >
            {(replyRef || message.replyToContent) && (
              <div
                className={cn(
                  "mb-1.5 cursor-pointer rounded-lg border-l-2 px-2 py-1 text-[12px]",
                  me ? "border-white/40 bg-white/10" : "border-signal-accent/40 bg-signal-bg",
                )}
                onClick={() => replyRef && onScrollToMessage?.(replyRef.id)}
              >
                <div className={cn("text-[10px] font-semibold", me ? "text-white/80" : "text-signal-accent")}>
                  {message.replyToSender ? message.replyToSender.name : replyRef ? getUser(replyRef.senderId).name : ""}
                </div>
                <div className={cn("truncate text-[11px]", me ? "text-white/60" : "text-signal-muted")}>
                  {message.replyToContent || replyRef?.content || "Attachment"}
                </div>
              </div>
            )}
            <AttachmentDisplay attachments={message.attachments ?? []} me={me} />
            {message.content && <span className="whitespace-pre-wrap break-words">{message.content}</span>}
            <span className={cn("ml-2 inline-flex items-center gap-1 align-baseline text-[10px]", me ? "text-white/75" : "text-signal-muted")}>
              {formatMessageTime(message.timestamp)}
              {message.edited && <span className="italic">edited</span>}
              {message.expiresAt && <Hourglass size={11} className="opacity-60" />}
              {me && (
                message.status === "read"
                  ? <CheckCheck size={13} className="text-white" />
                  : message.status === "delivered"
                  ? <CheckCheck size={13} />
                  : <Check size={13} />
              )}
            </span>
            {message.reactions && message.reactions.length > 0 && (
              <div className={cn("absolute -bottom-4 flex gap-1 rounded-full border border-signal-border bg-signal-panel px-1.5 py-0.5 text-[11px] shadow-sm", me ? "right-2" : "left-2")}>
                {message.reactions.map((r) => (
                  <span key={r.emoji} className="flex items-center gap-0.5">{r.emoji} {r.count > 1 && <span className="text-signal-muted">{r.count}</span>}</span>
                ))}
              </div>
            )}
          </div>
          {!me && <MessageActions onReact={onReact} onDelete={onDelete} onReply={onReply} content={message.content} />}
        </div>
      </div>
    </div>
  );
}

function MessageActions({ onReact, onDelete, onReply, left, status, content }: { onReact: (e: string) => void; onDelete: () => void; onReply: () => void; left?: boolean; status?: string; content?: string }) {
  return (
    <div className={cn("flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100", left && "order-first")}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="grid h-7 w-7 place-items-center rounded-full text-signal-muted hover:bg-signal-hover">
            <SmilePlus size={14} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="flex flex-row gap-1 p-1.5">
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => onReact(e)} className="rounded-md p-1 text-lg hover:bg-signal-hover">{e}</button>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="grid h-7 w-7 place-items-center rounded-full text-signal-muted hover:bg-signal-hover">
            <MoreVertical size={14} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onReply}><Reply size={14} className="mr-2" />Reply</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => { navigator.clipboard.writeText(content || ""); toast.success("Copied to clipboard"); }}>Copy</DropdownMenuItem>
          <DropdownMenuItem disabled className="text-xs text-signal-muted cursor-default">
            Status: {status || "Unknown"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red-600 focus:text-red-600" onSelect={onDelete}>
            <Trash2 size={14} className="mr-2" />Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function groupByDay(list: UIMessage[]) {
  const groups: { key: string; label: string; items: UIMessage[] }[] = [];
  for (const m of list) {
    const key = m.timestamp.toDateString();
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = { key, label: formatDayDivider(m.timestamp), items: [] };
      groups.push(g);
    }
    g.items.push(m);
  }
  return groups;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) return <ImageIcon size={20} className="text-blue-500" />;
  if (mimeType.startsWith("video/")) return <Film size={20} className="text-purple-500" />;
  return <FileText size={20} className="text-signal-muted" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentDisplay({ attachments, me }: { attachments: UIAttachment[]; me: boolean }) {
  if (!attachments?.length) return null;
  return (
    <div className="mt-1 flex flex-col gap-1">
      {attachments.map((att) => {
        const isImage = att.mimeType.startsWith("image/");
        const isVideo = att.mimeType.startsWith("video/");
        return (
          <div key={att.id}>
            {isImage ? (
              <a href={att.url} target="_blank" rel="noopener noreferrer">
                <img src={att.url} alt={att.fileName} className="max-h-48 rounded-lg object-cover" />
              </a>
            ) : isVideo ? (
              <video src={att.url} controls className="max-h-48 rounded-lg" />
            ) : (
              <a
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                  me ? "border-white/20 bg-white/10" : "border-signal-border bg-signal-bg",
                )}
              >
                <FileIcon mimeType={att.mimeType} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{att.fileName}</div>
                  <div className={cn("text-[10px]", me ? "text-white/60" : "text-signal-muted")}>{formatFileSize(att.fileSize)}</div>
                </div>
                <Download size={14} className={me ? "text-white/60" : "text-signal-muted"} />
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}
