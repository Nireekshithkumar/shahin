@echo off
echo ========================================================
echo Starting ScholarSetu AI / Government Scheme Assist AI
echo ========================================================

echo.
echo [1/2] Starting Django Backend on http://127.0.0.1:8000 ...
start "ScholarSetu Backend (Django)" cmd /k "python backend\manage.py runserver 127.0.0.1:8000"

echo.
echo [2/2] Starting Vite Frontend on http://localhost:5173 ...
start "ScholarSetu Frontend (Vite)" cmd /k "npm --prefix frontend run dev"

echo.
echo ========================================================
echo Services launched successfully in separate windows!
echo - Frontend UI:        http://localhost:5173/
echo - Backend API:        http://127.0.0.1:8000/api/
echo - Interactive Docs:   http://127.0.0.1:8000/api/docs/
echo ========================================================
pause
