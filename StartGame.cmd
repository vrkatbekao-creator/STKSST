@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title STKSST - Local Game
call scripts\check-local-env.cmd
if errorlevel 1 (
  echo 啟動準備失敗，請查看上方訊息。Setup failed. See the message above.
  pause
  exit /b 1
)
echo.
echo 遊戲網址 / Game URL: http://127.0.0.1:5173/
echo 啟動後會自動開啟預設瀏覽器，也可以手動貼上上方網址。
echo The default browser opens when the server is ready.
echo 遊玩時保留此視窗；結束按 Ctrl+C。同一瀏覽器與網址可續玩。
echo Keep this window open while playing. Press Ctrl+C to stop.
echo.
if /i "%~1"=="--check-only" exit /b 0
if "%STKSST_NO_OPEN%"=="1" (
  call npm run dev -- --port 5173 --strictPort
) else (
  call npm run play
)
if errorlevel 1 (
  echo 啟動失敗，請查看上方錯誤；若埠號已使用，請先關閉之前的啟動視窗。
  echo Startup failed. If the port is busy, close the previous launcher window.
  pause
  exit /b 1
)
endlocal
