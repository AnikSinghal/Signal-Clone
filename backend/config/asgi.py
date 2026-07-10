"""ASGI config for Signal Clone backend."""

import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

from apps.websocket.middleware import JwtAuthMiddlewareStack
import config.routing

django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": JwtAuthMiddlewareStack(URLRouter(config.routing.websocket_urlpatterns)),
    }
)
