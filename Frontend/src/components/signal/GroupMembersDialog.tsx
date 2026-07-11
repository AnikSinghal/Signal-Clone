import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar } from "./Avatar";
import { Search, UserPlus, UserMinus, UserCheck } from "lucide-react";
import type { BackendGroup } from "@/lib/backend";
import type { UIUser } from "@/lib/adapters";
import { useUserSearch } from "@/hooks/useUserSearch";
import { toast } from "sonner";

type GroupMembersDialogProps = {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  group: BackendGroup | null;
  currentUserId: string;
  users: UIUser[];
  contactIds: Set<string>;
  isAdmin: boolean;
  onAddMember: (userId: string) => Promise<void>;
  onRemoveMember: (userId: string | number) => Promise<void>;
  onAddContact: (userId: string) => Promise<void>;
};

export function GroupMembersDialog({
  open,
  onOpenChange,
  group,
  currentUserId,
  users,
  contactIds,
  isAdmin,
  onAddMember,
  onRemoveMember,
  onAddContact,
}: GroupMembersDialogProps) {
  const [query, setQuery] = useState("");
  const { results: searchResults } = useUserSearch(query);
  const memberIds = useMemo(
    () => new Set(group?.members.map((member) => String(member.user.id)) ?? []),
    [group],
  );

  const searchableUsers = useMemo(() => {
    const fromSearch = searchResults.filter(
      (user) => user.id !== currentUserId && !memberIds.has(user.id),
    );
    const fromProps = users.filter(
      (user) =>
        user.id !== currentUserId &&
        !memberIds.has(user.id) &&
        user.name.toLowerCase().includes(query.toLowerCase()),
    );
    return query.trim().length >= 2 ? fromSearch : fromProps;
  }, [currentUserId, memberIds, query, users, searchResults]);

  async function handleAddContact(userId: string) {
    try {
      await onAddContact(userId);
      toast.success("Contact added");
    } catch {
      toast.error("Failed to add contact");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Group members</DialogTitle>
          <DialogDescription>View who is in the group and manage membership.</DialogDescription>
        </DialogHeader>

        {group ? (
          <div className="grid gap-4">
            <div className="rounded-xl border border-signal-border bg-signal-bg p-4">
              <div className="text-sm font-semibold text-signal-text">{group.name}</div>
              <div className="text-xs text-signal-muted">{group.description || "No description"}</div>
              <div className="mt-1 text-xs text-signal-muted">{group.members.length} members</div>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-signal-muted">Current members</div>
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {group.members.map((member) => {
                  const memberId = String(member.user.id);
                  const isContact = contactIds.has(memberId);
                  const isSelf = memberId === currentUserId;
                  const displayName = member.user.name || member.user.phone || member.user.username;
                  return (
                    <div key={member.id} className="flex items-center gap-3 rounded-xl border border-signal-border px-3 py-2">
                      <Avatar
                        initials={member.user.initials ?? member.user.username.slice(0, 2).toUpperCase()}
                        color={member.user.avatar_color || "#3A76F0"}
                        size={40}
                        online={Boolean(member.user.profile?.is_online)}
                        imageUrl={member.user.profile?.avatar ?? null}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-signal-text">
                          {displayName}
                          {isSelf ? " (you)" : ""}
                        </div>
                        <div className="truncate text-xs text-signal-muted">
                          {member.is_admin
                            ? "Admin"
                            : member.user.profile?.is_online
                              ? "Online"
                              : member.user.profile?.last_seen ?? member.user.phone ?? "Offline"}
                        </div>
                      </div>
                      {!isSelf && !isContact && (
                        <button
                          onClick={() => handleAddContact(memberId)}
                          className="inline-flex items-center gap-1 rounded-lg bg-signal-accent px-2.5 py-1.5 text-xs font-medium text-white hover:bg-signal-accent/90"
                        >
                          <UserPlus size={14} />
                          Add Contact
                        </button>
                      )}
                      {!isSelf && isContact && (
                        <span className="inline-flex items-center gap-1 text-xs text-signal-muted">
                          <UserCheck size={14} />
                        </span>
                      )}
                      {isAdmin && !isSelf && (
                        <button
                          onClick={() => onRemoveMember(member.user.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-signal-border px-2.5 py-1.5 text-xs font-medium text-signal-text hover:bg-signal-hover"
                        >
                          <UserMinus size={14} />
                          Remove
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {isAdmin && (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-signal-muted">Add members</div>
              <div className="relative mb-3">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-signal-muted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search users"
                  className="w-full rounded-lg border border-signal-border py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-signal-accent/40"
                />
              </div>
              <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                {searchableUsers.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-signal-border px-3 py-4 text-center text-sm text-signal-muted">
                    No matching users to add.
                  </div>
                ) : (
                  searchableUsers.map((user) => (
                    <div key={user.id} className="flex items-center gap-3 rounded-xl border border-signal-border px-3 py-2">
                      <Avatar
                        initials={user.initials}
                        color={user.avatarColor}
                        size={40}
                        online={user.online}
                        imageUrl={user.avatarUrl ?? null}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-signal-text">{user.name}</div>
                        <div className="truncate text-xs text-signal-muted">{user.online ? "Online" : user.lastSeen ?? "Offline"}</div>
                      </div>
                      <button
                        onClick={() => onAddMember(user.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-signal-accent px-2.5 py-1.5 text-xs font-medium text-white"
                      >
                        <UserPlus size={14} />
                        Add
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-signal-border px-4 py-8 text-center text-sm text-signal-muted">
            Select a group to manage its members.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
