from django.urls import reverse
from rest_framework.test import APITestCase

from apps.users.models import User


class GroupTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="g1", email="g1@example.com", password="password123")
        login = self.client.post(reverse("login"), {"identifier": "g1", "password": "password123"}, format="json")
        self.client.credentials(HTTP_AUTHORIZATION="Bearer %s" % login.data["access"])

    def test_create_group(self):
        response = self.client.post(reverse("group-list"), {"name": "Roommates", "description": "Test"}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["name"], "Roommates")

