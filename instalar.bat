@echo off
rem Instalador para Windows: doble clic. Acepta las opciones de instalar.py.
rem Windows installer: double-click it. Accepts the options of instalar.py.
setlocal
cd /d "%~dp0"
chcp 65001 >nul
set "ES="
for /f %%i in ('powershell -NoProfile -Command "(Get-UICulture).TwoLetterISOLanguageName"') do if /i "%%i"=="es" set "ES=1"
set "PY="
py -3 --version >nul 2>&1 && set "PY=py -3"
if not defined PY python --version >nul 2>&1 && set "PY=python"
set "INSTALADO="
if not defined PY (
  if defined ES (echo Instalando Python...) else (echo Installing Python...)
  winget install -e --id Python.Python.3.12 --accept-source-agreements --accept-package-agreements || goto manual
  set "INSTALADO=1"
)
where node >nul 2>&1
if errorlevel 1 (
  if defined ES (echo Instalando Node.js...) else (echo Installing Node.js...)
  winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements || goto manual
  set "INSTALADO=1"
)
if defined INSTALADO (
  echo.
  if defined ES (echo Listo. Cerra esta ventana y volve a abrir instalar.bat para continuar.) else (echo Done. Close this window and open instalar.bat again to continue.)
  pause
  exit /b 0
)
%PY% instalar.py %*
if errorlevel 1 (
  echo.
  if defined ES (echo La instalacion no termino. Revisa el mensaje de arriba.) else (echo The installation did not finish. Check the message above.)
)
pause
exit /b

:manual
echo.
if defined ES (
  echo No pude instalarlo con winget. Instala a mano y volve a abrir este archivo:
  echo   Python: https://www.python.org/downloads/  ^(marca "Add python.exe to PATH"^)
) else (
  echo winget could not install it. Install it by hand and open this file again:
  echo   Python: https://www.python.org/downloads/  ^(check "Add python.exe to PATH"^)
)
echo   Node.js LTS: https://nodejs.org/
pause
exit /b 1
