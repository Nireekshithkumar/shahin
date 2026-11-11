from django.contrib.auth.models import AbstractUser
from django.db import models

class UserRole(models.TextChoices):
    CITIZEN = 'CITIZEN', 'Student / Citizen'
    REVIEWER = 'REVIEWER', 'Content Reviewer'
    MANAGER = 'MANAGER', 'Opportunity Manager'
    ADMIN = 'ADMIN', 'Platform Administrator'

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

    def __str__(self):
        return self.email
