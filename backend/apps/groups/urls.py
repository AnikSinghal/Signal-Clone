from django.urls import path

from apps.groups.views import GroupDetailView, GroupListCreateView, GroupMemberRemoveView, GroupMembersView

urlpatterns = [
    path("", GroupListCreateView.as_view(), name="group-list"),
    path("<uuid:pk>/", GroupDetailView.as_view(), name="group-detail"),
    path("<uuid:pk>/members/", GroupMembersView.as_view(), name="group-members"),
    path("<uuid:pk>/members/<int:user_id>/", GroupMemberRemoveView.as_view(), name="group-member-remove"),
]
