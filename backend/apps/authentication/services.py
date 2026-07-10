import random
import string

from django.core.cache import cache
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken


def generate_otp(length=6):
    return "".join(random.choice(string.digits) for _ in range(length))


def store_otp(identifier, code, ttl_seconds=300):
    cache.set("otp:%s" % identifier, {"code": code, "created_at": timezone.now().isoformat()}, ttl_seconds)


def verify_otp(identifier, code):
    payload = cache.get("otp:%s" % identifier)
    if not payload:
        return False
    return payload.get("code") == code


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }

