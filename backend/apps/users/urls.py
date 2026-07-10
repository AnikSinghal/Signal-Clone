from django.urls import path

from apps.users.views import MeView, ProfileView, UserSearchView

urlpatterns = [
    path("me/", MeView.as_view(), name="me"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path("search/", UserSearchView.as_view(), name="user-search"),
]

