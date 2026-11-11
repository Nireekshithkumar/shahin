#!/bin/sh
set -e

echo "=========================================================="
echo " Starting ScholarSetu AI Unified Container"
echo "=========================================================="

# Ensure directories exist
mkdir -p /var/log/supervisor /app/backend/staticfiles /var/log/redis

# 1. Start background Redis for initialization tasks
echo "==> [1/4] Starting internal Redis..."
redis-server --daemonize yes --protected-mode no --bind 127.0.0.1
sleep 1

# 2. Database migrations & single admin bootstrap
echo "==> [2/4] Running database migrations and bootstrapping single admin..."
python /app/backend/manage.py migrate --noinput
python /app/backend/manage.py bootstrap_admin || true

# 3. Seed opportunities (idempotent, skips duplicates)
echo "==> [3/4] Ensuring official opportunities and schemes are seeded..."
python /app/backend/manage.py seed_opportunities || true

# 4. Stop background Redis (supervisord will take over managing Redis)
echo "==> [4/4] Transitioning to Supervisord process manager..."
redis-cli shutdown 2>/dev/null || true
sleep 1

# Execute supervisord as foreground process
exec /usr/bin/supervisord -n -c /etc/supervisor/supervisord.conf

