from django.contrib import admin

from apps.users.models import Profile, User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("id", "username", "email", "phone", "is_staff")
    search_fields = ("username", "email", "phone", "first_name", "last_name")


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "is_online", "last_seen")
    search_fields = ("user__username", "user__email")

