from django.contrib.auth import get_user_model
from django.test import TransactionTestCase
from channels.testing import WebsocketCommunicator

from config.asgi import application
from apps.chat.models import Conversation, ConversationMember

User = get_user_model()


class WebsocketTests(TransactionTestCase):
    async_capable = True

    def setUp(self):
        self.user = User.objects.create_user(username="ws", email="ws@example.com", password="password123")
        self.friend = User.objects.create_user(username="ws2", email="ws2@example.com", password="password123")
        self.conversation = Conversation.objects.create(conversation_type=Conversation.ConversationType.DIRECT, created_by=self.user)
        ConversationMember.objects.create(conversation=self.conversation, user=self.user)
        ConversationMember.objects.create(conversation=self.conversation, user=self.friend)

    async def test_connect_rejects_without_token(self):
        communicator = WebsocketCommunicator(application, "/ws/chat/%s/" % self.conversation.id)
        connected, _ = await communicator.connect()
        self.assertFalse(connected)
