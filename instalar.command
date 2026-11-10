#!/bin/sh
# Instalador para macOS: doble clic en Finder (o "sh instalar.command" en la Terminal).
# macOS installer: double-click it in Finder (or run "sh instalar.command" in Terminal).
# Acepta las opciones de instalar.py / accepts the options of instalar.py.
cd "$(dirname "$0")" || exit 1
PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"; export PATH
ES=
case "$(defaults read -g AppleLanguages 2>/dev/null | sed -n 2p)" in *\"es*|*" es"*) ES=1 ;; esac
m() { if [ -n "$ES" ]; then printf '%s' "$1"; else printf '%s' "$2"; fi; }
fin() { echo; m 'Presioná Enter para cerrar esta ventana. ' 'Press Enter to close this window. '; read -r _; exit "$1"; }

# Python 3 viene con las herramientas de línea de comandos de Apple.
if ! python3 -c 'import venv, ensurepip' >/dev/null 2>&1; then
  m "Falta Python 3. Se abre el instalador de las herramientas de línea de comandos de Apple:
aceptalo y, cuando termine, volvé a abrir instalar.command." "Python 3 is missing. Apple's command line tools installer will open:
accept it and, when it finishes, open instalar.command again."; echo
  xcode-select --install >/dev/null 2>&1
  fin 1
fi

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    m 'Falta Node.js. ¿Lo instalo con Homebrew? [S/n]: ' 'Node.js is missing. Install it with Homebrew? [Y/n]: '; read -r r
    case "$r" in n|N|no|NO) fin 1 ;; esac
    brew install node || fin 1
  else
    m "Falta Node.js 22.7 o más nuevo. Bajá el instalador para macOS de https://nodejs.org/
y, cuando termine, volvé a abrir instalar.command." "Node.js 22.7 or newer is missing. Download the macOS installer from https://nodejs.org/
and, when it finishes, open instalar.command again."; echo
    open "https://nodejs.org/" >/dev/null 2>&1
    fin 1
  fi
fi

if [ -n "$ES" ]; then python3 instalar.py --idioma es "$@"; else python3 instalar.py --idioma en "$@"; fi
r=$?
[ "$r" -ne 0 ] && echo && m "La instalación no terminó. Revisá el mensaje de arriba." "The installation did not finish. Check the message above." && echo
fin "$r"
