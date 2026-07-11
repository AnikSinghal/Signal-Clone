import os

os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    os.getenv("DJANGO_SETTINGS_MODULE", "config.settings.dev"),
)

from django.core.asgi import get_asgi_application

django_asgi_app = get_asgi_application()
from channels.routing import ProtocolTypeRouter, URLRouter
from apps.websocket.middleware import JwtAuthMiddlewareStack
import config.routing

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": JwtAuthMiddlewareStack(
            URLRouter(config.routing.websocket_urlpatterns)
        ),
    }
)