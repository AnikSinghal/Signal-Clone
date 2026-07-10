from rest_framework import serializers

from apps.users.models import Profile, User


class ProfileSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = [
            "avatar",
            "bio",
            "status_message",
            "is_online",
            "last_seen",
        ]

    def get_avatar(self, obj):
        if obj.avatar:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None


class UserListSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)
    name = serializers.SerializerMethodField()
    initials = serializers.SerializerMethodField()
    avatar_color = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "phone",
            "name",
            "initials",
            "avatar_color",
            "about",
            "profile",
        ]

    def get_name(self, obj):
        return obj.display_name

    def get_initials(self, obj):
        return obj.initials


class UserDetailSerializer(UserListSerializer):
    pass


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ["avatar", "bio", "status_message"]

