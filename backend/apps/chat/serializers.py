from rest_framework import serializers

from apps.chat.models import Attachment, Conversation, ConversationMember, Message, Reaction, ReadReceipt, TypingStatus
from apps.users.serializers import UserListSerializer


class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attachment
        fields = ["id", "file", "mime_type", "file_name", "file_size", "created_at"]


class ReactionSerializer(serializers.ModelSerializer):
    user = UserListSerializer(read_only=True)

    class Meta:
        model = Reaction
        fields = ["id", "user", "emoji", "created_at"]


class ReadReceiptSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReadReceipt
        fields = ["id", "user", "read_at"]


class MessageSerializer(serializers.ModelSerializer):
    sender = UserListSerializer(read_only=True)
    attachments = AttachmentSerializer(many=True, read_only=True)
    reactions = ReactionSerializer(source="reaction_items", many=True, read_only=True)
    read_receipts = ReadReceiptSerializer(many=True, read_only=True)
    reply_to_id = serializers.SerializerMethodField()
    reply_to_content = serializers.SerializerMethodField()
    reply_to_sender = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id",
            "conversation",
            "sender",
            "content",
            "reply_to_id",
            "reply_to_content",
            "reply_to_sender",
            "edited_at",
            "deleted_at",
            "expires_at",
            "created_at",
            "updated_at",
            "attachments",
            "reactions",
            "read_receipts",
        ]

    def get_reply_to_id(self, obj):
        return str(obj.reply_to_id) if obj.reply_to_id else None

    def get_reply_to_content(self, obj):
        if obj.reply_to_id and obj.reply_to:
            return obj.reply_to.content[:200] if obj.reply_to.content else ""
        return None

    def get_reply_to_sender(self, obj):
        if obj.reply_to_id and obj.reply_to and obj.reply_to.sender:
            sender = obj.reply_to.sender
            return {
                "id": sender.id,
                "name": sender.display_name,
                "username": sender.username,
            }
        return None


class MessageCreateSerializer(serializers.Serializer):
    content = serializers.CharField(required=False, allow_blank=True)
    reply_to = serializers.UUIDField(required=False, allow_null=True)


class MessageUpdateSerializer(serializers.Serializer):
    content = serializers.CharField()


class ConversationMemberSerializer(serializers.ModelSerializer):
    user = UserListSerializer(read_only=True)

    class Meta:
        model = ConversationMember
        fields = ["id", "user", "role", "is_pinned", "is_archived", "is_muted", "unread_count", "last_read_at", "joined_at"]


class ConversationSerializer(serializers.ModelSerializer):
    members = ConversationMemberSerializer(many=True, read_only=True)
    last_message = MessageSerializer(read_only=True)
    display_title = serializers.SerializerMethodField()
    is_group = serializers.BooleanField(read_only=True)

    class Meta:
        model = Conversation
        fields = [
            "id",
            "conversation_type",
            "title",
            "display_title",
            "is_group",
            "created_by",
            "last_message",
            "last_message_at",
            "is_muted",
            "disappearing_duration",
            "created_at",
            "updated_at",
            "members",
        ]
        read_only_fields = ["created_by", "last_message", "last_message_at", "created_at", "updated_at"]

    def get_display_title(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and user.is_authenticated:
            return obj.display_title_for(user)
        return obj.title or ""
