from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from apps.accounts.views import (
    RegisterView, LoginView, MeView, GoogleAuthView,
    SendVerificationEmailView, VerifyEmailView,
    RequestPasswordResetView, ResetPasswordView,
    ChangePasswordView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('login/', LoginView.as_view(), name='auth-login'),
    path('me/', MeView.as_view(), name='auth-me'),
    path('change-password/', ChangePasswordView.as_view(), name='auth-change-password'),
    path('google/', GoogleAuthView.as_view(), name='auth-google'),
    path('token/refresh/', TokenRefreshView.as_view(), name='auth-token-refresh'),
    path('send-verification-email/', SendVerificationEmailView.as_view(), name='auth-send-verification-email'),
    path('verify-email/', VerifyEmailView.as_view(), name='auth-verify-email'),
    path('request-password-reset/', RequestPasswordResetView.as_view(), name='auth-request-password-reset'),
    path('reset-password/', ResetPasswordView.as_view(), name='auth-reset-password'),

]
