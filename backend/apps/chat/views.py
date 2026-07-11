import mimetypes

from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, serializers, status, views
from rest_framework.response import Response

from apps.chat.models import Attachment, Conversation, ConversationMember, Message
from apps.chat.serializers import ConversationSerializer, MessageSerializer, MessageUpdateSerializer
from apps.chat.services import broadcast_reaction, create_or_get_direct_conversation, mark_conversation_read, send_message, toggle_reaction, update_typing_status
from apps.common.utils import resolve_user

MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_MIME_PREFIXES = ("image/", "video/", "audio/", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument", "text/")


class ConversationListCreateView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = (
            Conversation.objects.filter(members__user=request.user)
            .select_related("created_by", "last_message", "last_message__sender")
            .prefetch_related("members__user", "members__user__profile")
            .distinct()
            .order_by("-last_message_at", "-created_at")
        )
        return Response(ConversationSerializer(queryset, many=True, context={"request": request}).data)

    def post(self, request):
        user_ref = request.data.get("user")
        title = request.data.get("title", "")
        if user_ref:
            other = resolve_user(user_ref)
            if not other:
                raise generics.NotFound("User not found.")
            conversation, _ = create_or_get_direct_conversation(request.user, other)
            return Response(ConversationSerializer(conversation, context={"request": request}).data, status=status.HTTP_201_CREATED)
        conversation = Conversation.objects.create(
            conversation_type=Conversation.ConversationType.GROUP,
            title=title or "New conversation",
            created_by=request.user,
        )
        ConversationMember.objects.create(conversation=conversation, user=request.user, role=ConversationMember.Role.OWNER)
        return Response(ConversationSerializer(conversation, context={"request": request}).data, status=status.HTTP_201_CREATED)


class ConversationDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        conversation = get_object_or_404(Conversation.objects.select_related("created_by", "last_message"), pk=pk, members__user=request.user)
        return Response(ConversationSerializer(conversation, context={"request": request}).data)


class MessageListCreateView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, conversation_id):
        conversation = get_object_or_404(Conversation, pk=conversation_id, members__user=request.user)
        queryset = (
            Message.objects.filter(conversation=conversation)
            .not_expired()
            .select_related("sender", "sender__profile", "reply_to")
            .prefetch_related("attachments", "reaction_items__user", "read_receipts__user")
        )
        return Response(MessageSerializer(queryset, many=True, context={"request": request}).data)

    def post(self, request, conversation_id):
        conversation = get_object_or_404(Conversation, pk=conversation_id, members__user=request.user)
        content = request.data.get("content", "")
        reply_to = request.data.get("reply_to")
        reply_obj = None
        if reply_to:
            reply_obj = Message.objects.filter(pk=reply_to, conversation=conversation).first()

        files = request.FILES.getlist("files")
        attachments = []
        for f in files:
            if f.size > MAX_ATTACHMENT_SIZE:
                raise serializers.ValidationError(f"File '{f.name}' exceeds the 10 MB size limit.")
            mime = f.content_type or mimetypes.guess_type(f.name)[0] or "application/octet-stream"
            if not any(mime.startswith(prefix) for prefix in ALLOWED_MIME_PREFIXES):
                raise serializers.ValidationError(f"File type '{mime}' is not allowed.")
            attachment = Attachment(
                file=f,
                mime_type=mime,
                file_name=f.name,
                file_size=f.size,
            )
            attachments.append(attachment)

        message = send_message(conversation, request.user, content=content, reply_to=reply_obj, attachments=attachments if attachments else None)
        return Response(MessageSerializer(message, context={"request": request}).data, status=status.HTTP_201_CREATED)


class MessageDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        from django.utils import timezone as tz
        message = get_object_or_404(Message, pk=pk, sender=request.user, deleted_at__isnull=True)
        serializer = MessageUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message.content = serializer.validated_data["content"]
        message.edited_at = tz.now()
        message.save(update_fields=["content", "edited_at", "updated_at"])
        return Response(MessageSerializer(message, context={"request": request}).data)

    def delete(self, request, pk):
        from django.utils import timezone as tz
        message = get_object_or_404(Message, pk=pk, sender=request.user)
        message.deleted_at = tz.now()
        message.content = ""
        message.save(update_fields=["deleted_at", "content", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class MessageReactionView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        message = get_object_or_404(Message, pk=pk, conversation__members__user=request.user)
        emoji = request.data.get("emoji", "👍")
        deleted = toggle_reaction(message, request.user, emoji)
        broadcast_reaction(message, request.user, emoji, deleted)
        if deleted:
            return Response({"deleted": True}, status=status.HTTP_200_OK)
        return Response({"created": True, "emoji": emoji}, status=status.HTTP_201_CREATED)


class ReadReceiptView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, conversation_id):
        conversation = get_object_or_404(Conversation, pk=conversation_id, members__user=request.user)
        mark_conversation_read(conversation, request.user)
        return Response({"status": "ok"})


class TypingStatusView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, conversation_id):
        conversation = get_object_or_404(Conversation, pk=conversation_id, members__user=request.user)
        is_typing = bool(request.data.get("is_typing", True))
        update_typing_status(conversation, request.user, is_typing)
        return Response({"is_typing": is_typing})


class ConversationMemberUpdateView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, conversation_id):
        conversation = get_object_or_404(Conversation, pk=conversation_id, members__user=request.user)
        member = get_object_or_404(ConversationMember, conversation=conversation, user=request.user)
        allowed_fields = {"is_archived", "is_pinned", "is_muted"}
        updates = {k: v for k, v in request.data.items() if k in allowed_fields}
        if not updates:
            raise serializers.ValidationError("No valid fields to update.")
        for key, value in updates.items():
            setattr(member, key, bool(value))
        member.save(update_fields=list(updates.keys()))
        return Response({"status": "ok", **{k: bool(getattr(member, k)) for k in updates}})


class DisappearingMessagesView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, conversation_id):
        conversation = get_object_or_404(Conversation, pk=conversation_id, members__user=request.user)
        duration = int(request.data.get("duration", 0))
        valid = [c for c, _ in Conversation.DisappearingDuration.choices]
        if duration not in valid:
            raise serializers.ValidationError("Invalid duration value.")
        conversation.disappearing_duration = duration
        conversation.save(update_fields=["disappearing_duration", "updated_at"])
        return Response({"disappearing_duration": duration})


class CleanupExpiredMessagesView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from django.utils import timezone as tz
        if not request.user.is_staff:
            return Response(status=status.HTTP_403_FORBIDDEN)
        deleted, _ = Message.objects.filter(expires_at__isnull=False, expires_at__lte=tz.now()).delete()
        return Response({"deleted": deleted})
