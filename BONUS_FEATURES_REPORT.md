# Bonus Features Implementation Report

## Summary

All 4 bonus features implemented and verified. No existing functionality regressed. Final cleanup pass completed — dead code removed, constants extracted, all checks passing.

---

## Feature 1: Attachments

### Backend
- `backend/apps/chat/views.py` — `MessageListCreateView.post()` now handles `multipart/form-data` with file uploads (10MB limit, MIME type validation)
- `backend/apps/chat/services.py` — `send_message()` already accepted attachments (no change needed)

### Frontend
- `Frontend/src/lib/backend.ts` — `sendMessage()` accepts `files?: File[]`, sends via `FormData`
- `Frontend/src/lib/adapters.ts` — `UIAttachment` type, `UIMessage.attachments` field
- `Frontend/src/components/signal/ChatWindow.tsx`:
  - Hidden file input + paperclip button + drag-and-drop zone
  - Pending file preview strip with remove buttons
  - `AttachmentDisplay` component: inline images, video player, document download links
  - `FileIcon` helper (image/video/audio/generic)
  - `formatFileSize()` utility

### Usage
Click the paperclip icon or drag files into the composer. Max 5 files, 10MB each. Supported: images, video, audio, PDF, documents.

---

## Feature 2: Reply/Quoted Messages

### Backend
- `backend/apps/chat/serializers.py` — `MessageSerializer` now includes `reply_to_content` and `reply_to_sender` methods

### Frontend
- `Frontend/src/lib/adapters.ts` — `UIMessage` extended with `replyToContent`, `replyToSender`
- `Frontend/src/lib/backend.ts` — `BackendMessage` type updated with reply fields
- `Frontend/src/components/signal/ChatWindow.tsx`:
  - Reply action in message dropdown menu
  - `replyToMsg` state tracks which message is being replied to
  - Quoted message preview bar above composer with dismiss button
  - Quoted message display inside message bubble (with click-to-scroll-to-original)
  - `allMessages` prop on `MessageBubble` for resolving reply references

### Usage
Click the three-dot menu on any message → Reply. The quoted message appears above the composer. Click the quoted block in a received message to scroll to the original.

---

## Feature 3: Disappearing Messages

### Backend
- `backend/apps/chat/models.py`:
  - `Conversation.DisappearingDuration` choices: Off, 30s, 5m, 1h, 1d
  - `Conversation.disappearing_duration` IntegerField
  - `Message.expires_at` (DateTimeField, nullable, indexed)
  - `MessageQuerySet.not_expired()` manager method
- `backend/apps/chat/services.py` — `send_message()` auto-computes `expires_at` from conversation duration
- `backend/apps/chat/views.py`:
  - `MessageListCreateView.get()` uses `.not_expired()` to filter
  - `DisappearingMessagesView` — PATCH to set duration per conversation
  - `CleanupExpiredMessagesView` — POST to bulk-delete expired messages (admin only)
- `backend/apps/chat/urls.py` — Routes for disappearing and cleanup endpoints
- Migration `0003_conversation_disappearing_duration_and_more`

### Frontend
- `Frontend/src/lib/adapters.ts` — `UIMessage.expiresAt`, `UIConversation.disappearingDuration`
- `Frontend/src/lib/backend.ts` — `setDisappearingDuration()` function
- `Frontend/src/lib/constants.ts` — `DISAPPEARING_DURATIONS` array
- `Frontend/src/lib/api-routes.ts` — `DISAPPEARING` route
- `Frontend/src/components/signal/ChatWindow.tsx`:
  - Dedicated hourglass icon dropdown in header (Off, 30s, 5m, 1h, 1d)
  - Hourglass icon on messages with `expiresAt`
- `Frontend/src/routes/index.tsx` — `disappearingMutation` wired to ChatWindow

### Usage
Open conversation header menu → select duration. New messages will auto-expire. Hourglass icon indicates expiring messages.

---

## Feature 4: Keyboard Shortcuts

### Frontend
- `Frontend/src/hooks/useKeyboardShortcuts.ts` — New hook with global keydown listener
- `Frontend/src/routes/index.tsx`:
  - `composerFocused` state tracked
  - Shortcuts wired: Ctrl/⌘+K (search), Escape (close/back), Arrow Up/Down (navigate conversations)
- `Frontend/src/components/signal/ChatWindow.tsx`:
  - Composer `onFocus`/`onBlur` report to parent
  - Listens for `signal:toggle-search` custom event
- `Frontend/src/components/signal/SettingsDialog.tsx`:
  - Keyboard shortcuts reference card in Settings dialog

### Shortcuts
| Shortcut | Action |
|---|---|
| Ctrl/⌘ + K | Toggle search |
| Esc | Close dialog / Back to list |
| Enter | Send message |
| Shift + Enter | New line |
| ↑ / ↓ | Navigate conversations (when composer not focused) |

---

## UI Polish

- **Copy message**: Message dropdown copies actual text content to clipboard with toast confirmation
- **Toast notifications**: New messages show sender name + message preview (DMs) or "Sender — Group Name" (groups)
- **Auto-mark-as-read**: Conversations auto-marked as read on mount and when new messages arrive
- **Dropdown items**: All `DropdownMenuItem` use `onSelect` (Radix UI canonical API) instead of `onClick`
- **Settings dialog**: Scrollable, organized into Profile / General / Shortcuts sections

---

## Refactoring & Cleanup

### Backend dead code removed
| File | Removed |
|---|---|
| `apps/common/pagination.py` | Deleted (unused + DRF setting reference removed) |
| `apps/common/permissions.py` | Deleted (empty file) |
| `apps/common/utils.py` | Removed `unique_slug` |
| `apps/authentication/serializers.py` | Removed `TokenPairSerializer` |
| `apps/chat/models.py` | Removed `Message.Status`, `Message.has_attachments`, `Conversation.members_qs` |
| `apps/chat/serializers.py` | Removed unused `TypingStatus` import, `MessageCreateSerializer` |
| `apps/users/views.py` | Removed unused `django.db.models` import |

### Frontend dead code removed
| Item | Removed |
|---|---|
| 43 shadcn/ui component files | Deleted (only `dialog.tsx` + `dropdown-menu.tsx` kept) |
| `hooks/use-mobile.tsx` | Deleted (unused hook) |
| `routes/README.md` | Deleted |
| `lib/format.ts` | Removed `formatDistanceToNowStrict` re-export |
| `hooks/useChatWebSocket.ts` | Removed unused `sendRead` function |
| `lib/backend.ts` | Un-exported `UIReaction`, `BackendContact`, `AuthPayload`, `RegisterPayload` |
| `routes/index.tsx` | Removed unused `handleKeyboardNav` variable |

### Constants extracted
| File | New |
|---|---|
| `lib/constants.ts` | `MAX_FILES_PER_MESSAGE`, `ACCEPTED_FILE_TYPES`, `DISAPPEARING_DURATIONS` |
| `components/signal/ChatWindow.tsx` | Imports from `lib/constants.ts` |

---

## Final Verification

- **TypeScript**: `npx tsc --noEmit` — 0 errors
- **Django check**: `manage.py check` — 0 issues
- **pytest**: 5/5 tests passed
- **Vite build**: All 3 environments (client, SSR, Nitro) built successfully
- **No regressions**: All existing functionality preserved
