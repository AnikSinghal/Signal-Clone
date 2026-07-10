import { getStoredTokens, setStoredTokens, type StoredTokens } from "./session";
import { API } from "./api-routes";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

type RequestOptions = Omit<RequestInit, 'body'> & {
  auth?: boolean;
  retryOnAuthError?: boolean;
  body?: unknown;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, retryOnAuthError = true, headers, body, ...rest } = options;
  const currentTokens = getStoredTokens();
  const finalHeaders = new Headers(headers);
  if (body != null && !(body instanceof FormData)) {
    finalHeaders.set("Content-Type", "application/json");
  }
  if (auth && currentTokens?.access) {
    finalHeaders.set("Authorization", `Bearer ${currentTokens.access}`);
  }

  const doFetch = async (token?: string) => {
    const requestHeaders = new Headers(finalHeaders);
    if (token) {
      requestHeaders.set("Authorization", `Bearer ${token}`);
    }
    return fetch(`${API_BASE}${path}`, {
      ...rest,
      headers: requestHeaders,
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });
  };

  let response = await doFetch();
  if (response.status === 401 && auth && retryOnAuthError && currentTokens?.refresh) {
    const refreshed = await refreshTokens(currentTokens.refresh);
    if (refreshed) {
      response = await doFetch(refreshed.access);
    }
  }
  if (!response.ok) {
    const error = await safeJson(response);
    throw new Error(error?.detail || error?.message || "Request failed");
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

async function safeJson(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export type BackendProfile = {
  avatar: string | null;
  bio: string;
  status_message: string;
  is_online: boolean;
  last_seen: string | null;
};

export type BackendUser = {
  id: number;
  username: string;
  email: string;
  phone: string;
  name?: string;
  initials?: string;
  avatar_color: string;
  about: string;
  profile?: BackendProfile;
};

export type BackendContact = {
  id: string;
  contact: string;
  contact_user: BackendUser;
  nickname: string;
  blocked: boolean;
  created_at: string;
  updated_at: string;
};

export type BackendConversationMember = {
  id: string;
  user: BackendUser;
  role: "owner" | "admin" | "member";
  is_pinned: boolean;
  is_archived: boolean;
  is_muted: boolean;
  unread_count: number;
  last_read_at: string | null;
  joined_at: string;
};

export type BackendMessageReaction = {
  id: string;
  user: BackendUser;
  emoji: string;
  created_at: string;
};

export type BackendMessage = {
  id: string;
  conversation: string;
  sender: BackendUser;
  content: string;
  reply_to_id: string | null;
  reply_to_content: string | null;
  reply_to_sender: { id: number; name: string; username: string } | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  attachments: Array<{
    id: string;
    file: string;
    mime_type: string;
    file_name: string;
    file_size: number;
    created_at: string;
  }>;
  reactions: BackendMessageReaction[];
  read_receipts: Array<{ id: string; user: number; read_at: string }>;
};

export type BackendConversation = {
  id: string;
  conversation_type: "dm" | "group";
  title: string;
  display_title: string;
  is_group: boolean;
  created_by: number | null;
  last_message: BackendMessage | null;
  last_message_at: string | null;
  is_muted: boolean;
  created_at: string;
  updated_at: string;
  members: BackendConversationMember[];
};

export type BackendGroup = {
  id: string;
  conversation: string;
  name: string;
  description: string;
  avatar: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  members: Array<{
    id: string;
    user: BackendUser;
    is_admin: boolean;
    joined_at: string;
  }>;
};

export type AuthPayload = StoredTokens & {
  user: BackendUser;
};

export type RegisterPayload = AuthPayload & {
  otp_required?: boolean;
  mock_otp?: string;
};

export async function login(identifier: string, password: string) {
  const data = await request<AuthPayload>(API.AUTH.LOGIN, {
    method: "POST",
    auth: false,
    body: { identifier, password },
  });
  setStoredTokens({ access: data.access, refresh: data.refresh });
  return data;
}

export async function register(input: {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}) {
  return request<RegisterPayload>(API.AUTH.REGISTER, {
    method: "POST",
    auth: false,
    body: input,
  });
}

export async function verifyOtp(identifier: string, code: string) {
  const data = await request<AuthPayload>(API.AUTH.OTP_VERIFY, {
    method: "POST",
    auth: false,
    body: { identifier, code },
  });
  setStoredTokens({ access: data.access, refresh: data.refresh });
  return data;
}

export async function logout() {
  const tokens = getStoredTokens();
  try {
    await request<void>(API.AUTH.LOGOUT, {
      method: "POST",
      body: tokens ? { refresh: tokens.refresh } : {},
    });
  } finally {
    setStoredTokens(null);
  }
}

export async function refreshTokens(refreshToken: string) {
  const data = await request<StoredTokens>(API.AUTH.REFRESH, {
    method: "POST",
    auth: false,
    retryOnAuthError: false,
    body: { refresh: refreshToken },
  });
  setStoredTokens(data);
  return data;
}

export async function getCurrentUser() {
  return request<BackendUser>(API.USERS.ME);
}

export async function updateProfile(body: FormData | Record<string, unknown>) {
  return request<BackendProfile>(API.USERS.PROFILE, {
    method: "PATCH",
    body,
  });
}

export async function searchUsers(query = "") {
  const suffix = query ? `?q=${encodeURIComponent(query)}` : "";
  return unwrapList(await request<Paginated<BackendUser>>(`${API.USERS.SEARCH}${suffix}`));
}

export async function listContacts() {
  return unwrapList(await request<Paginated<BackendContact>>(API.CONTACTS.LIST));
}

export async function addContact(contact: string) {
  return request<BackendContact>(API.CONTACTS.LIST, {
    method: "POST",
    body: { contact },
  });
}

export async function listConversations() {
  return unwrapList(await request<Paginated<BackendConversation>>(API.CHAT.CONVERSATIONS));
}

export async function createConversation(user?: string, title?: string) {
  return request<BackendConversation>(API.CHAT.CONVERSATIONS, {
    method: "POST",
    body: user ? { user } : { title },
  });
}

export async function getConversation(conversationId: string) {
  return request<BackendConversation>(`${API.CHAT.CONVERSATIONS}${conversationId}/`);
}

export async function listMessages(conversationId: string) {
  return unwrapList(await request<Paginated<BackendMessage>>(API.CHAT.MESSAGES(conversationId)));
}

export async function sendMessage(conversationId: string, content: string, replyTo?: string | null, files?: File[]) {
  const form = new FormData();
  form.append("content", content);
  if (replyTo) form.append("reply_to", replyTo);
  if (files?.length) {
    for (const file of files) {
      form.append("files", file);
    }
  }
  return request<BackendMessage>(API.CHAT.MESSAGES(conversationId), {
    method: "POST",
    body: form,
  });
}

export async function updateMessage(messageId: string, content: string) {
  return request<BackendMessage>(API.CHAT.MESSAGE_DETAIL(messageId), {
    method: "PATCH",
    body: { content },
  });
}

export async function deleteMessage(messageId: string) {
  return request<void>(API.CHAT.MESSAGE_DETAIL(messageId), {
    method: "DELETE",
  });
}

export async function reactToMessage(messageId: string, emoji: string) {
  return request<{ created?: boolean; deleted?: boolean; emoji?: string }>(API.CHAT.REACTION(messageId), {
    method: "POST",
    body: { emoji },
  });
}

export async function markConversationRead(conversationId: string) {
  return request<{ status: string }>(API.CHAT.READ(conversationId), {
    method: "POST",
  });
}

export async function setTyping(conversationId: string, isTyping: boolean) {
  return request<{ is_typing: boolean }>(API.CHAT.TYPING(conversationId), {
    method: "POST",
    body: { is_typing: isTyping },
  });
}

export async function updateConversationMember(conversationId: string, updates: { is_archived?: boolean; is_pinned?: boolean; is_muted?: boolean }) {
  return request<{ status: string }>(API.CHAT.MEMBER_UPDATE(conversationId), {
    method: "PATCH",
    body: updates,
  });
}

export async function listGroups() {
  return unwrapList(await request<Paginated<BackendGroup>>(API.GROUPS.LIST));
}

export async function createGroup(name: string, description = "") {
  return request<BackendGroup>(API.GROUPS.LIST, {
    method: "POST",
    body: { name, description },
  });
}

export async function getGroupMembers(groupId: string) {
  return unwrapList(await request<Paginated<BackendGroup["members"][number]>>(API.GROUPS.MEMBERS(groupId)));
}

export async function addGroupMember(groupId: string, user: string) {
  return request<BackendGroup>(API.GROUPS.MEMBERS(groupId), {
    method: "POST",
    body: { user },
  });
}

export async function removeGroupMember(groupId: string, userId: string | number) {
  return request<void>(API.GROUPS.MEMBER_REMOVE(groupId, userId), {
    method: "DELETE",
  });
}

export async function setDisappearingDuration(conversationId: string, duration: number) {
  return request<{ disappearing_duration: number }>(API.CHAT.DISAPPEARING(conversationId), {
    method: "PATCH",
    body: { duration },
  });
}

type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

function unwrapList<T>(payload: T[] | Paginated<T>): T[] {
  if (Array.isArray(payload)) return payload;
  return payload.results;
}
