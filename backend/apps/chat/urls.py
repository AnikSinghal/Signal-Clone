from django.urls import path

from apps.chat.views import (
    CleanupExpiredMessagesView,
    ConversationDetailView,
    ConversationListCreateView,
    ConversationMemberUpdateView,
    DisappearingMessagesView,
    MessageDetailView,
    MessageListCreateView,
    MessageReactionView,
    ReadReceiptView,
    TypingStatusView,
)

urlpatterns = [
    path("conversations/", ConversationListCreateView.as_view(), name="conversation-list"),
    path("conversations/<uuid:pk>/", ConversationDetailView.as_view(), name="conversation-detail"),
    path("conversations/<uuid:conversation_id>/messages/", MessageListCreateView.as_view(), name="conversation-messages"),
    path("messages/<uuid:pk>/", MessageDetailView.as_view(), name="message-detail"),
    path("messages/<uuid:pk>/reactions/", MessageReactionView.as_view(), name="message-reaction"),
    path("conversations/<uuid:conversation_id>/read/", ReadReceiptView.as_view(), name="conversation-read"),
    path("conversations/<uuid:conversation_id>/typing/", TypingStatusView.as_view(), name="conversation-typing"),
    path("conversations/<uuid:conversation_id>/member/", ConversationMemberUpdateView.as_view(), name="conversation-member-update"),
    path("conversations/<uuid:conversation_id>/disappearing/", DisappearingMessagesView.as_view(), name="conversation-disappearing"),
    path("messages/cleanup/", CleanupExpiredMessagesView.as_view(), name="message-cleanup"),
]

