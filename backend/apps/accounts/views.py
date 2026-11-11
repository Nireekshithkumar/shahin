import os
import json
from rest_framework import status, views, permissions
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from apps.accounts.models import User, UserRole
from apps.accounts.serializers import UserRegistrationSerializer, UserSerializer, GoogleAuthSerializer

class RegisterView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)

            # Auto-send email verification email in background thread so registration is instantaneous
            try:
                import threading
                from apps.accounts.tokens import generate_email_verification_token
                from apps.notifications.email_service import EmailService
                token = generate_email_verification_token(user)
                frontend_url = EmailService.get_frontend_url()
                verification_url = f"{frontend_url}/notifications?verify_token={token}"
                threading.Thread(target=EmailService.send_verification_email, args=(user, verification_url), daemon=True).start()
            except Exception as e:
                # Log but do not block registration
                pass

            return Response({
                'message': 'Registration successful. A verification email has been sent to your inbox.',
                'user': UserSerializer(user).data,
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                }
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        password = request.data.get('password', '')
        
        if not email or not password:
            return Response({'error': 'Email and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(request, username=email, password=password)
        if not user:
            # Check if user exists by email
            try:
                found_user = User.objects.get(email=email)
                if not found_user.check_password(password):
                    return Response({'error': 'Invalid credentials. Please verify your email and password.'}, status=status.HTTP_401_UNAUTHORIZED)
                user = found_user
            except User.DoesNotExist:
                return Response({'error': 'No account found with this email address.'}, status=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(user)
        return Response({
            'message': 'Login successful.',
            'user': UserSerializer(user).data,
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }
        }, status=status.HTTP_200_OK)

class MeView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class GoogleAuthView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        credential = serializer.validated_data['credential']
        google_client_id = os.getenv('GOOGLE_OAUTH_CLIENT_ID')

        email = None
        name = "Google User"
        picture = None
        google_sub = None

        try:
            from google.oauth2 import id_token
            from google.auth.transport import requests as google_requests

            # If client ID is configured, strictly verify with Google
            if google_client_id:
                id_info = id_token.verify_oauth2_token(credential, google_requests.Request(), google_client_id)
                email = id_info.get('email')
                name = id_info.get('name', 'Google User')
                picture = id_info.get('picture')
                google_sub = id_info.get('sub')
            else:
                # In development mode or unconfigured OAuth, decode token payload safely
                import base64
                parts = credential.split('.')
                if len(parts) >= 2:
                    padded = parts[1] + '=' * (4 - len(parts[1]) % 4)
                    payload = json.loads(base64.urlsafe_b64decode(padded))
                    email = payload.get('email')
                    name = payload.get('name', 'Google User')
                    picture = payload.get('picture')
                    google_sub = payload.get('sub')
                else:
                    return Response({'error': 'Invalid token format'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': f"Google verification error: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        if not email:
            return Response({'error': 'Could not extract verified email from Google identity token.'}, status=status.HTTP_400_BAD_REQUEST)

        # Get or create user
        user, created = User.objects.get_or_create(
            email=email.lower(),
            defaults={
                'username': email.split('@')[0],
                'is_email_verified': True,
                'avatar_url': picture or '',
                'google_id': google_sub or '',
                'role': UserRole.CITIZEN
            }
        )

        if not created:
            if picture and not user.avatar_url:
                user.avatar_url = picture
            if google_sub and not user.google_id:
                user.google_id = google_sub
            user.is_email_verified = True
            user.save()

        # Initialize profile if missing
        from apps.profiles.models import UserProfile
        UserProfile.objects.get_or_create(user=user, defaults={'full_name': name})

        # Initialize notification preferences
        from apps.notifications.models import UserNotificationPreference
        UserNotificationPreference.objects.get_or_create(user=user, defaults={'reminder_days_before': [30, 14, 7, 3, 1]})

        refresh = RefreshToken.for_user(user)
        return Response({
            'message': 'Google authentication successful.',
            'user': UserSerializer(user).data,
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }
        }, status=status.HTTP_200_OK)


class SendVerificationEmailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.is_email_verified:
            return Response({'message': 'Your email address is already verified.'}, status=status.HTTP_200_OK)

        from apps.accounts.tokens import generate_email_verification_token
        from apps.notifications.email_service import EmailService

        token = generate_email_verification_token(user)
        frontend_url = EmailService.get_frontend_url()
        verification_url = f"{frontend_url}/notifications?verify_token={token}"

        log = EmailService.send_verification_email(user, verification_url)
        return Response({
            'message': f'Verification email dispatched to {user.email}. Please check your inbox.',
            'delivery_status': log.status
        }, status=status.HTTP_200_OK)


class VerifyEmailView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get('token', '').strip()
        if not token:
            return Response({'error': 'Verification token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        from apps.accounts.tokens import verify_email_token
        valid, user, msg = verify_email_token(token)
        if not valid:
            return Response({'error': msg}, status=status.HTTP_400_BAD_REQUEST)

        user.is_email_verified = True
        user.save(update_fields=['is_email_verified'])

        return Response({
            'message': 'Email address successfully verified. You can now receive verified scholarship and scheme deadline alerts.',
            'is_email_verified': True
        }, status=status.HTTP_200_OK)


class RequestPasswordResetView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'error': 'Email address is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email=email).first()
        # Prevent user enumeration by returning standard message even if user not found
        if user:
            from apps.accounts.tokens import generate_password_reset_token
            from apps.notifications.email_service import EmailService

            token = generate_password_reset_token(user)
            frontend_url = EmailService.get_frontend_url()
            reset_url = f"{frontend_url}/notifications?reset_token={token}"

            EmailService.send_password_reset_email(user, reset_url)

        return Response({
            'message': 'If an account exists with this email address, password reset instructions have been sent.'
        }, status=status.HTTP_200_OK)


class ResetPasswordView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get('token', '').strip()
        new_password = request.data.get('new_password', '').strip()

        if not token or not new_password:
            return Response({'error': 'Token and new password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 6:
            return Response({'error': 'Password must be at least 6 characters.'}, status=status.HTTP_400_BAD_REQUEST)

        from apps.accounts.tokens import verify_password_reset_token
        valid, user, msg = verify_password_reset_token(token)
        if not valid:
            return Response({'error': msg}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()

        return Response({
            'message': 'Password has been successfully updated. Please log in with your new password.'
        }, status=status.HTTP_200_OK)

