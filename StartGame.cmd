@echo off
setlocal
cd /d "%~dp0"
if not exist node_modules\vite\bin\vite.js (
  echo Dependencies are missing. Run npm ci in this folder first.
  pause
  exit /b 1
)
echo Open the Local URL printed below in your browser.
echo Keep this window open while playing. Press Ctrl+C to stop.
echo Use the same browser and http://127.0.0.1:5173 to continue a saved campaign.
call npm run dev -- --port 5173 --strictPort
endlocal
