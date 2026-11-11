from django.core.signing import TimestampSigner, BadSignature, SignatureExpired
from typing import Optional, Tuple
from apps.accounts.models import User

signer = TimestampSigner(salt='scholarsetu-account-security-salt')

def generate_email_verification_token(user: User) -> str:
    """Generates a cryptographic time-stamped token valid for 24 hours."""
    payload = {
        'user_id': user.id,
        'email': user.email,
        'purpose': 'email_verification'
    }
    return signer.sign_object(payload)

def verify_email_token(token: str, max_age_seconds: int = 86400) -> Tuple[bool, Optional[User], str]:
    """Validates the email verification token and returns (success, user, message)."""
    try:
        data = signer.unsign_object(token, max_age=max_age_seconds)
        if data.get('purpose') != 'email_verification':
            return False, None, "Invalid token purpose."
        user = User.objects.filter(id=data.get('user_id'), email=data.get('email')).first()
        if not user:
            return False, None, "User not found."
        return True, user, "Token verified successfully."
    except SignatureExpired:
        return False, None, "Verification link has expired (valid for 24 hours). Please request a new one."
    except (BadSignature, Exception):
        return False, None, "Invalid or corrupted verification link."

def generate_password_reset_token(user: User) -> str:
    """Generates a cryptographic time-stamped token valid for 1 hour."""
    payload = {
        'user_id': user.id,
        'email': user.email,
        'purpose': 'password_reset',
        'pw_stamp': user.password[:10]  # Invalidate immediately once password changes
    }
    return signer.sign_object(payload)

def verify_password_reset_token(token: str, max_age_seconds: int = 3600) -> Tuple[bool, Optional[User], str]:
    """Validates password reset token and returns (success, user, message)."""
    try:
        data = signer.unsign_object(token, max_age=max_age_seconds)
        if data.get('purpose') != 'password_reset':
            return False, None, "Invalid token purpose."
        user = User.objects.filter(id=data.get('user_id'), email=data.get('email')).first()
        if not user:
            return False, None, "User not found."
        if data.get('pw_stamp') != user.password[:10]:
            return False, None, "Reset link has already been used. Please request a new link."
        return True, user, "Token valid."
    except SignatureExpired:
        return False, None, "Password reset link has expired (valid for 1 hour). Please request a new link."
    except (BadSignature, Exception):
        return False, None, "Invalid or corrupted password reset link."
