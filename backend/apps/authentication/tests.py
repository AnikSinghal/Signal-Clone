from django.urls import reverse
from rest_framework.test import APITestCase

from apps.users.models import User


class AuthenticationTests(APITestCase):
    def test_register_and_login(self):
        response = self.client.post(
            reverse("register"),
            {
                "username": "tester",
                "email": "tester@example.com",
                "phone": "+1 555 0000",
                "password": "password123",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertIn("mock_otp", response.data)

        login = self.client.post(
            reverse("login"),
            {"identifier": "tester", "password": "password123"},
            format="json",
        )
        self.assertEqual(login.status_code, 200)
        self.assertIn("access", login.data)
        self.assertIn("refresh", login.data)

