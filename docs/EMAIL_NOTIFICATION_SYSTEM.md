# ScholarSetu AI - Production Automated Email Notification System

## 1. System Overview
ScholarSetu AI provides an automated, production-grade notification system delivering verified Indian scholarships, central & state welfare scheme updates, approaching deadline reminders, criteria changes, and personalized eligibility digests.

### Key Architectural Tenets
- **Real Database Records Only**: Never fabricates opportunities, amounts, deadlines, or application URLs.
- **Deterministic Eligibility Matching**: Uses `EligibilityEngine` to evaluate profile constraints (state/domicile, education level, stream, income, caste category, marks, age) without LLM hallucinations.
- **Durable Delivery (Transactional Outbox)**: Logs notifications as `QUEUED` within database transactions and dispatches asynchronous delivery on commit (`transaction.on_commit`).
- **Idempotency & Duplicate Suppression**: Enforces cryptographically or version-derived idempotency keys per recipient, event, closing date, and reminder interval.
- **Timezone-Aware Calculations**: All deadline calculations are grounded in Indian Standard Time (`Asia/Kolkata`).

---

## 2. Notification Types & Trigger Events

| Notification Type | Trigger Event | Target Audience |
| :--- | :--- | :--- |
| `NEW_SCHOLARSHIP` | New verified scholarship published | Users with scholarship alerts enabled |
| `NEW_SCHEME` | New verified government scheme published | Users with scheme alerts enabled |
| `NEW_MATCHING_OPPORTUNITY` | Opportunity matches user's profile | Verified users matching deterministic criteria |
| `DEADLINE_APPROACHING` | 30, 14, 7, 3, 1, or 0 days remaining | Users tracking/saved/subscribed to opportunity |
| `DEADLINE_EXTENDED` | Official closing date extended | Users tracking/saved/subscribed to opportunity |
| `REQUIREMENTS_CHANGED` | Eligibility, income cap, or docs updated | Users tracking/saved/subscribed to opportunity |
| `BENEFITS_OR_DOCS_CHANGED` | Grant amount or document checklist updated | Users tracking/saved/subscribed to opportunity |
| `OPPORTUNITY_CLOSED_OR_EXPIRED` | Scheme closed or discontinued | Users tracking/saved/subscribed to opportunity |
| `SAVED_OPPORTUNITY_CLOSING` | Bookmarked opportunity closing soon | Users who saved opportunity |
| `TRACKER_REMINDER` | Pending document checklist or milestone | Users with active Application Tracker items |
| `RENEWAL_REMINDER` | Recurring scholarship renewal due date | Users with continuing grant opportunities |
| `WEEKLY_DIGEST` | Periodic Monday 08:00 IST digest | Active verified users with digest enabled |
| `EMAIL_VERIFICATION` | Registration or resend request | Registered user |
| `PASSWORD_RESET` | Password reset request | Registered user (1h token expiration) |
| `TEST_EMAIL` | Admin or user test send | Authenticated user testing channel |

---

## 3. Date & Timezone Interpretation (Indian Standard Time)
Scholarship and scheme deadlines in official Indian gazettes and portals (NSP, SSP, MahaDBT, UGC) are specified as date-only (`YYYY-MM-DD`).

### Documented Date Rule:
1. Deadlines given as date `D` expire at **23:59:59 IST** on that calendar date.
2. The daily scanner runs at **06:00 AM IST** on date $D_{current}$.
3. For each configured interval $N \in \{30, 14, 7, 3, 1, 0\}$:
   $$\text{Target Date} = D_{current} + N \text{ days}$$
4. When $N = 0$, the deadline is **TODAY** (urgent last-day alert).
5. When $N = 1$, the deadline is **TOMORROW** (24 hours remaining).
6. Opportunities with status `CLOSED`, `EXPIRED`, or `ARCHIVED` are strictly suppressed.
7. Immediate database status is verified right before dispatching the email.

---

## 4. Idempotency & Duplicate Prevention Strategy
Every notification email calculates an `idempotency_key` prior to delivery:
- **Deadline Reminder**: `f"deadline:{user.id}:{opp.id}:{opp.application_closing_date}:{interval_days}"`
- **Deadline Extended**: `f"extended:{user.id}:{opp.id}:{new_closing_date}"`
- **New Match**: `f"new_opp:{user.id}:{opp.id}:{notification_type}"`
- **Weekly Digest**: `f"digest:{user.id}:{year}-W{week_num}"`
- **Tracker Milestone**: `f"tracker:{user.id}:{tracker.id}:{today_date}"`

If a task is executed multiple times or retried by Celery, subsequent attempts detect the existing delivery log and suppress duplicate delivery.

