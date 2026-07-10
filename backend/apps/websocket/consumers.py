from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from apps.chat.models import Conversation
from apps.chat.services import mark_conversation_read, send_message, set_user_online, update_typing_status


class ChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.conversation_id = self.scope["url_route"]["kwargs"]["conversation_id"]
        self.user = self.scope.get("user")
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return
        if not await self.is_member():
            await self.close(code=4003)
            return
        self.group_name = "conversation_%s" % self.conversation_id
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self.set_online(True)
        await self.broadcast_status("online", True)

    async def disconnect(self, code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
        await self.set_online(False)
        await self.broadcast_status("online", False)

    async def receive_json(self, content, **kwargs):
        event = content.get("type")
        if event == "message":
            payload = await self.create_message(content)
            await self.channel_layer.group_send(self.group_name, {"type": "chat.message", "payload": payload})
        elif event == "typing":
            is_typing = bool(content.get("is_typing", True))
            await self.set_typing(is_typing)
            await self.broadcast_status("typing", is_typing)
        elif event == "read":
            await self.mark_read()
            await self.broadcast_status("read", True)

    async def chat_message(self, event):
        await self.send_json(event["payload"])

    async def status_event(self, event):
        await self.send_json(event["payload"])

    @database_sync_to_async
    def is_member(self):
        return Conversation.objects.filter(pk=self.conversation_id, members__user=self.user).exists()

    @database_sync_to_async
    def create_message(self, content):
        conversation = Conversation.objects.get(pk=self.conversation_id)
        message = send_message(conversation, self.user, content=content.get("content", ""))
        return {
            "type": "message",
            "message": {
                "id": str(message.id),
                "conversation": str(conversation.id),
                "sender": {
                    "id": str(self.user.id),
                    "username": self.user.username,
                    "email": self.user.email,
                    "name": self.user.display_name,
                    "initials": self.user.initials,
                    "about": self.user.about,
                    "avatar_color": self.user.avatar_color,
                },
                "content": message.content,
                "created_at": message.created_at.isoformat(),
            },
        }

    @database_sync_to_async
    def set_typing(self, is_typing):
        update_typing_status(
            Conversation.objects.get(pk=self.conversation_id),
            self.user,
            is_typing,
        )

    @database_sync_to_async
    def set_online(self, is_online):
        set_user_online(self.user, is_online)

    @database_sync_to_async
    def mark_read(self):
        conversation = Conversation.objects.get(pk=self.conversation_id)
        mark_conversation_read(conversation, self.user)

    async def broadcast_status(self, kind, value):
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "status.event",
                "payload": {
                    "type": kind,
                    "conversation": self.conversation_id,
                    "user_id": str(self.user.id),
                    "value": value,
                },
            },
        )
