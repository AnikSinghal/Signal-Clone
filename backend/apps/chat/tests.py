from django.urls import reverse
from rest_framework.test import APITestCase

from apps.chat.models import Conversation, ConversationMember
from apps.users.models import User


class ChatTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="alice", email="alice@example.com", password="password123")
        self.friend = User.objects.create_user(username="bob", email="bob@example.com", password="password123")
        login = self.client.post(reverse("login"), {"identifier": "alice", "password": "password123"}, format="json")
        self.client.credentials(HTTP_AUTHORIZATION="Bearer %s" % login.data["access"])

    def test_create_conversation_and_message(self):
        conv = self.client.post(reverse("conversation-list"), {"user": str(self.friend.id)}, format="json")
        self.assertEqual(conv.status_code, 201)
        conversation_id = conv.data["id"]
        msg = self.client.post(
            reverse("conversation-messages", kwargs={"conversation_id": conversation_id}),
            {"content": "Hello"},
            format="json",
        )
        self.assertEqual(msg.status_code, 201)
        self.assertEqual(msg.data["content"], "Hello")

