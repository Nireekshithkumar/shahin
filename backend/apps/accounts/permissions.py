from rest_framework import permissions
from apps.accounts.models import UserRole

class IsScholarSetuAdmin(permissions.BasePermission):
    """
    Strict permission check: Allows access ONLY to the authenticated Platform Administrator.
    Normal users (CITIZEN) receive HTTP 403 Forbidden.
    """
    message = "Administrator access required. Normal users are not authorized to perform this administrative operation."

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.role == UserRole.ADMIN or request.user.is_superuser)
        )

    def has_object_permission(self, request, view, obj):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.role == UserRole.ADMIN or request.user.is_superuser)
        )


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Safe methods (GET, HEAD, OPTIONS) are available to any user.
    Write operations (POST, PUT, PATCH, DELETE) require Platform Administrator role.
    """
    message = "Only the Platform Administrator can create, edit, verify, or delete official scheme records."

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.role == UserRole.ADMIN or request.user.is_superuser)
        )

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.role == UserRole.ADMIN or request.user.is_superuser)
        )


class IsOwnerOnly(permissions.BasePermission):
    """
    Strict object ownership: Users can only view, edit, or delete their own data.
    """
    message = "You do not have permission to access another user's personal documents or records."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        user = getattr(obj, 'user', None)
        if user is None:
            return False
        return user == request.user

