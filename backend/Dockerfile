# ── ScholarSetu AI – Backend Production Dockerfile ───────────────────────────
FROM python:3.11-slim

LABEL maintainer="nireekshithkumar"
LABEL project="ScholarSetu AI"

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

# Install gunicorn + app deps
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir gunicorn==21.2.0

COPY . /app/

# Collect static files
RUN python manage.py collectstatic --noinput --settings=config.settings || true

EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/api/schema/ || exit 1

# Run with gunicorn in production; override CMD for celery containers
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "120", "--access-logfile", "-"]
