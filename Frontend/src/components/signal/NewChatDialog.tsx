import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar } from "./Avatar";
import { Search, UserPlus, MessageCircle } from "lucide-react";
import type { UIUser } from "@/lib/adapters";
import { useUserSearch } from "@/hooks/useUserSearch";
import { toast } from "sonner";

export function NewChatDialog({
  open,
  onOpenChange,
  users,
  onStartChat,
  onAddContact,
  contactIds,
  isCreatingGroup,
  onStartGroup,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  users: UIUser[];
  onStartChat: (userId: string) => void;
  onAddContact?: (userId: string) => Promise<void>;
  contactIds?: Set<string>;
  isCreatingGroup?: boolean;
  onStartGroup?: (name: string, memberIds: string[]) => Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const { results: searchResults } = useUserSearch(q);

  useEffect(() => {
    setQ("");
    setSelectedMembers([]);
  }, [open]);

  const allUsers = useMemo(() => {
    const map = new Map<string, UIUser>();
    for (const u of users) map.set(u.id, u);
    for (const u of searchResults) map.set(u.id, u);
    return Array.from(map.values());
  }, [users, searchResults]);

  const filtered = useMemo(() => {
    const base = q.trim().length >= 2 ? allUsers : users;
    return [...base]
      .sort((a, b) => {
        const aSel = selectedMembers.includes(a.id) ? 0 : 1;
        const bSel = selectedMembers.includes(b.id) ? 0 : 1;
        return aSel - bSel || a.name.localeCompare(b.name);
      });
  }, [allUsers, users, q, selectedMembers]);

  async function handleAddContact(userId: string) {
    if (!onAddContact) return;
    try {
      await onAddContact(userId);
      toast.success("Contact added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add contact");
    }
  }

  async function handleCreateGroup() {
    if (!onStartGroup || !groupName.trim()) return;
    try {
      await onStartGroup(groupName.trim(), selectedMembers);
      setGroupName("");
      setSelectedMembers([]);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create group");
    }
  }

  if (isCreatingGroup) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New group</DialogTitle>
          </DialogHeader>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-signal-muted">Group name</label>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              className="w-full rounded-lg border border-signal-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-signal-accent/40"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-signal-muted">Add members</label>
            <div className="relative mb-2">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-signal-muted" />
              <input
                value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Search users"
                className="w-full rounded-lg bg-signal-bg py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-signal-accent/40"
              />
            </div>
            {selectedMembers.length > 0 && (
              <div className="mb-2 max-h-28 space-y-1 overflow-y-auto rounded-lg border border-signal-border bg-signal-bg p-2">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-signal-muted">Selected ({selectedMembers.length})</div>
                {allUsers.filter((u) => selectedMembers.includes(u.id))
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((u) => (
                    <div key={u.id} className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-signal-text hover:bg-signal-hover">
                      <Avatar initials={u.initials} color={u.avatarColor} size={24} imageUrl={u.avatarUrl} />
                      <span className="flex-1 truncate">{u.name}</span>
                      <button onClick={() => setSelectedMembers((prev) => prev.filter((id) => id !== u.id))} className="text-signal-muted hover:text-red-500 text-xs">Remove</button>
                    </div>
                  ))}
              </div>
            )}
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {filtered.map((u) => {
                const isSelected = selectedMembers.includes(u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      setSelectedMembers((prev) =>
                        isSelected ? prev.filter((id) => id !== u.id) : [...prev, u.id],
                      );
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors ${
                      isSelected ? "bg-signal-hover" : "hover:bg-signal-bg"
                    }`}
                  >
                    <div className={`grid h-5 w-5 shrink-0 place-items-center rounded border-2 ${
                      isSelected ? "border-signal-accent bg-signal-accent" : "border-signal-muted"
                    }`}>
                      {isSelected && <span className="text-[10px] text-white">✓</span>}
                    </div>
                    <Avatar initials={u.initials} color={u.avatarColor} size={36} online={u.online} imageUrl={u.avatarUrl} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-signal-text">{u.name}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <button
            onClick={handleCreateGroup}
            disabled={!groupName.trim() || selectedMembers.length === 0}
            className="w-full rounded-lg bg-signal-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Create group ({selectedMembers.length} members)
          </button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New chat</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-signal-muted" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search users"
            className="w-full rounded-lg bg-signal-bg py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-signal-accent/40"
          />
        </div>
        <div className="max-h-80 overflow-y-auto">
          {filtered.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-3 rounded-lg p-2 hover:bg-signal-hover"
            >
              <button
                onClick={() => {
                  onStartChat(u.id);
                  onOpenChange(false);
                }}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <Avatar initials={u.initials} color={u.avatarColor} online={u.online} imageUrl={u.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-signal-text">{u.name}</div>
                  <div className="truncate text-xs text-signal-muted">{u.online ? "Online" : u.lastSeen ?? "Offline"}</div>
                </div>
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    onStartChat(u.id);
                    onOpenChange(false);
                  }}
                  className="grid h-8 w-8 place-items-center rounded-full text-signal-accent hover:bg-signal-hover"
                  title="Start chat"
                >
                  <MessageCircle size={16} />
                </button>
                {onAddContact && contactIds && !contactIds.has(u.id) && (
                  <button
                    onClick={() => handleAddContact(u.id)}
                    className="grid h-8 w-8 place-items-center rounded-full text-signal-muted hover:bg-signal-hover"
                    title="Add contact"
                  >
                    <UserPlus size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
