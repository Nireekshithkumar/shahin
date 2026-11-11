# ScholarSetu AI — Production Deployment Guide

Instructions for deploying the React frontend to Vercel/Netlify and the Django REST backend to Render, Railway, AWS, or Docker.

---

## 1. Frontend Deployment (Vercel)

1. Connect your repository to Vercel.
2. Set **Root Directory** to `frontend`.
3. Set **Framework Preset** to `Vite`.
4. Configure Environment Variables:
   - `VITE_API_URL`: `https://your-backend-api.onrender.com/api`
   - `VITE_GOOGLE_CLIENT_ID`: `your-google-client-id.apps.googleusercontent.com`
5. Deploy: Vercel automatically runs `npm run build` and serves static assets globally via CDN.

---

## 2. Backend Deployment (Render / Railway / VM)

1. Set **Root Directory** to `backend`.
2. Build Command:
   ```bash
   pip install -r requirements.txt && python manage.py migrate && python manage.py seed_opportunities
   ```
3. Start Command:
   ```bash
   gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
   ```
4. Configure Environment Variables:
   - `SECRET_KEY`: Random 50+ character string
   - `DEBUG`: `False`
   - `ALLOWED_HOSTS`: `.onrender.com,yourdomain.com`
   - `DB_ENGINE`: `postgresql`
   - `DATABASE_URL` or `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT`
   - `CORS_ALLOWED_ORIGINS`: `https://your-frontend.vercel.app`

---

## 3. Local Docker Compose

To start all services (PostgreSQL + Redis + Django Backend + React Frontend) locally:

```bash
docker-compose up --build
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000/api`
- Swagger UI: `http://localhost:8000/api/docs/`
