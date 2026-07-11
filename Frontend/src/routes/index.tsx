import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/signal/Sidebar";
import { ChatWindow } from "@/components/signal/ChatWindow";
import { SettingsDialog } from "@/components/signal/SettingsDialog";
import { NewChatDialog } from "@/components/signal/NewChatDialog";
import { GroupMembersDialog } from "@/components/signal/GroupMembersDialog";
import { AuthGate } from "@/components/signal/AuthGate";
import { Toaster } from "sonner";
import { MessageSquare } from "lucide-react";
import { getStoredTokens } from "@/lib/session";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import {
  getCurrentUser,
  logout,
} from "@/lib/api/auth";
import {
  createConversation,
  deleteMessage,
  listConversations,
  listMessages,
  markConversationRead,
  reactToMessage,
  sendMessage,
  setTyping,
  updateConversationMember,
} from "@/lib/api/chat";
import { addContact, listContacts } from "@/lib/api/contact";
import { addGroupMember, createGroup, listGroups, removeGroupMember } from "@/lib/api/group";
import { setDisappearingDuration } from "@/lib/backend";
import type { BackendConversation } from "@/lib/backend";
import type { UIConversation, UIMessage, UIUser } from "@/lib/adapters";
import { toUIConversation, toUIMessage, toUIUser } from "@/lib/adapters";
import { toast } from "sonner";
import { initDarkMode } from "@/lib/dark-mode";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Signal" },
      { name: "description", content: "Signal — Speak Freely. Private messenger for everyone." },
      { property: "og:title", content: "Signal" },
      { property: "og:description", content: "Signal — Speak Freely. Private messenger for everyone." },
    ],
  }),
  component: SignalApp,
});

