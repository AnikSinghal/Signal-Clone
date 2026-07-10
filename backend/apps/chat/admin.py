from django.contrib import admin

from apps.chat.models import Attachment, Conversation, ConversationMember, Message, Reaction, ReadReceipt, TypingStatus


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ("id", "conversation_type", "title", "created_by", "last_message_at")
    search_fields = ("title", "created_by__username")


@admin.register(ConversationMember)
class ConversationMemberAdmin(admin.ModelAdmin):
    list_display = ("conversation", "user", "role", "unread_count", "is_pinned", "is_archived")


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "conversation", "sender", "created_at")
    search_fields = ("content", "sender__username")


admin.site.register(Attachment)
admin.site.register(Reaction)
admin.site.register(ReadReceipt)
admin.site.register(TypingStatus)

