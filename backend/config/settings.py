"""
Django settings for ScholarSetu AI backend.
"""
import os
import sys
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

# Load .env file from the backend directory (where manage.py lives)
load_dotenv(Path(__file__).resolve().parent.parent / '.env')

BASE_DIR = Path(__file__).resolve().parent.parent

# Add BASE_DIR to sys.path to allow clean imports like 'apps.accounts'
sys.path.insert(0, str(BASE_DIR))

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('SECRET_KEY', 'scholarsetu-django-secret-key-development-secure-token-2026')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG', 'True').lower() in ('true', '1', 'yes')

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '*').split(',')

# Custom user model
AUTH_USER_MODEL = 'accounts.User'

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party apps
    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt',
    'drf_spectacular',

    # ScholarSetu modular apps
    'apps.accounts',
    'apps.profiles',
    'apps.opportunities',
    'apps.eligibility',
    'apps.recommendations',
    'apps.applications',
    'apps.notifications',
    'apps.ai_assistant',
    'apps.workflows',
    'apps.data_import',
    'apps.analytics',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database configuration
# Support PostgreSQL via env if provided, otherwise SQLite3 for quick local development & testing
DB_ENGINE = os.getenv('DB_ENGINE', 'sqlite')
if DB_ENGINE == 'postgresql' or os.getenv('POSTGRES_DB'):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('POSTGRES_DB', 'scholarsetu_db'),
            'USER': os.getenv('POSTGRES_USER', 'postgres'),
            'PASSWORD': os.getenv('POSTGRES_PASSWORD', 'postgres'),
            'HOST': os.getenv('POSTGRES_HOST', 'localhost'),
            'PORT': os.getenv('POSTGRES_PORT', '5432'),
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 6},
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 15,
}

# Simple JWT settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=120),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=14),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': False,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# drf-spectacular documentation
SPECTACULAR_SETTINGS = {
    'TITLE': 'ScholarSetu AI API',
    'DESCRIPTION': 'Every Eligible Opportunity, One Platform. Complete API for Scholarships, Schemes, Eligibility Engine, Workflows, Applications and RAG Assistant.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
}

# CORS & CSRF settings
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = [
    'http://localhost',
    'http://localhost:80',
    'http://localhost:5173',
    'http://localhost:8000',
    'http://127.0.0.1',
    'http://127.0.0.1:80',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8000',
]

# Internationalization & Timezone
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'  # Indian Standard Time
USE_I18N = True
USE_TZ = True

# Static & Media
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Email backend configuration — sender defaults to nireekshith9@gmail.com
# Change any of these by updating environment variables and restarting the backend,
# Celery workers, and scheduler. No source-code edits are necessary.
_default_email_backend = 'django.core.mail.backends.smtp.EmailBackend' if os.getenv('EMAIL_HOST_PASSWORD') else 'django.core.mail.backends.console.EmailBackend'
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', _default_email_backend)
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True').lower() in ('1', 'true', 'yes')
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', 'nireekshith9@gmail.com')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'nireekshith9@gmail.com')
EMAIL_TIMEOUT = int(os.getenv('EMAIL_TIMEOUT', '15'))

# Site name used in email templates and branding
SCHOLARSETU_SITE_NAME = os.getenv('SCHOLARSETU_SITE_NAME', 'ScholarSetu AI')

# System URLs
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:8000')

# Celery Configuration
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/0'))
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', CELERY_BROKER_URL)
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_ENABLE_UTC = False
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60

# Celery Beat Periodic Schedule
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    'scan-upcoming-deadlines-daily': {
        'task': 'apps.notifications.tasks.scan_upcoming_deadlines_task',
        'schedule': crontab(hour=6, minute=0),  # 6:00 AM IST daily
        'options': {'queue': 'notifications'},
    },
    'send-tracker-reminders-daily': {
        'task': 'apps.notifications.tasks.send_tracker_reminders_task',
        'schedule': crontab(hour=7, minute=0),  # 7:00 AM IST daily
        'options': {'queue': 'notifications'},
    },
    'process-opportunity-changes': {
        'task': 'apps.notifications.tasks.process_opportunity_changes_task',
        'schedule': crontab(minute='*/15'),  # Every 15 minutes
        'options': {'queue': 'notifications'},
    },
    'send-weekly-opportunity-digest': {
        'task': 'apps.notifications.tasks.send_weekly_digests_task',
        'schedule': crontab(day_of_week=1, hour=8, minute=0),  # Monday 8:00 AM IST
        'options': {'queue': 'notifications'},
    },
    'process-email-retries': {
        'task': 'apps.notifications.tasks.process_email_retries_task',
        'schedule': crontab(minute='*/5'),  # Every 5 minutes
        'options': {'queue': 'notifications'},
    },
    'cleanup-expired-notification-data': {
        'task': 'apps.notifications.tasks.cleanup_expired_notifications_task',
        'schedule': crontab(day_of_week=0, hour=0, minute=0),  # Sunday midnight
        'options': {'queue': 'notifications'},
    },
}

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Structured logging configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{asctime}] {levelname} {name} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': os.getenv('DJANGO_LOG_LEVEL', 'INFO'),
            'propagate': False,
        },
        'notifications': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'data_import': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'eligibility': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}
