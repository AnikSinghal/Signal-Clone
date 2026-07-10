from rest_framework import serializers

from apps.contacts.models import Contact
from apps.users.serializers import UserListSerializer


class ContactSerializer(serializers.ModelSerializer):
    contact = serializers.CharField(source="contact_id", read_only=True)
    contact_user = UserListSerializer(source="contact", read_only=True)

    class Meta:
        model = Contact
        fields = [
            "id",
            "contact",
            "contact_user",
            "nickname",
            "blocked",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class ContactCreateSerializer(serializers.Serializer):
    contact = serializers.CharField()
    nickname = serializers.CharField(required=False, allow_blank=True)
