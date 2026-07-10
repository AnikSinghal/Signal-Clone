from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import exceptions, permissions, status, views
from rest_framework.response import Response

from apps.chat.models import Conversation, ConversationMember
from apps.groups.models import Group, GroupMember
from apps.groups.serializers import GroupSerializer

User = get_user_model()


def _require_group_admin(request, group):
    membership = GroupMember.objects.filter(group=group, user=request.user).first()
    if not membership or not membership.is_admin:
        raise exceptions.PermissionDenied("Only group admins can perform this action.")


class GroupListCreateView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = (
            Group.objects.filter(members__user=request.user)
            .select_related("conversation", "created_by")
            .prefetch_related("members__user", "members__user__profile")
            .distinct()
        )
        return Response(GroupSerializer(queryset, many=True).data)

    def post(self, request):
        name = request.data.get("name")
        description = request.data.get("description", "")
        conversation = Conversation.objects.create(
            conversation_type=Conversation.ConversationType.GROUP,
            title=name,
            created_by=request.user,
        )
        ConversationMember.objects.create(conversation=conversation, user=request.user, role=ConversationMember.Role.OWNER)
        group = Group.objects.create(
            conversation=conversation,
            name=name,
            description=description,
            created_by=request.user,
        )
        GroupMember.objects.create(group=group, user=request.user, is_admin=True)
        return Response(GroupSerializer(group).data, status=status.HTTP_201_CREATED)


class GroupDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        group = get_object_or_404(
            Group.objects.filter(members__user=request.user).select_related("conversation", "created_by"),
            pk=pk,
        )
        return Response(GroupSerializer(group).data)

    def patch(self, request, pk):
        group = get_object_or_404(
            Group.objects.filter(members__user=request.user).select_related("conversation", "created_by"),
            pk=pk,
        )
        serializer = GroupSerializer(group, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class GroupMembersView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        group = get_object_or_404(Group.objects.filter(members__user=request.user), pk=pk)
        return Response(GroupSerializer(group).data["members"])

    def post(self, request, pk):
        group = get_object_or_404(Group.objects.filter(members__user=request.user), pk=pk)
        _require_group_admin(request, group)
        user_id = request.data.get("user")
        user = User.objects.filter(id=user_id).first()
        if not user:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        GroupMember.objects.get_or_create(group=group, user=user)
        ConversationMember.objects.get_or_create(conversation=group.conversation, user=user)
        return Response(GroupSerializer(group).data)


class GroupMemberRemoveView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk, user_id):
        group = get_object_or_404(Group.objects.filter(members__user=request.user), pk=pk)
        _require_group_admin(request, group)
        GroupMember.objects.filter(group=group, user_id=user_id).delete()
        ConversationMember.objects.filter(conversation=group.conversation, user_id=user_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
