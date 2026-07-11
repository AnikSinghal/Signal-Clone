from rest_framework import generics, permissions

from apps.users.models import Profile, User
from apps.users.serializers import ProfileSerializer, ProfileUpdateSerializer, UserDetailSerializer, UserListSerializer


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        profile, _ = Profile.objects.get_or_create(user=self.request.user)
        return profile

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return ProfileUpdateSerializer
        return ProfileSerializer


class UserSearchView(generics.ListAPIView):
    serializer_class = UserListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = User.objects.select_related("profile").exclude(id=self.request.user.id)
        q = self.request.query_params.get("q", "").strip()
        if not q:
            return User.objects.none()
        queryset = queryset.filter(phone__icontains=q)
        return queryset.order_by("first_name", "username")
