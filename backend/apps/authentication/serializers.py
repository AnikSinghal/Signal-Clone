from django.contrib.auth import authenticate, get_user_model
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from apps.users.models import Profile
from apps.users.serializers import UserDetailSerializer

User = get_user_model()


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField()
    email = serializers.EmailField()
    phone = serializers.CharField(required=True)
    first_name = serializers.CharField(required=False, allow_blank=True, default="")
    last_name = serializers.CharField(required=False, allow_blank=True, default="")
    password = serializers.CharField(write_only=True)

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError(_("Password must be at least 8 characters long."))
        return value

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(_("A user with this email already exists."))
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User.objects.create_user(password=password, **validated_data)
        Profile.objects.get_or_create(user=user)
        return user


class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        identifier = attrs.get("identifier")
        password = attrs.get("password")
        user = authenticate(username=identifier, password=password)
        if not user:
            user = User.objects.filter(email__iexact=identifier).first() or User.objects.filter(phone=identifier).first()
            if user:
                user = authenticate(username=user.username, password=password)
        if not user:
            raise serializers.ValidationError(_("Invalid credentials."))
        attrs["user"] = user
        return attrs


class OTPRequestSerializer(serializers.Serializer):
    identifier = serializers.CharField()


class OTPVerifySerializer(serializers.Serializer):
    identifier = serializers.CharField()
    code = serializers.CharField()


class TokenPairSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()
    user = UserDetailSerializer()
