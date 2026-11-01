@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title STKSST - Accessibility Test
call scripts\check-local-env.cmd
if errorlevel 1 (
  echo 啟動準備失敗，請查看上方訊息。Setup failed. See the message above.
  pause
  exit /b 1
)
echo.
echo 檢查網址 / Test URL: http://127.0.0.1:5187/design/compat-qa.html
echo 此入口使用獨立測試進度，一般遊玩的 5173 存檔不受影響。
echo This separate test origin does not change your game save on port 5173.
echo 遊戲下方有檢查按鈕；F8 可在對話框內執行檢查。
echo Use the audit buttons below the game, or press F8 inside a dialog.
echo 保留此視窗；結束按 Ctrl+C。Keep this window open. Press Ctrl+C to stop.
echo.
if /i "%~1"=="--check-only" exit /b 0
if "%STKSST_NO_OPEN%"=="1" (
  call npm run dev -- --port 5187 --strictPort
) else (
  call npm run qa
)
if errorlevel 1 (
  echo 啟動失敗，請查看上方錯誤；若埠號已使用，請先關閉之前的檢查視窗。
  echo Startup failed. If the port is busy, close the previous test window.
  pause
  exit /b 1
)
endlocal
