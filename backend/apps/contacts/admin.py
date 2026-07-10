from django.contrib import admin

from apps.contacts.models import Contact


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ("owner", "contact", "blocked", "updated_at")
    search_fields = ("owner__username", "contact__username", "owner__email", "contact__email")