---

## 5. Retention & Cleanup Policy
The periodic task `cleanup_expired_notifications_task` runs weekly (Sunday 00:00 IST):
- `SENT` and `SUPPRESSED_DUPLICATE` delivery logs older than **90 days** are purged.
- Read in-app notifications older than **60 days** are deleted.
- Processed `OpportunityChangeEvent` records older than **90 days** are deleted.
- Permanent failure logs (`FAILED`) older than **180 days** are archived/deleted.

---

## 6. Celery Periodic Scheduler Configuration (Celery Beat)

```python
CELERY_BEAT_SCHEDULE = {
    'scan-upcoming-deadlines-daily': {
        'task': 'apps.notifications.tasks.scan_upcoming_deadlines_task',
        'schedule': crontab(hour=6, minute=0),  # 6:00 AM IST daily
    },
    'send-tracker-reminders-daily': {
        'task': 'apps.notifications.tasks.send_tracker_reminders_task',
        'schedule': crontab(hour=7, minute=0),  # 7:00 AM IST daily
    },
    'process-opportunity-changes': {
        'task': 'apps.notifications.tasks.process_opportunity_changes_task',
        'schedule': crontab(minute='*/15'),  # Every 15 minutes
    },
    'send-weekly-opportunity-digest': {
        'task': 'apps.notifications.tasks.send_weekly_digests_task',
        'schedule': crontab(day_of_week=1, hour=8, minute=0),  # Monday 8:00 AM IST
    },
    'process-email-retries': {
        'task': 'apps.notifications.tasks.process_email_retries_task',
        'schedule': crontab(minute='*/5'),  # Every 5 minutes
    },
    'cleanup-expired-notification-data': {
        'task': 'apps.notifications.tasks.cleanup_expired_notifications_task',
        'schedule': crontab(day_of_week=0, hour=0, minute=0),  # Sunday midnight
    },
}
```

---

## 7. Starting the Services (Worker, Scheduler, Web)

### Local Development (Windows / Linux / macOS)
1. **Activate virtual environment**:
   ```bash
   venv\Scripts\activate   # Windows
   source venv/bin/activate # Linux/macOS
   ```
2. **Apply database migrations**:
   ```bash
   python manage.py migrate
   ```
3. **Start Redis Server**:
   Ensure Redis is running locally on port 6379 or via Docker:
   ```bash
   docker run -d -p 6379:6379 redis:7-alpine
   ```
4. **Start Celery Worker**:
   ```bash
   celery -A config worker --loglevel=info -P solo   # Windows
   celery -A config worker --loglevel=info          # Linux/macOS
   ```
5. **Start Celery Beat Scheduler**:
   ```bash
   celery -A config beat --loglevel=info
   ```
6. **Start Django REST Backend**:
   ```bash
   python manage.py runserver
   ```
7. **Start Vite Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

### Production Deployment via Docker Compose
Run the entire cluster (PostgreSQL, Redis, Backend, Celery Worker, Celery Beat, Frontend):
```bash
docker compose up -d --build
```

---

## 8. REST API Endpoints Reference

### User Notification Endpoints
- `GET /api/notifications/`: Paginated notifications list with unread counter.
- `PATCH /api/notifications/`: Mark all user notifications as read.
- `PATCH /api/notifications/{id}/read/`: Mark specific notification as read.
- `GET /api/notifications/preferences/`: Retrieve user notification preferences.
- `PATCH /api/notifications/preferences/`: Update notification preferences.
- `GET /api/notifications/email-history/`: Paginated audit log of emails delivered to user.
- `POST /api/notifications/test-email/`: Send diagnostic test notification.
- `GET /api/notifications/unsubscribe/?token={token}`: Validate one-click unsubscribe token.
- `POST /api/notifications/unsubscribe/`: Execute one-click or granular unsubscribe.

### Opportunity Subscription Endpoints
- `GET /api/opportunities/{id}/notification-settings/`: Check subscription status for opportunity.
- `POST /api/opportunities/{id}/subscribe/`: Subscribe to deadline/change alerts for opportunity.
- `DELETE /api/opportunities/{id}/subscribe/`: Unsubscribe from updates for opportunity.

### Administrative Monitoring Endpoints
- `GET /api/notifications/admin/stats/`: Real-time telemetry, pending queue, bounce rates, subscribers.
- `GET /api/notifications/admin/logs/`: Filterable delivery log audit trail.
- `POST /api/notifications/admin/retry/{log_id}/`: Manual retry for eligible transient failed emails.
- `GET /api/notifications/admin/templates/{template_type}/preview/`: Live rendered HTML/text template preview.
