# Signal Clone

A full-stack Signal-style messenger with a Django REST Framework backend, WebSocket real-time messaging, and a React (TanStack Start) frontend.

## Tech Stack

**Backend**
- Django 5.x + Django REST Framework — HTTP APIs
- Django Channels + Daphne — ASGI server and WebSocket support
- SimpleJWT — JWT authentication (access + refresh + blacklist)
- SQLite (local development) / PostgreSQL (production)
- Pillow — image processing for avatars and attachments

**Frontend**
- React 19 + TanStack Start / TanStack Router — SSR-capable SPA
- TanStack React Query — server state management
- Tailwind CSS v4 + shadcn/ui — styling and components
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
- **Attachments** — file upload via paperclip or drag-and-drop (images, video, audio, PDF, documents; 10 MB limit, 5 files max)
- **Reply / Quoted Messages** — quote-reply to any message with scroll-to-original
- **Disappearing Messages** — per-conversation timer (Off, 30s, 5m, 1h, 1d)
- **Keyboard Shortcuts** — Ctrl/⌘+K (search), Esc (close), ↑/↓ (navigate), Enter (send)

## Architecture

```
backend/
  config/            # Django settings (base/dev/prod), ASGI/WSGI, root URL routing
  apps/
    authentication/  # register, login, logout, OTP, JWT refresh
    users/           # user profiles, search
    contacts/        # contact list
    chat/            # conversations, messages, reactions, receipts, typing, attachments
    groups/          # group metadata and membership
    websocket/       # WebSocket auth middleware and chat consumer
    common/          # shared utilities
  media/             # uploaded files (avatars, attachments)
  static/

Frontend/
  src/
    components/signal/   # UI components (ChatWindow, Sidebar, Settings, etc.)
    hooks/               # custom hooks (useChatWebSocket, useKeyboardShortcuts)
    lib/                 # API client, adapters, utilities, constants
    routes/              # TanStack Router routes
    styles.css           # Tailwind CSS entry point
```

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `SECRET_KEY` | **Yes** | dev placeholder | Django secret key |
| `DEBUG` | No | `true` | Enable debug mode |
| `DJANGO_SETTINGS_MODULE` | No | `config.settings.dev` | Settings module (`config.settings.prod` for production) |
| `ALLOWED_HOSTS` | No | `localhost,127.0.0.1,testserver` | Comma-separated allowed hosts |
| `DATABASE_URL` | No | `sqlite:///db.sqlite3` | Database URL (supports PostgreSQL via `postgres://` or `postgresql://`) |
| `JWT_SECRET` | **Yes** | dev placeholder | JWT signing key |
| `JWT_ACCESS_MINUTES` | No | `30` | Access token lifetime |
| `JWT_REFRESH_DAYS` | No | `7` | Refresh token lifetime |
| `FRONTEND_URL` | No | `http://localhost:5173` | Frontend origin for CORS/redirects |
| `CORS_ALLOWED_ORIGINS` | No | localhost variants | Comma-separated CORS origins |
| `CSRF_TRUSTED_ORIGINS` | No | localhost variants | Comma-separated CSRF trusted origins |
| `STATIC_ROOT` | No | `static` | Static files output directory |
| `MEDIA_ROOT` | No | `backend/media` | Media uploads directory |
| `MEDIA_URL` | No | `/media/` | Media URL path |

### Frontend (`Frontend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | No | `http://localhost:8000` | Backend API base URL |

## Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+ (or npm)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt   # For development with linting: pip install -r requirements-dev.txt
cp ../.env.example .env           # Edit with your own secrets
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver        # Starts on http://localhost:8000
```

### Frontend

```bash
cd Frontend
npm install
cp .env.example .env              # Edit VITE_API_URL if backend runs on a different port
npm run dev                       # Starts on http://localhost:5173
```

### Seed Demo Data

```bash
python backend/manage.py seed_demo_data
```

### Tests

```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

## Build Commands

```bash
# Frontend production build
cd Frontend && npm run build

# Backend Django system check
cd backend && python manage.py check

# TypeScript type checking
cd Frontend && npx tsc --noEmit
```

## Production Deployment

### Backend

1. Set environment variables (see table above):
   - `DJANGO_SETTINGS_MODULE=config.settings.prod`
   - `DEBUG=false`
   - Strong `SECRET_KEY` and `JWT_SECRET`
   - `ALLOWED_HOSTS` with your domain
   - `DATABASE_URL` pointing to PostgreSQL
   - `CORS_ALLOWED_ORIGINS` with your frontend domain
   - `CSRF_TRUSTED_ORIGINS` with your frontend domain

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run migrations and collect static:
   ```bash
   python manage.py migrate
   python manage.py collectstatic
   ```

4. Run with Daphne (ASGI) for WebSocket support:
   ```bash
   daphne -b 0.0.0.0 -p 8000 config.asgi:application
   ```

### Frontend

1. Set `VITE_API_URL` to your backend's public URL.
2. Build:
   ```bash
   npm run build
   ```
3. Deploy the `.output/` directory to your hosting provider.

### Production Notes

- Replace the in-memory channel layer with **Redis** for multi-process WebSocket deployments (`channels_redis`)
- Serve media files from durable storage (S3, GCS, or equivalent) via `django-storages`
- Use **PostgreSQL** instead of SQLite for production
- The WebSocket URL is constructed dynamically from `VITE_API_URL` and `window.location.protocol` (auto-selects `ws://` or `wss://`)

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

## API Overview

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
ws[s]://<host>/ws/chat/<conversation_id>/?token=<access_token>
```

The protocol (`ws://` or `wss://`) is selected automatically based on the page's protocol.

**Events:**
| Direction | Type | Payload |
|---|---|---|
| Server → Client | `message` | `{ id, sender, content, created_at }` |
| Server → Client | `typing` | `{ user_id, value }` |
| Server → Client | `reaction` | `{ user_id, emoji, deleted }` |
| Server → Client | `read` | `{ user_id }` |
| Client → Server | `message` | `{ type: "message", content }` |
| Client → Server | `typing` | `{ type: "typing", is_typing }` |
| Client → Server | `read` | `{ type: "read" }` |