function SignalApp() {
  const queryClient = useQueryClient();

  useEffect(() => { initDarkMode(); }, []);
  const [sessionVersion, setSessionVersion] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupMembersOpen, setGroupMembersOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [composerFocused, setComposerFocused] = useState(false);

  const hasSession = Boolean(getStoredTokens());

  const currentUserQuery = useQuery({
    queryKey: ["current-user", sessionVersion],
    queryFn: getCurrentUser,
    enabled: hasSession,
  });

  const conversationsQuery = useQuery({
    queryKey: ["conversations", sessionVersion],
    queryFn: listConversations,
    enabled: hasSession,
  });

  const contactsQuery = useQuery({
    queryKey: ["contacts", sessionVersion],
    queryFn: listContacts,
    enabled: hasSession,
  });

  const groupsQuery = useQuery({
    queryKey: ["groups", sessionVersion],
    queryFn: listGroups,
    enabled: hasSession,
  });

  const activeConversationId = activeId ?? conversationsQuery.data?.[0]?.id ?? null;

  useEffect(() => {
    if (!activeId && conversationsQuery.data?.length) {
      setActiveId(conversationsQuery.data[0].id);
    }
  }, [activeId, conversationsQuery.data]);

  const messagesQuery = useQuery({
    queryKey: ["messages", activeConversationId, sessionVersion],
    queryFn: () => listMessages(activeConversationId as string),
    enabled: hasSession && Boolean(activeConversationId),
  });

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["conversations"] }),
      queryClient.invalidateQueries({ queryKey: ["messages", activeConversationId] }),
    ]);
  };

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, files, replyTo }: { content: string; files?: File[]; replyTo?: string | null }) => {
      if (!activeConversationId) throw new Error("No active conversation");
      const message = await sendMessage(activeConversationId, content, replyTo, files);
      return toUIMessage(message, activeConversation?.participantIds, currentUser?.id);
    },
    onSuccess: async () => {
      await refreshAll();
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      await deleteMessage(messageId);
    },
    onSuccess: async () => {
      await refreshAll();
    },
  });

  const reactMessageMutation = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      await reactToMessage(messageId, emoji);
    },
    onSuccess: async () => {
      await refreshAll();
    },
  });

  const typingMutation = useMutation({
    mutationFn: async (isTyping: boolean) => {
      if (!activeConversationId) return;
      await setTyping(activeConversationId, isTyping);
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async () => {
      if (!activeConversationId) return;
      await markConversationRead(activeConversationId);
    },
    onSuccess: async () => {
      await refreshAll();
    },
  });

  const addContactMutation = useMutation({
    mutationFn: async (userId: string) => {
      await addContact(userId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      await addGroupMember(groupId, userId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["conversations"] }),
        queryClient.invalidateQueries({ queryKey: ["groups"] }),
      ]);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const member = conversationsQuery.data?.find((c: BackendConversation) => c.id === conversationId)?.members.find(
        (m) => String(m.user.id) === currentUser?.id
      );
      const currentlyArchived = member?.is_archived ?? false;
      await updateConversationMember(conversationId, { is_archived: !currentlyArchived });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const disappearingMutation = useMutation({
    mutationFn: async ({ conversationId, duration }: { conversationId: string; duration: number }) => {
      await setDisappearingDuration(conversationId, duration);
    },
    onSuccess: async (_data, vars) => {
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
      const labels: Record<number, string> = { 0: "Off", 30: "30 seconds", 300: "5 minutes", 3600: "1 hour", 86400: "1 day" };
      toast.success(`Disappearing messages: ${labels[vars.duration] ?? vars.duration + "s"}`);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      await removeGroupMember(groupId, userId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["conversations"] }),
        queryClient.invalidateQueries({ queryKey: ["groups"] }),
      ]);
    },
  });

  useKeyboardShortcuts(
    {
      onSearch: () => {
        window.dispatchEvent(new CustomEvent("signal:toggle-search"));
      },
      onEscape: () => {
        if (settingsOpen) setSettingsOpen(false);
        else if (newChatOpen) setNewChatOpen(false);
        else if (groupMembersOpen) setGroupMembersOpen(false);
        else setMobileView("list");
      },
      onNavigateUp: () => {
        const idx = conversations.findIndex((c) => c.id === activeConversationId);
        if (idx > 0) {
          const prevId = conversations[idx - 1].id;
          setActiveId(prevId);
        }
      },
      onNavigateDown: () => {
        const idx = conversations.findIndex((c) => c.id === activeConversationId);
        if (idx >= 0 && idx < conversations.length - 1) {
          const nextId = conversations[idx + 1].id;
          setActiveId(nextId);
        }
      },
    },
    { composerFocused },
  );

  const userMap = useMemo(() => {
    const map = new Map<string, UIUser>();
    const allUsers = [
      currentUserQuery.data ? toUIUser(currentUserQuery.data) : null,
      ...(contactsQuery.data ?? []).map((contact) => toUIUser(contact.contact_user)),
      ...(groupsQuery.data ?? []).flatMap((group) => group.members.map((m) => toUIUser(m.user))),
    ].filter(Boolean) as UIUser[];
    for (const user of allUsers) {
      map.set(user.id, user);
    }
    return map;
  }, [contactsQuery.data, currentUserQuery.data, groupsQuery.data]);

  const currentUser = currentUserQuery.data ? toUIUser(currentUserQuery.data) : null;

  const conversations: UIConversation[] = useMemo(() => {
    const currentUserId = currentUser?.id;
    return (conversationsQuery.data ?? []).map((conversation) => toUIConversation(conversation, currentUserId));
  }, [conversationsQuery.data, currentUser?.id]);

  const contactIds = useMemo(() => {
    return new Set((contactsQuery.data ?? []).map((c) => String(c.contact_user.id)));
  }, [contactsQuery.data]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId],
  );

  const messages: UIMessage[] = useMemo(
    () =>
      (messagesQuery.data ?? []).map((m) =>
        toUIMessage(m, activeConversation?.participantIds, currentUser?.id),
      ),
    [messagesQuery.data, activeConversation?.participantIds, currentUser?.id],
  );

  const selectedGroup = useMemo(() => {
    if (!activeConversationId || !conversationsQuery.data) return null;
    const backendConv = conversationsQuery.data.find((c: BackendConversation) => c.id === activeConversationId);
    if (!backendConv || !backendConv.is_group) return null;
    const actualGroup = groupsQuery.data?.find((g) => g.conversation === activeConversationId);
    const members = backendConv.members.map((m) => ({
      id: m.id,
      user: m.user,
      is_admin: m.role === "owner" || m.role === "admin",
      joined_at: m.joined_at,
    }));
    return {
      id: actualGroup?.id ?? activeConversationId,
      conversation: activeConversationId,
      name: backendConv.display_title || backendConv.title,
      description: actualGroup?.description ?? "",
      avatar: actualGroup?.avatar ?? null,
      created_by: backendConv.created_by ?? 0,
      created_at: backendConv.created_at,
      updated_at: backendConv.updated_at,
      members,
    };
  }, [activeConversationId, conversationsQuery.data, groupsQuery.data]);

  async function handleAuthed() {
    setSessionVersion((value) => value + 1);
    await queryClient.invalidateQueries();
  }

  async function handleLogout() {
    await logout();
    setActiveId(null);
    setSessionVersion((value) => value + 1);
    toast.success("Logged out");
  }

  async function handleStartChat(userId: string) {
    const conversation = await createConversation(userId);
    toast.success("Conversation created");
    await queryClient.invalidateQueries({ queryKey: ["conversations"] });
    setActiveId(conversation.id);
    setMobileView("chat");
  }

  async function handleCreateGroup(name: string, memberIds: string[]) {
    const group = await createGroup(name);
    for (const memberId of memberIds) {
      await addGroupMember(group.id, memberId);
    }
    toast.success("Group created");
    await queryClient.invalidateQueries({ queryKey: ["conversations"] });
    setActiveId(group.conversation);
  }

  async function handleAddContact(userId: string) {
    await addContactMutation.mutateAsync(userId);
  }

  async function handleAddGroupMember(userId: string) {
    if (!selectedGroup) return;
    await addMemberMutation.mutateAsync({ groupId: selectedGroup.id, userId });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["conversations"] }),
      queryClient.invalidateQueries({ queryKey: ["groups"] }),
    ]);
    toast.success("Member added");
  }

  async function handleRemoveGroupMember(userId: string | number) {
    if (!selectedGroup) return;
    await removeMemberMutation.mutateAsync({ groupId: selectedGroup.id, userId: String(userId) });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["conversations"] }),
      queryClient.invalidateQueries({ queryKey: ["groups"] }),
    ]);
    toast.success("Member removed");
  }

  if (!hasSession) {
    return (
      <>
        <AuthGate onAuthed={handleAuthed} />
        <Toaster position="bottom-right" />
      </>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-signal-bg font-sans text-signal-text">
      <div className={mobileView === "chat" ? "hidden md:flex" : "flex flex-1 md:flex-none"}>
        <Sidebar
          activeId={activeConversationId}
          conversations={conversations}
          onSelect={(id) => {
            setActiveId(id);
            setMobileView("chat");
          }}
          onOpenNewChat={() => { setNewChatOpen(true); setCreatingGroup(false); }}
          onOpenNewGroup={() => { setNewChatOpen(true); setCreatingGroup(true); }}
          onOpenSettings={() => setSettingsOpen(true)}
          onArchive={async (id) => {
            await archiveMutation.mutateAsync(id);
            toast.success("Conversation archived");
          }}
        />
      </div>
      <div className={mobileView === "list" ? "hidden md:flex md:flex-1" : "flex flex-1"}>
        {activeConversation && currentUser ? (
          <ChatWindow
            key={activeConversation.id}
            conversation={activeConversation}
            messages={messages}
            currentUserId={currentUser.id}
            getUser={(id) => userMap.get(id) ?? fallbackUser(id)}
            onBack={() => setMobileView("list")}
            onSendMessage={async (content, files, replyTo) => {
              const created = await sendMessageMutation.mutateAsync({ content, files, replyTo });
              return created;
            }}
            onDeleteMessage={async (messageId) => {
              await deleteMessageMutation.mutateAsync(messageId);
            }}
            onReactMessage={async (messageId, emoji) => {
              await reactMessageMutation.mutateAsync({ messageId, emoji });
            }}
            onTypingChange={async (isTyping) => {
              await typingMutation.mutateAsync(isTyping);
            }}
            onMarkRead={async () => {
              await markReadMutation.mutateAsync();
            }}
            onRefreshConversations={refreshAll}
            onOpenGroupMembers={() => setGroupMembersOpen(true)}
            onArchive={async () => {
              if (!activeConversationId) return;
              await archiveMutation.mutateAsync(activeConversationId);
            }}
            onSetDisappearing={async (duration) => {
              if (!activeConversationId) return;
              await disappearingMutation.mutateAsync({ conversationId: activeConversationId, duration });
            }}
            onComposerFocusChange={setComposerFocused}
          />
        ) : (
          <EmptyState />
        )}
      </div>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} user={currentUser} onLogout={handleLogout} />
      <NewChatDialog
        open={newChatOpen}
        onOpenChange={(v) => {
          setNewChatOpen(v);
          if (!v) setCreatingGroup(false);
        }}
        users={(contactsQuery.data ?? []).map((c) => toUIUser(c.contact_user))}
        onStartChat={handleStartChat}
        onAddContact={handleAddContact}
        contactIds={contactIds}
        isCreatingGroup={creatingGroup}
        onStartGroup={handleCreateGroup}
      />
      {selectedGroup && (
        <GroupMembersDialog
          open={groupMembersOpen}
          onOpenChange={setGroupMembersOpen}
          group={selectedGroup}
          currentUserId={currentUser?.id ?? ""}
          users={(contactsQuery.data ?? []).map((c) => toUIUser(c.contact_user))}
          contactIds={contactIds}
          isAdmin={selectedGroup.members.some((m) => String(m.user.id) === currentUser?.id && m.is_admin)}
          onAddMember={handleAddGroupMember}
          onRemoveMember={handleRemoveGroupMember}
          onAddContact={(userId) => addContactMutation.mutateAsync(userId)}
        />
      )}
      <Toaster position="bottom-right" />
    </div>
  );
}

function fallbackUser(id: string): UIUser {
  return {
    id,
    name: "Unknown",
    avatarColor: "#999999",
    initials: "??",
    online: false,
  };
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-signal-panel text-center">
      <div className="grid h-20 w-20 place-items-center rounded-full bg-signal-hover text-signal-accent">
        <MessageSquare size={32} />
      </div>
      <h2 className="mt-6 text-xl font-semibold text-signal-text">Welcome to Signal</h2>
      <p className="mt-2 max-w-sm text-sm text-signal-muted">
        Select a conversation to start messaging. Your messages are end-to-end encrypted.
      </p>
    </div>
  );
}
