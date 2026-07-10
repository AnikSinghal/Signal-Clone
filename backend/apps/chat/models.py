import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone


class MessageQuerySet(models.QuerySet):
    def not_expired(self):
        now = timezone.now()
        return self.filter(Q(expires_at__isnull=True) | Q(expires_at__gt=now))


class Conversation(models.Model):
    class ConversationType(models.TextChoices):
        DIRECT = "dm", "Direct"
        GROUP = "group", "Group"

    class DisappearingDuration(models.IntegerChoices):
        OFF = 0, "Off"
        THIRTY_SECONDS = 30, "30 seconds"
        FIVE_MINUTES = 300, "5 minutes"
        ONE_HOUR = 3600, "1 hour"
        ONE_DAY = 86400, "1 day"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation_type = models.CharField(max_length=10, choices=ConversationType.choices, default=ConversationType.DIRECT)
    title = models.CharField(max_length=255, blank=True, default="")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="created_conversations")
    last_message = models.ForeignKey("Message", on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    last_message_at = models.DateTimeField(blank=True, null=True)
    is_muted = models.BooleanField(default=False)
    disappearing_duration = models.IntegerField(choices=DisappearingDuration.choices, default=DisappearingDuration.OFF)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-last_message_at", "-created_at"]

    def __str__(self):
        return self.title or str(self.id)

    @property
    def is_group(self):
        return self.conversation_type == self.ConversationType.GROUP

    @property
    def members_qs(self):
        return self.members.select_related("user", "user__profile")

    def display_title_for(self, user):
        if self.title:
            return self.title
        if self.is_group:
            return "Group"
        other = self.members.exclude(user=user).select_related("user").first()
        return other.user.display_name if other else "Conversation"


class ConversationMember(models.Model):
    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        ADMIN = "admin", "Admin"
        MEMBER = "member", "Member"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="members")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="conversation_memberships")
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.MEMBER)
    is_pinned = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    is_muted = models.BooleanField(default=False)
    unread_count = models.PositiveIntegerField(default=0)
    last_read_at = models.DateTimeField(blank=True, null=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("conversation", "user")
        ordering = ["-joined_at"]


class Message(models.Model):
    class Status(models.TextChoices):
        SENT = "sent", "Sent"
        DELIVERED = "delivered", "Delivered"
        READ = "read", "Read"

    objects = MessageQuerySet.as_manager()

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_messages")
    content = models.TextField(blank=True, default="")
    reply_to = models.ForeignKey("self", on_delete=models.SET_NULL, null=True, blank=True, related_name="replies")
    edited_at = models.DateTimeField(blank=True, null=True)
    deleted_at = models.DateTimeField(blank=True, null=True)
    expires_at = models.DateTimeField(blank=True, null=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]

    @property
    def has_attachments(self):
        return self.attachments.exists()


class Attachment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="attachments")
    file = models.FileField(upload_to="attachments/%Y/%m/")
    mime_type = models.CharField(max_length=120, blank=True, default="")
    file_name = models.CharField(max_length=255, blank=True, default="")
    file_size = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)


class Reaction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="reaction_items")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="message_reactions")
    emoji = models.CharField(max_length=16)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("message", "user")


class TypingStatus(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="typing_statuses")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="typing_statuses")
    is_typing = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("conversation", "user")


class ReadReceipt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="read_receipts")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="message_read_receipts")
    read_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("message", "user")

