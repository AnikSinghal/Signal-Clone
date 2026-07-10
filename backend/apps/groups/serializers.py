from rest_framework import serializers

from apps.groups.models import Group, GroupMember
from apps.users.serializers import UserListSerializer


class GroupMemberSerializer(serializers.ModelSerializer):
    user = UserListSerializer(read_only=True)

    class Meta:
        model = GroupMember
        fields = ["id", "user", "is_admin", "joined_at"]


class GroupSerializer(serializers.ModelSerializer):
    members = GroupMemberSerializer(many=True, read_only=True)

    class Meta:
        model = Group
        fields = ["id", "conversation", "name", "description", "avatar", "created_by", "created_at", "updated_at", "members"]
        read_only_fields = ["conversation", "created_by", "created_at", "updated_at"]

