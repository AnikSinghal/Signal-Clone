from django.urls import path

from apps.authentication.views import LoginView, LogoutView, OTPChallengeView, OTPRequestView, OTPVerifyView, RefreshTokenView, RegisterView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("otp/request/", OTPRequestView.as_view(), name="otp-request"),
    path("otp/verify/", OTPVerifyView.as_view(), name="otp-verify"),
    path("otp/challenge/", OTPChallengeView.as_view(), name="otp-challenge"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("refresh/", RefreshTokenView.as_view(), name="refresh"),
]

