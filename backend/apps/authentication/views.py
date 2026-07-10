from django.contrib.auth import get_user_model
from rest_framework import permissions, status, views
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from apps.authentication.serializers import LoginSerializer, OTPRequestSerializer, OTPVerifySerializer, RegisterSerializer
from apps.authentication.services import generate_otp, get_tokens_for_user, store_otp, verify_otp
from apps.users.serializers import UserDetailSerializer

User = get_user_model()


class RegisterView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        otp = generate_otp()
        store_otp(user.email, otp)
        return Response(
            {
                "user": UserDetailSerializer(user).data,
                "otp_required": True,
                "mock_otp": otp,
            },
            status=status.HTTP_201_CREATED,
        )


class OTPRequestView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = OTPRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        identifier = serializer.validated_data["identifier"]
        code = generate_otp()
        store_otp(identifier, code)
        return Response({"otp_required": True, "mock_otp": code})


class OTPVerifyView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        identifier = serializer.validated_data["identifier"]
        code = serializer.validated_data["code"]
        if not verify_otp(identifier, code):
            return Response({"detail": "Invalid OTP."}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.filter(email__iexact=identifier).first() or User.objects.filter(phone=identifier).first()
        if not user:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        tokens = get_tokens_for_user(user)
        return Response({**tokens, "user": UserDetailSerializer(user).data})


class LoginView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        tokens = get_tokens_for_user(user)
        return Response({**tokens, "user": UserDetailSerializer(user).data})


class LogoutView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RefreshTokenView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        token = RefreshToken(refresh_token)
        return Response({"access": str(token.access_token), "refresh": str(token)})


class OTPChallengeView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        otp = generate_otp()
        store_otp(request.user.email, otp)
        return Response({"mock_otp": otp})

