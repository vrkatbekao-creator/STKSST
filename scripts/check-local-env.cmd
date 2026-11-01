@echo off
setlocal
cd /d "%~dp0.."
where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] 找不到 Node.js。請先安裝 Node.js 22.12 以上，再重新開啟。
  echo Node.js 22.12 or newer is required: https://nodejs.org/
  exit /b 1
)
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=12)?0:1)"
if errorlevel 1 (
  echo [ERROR] Node.js 版本太舊，請更新至 22.12 以上。
  echo Please update Node.js to version 22.12 or newer.
  exit /b 1
)
where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo [ERROR] 找不到 npm，請重新安裝包含 npm 的 Node.js。
  echo npm is missing. Reinstall Node.js with npm included.
  exit /b 1
)
call npm ls --depth=0 >nul 2>&1
if errorlevel 1 (
  echo 正在準備專案套件，首次執行需要網路連線，請稍候。
  echo Preparing locked dependencies. The first setup needs internet access.
  call npm ci
  if errorlevel 1 exit /b 1
)
exit /b 0
