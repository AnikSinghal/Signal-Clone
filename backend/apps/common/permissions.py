from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsOwnerOrReadOnly(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return getattr(obj, "user_id", None) == getattr(request.user, "id", None)


class IsConversationMember(BasePermission):
    def has_object_permission(self, request, view, obj):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        if hasattr(obj, "members"):
            return obj.members.filter(user=user).exists()
        if hasattr(obj, "conversation"):
            return obj.conversation.members.filter(user=user).exists()
        return False

