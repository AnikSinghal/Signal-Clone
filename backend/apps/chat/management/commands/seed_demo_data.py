import random
from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from PIL import Image

from apps.chat.models import Conversation, ConversationMember, Message, ReadReceipt
from apps.chat.services import create_or_get_direct_conversation
from apps.contacts.models import Contact
from apps.groups.models import Group, GroupMember

User = get_user_model()


class Command(BaseCommand):
    help = "Seed demo data for the Signal clone backend."

    def handle(self, *args, **options):
        with transaction.atomic():
            self.seed_users()
            self.seed_contacts()
            self.seed_conversations_and_messages()
            self.stdout.write(self.style.SUCCESS("Seed data created successfully."))

    def seed_users(self):
        samples = [
            ("maya", "Maya", "Johnson", "maya@example.com", "+1 555 0101"),
            ("kai", "Kai", "Guo", "kai@example.com", "+1 555 0102"),
            ("paige", "Paige", "Hall", "paige@example.com", "+1 555 0103"),
            ("michael", "Michael", "Lundberg", "michael@example.com", "+1 555 0104"),
            ("matthew", "Matthew", "Hall", "matthew@example.com", "+1 555 0105"),
            ("mia", "Mia", "Vendel", "mia@example.com", "+1 555 0106"),
            ("ben", "Ben", "Carter", "ben@example.com", "+1 555 0107"),
            ("katie", "Katie", "Reeves", "katie@example.com", "+1 555 0108"),
            ("luis", "Luis", "Uptodown", "luis@example.com", "+1 555 0109"),
            ("nelson", "Nelson", "de Benito", "nelson@example.com", "+1 555 0110"),
        ]
        self.users = []
        for username, first_name, last_name, email, phone in samples:
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "first_name": first_name,
                    "last_name": last_name,
                    "email": email,
                    "phone": phone,
                },
            )
            if created:
                user.set_password("password123")
                user.about = "Signal is freedom."
                user.save()
            self.users.append(user)

        # Create a tiny avatar placeholder for demo purposes.
        for user in self.users:
            profile = user.profile
            if not profile.avatar:
                image = Image.new("RGB", (128, 128), color=(random.randint(30, 220), random.randint(30, 220), random.randint(30, 220)))
                buffer = BytesIO()
                image.save(buffer, format="PNG")
                profile.avatar.save("%s.png" % user.username, ContentFile(buffer.getvalue()), save=True)

    def seed_contacts(self):
        me = self.users[0]
        for contact in self.users[1:]:
            Contact.objects.get_or_create(owner=me, contact=contact)

    def seed_conversations_and_messages(self):
        dm_pairs = [(self.users[0], self.users[1]), (self.users[0], self.users[2]), (self.users[0], self.users[3])]
        conversations = []

        for a, b in dm_pairs:
            conversation, _ = create_or_get_direct_conversation(a, b)
            conversations.append(conversation)

        group_specs = [
            ("Roommates", self.users[0:4]),
            ("Family", self.users[0:6]),
            ("Design Team", [self.users[0], self.users[1], self.users[3], self.users[8]]),
            ("Book Club", [self.users[0], self.users[2], self.users[5], self.users[7]]),
            ("Weekend Crew", [self.users[0], self.users[4], self.users[6], self.users[9]]),
        ]

        for name, members in group_specs:
            conversation = Conversation.objects.create(
                conversation_type=Conversation.ConversationType.GROUP,
                title=name,
                created_by=members[0],
            )
            Group.objects.get_or_create(
                conversation=conversation,
                defaults={"name": name, "description": "%s group" % name, "created_by": members[0]},
            )
            group = conversation.group
            for idx, member in enumerate(members):
                ConversationMember.objects.get_or_create(
                    conversation=conversation,
                    user=member,
                    defaults={"role": ConversationMember.Role.OWNER if idx == 0 else ConversationMember.Role.MEMBER},
                )
                GroupMember.objects.get_or_create(group=group, user=member, defaults={"is_admin": idx == 0})
            conversations.append(conversation)

        sample_texts = [
            "Hey! How's it going?",
            "Did you see the game last night?",
            "That was wild 😂",
            "Let's grab dinner together this week.",
            "Yes, that works for me.",
            "What sounds good?",
            "Perfect.",
            "I'll book it for 7:30.",
            "Can't wait 🎉",
            "On it.",
            "Sure, red or white?",
            "Whatever pairs well with pasta.",
            "Sounds good to me.",
            "See you tomorrow!",
        ]

        for conversation in conversations:
            members = list(conversation.members.select_related("user").all())
            if len(members) < 2:
                continue
            total = random.randint(80, 130)
            last_message = None
            for i in range(total):
                sender_member = random.choice(members)
                text = random.choice(sample_texts)
                message = Message.objects.create(
                    conversation=conversation,
                    sender=sender_member.user,
                    content=text,
                )
                last_message = message
                if sender_member.user == members[0].user:
                    for other_member in members[1:]:
                        ReadReceipt.objects.get_or_create(message=message, user=other_member.user)
            if last_message:
                conversation.last_message = last_message
                conversation.last_message_at = last_message.created_at
                conversation.save(update_fields=["last_message", "last_message_at", "updated_at"])
