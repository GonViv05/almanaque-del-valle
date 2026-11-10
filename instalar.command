#!/bin/sh
# Instalador para macOS: doble clic en Finder (o "sh instalar.command" en la Terminal).
# Acepta las opciones de instalar.py.
cd "$(dirname "$0")" || exit 1
PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"; export PATH
fin() { echo; printf 'Presioná Enter para cerrar esta ventana. '; read -r _; exit "$1"; }

# Python 3 viene con las herramientas de línea de comandos de Apple.
if ! python3 -c 'import venv, ensurepip' >/dev/null 2>&1; then
  echo "Falta Python 3. Se abre el instalador de las herramientas de línea de comandos de Apple:"
  echo "aceptalo y, cuando termine, volvé a abrir instalar.command."
  xcode-select --install >/dev/null 2>&1
  fin 1
fi

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    printf 'Falta Node.js. ¿Lo instalo con Homebrew? [S/n]: '; read -r r
    case "$r" in n|N|no|NO) fin 1 ;; esac
    brew install node || fin 1
  else
    echo "Falta Node.js 22.7 o más nuevo. Bajá el instalador para macOS de https://nodejs.org/"
    echo "y, cuando termine, volvé a abrir instalar.command."
    open "https://nodejs.org/" >/dev/null 2>&1
    fin 1
  fi
fi

python3 instalar.py "$@"
r=$?
[ "$r" -ne 0 ] && echo && echo "La instalación no terminó. Revisá el mensaje de arriba."
fin "$r"
