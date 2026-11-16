Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Starting ScholarSetu AI / Government Scheme Assist AI" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

Write-Host "`n[1/2] Starting Django Backend on http://127.0.0.1:8000 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "python backend\manage.py runserver 127.0.0.1:8000"

Write-Host "`n[2/2] Starting Vite Frontend on http://localhost:5173 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm --prefix frontend run dev"

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "Services launched successfully in separate terminal windows!" -ForegroundColor Green
Write-Host "• Frontend UI:        http://localhost:5173/" -ForegroundColor White
Write-Host "• Backend API:        http://127.0.0.1:8000/api/" -ForegroundColor White
Write-Host "• Interactive Docs:   http://127.0.0.1:8000/api/docs/" -ForegroundColor White
Write-Host "========================================================`n" -ForegroundColor Green
