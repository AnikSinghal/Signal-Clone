from django.urls import reverse
from rest_framework.test import APITestCase

from apps.users.models import User


class ContactTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="owner", email="owner@example.com", password="password123")
        self.other = User.objects.create_user(username="friend", email="friend@example.com", password="password123")
        login = self.client.post(reverse("login"), {"identifier": "owner", "password": "password123"}, format="json")
        self.client.credentials(HTTP_AUTHORIZATION="Bearer %s" % login.data["access"])

    def test_create_contact(self):
        response = self.client.post(reverse("contact-list"), {"contact": self.other.username}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["contact"], str(self.other.id))

