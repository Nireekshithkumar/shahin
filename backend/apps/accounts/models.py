from django.contrib.auth.models import AbstractUser
from django.db import models

class UserRole(models.TextChoices):
    ADMIN = 'ADMIN', 'Administrator'
    CITIZEN = 'CITIZEN', 'Normal User'

class User(AbstractUser):
    username = models.CharField(max_length=150, blank=True, null=True)
    email = models.EmailField('email address', unique=True)
    role = models.CharField(max_length=20, choices=UserRole.choices, default=UserRole.CITIZEN)
    is_email_verified = models.BooleanField(default=False)
    google_id = models.CharField(max_length=255, blank=True, null=True)
    avatar_url = models.URLField(max_length=500, blank=True, null=True)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    @property
    def is_admin_user(self):
        return self.role == UserRole.ADMIN or self.is_superuser or self.is_staff

    def save(self, *args, **kwargs):
        if self.role == UserRole.ADMIN:
            existing_admin = User.objects.filter(role=UserRole.ADMIN).exclude(pk=self.pk).first()
            if existing_admin:
                raise ValueError(f"Only one administrator account is authorized. Existing admin: {existing_admin.email}")
            self.is_staff = True
            self.is_superuser = True
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.email} ({self.role})"
