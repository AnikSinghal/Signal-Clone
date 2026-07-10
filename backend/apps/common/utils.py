from django.utils.text import slugify


def initials_from_name(name):
    parts = [part for part in (name or "").replace("-", " ").split() if part]
    if not parts:
        return "??"
    return "".join(part[0] for part in parts[:2]).upper()


def color_from_key(key):
    palette = [
        "#EF4444",
        "#F59E0B",
        "#10B981",
        "#3B82F6",
        "#8B5CF6",
        "#EC4899",
        "#14B8A6",
        "#F97316",
        "#6366F1",
        "#84CC16",
    ]
    if not key:
        return palette[0]
    return palette[sum(ord(char) for char in str(key)) % len(palette)]


def unique_slug(base, existing_slugs):
    candidate = slugify(base)
    if candidate not in existing_slugs:
        return candidate
    index = 2
    while True:
        next_candidate = "%s-%s" % (candidate, index)
        if next_candidate not in existing_slugs:
            return next_candidate
        index += 1


def resolve_user(value):
    from django.contrib.auth import get_user_model
    User = get_user_model()

    if value is None:
        return None
    user = User.objects.filter(id=value).first() if str(value).isdigit() else None
    if not user:
        user = (
            User.objects.filter(username=value).first()
            or User.objects.filter(email__iexact=value).first()
            or User.objects.filter(phone=value).first()
        )
    return user

