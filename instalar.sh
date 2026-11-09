#!/bin/sh
# Instalador para Linux. Uso: ./instalar.sh  (acepta las opciones de instalar.py)
cd "$(dirname "$0")" || exit 1
falta=""
command -v python3 >/dev/null 2>&1 || falta="python3"
command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1 || falta="$falta nodejs npm"
python3 -c 'import venv, ensurepip' 2>/dev/null || falta="$falta python3-venv"
if [ -n "$falta" ]; then
  echo "Falta instalar:$falta"
  if command -v pacman >/dev/null 2>&1; then echo "  sudo pacman -S python nodejs npm"
  elif command -v apt >/dev/null 2>&1; then echo "  sudo apt install python3 python3-venv nodejs npm"
  elif command -v dnf >/dev/null 2>&1; then echo "  sudo dnf install python3 nodejs npm"
  fi
  exit 1
fi
exec python3 instalar.py "$@"
