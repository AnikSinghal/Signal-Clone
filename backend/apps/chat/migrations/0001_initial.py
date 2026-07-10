import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Conversation",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("conversation_type", models.CharField(choices=[("dm", "Direct"), ("group", "Group")], default="dm", max_length=10)),
                ("title", models.CharField(blank=True, default="", max_length=255)),
                ("last_message_at", models.DateTimeField(blank=True, null=True)),
                ("is_muted", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("created_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="created_conversations", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-last_message_at", "-created_at"]},
        ),
        migrations.CreateModel(
            name="ConversationMember",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("role", models.CharField(choices=[("owner", "Owner"), ("admin", "Admin"), ("member", "Member")], default="member", max_length=16)),
                ("is_pinned", models.BooleanField(default=False)),
                ("is_archived", models.BooleanField(default=False)),
                ("is_muted", models.BooleanField(default=False)),
                ("unread_count", models.PositiveIntegerField(default=0)),
                ("last_read_at", models.DateTimeField(blank=True, null=True)),
                ("joined_at", models.DateTimeField(auto_now_add=True)),
                ("conversation", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="members", to="chat.conversation")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="conversation_memberships", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-joined_at"], "unique_together": {("conversation", "user")}},
        ),
        migrations.CreateModel(
            name="Message",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("content", models.TextField(blank=True, default="")),
                ("edited_at", models.DateTimeField(blank=True, null=True)),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("conversation", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="messages", to="chat.conversation")),
                ("reply_to", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="replies", to="chat.message")),
                ("sender", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="sent_messages", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["created_at"]},
        ),
        migrations.AddField(
            model_name="conversation",
            name="last_message",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="chat.message"),
        ),
        migrations.CreateModel(
            name="Attachment",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("file", models.FileField(upload_to="attachments/%Y/%m/")),
                ("mime_type", models.CharField(blank=True, default="", max_length=120)),
                ("file_name", models.CharField(blank=True, default="", max_length=255)),
                ("file_size", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("message", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="attachments", to="chat.message")),
            ],
        ),
        migrations.CreateModel(
            name="Reaction",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("emoji", models.CharField(max_length=16)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("message", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="reaction_items", to="chat.message")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="message_reactions", to=settings.AUTH_USER_MODEL)),
            ],
            options={"unique_together": {("message", "user", "emoji")}},
        ),
        migrations.CreateModel(
            name="TypingStatus",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("is_typing", models.BooleanField(default=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("conversation", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="typing_statuses", to="chat.conversation")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="typing_statuses", to=settings.AUTH_USER_MODEL)),
            ],
            options={"unique_together": {("conversation", "user")}},
        ),
        migrations.CreateModel(
            name="ReadReceipt",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("read_at", models.DateTimeField(auto_now_add=True)),
                ("message", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="read_receipts", to="chat.message")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="message_read_receipts", to=settings.AUTH_USER_MODEL)),
            ],
            options={"unique_together": {("message", "user")}},
        ),
    ]

