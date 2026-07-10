from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models

from apps.common.utils import color_from_key, initials_from_name


class User(AbstractUser):
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=32, blank=True, default="")
    about = models.CharField(max_length=255, blank=True, default="")
    avatar_color = models.CharField(max_length=32, blank=True, default="")

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["email"]

    def save(self, *args, **kwargs):
        if not self.avatar_color:
            self.avatar_color = color_from_key(self.email or self.username or self.pk)
        super().save(*args, **kwargs)

    @property
    def display_name(self):
        return self.get_full_name() or self.username or self.email

    @property
    def initials(self):
        return initials_from_name(self.display_name)


class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    bio = models.CharField(max_length=255, blank=True, default="")
    status_message = models.CharField(max_length=255, blank=True, default="")
    is_online = models.BooleanField(default=False)
    last_seen = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return "%s profile" % self.user.username

