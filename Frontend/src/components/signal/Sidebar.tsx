import { useMemo, useState } from "react";
import { Search, SquarePen, MoreHorizontal, MessageSquare, Phone, Archive, Settings, Filter, Users, UserPlus, CheckCheck } from "lucide-react";
import { Avatar } from "./Avatar";
import type { UIConversation } from "@/lib/adapters";
import { formatConversationTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

type Tab = "chats" | "calls" | "archived";

export function Sidebar({
  activeId,
  onSelect,
  onOpenNewChat,
  onOpenNewGroup,
  onOpenSettings,
  conversations,
  onArchive,
}: {
  activeId: string | null;
  onSelect: (id: string) => void;
  onOpenNewChat: () => void;
  onOpenNewGroup?: () => void;
  onOpenSettings: () => void;
  conversations: UIConversation[];
  onArchive?: (id: string) => Promise<void>;
}) {
  const [tab, setTab] = useState<Tab>("chats");
  const [query, setQuery] = useState("");
  const [filterUnread, setFilterUnread] = useState(false);

  const list = useMemo(() => {
    let arr = conversations.filter((c) =>
      tab === "archived" ? c.archived : !c.archived,
    );
    if (query) arr = arr.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
    if (filterUnread) arr = arr.filter((c) => c.unread > 0);
    return [...arr].sort((a, b) => {
      if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
      return b.lastMessageAt.getTime() - a.lastMessageAt.getTime();
    });
  }, [conversations, tab, query, filterUnread]);

  const totalUnread = conversations.filter((c) => !c.archived).reduce((s, c) => s + c.unread, 0);
  const archivedCount = conversations.filter((c) => c.archived).length;

  return (
    <div className="flex h-full">
      {/* Rail */}
      <div className="flex w-16 shrink-0 flex-col items-center gap-1 border-r border-signal-border bg-signal-panel py-4">
        <RailButton icon={<MessageSquare size={20} />} active={tab === "chats"} onClick={() => setTab("chats")} badge={totalUnread} />
        <RailButton icon={<Phone size={20} />} active={tab === "calls"} onClick={() => setTab("calls")} />
        <RailButton icon={<Archive size={20} />} active={tab === "archived"} onClick={() => setTab("archived")} badge={archivedCount} />
        <div className="mt-auto" />
        <RailButton icon={<Settings size={20} />} onClick={onOpenSettings} />
      </div>

      {/* List panel */}
      <div className="flex w-80 shrink-0 flex-col border-r border-signal-border bg-signal-panel">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h1 className="text-xl font-bold tracking-tight text-signal-text">
            {tab === "chats" ? "Chats" : tab === "calls" ? "Calls" : "Archived"}
          </h1>
          <div className="flex items-center gap-1 text-signal-muted">
            <IconBtn onClick={onOpenNewChat} label="New chat"><SquarePen size={18} /></IconBtn>
            {onOpenNewGroup && <IconBtn onClick={onOpenNewGroup} label="New group"><Users size={18} /></IconBtn>}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconBtn label="More"><MoreHorizontal size={18} /></IconBtn>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onOpenNewGroup && <DropdownMenuItem onSelect={onOpenNewGroup}><UserPlus size={14} className="mr-2" />New group</DropdownMenuItem>}
                <DropdownMenuItem onSelect={onOpenSettings}><Settings size={14} className="mr-2" />Settings</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 pb-3">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-signal-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-full rounded-lg bg-signal-bg py-2 pl-9 pr-3 text-sm text-signal-text placeholder:text-signal-muted focus:outline-none focus:ring-2 focus:ring-signal-accent/40"
            />
          </div>
          <button
            onClick={() => setFilterUnread((v) => !v)}
            className={cn(
              "grid h-9 w-9 place-items-center rounded-lg text-signal-muted transition-colors hover:bg-signal-hover",
              filterUnread && "bg-signal-hover text-signal-accent",
            )}
            aria-label="Filter"
          >
            <Filter size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {list.length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-signal-muted">No conversations</div>
          )}
          {list.map((c) => (
            <ConversationRow key={c.id} c={c} active={activeId === c.id} onClick={() => onSelect(c.id)} onArchive={onArchive} />
          ))}
        </div>
      </div>
    </div>
  );
}

function RailButton({
  icon, active, onClick, badge,
}: { icon: React.ReactNode; active?: boolean; onClick?: () => void; badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative grid h-11 w-11 place-items-center rounded-xl text-signal-muted transition-colors hover:bg-signal-hover",
        active && "bg-signal-hover text-signal-accent",
      )}
    >
      {icon}
      {!!badge && badge > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] h-[18px] place-items-center rounded-full bg-red-500 dark:bg-red-600 px-1 text-[10px] font-semibold text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}

function IconBtn({ children, onClick, label }: { children: React.ReactNode; onClick?: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-lg text-signal-muted transition-colors hover:bg-signal-hover"
    >
      {children}
    </button>
  );
}

function ConversationRow({ c, active, onClick, onArchive }: { c: UIConversation; active: boolean; onClick: () => void; onArchive?: (id: string) => Promise<void> }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="group relative">
      <button
        onClick={onClick}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
          active ? "bg-signal-hover" : "hover:bg-signal-bg",
        )}
      >
        <Avatar initials={c.initials} color={c.avatarColor} size={44} imageUrl={c.avatarUrl} />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold text-signal-text">{c.name}</span>
            <span className={cn("shrink-0 text-[11px]", c.unread > 0 ? "text-signal-accent font-semibold" : "text-signal-muted")}>
              {formatConversationTime(c.lastMessageAt)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className={cn("truncate text-[13px]", c.unread > 0 ? "text-signal-text" : "text-signal-muted")}>
              {c.typing ? <em className="text-signal-accent not-italic">typing…</em> : c.lastMessage}
            </span>
            {c.unread > 0 ? (
              <span className="grid min-w-[20px] h-5 shrink-0 place-items-center rounded-full bg-signal-accent px-1.5 text-[11px] font-semibold text-white">
                {c.unread}
              </span>
            ) : c.pinned ? (
              <span className="text-signal-muted">📌</span>
            ) : null}
          </div>
        </div>
      </button>
      {onArchive && (
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="absolute right-1 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-full text-signal-muted opacity-0 group-hover:opacity-100 hover:bg-signal-hover transition-opacity"
            >
              <MoreHorizontal size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onSelect={() => { onArchive(c.id); setMenuOpen(false); }}>
              <Archive size={14} className="mr-2" />{c.archived ? "Unarchive" : "Archive"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
