@echo off
rem Instalador para Windows: doble clic. Acepta las opciones de instalar.py.
setlocal
cd /d "%~dp0"
chcp 65001 >nul
set "PY="
py -3 --version >nul 2>&1 && set "PY=py -3"
if not defined PY python --version >nul 2>&1 && set "PY=python"
set "INSTALADO="
if not defined PY (
  echo Instalando Python...
  winget install -e --id Python.Python.3.12 --accept-source-agreements --accept-package-agreements || goto manual
  set "INSTALADO=1"
)
where node >nul 2>&1
if errorlevel 1 (
  echo Instalando Node.js...
  winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements || goto manual
  set "INSTALADO=1"
)
if defined INSTALADO (
  echo.
  echo Listo. Cerra esta ventana y volve a abrir instalar.bat para continuar.
  pause
  exit /b 0
)
%PY% instalar.py %*
if errorlevel 1 echo. & echo La instalacion no termino. Revisa el mensaje de arriba.
pause
exit /b

:manual
echo.
echo No pude instalarlo con winget. Instala a mano y volve a abrir este archivo:
echo   Python: https://www.python.org/downloads/  (marca "Add python.exe to PATH")
echo   Node.js LTS: https://nodejs.org/
pause
exit /b 1
