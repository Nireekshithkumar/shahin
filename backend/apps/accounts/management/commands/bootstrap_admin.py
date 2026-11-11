from django.core.management.base import BaseCommand
from django.db import transaction
from apps.accounts.models import User, UserRole
from apps.profiles.models import UserProfile

class Command(BaseCommand):
    help = "Bootstraps the single authorized ScholarSetu platform administrator."

    def handle(self, *args, **options):
        admin_email = "admin@gamil.com"
        admin_password = "admin@1234"

        with transaction.atomic():
            # Demote any other existing admin accounts to CITIZEN to enforce exactly ONE admin
            other_admins = User.objects.filter(role=UserRole.ADMIN).exclude(email__iexact=admin_email)
            for other in other_admins:
                other.role = UserRole.CITIZEN
                other.is_staff = False
                other.is_superuser = False
                other.save()
                self.stdout.write(f"Demoted non-primary admin {other.email} to CITIZEN.")

            # Create or update the single authorized admin
            admin_user, created = User.objects.get_or_create(
                email=admin_email,
                defaults={
                    'username': 'platform_admin',
                    'role': UserRole.ADMIN,
                    'is_staff': True,
                    'is_superuser': True,
                    'is_email_verified': True,
                    'first_name': 'Platform',
                    'last_name': 'Administrator'
                }
            )

            # Ensure credentials and permissions are strictly enforced
            admin_user.set_password(admin_password)
            admin_user.role = UserRole.ADMIN
            admin_user.is_staff = True
            admin_user.is_superuser = True
            admin_user.is_email_verified = True
            admin_user.save()

            # Ensure profile exists
            UserProfile.objects.get_or_create(
                user=admin_user,
                defaults={'full_name': 'Platform Administrator'}
            )

            action_str = "Created" if created else "Updated"
            self.stdout.write(self.style.SUCCESS(
                f"Successfully {action_str} authorized administrator ({admin_email}) with initial credentials."
            ))

