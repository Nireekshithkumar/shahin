# ==============================================================================
# ScholarSetu AI – Unified Single All-in-One Docker Image
# Contains: React 18 SPA + Django 5 REST Backend + Gunicorn + Nginx + Redis + Celery
# Runs completely self-contained on port 80 with zero external dependencies!
# ==============================================================================

# -------------------------------------------------------------
# Stage 1: Build React + Vite frontend
# -------------------------------------------------------------
FROM node:20-alpine AS frontend_builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci --prefer-offline

COPY frontend/ ./
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# -------------------------------------------------------------
# Stage 2: Install Python dependencies
# -------------------------------------------------------------
FROM python:3.11-slim AS backend_builder

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

WORKDIR /app/backend

RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt gunicorn==21.2.0

# -------------------------------------------------------------
# Stage 3: Final Unified Production Container
# -------------------------------------------------------------
FROM python:3.11-slim

LABEL maintainer="nireekshithkumar"
LABEL project="ScholarSetu AI"
LABEL description="All-in-one unified container: React Frontend, Django Backend, Nginx, Redis, and Celery"

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=config.settings \
    REDIS_URL=redis://127.0.0.1:6379/0 \
    CELERY_BROKER_URL=redis://127.0.0.1:6379/0 \
    CELERY_RESULT_BACKEND=redis://127.0.0.1:6379/0 \
    DB_ENGINE=sqlite \
    DEBUG=False \
    SECRET_KEY=scholarsetu-standalone-production-secret-key-2026

WORKDIR /app/backend

# Install runtime dependencies (Nginx, Supervisor, Redis server, curl for healthchecks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    supervisor \
    redis-server \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages & binaries from builder
COPY --from=backend_builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=backend_builder /usr/local/bin/gunicorn /usr/local/bin/gunicorn
COPY --from=backend_builder /usr/local/bin/celery /usr/local/bin/celery

# Copy backend source code
COPY backend/ /app/backend/

# Copy built frontend assets to Nginx webroot
COPY --from=frontend_builder /app/frontend/dist /var/www/scholarsetu

# Configure Nginx reverse proxy & static file server
RUN printf 'server {\n\
    listen 80 default_server;\n\
    server_name _;\n\
    root /var/www/scholarsetu;\n\
    index index.html;\n\
    client_max_body_size 50M;\n\
\n\
    # Static files collected from Django\n\
    location /static/ {\n\
        alias /app/backend/staticfiles/;\n\
        expires 30d;\n\
        add_header Cache-Control "public, no-transform";\n\
    }\n\
\n\
    # Django REST API\n\
    location /api/ {\n\
        proxy_pass http://127.0.0.1:8000;\n\
        proxy_set_header Host $host;\n\
        proxy_set_header X-Real-IP $remote_addr;\n\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n\
        proxy_set_header X-Forwarded-Proto $scheme;\n\
    }\n\
\n\
    # Django Admin\n\
    location /admin/ {\n\
        proxy_pass http://127.0.0.1:8000;\n\
        proxy_set_header Host $host;\n\
        proxy_set_header X-Real-IP $remote_addr;\n\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n\
        proxy_set_header X-Forwarded-Proto $scheme;\n\
    }\n\
\n\
    # React SPA client-side routing fallback\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
\n\
    gzip on;\n\
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;\n\
}\n' > /etc/nginx/sites-available/default

# Configure Supervisord process manager
RUN printf '[supervisord]\n\
nodaemon=true\n\
user=root\n\
logfile=/var/log/supervisor/supervisord.log\n\
pidfile=/var/run/supervisord.pid\n\
\n\
[program:redis]\n\
command=/usr/bin/redis-server --daemonize no --protected-mode no --bind 127.0.0.1\n\
autostart=true\n\
autorestart=true\n\
priority=10\n\
stdout_logfile=/dev/stdout\n\
stdout_logfile_maxbytes=0\n\
stderr_logfile=/dev/stderr\n\
stderr_logfile_maxbytes=0\n\
\n\
[program:gunicorn]\n\
command=gunicorn config.wsgi:application --bind 127.0.0.1:8000 --workers 3 --timeout 120 --access-logfile -\n\
directory=/app/backend\n\
autostart=true\n\
autorestart=true\n\
priority=20\n\
stdout_logfile=/dev/stdout\n\
stdout_logfile_maxbytes=0\n\
stderr_logfile=/dev/stderr\n\
stderr_logfile_maxbytes=0\n\
\n\
[program:celery]\n\
command=celery -A config worker --loglevel=info -Q notifications,celery --concurrency=2\n\
directory=/app/backend\n\
autostart=true\n\
autorestart=true\n\
priority=30\n\
stdout_logfile=/dev/stdout\n\
stdout_logfile_maxbytes=0\n\
stderr_logfile=/dev/stderr\n\
stderr_logfile_maxbytes=0\n\
\n\
[program:nginx]\n\
command=/usr/sbin/nginx -g "daemon off;"\n\
autostart=true\n\
autorestart=true\n\
priority=40\n\
stdout_logfile=/dev/stdout\n\
stdout_logfile_maxbytes=0\n\
stderr_logfile=/dev/stderr\n\
stderr_logfile_maxbytes=0\n' > /etc/supervisor/conf.d/scholarsetu.conf

# Pre-collect static files during build
RUN python manage.py collectstatic --noinput --settings=config.settings || true

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]

