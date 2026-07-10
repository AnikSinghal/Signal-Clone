from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response

from apps.common.utils import resolve_user
from apps.contacts.models import Contact
from apps.contacts.serializers import ContactCreateSerializer, ContactSerializer


class ContactListCreateView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ContactCreateSerializer
        return ContactSerializer

    def get(self, request, *args, **kwargs):
        queryset = Contact.objects.select_related("contact", "contact__profile").filter(owner=request.user)
        serializer = ContactSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request, *args, **kwargs):
        serializer = ContactCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        raw_contact = serializer.validated_data["contact"]
        nickname = serializer.validated_data.get("nickname", "")
        contact_user = resolve_user(raw_contact)
        if not contact_user:
            raise serializers.ValidationError({"contact": "User not found."})
        contact, created = Contact.objects.get_or_create(
            owner=request.user,
            contact=contact_user,
            defaults={"nickname": nickname},
        )
        if not created and nickname:
            contact.nickname = nickname
            contact.save(update_fields=["nickname", "updated_at"])
        return Response(ContactSerializer(contact).data, status=status.HTTP_201_CREATED)


class ContactDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ContactSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Contact.objects.select_related("contact", "contact__profile").filter(owner=self.request.user)
