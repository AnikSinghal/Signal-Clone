from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import models, transaction
from django.utils import timezone

from apps.chat.models import Conversation, ConversationMember, Message, Reaction, ReadReceipt, TypingStatus


@transaction.atomic
def create_or_get_direct_conversation(user_a, user_b):
    conversation = (
        Conversation.objects.filter(conversation_type=Conversation.ConversationType.DIRECT)
        .filter(members__user=user_a)
        .filter(members__user=user_b)
        .distinct()
        .first()
    )
    if conversation:
        return conversation, False

    conversation = Conversation.objects.create(
        conversation_type=Conversation.ConversationType.DIRECT,
        created_by=user_a,
    )
    ConversationMember.objects.create(conversation=conversation, user=user_a, role=ConversationMember.Role.OWNER)
    ConversationMember.objects.create(conversation=conversation, user=user_b)
    return conversation, True


@transaction.atomic
def send_message(conversation, sender, content="", reply_to=None, attachments=None):
    now = timezone.now()
    expires_at = None
    if conversation.disappearing_duration > 0:
        from datetime import timedelta
        expires_at = now + timedelta(seconds=conversation.disappearing_duration)
    message = Message.objects.create(
        conversation=conversation,
        sender=sender,
        content=content or "",
        reply_to=reply_to,
        expires_at=expires_at,
    )
    conversation.last_message = message
    conversation.last_message_at = message.created_at
    conversation.save(update_fields=["last_message", "last_message_at", "updated_at"])
    ConversationMember.objects.filter(conversation=conversation).exclude(user=sender).update(
        unread_count=models.F("unread_count") + 1
    )
    if attachments:
        for attachment in attachments:
            attachment.message = message
            attachment.save()
    return message


def mark_conversation_read(conversation, user):
    ConversationMember.objects.filter(conversation=conversation, user=user).update(
        unread_count=0,
        last_read_at=timezone.now(),
    )
    for message in conversation.messages.exclude(sender=user):
        ReadReceipt.objects.get_or_create(message=message, user=user)


def toggle_reaction(message, user, emoji):
    existing = Reaction.objects.filter(message=message, user=user).first()
    deleted = False
    if existing:
        if existing.emoji == emoji:
            existing.delete()
            deleted = True
        else:
            existing.delete()
    if not deleted:
        Reaction.objects.create(message=message, user=user, emoji=emoji)
    return deleted


def broadcast_reaction(message, user, emoji, deleted):
    try:
        channel_layer = get_channel_layer()
        group_name = "conversation_%s" % message.conversation_id
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": "status.event",
                "payload": {
                    "type": "reaction",
                    "conversation": str(message.conversation_id),
                    "user_id": str(user.id),
                    "message_id": str(message.id),
                    "emoji": emoji,
                    "deleted": deleted,
                },
            },
        )
    except Exception:
        pass


def update_typing_status(conversation, user, is_typing):
    TypingStatus.objects.update_or_create(
        conversation=conversation,
        user=user,
        defaults={"is_typing": is_typing},
    )


def set_user_online(user, is_online):
    profile = getattr(user, "profile", None)
    if profile:
        profile.is_online = is_online
        profile.last_seen = timezone.now()
        profile.save(update_fields=["is_online", "last_seen"])
