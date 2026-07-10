# Signal Clone Backend

This repository contains a Django backend for the Signal-style messenger frontend that already exists in `Frontend/`.

## Overview

- Django REST Framework for HTTP APIs
- Channels for realtime websocket messaging
- JWT authentication via SimpleJWT
- SQLite for local development
- Local media uploads for avatars and attachments

## Architecture

- `backend/config` holds Django settings, ASGI/WSGI, and root URL routing
- `backend/apps/authentication` handles register, login, logout, OTP challenge/verify, and refresh
- `backend/apps/users` manages user profiles and user search
- `backend/apps/contacts` stores the contact list
- `backend/apps/chat` stores conversations, messages, reactions, receipts, typing state, and attachments
- `backend/apps/groups` stores group metadata and membership
- `backend/apps/websocket` contains the websocket auth middleware and chat consumer
- `backend/apps/common` contains shared pagination, permissions, and helpers

## Folder Structure

- `backend/`
- `backend/apps/`
- `backend/apps/authentication/`
- `backend/apps/users/`
- `backend/apps/contacts/`
- `backend/apps/chat/`
- `backend/apps/groups/`
- `backend/apps/websocket/`
- `backend/apps/common/`
- `backend/media/`
- `backend/static/`

## Database Schema

- `users.User`
- `users.Profile`
- `contacts.Contact`
- `chat.Conversation`
- `chat.ConversationMember`
- `chat.Message`
- `groups.Group`
- `groups.GroupMember`
- `chat.Attachment`
- `chat.Reaction`
- `chat.TypingStatus`
- `chat.ReadReceipt`

## API Documentation

### Authentication

- `POST /api/auth/register/`
- `POST /api/auth/otp/request/`
- `POST /api/auth/otp/verify/`
- `POST /api/auth/login/`
- `POST /api/auth/logout/`
- `POST /api/auth/refresh/`

### Users

- `GET /api/users/me/`
- `PATCH /api/users/me/`
- `GET /api/users/profile/`
- `PATCH /api/users/profile/`
- `GET /api/users/search/?q=maya`

### Contacts

- `GET /api/contacts/`
- `POST /api/contacts/`
- `GET /api/contacts/<uuid>/`
- `PATCH /api/contacts/<uuid>/`
- `DELETE /api/contacts/<uuid>/`

### Conversations and Messages

- `GET /api/chat/conversations/`
- `POST /api/chat/conversations/`
- `GET /api/chat/conversations/<uuid>/`
- `GET /api/chat/conversations/<uuid>/messages/`
- `POST /api/chat/conversations/<uuid>/messages/`
- `DELETE /api/chat/messages/<uuid>/`
- `POST /api/chat/messages/<uuid>/reactions/`
- `POST /api/chat/conversations/<uuid>/read/`
- `POST /api/chat/conversations/<uuid>/typing/`

### Groups

- `GET /api/groups/`
- `POST /api/groups/`
- `GET /api/groups/<uuid>/`
- `PATCH /api/groups/<uuid>/`
- `POST /api/groups/<uuid>/members/`

## WebSockets

- `ws://localhost:8000/ws/chat/<conversation_id>/?token=<access_token>`

Events supported:

- `message`
- `typing`
- `read`
- status broadcasts for online/typing/read changes

## Environment Variables

- `SECRET_KEY`
- `DEBUG`
- `ALLOWED_HOSTS`
- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_URL`
- `MEDIA_ROOT`
- `MEDIA_URL`

## Installation

1. Create a virtual environment.
2. Install dependencies with `pip install -r requirements.txt`.
3. Copy `.env.example` to `.env`.
4. Run migrations.
5. Seed demo data if desired.

## Running Backend

```bash
python backend/manage.py migrate
python backend/manage.py runserver
```

For Channels support in local development, `runserver` works with Daphne installed.

## Running Frontend

The frontend lives in `Frontend/`.

```bash
cd Frontend
bun install
bun run dev
```

## Creating Superuser

```bash
python backend/manage.py createsuperuser
```

## Running Seed Script

```bash
python backend/manage.py seed_demo_data
```

## Testing

```bash
pytest
```

## Deployment Notes

- Set `DEBUG=false`
- Provide a strong `SECRET_KEY`
- Replace in-memory channel layers with Redis for multi-process websocket deployments
- Serve media from durable storage in production

## Known Assumptions

- JWT refresh/logout is implemented with SimpleJWT blacklist support
- OTP is mock-only and returns the code in the API response
- WebSocket authentication uses the JWT access token in the query string
- SQLite is used for local development

