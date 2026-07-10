# Signal Clone

A full-stack Signal-style messenger with a Django REST Framework backend, WebSocket real-time messaging, and a React (TanStack Start) frontend.

## Tech Stack

**Backend**
- Django REST Framework — HTTP APIs
- Django Channels — real-time WebSocket messaging
- SimpleJWT — JWT authentication (access + refresh + blacklist)
- SQLite (local development)
- Local media uploads for avatars and file attachments

**Frontend**
- React 19 + TanStack Start / TanStack Router
- TanStack React Query — server state management
- Tailwind CSS + shadcn/ui — styling and components
- Native WebSocket API — real-time updates
- Sonner — toast notifications

## Features

### Core
- **User auth** — register, login, logout, JWT refresh, OTP challenge/verify
- **Profile** — avatar upload, bio, status message, online status, last seen
- **Contacts** — add/remove contacts, contact list
- **Direct messaging** — 1:1 real-time chat with delivery and read receipts
- **Group messaging** — create groups, add/remove members, admin roles
- **Message status** — sent → delivered → read pipeline with Check/CheckCheck icons
- **Typing indicators** — real-time per-user typing state with debounce
- **Reactions** — emoji reactions on messages with aggregate counts
- **Message editing and deletion** — edit or soft-delete own messages
- **Emoji picker** — quick emoji selection in the composer
- **Search** — search messages within a conversation
- **Conversation management** — pin, archive, mute conversations
- **Dark mode** — full dark/light theme toggle persisted to localStorage
- **Mobile responsive** — slide between conversation list and chat view

### Bonus Features

#### Attachments
- Upload files via paperclip button or drag-and-drop
- Supports images, video, audio, PDF, and documents (10 MB limit, 5 files max)
- Inline image/video preview in chat, download links for documents
- MIME type validation on the server

#### Reply / Quoted Messages
- Reply to any message via the three-dot menu
- Quoted preview shown above the composer before sending
- Quoted block rendered inside the receiving message bubble
- Click the quoted block to scroll to the original message

#### Disappearing Messages
- Set a per-conversation timer: Off, 30 seconds, 5 minutes, 1 hour, 1 day
- Configurable from the conversation header menu
- New messages automatically get an `expires_at` timestamp
- Expired messages are filtered out of queries
- Hourglass icon on messages that will expire
- Server-side cleanup endpoint for bulk deletion of expired messages

#### Keyboard Shortcuts
| Shortcut | Action |
|---|---|
| `Ctrl/⌘ + K` | Toggle message search |
| `Esc` | Close dialog / Back to conversation list |
| `Enter` | Send message |
| `Shift + Enter` | New line in composer |
| `↑ / ↓` | Navigate between conversations |

All shortcuts listed in the Settings dialog.

## Architecture

```
backend/
  config/          # Django settings, ASGI/WSGI, root URL routing
  apps/
    authentication/  # register, login, logout, OTP, JWT refresh
    users/           # user profiles, search
    contacts/        # contact list
    chat/            # conversations, messages, reactions, receipts, typing, attachments
    groups/          # group metadata and membership
    websocket/       # WebSocket auth middleware and chat consumer
    common/          # shared pagination, permissions, helpers
  media/           # uploaded files (avatars, attachments)
  static/

Frontend/
  src/
    components/signal/   # UI components (ChatWindow, Sidebar, Settings, etc.)
    hooks/               # custom hooks (useChatWebSocket, useKeyboardShortcuts)
    lib/                 # API client, adapters, utilities
    routes/              # TanStack Router routes
```

## Database Schema

- `users.User`, `users.Profile`
- `contacts.Contact`
- `chat.Conversation` (with `disappearing_duration`)
- `chat.ConversationMember`
- `chat.Message` (with `expires_at`, `reply_to`, `edited_at`, `deleted_at`)
- `chat.Attachment`
- `chat.Reaction`
- `chat.TypingStatus`
- `chat.ReadReceipt`
- `groups.Group`, `groups.GroupMember`

## API Endpoints

### Authentication
- `POST /api/auth/register/`
- `POST /api/auth/login/`
- `POST /api/auth/logout/`
- `POST /api/auth/refresh/`
- `POST /api/auth/otp/request/`
- `POST /api/auth/otp/verify/`

### Users
- `GET  /api/users/me/`
- `GET  /api/users/profile/`
- `PATCH /api/users/profile/`
- `GET  /api/users/search/?q=`

### Contacts
- `GET    /api/contacts/`
- `POST   /api/contacts/`
- `DELETE /api/contacts/<uuid>/`

### Chat
- `GET    /api/chat/conversations/`
- `POST   /api/chat/conversations/`
- `GET    /api/chat/conversations/<uuid>/`
- `GET    /api/chat/conversations/<uuid>/messages/`
- `POST   /api/chat/conversations/<uuid>/messages/` — supports `multipart/form-data` for attachments
- `PATCH  /api/chat/messages/<uuid>/` — edit message content
- `DELETE /api/chat/messages/<uuid>/` — soft-delete
- `POST   /api/chat/messages/<uuid>/reactions/`
- `POST   /api/chat/conversations/<uuid>/read/`
- `POST   /api/chat/conversations/<uuid>/typing/`
- `PATCH  /api/chat/conversations/<uuid>/member/` — pin, archive, mute
- `PATCH  /api/chat/conversations/<uuid>/disappearing/` — set disappearing message duration
- `POST   /api/chat/messages/cleanup/` — bulk delete expired messages (admin only)

### Groups
- `GET    /api/groups/`
- `POST   /api/groups/`
- `GET    /api/groups/<uuid>/`
- `PATCH  /api/groups/<uuid>/`
- `POST   /api/groups/<uuid>/members/`
- `DELETE /api/groups/<uuid>/members/<user_id>/`

## WebSocket

```
ws://localhost:8000/ws/chat/<conversation_id>/?token=<access_token>
```

Events:
- `message` — new message broadcast
- `typing` — typing indicator
- `read` — read receipt
- `reaction` — reaction added/removed
- `status` — online/typing/read status updates

## Environment Variables

- `SECRET_KEY`
- `DEBUG`
- `ALLOWED_HOSTS`
- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_URL`
- `MEDIA_ROOT`
- `MEDIA_URL`

## Getting Started

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend

```bash
cd Frontend
bun install
bun run dev
```

### Seed Demo Data

```bash
python backend/manage.py seed_demo_data
```

### Tests

```bash
cd backend
pytest
```

## Deployment Notes

- Set `DEBUG=false` in production
- Provide a strong `SECRET_KEY`
- Replace in-memory channel layer with Redis for multi-process WebSocket deployments
- Serve media from durable storage (S3, GCS) in production
- Use a production database (PostgreSQL) instead of SQLite

## Known Assumptions

- JWT refresh/logout uses SimpleJWT blacklist support
- OTP is mock-only and returns the code in the API response
- WebSocket authentication uses the JWT access token in the query string
- SQLite is used for local development
- File uploads validated server-side (10 MB max, MIME type prefix matching)
