# Bonus Features Implementation Report

## Summary

All 4 bonus features implemented and verified. No existing functionality regressed.

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
  - `Conversation.disappearing_duration`IntegerField
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
- `Frontend/src/lib/api-routes.ts` — `DISAPPEARING` route
- `Frontend/src/components/signal/ChatWindow.tsx`:
  - Disappearing messages dropdown in header menu (Off, 30s, 5m, 1h, 1d)
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
  - Shortcuts wired: Ctrl/⌘+K (search), Ctrl/⌘+N (new chat), Escape (close/back), Arrow Up/Down (navigate conversations)
- `Frontend/src/components/signal/ChatWindow.tsx`:
  - Composer `onFocus`/`onBlur` report to parent
  - Listens for `signal:toggle-search` custom event
- `Frontend/src/components/signal/SettingsDialog.tsx`:
  - Keyboard shortcuts reference card in Settings dialog

### Shortcuts
| Shortcut | Action |
|---|---|
| Ctrl/⌘ + K | Toggle search |
| Ctrl/⌘ + N | New conversation |
| Esc | Close dialog / Back to list |
| Enter | Send message |
| Shift + Enter | New line |
| ↑ / ↓ | Navigate conversations (when composer not focused) |

---

## Verification

- **TypeScript**: `npx tsc --noEmit` — 0 errors
- **Django check**: `manage.py check` — 0 issues
- **pytest**: 5 tests passed
- **Vite build**: Successful (both client and SSR)
- **No regressions**: All existing functionality preserved

## Files Modified
- `backend/apps/chat/models.py` — Disappearing message fields + MessageQuerySet
- `backend/apps/chat/views.py` — Attachment handling, disappearing toggle, cleanup
- `backend/apps/chat/serializers.py` — Reply context, expires_at, disappearing_duration
- `backend/apps/chat/services.py` — Auto-compute expires_at
- `backend/apps/chat/urls.py` — New endpoints
- `backend/apps/chat/migrations/0003_*` — New migration
- `Frontend/src/lib/backend.ts` — Files in sendMessage, setDisappearingDuration
- `Frontend/src/lib/adapters.ts` — UIAttachment, reply fields, expiresAt, disappearingDuration
- `Frontend/src/lib/api-routes.ts` — DISAPPEARING route
- `Frontend/src/hooks/useKeyboardShortcuts.ts` — New hook
- `Frontend/src/components/signal/ChatWindow.tsx` — All UI features
- `Frontend/src/components/signal/SettingsDialog.tsx` — Keyboard shortcuts card
- `Frontend/src/routes/index.tsx` — All mutations and wiring
