import os
from pathlib import Path
from celery import Celery
from dotenv import load_dotenv

# Load .env so Celery workers pick up environment variables
load_dotenv(Path(__file__).resolve().parent.parent / '.env')

# Set default Django settings module for 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('scholarsetu')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Redis 3.x compatibility: disable RESP3 (HELLO command not supported by Redis < 6)
app.conf.broker_transport_options = {
    'visibility_timeout': 3600,
    'socket_connect_timeout': 5,
    'socket_timeout': 5,
}
# Disable HELLO negotiation for Redis 3.x
app.conf.redis_socket_connect_timeout = 5
app.conf.redis_socket_timeout = 5

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
