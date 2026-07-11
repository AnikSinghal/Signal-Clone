export const API = {
  AUTH: {
    REGISTER: "/api/auth/register/",
    LOGIN: "/api/auth/login/",
    LOGOUT: "/api/auth/logout/",
    REFRESH: "/api/auth/refresh/",
    OTP_VERIFY: "/api/auth/otp/verify/",
  },
  USERS: {
    ME: "/api/users/me/",
    PROFILE: "/api/users/profile/",
    SEARCH: "/api/users/search/",
  },
  CONTACTS: {
    LIST: "/api/contacts/",
  },
  CHAT: {
    CONVERSATIONS: "/api/chat/conversations/",
    MESSAGES: (id: string) => `/api/chat/conversations/${id}/messages/` as const,
    MESSAGE_DETAIL: (id: string) => `/api/chat/messages/${id}/` as const,
    REACTION: (id: string) => `/api/chat/messages/${id}/reactions/` as const,
    READ: (id: string) => `/api/chat/conversations/${id}/read/` as const,
    TYPING: (id: string) => `/api/chat/conversations/${id}/typing/` as const,
    MEMBER_UPDATE: (id: string) => `/api/chat/conversations/${id}/member/` as const,
    DISAPPEARING: (id: string) => `/api/chat/conversations/${id}/disappearing/` as const,
  },
  GROUPS: {
    LIST: "/api/groups/",
    MEMBERS: (id: string) => `/api/groups/${id}/members/` as const,
    MEMBER_REMOVE: (groupId: string, userId: string | number) =>
      `/api/groups/${groupId}/members/${userId}/` as const,
  },
} as const;
