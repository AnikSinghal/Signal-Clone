import uuid

from django.conf import settings
from django.db import models


class Contact(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="contacts")
    contact = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="contacted_by")
    nickname = models.CharField(max_length=120, blank=True, default="")
    blocked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("owner", "contact")
        ordering = ["-updated_at"]

    def __str__(self):
        return "%s -> %s" % (self.owner_id, self.contact_id)

