"""Idioma de las herramientas (instalador, datos y vigía): español o inglés.

sistema() mira el idioma del sistema operativo; cualquier cosa que no sea español cuenta como inglés.
"""
import locale, os, subprocess, sys

IDIOMAS = ('es', 'en')


def sistema():
    for v in ('LC_ALL', 'LC_MESSAGES', 'LANGUAGE', 'LANG'):
        x = os.environ.get(v, '')
        if x and x not in ('C', 'POSIX', 'C.UTF-8'): return 'es' if x.lower().startswith('es') else 'en'
    if os.name == 'nt':
        try:
            import ctypes
            return 'es' if ctypes.windll.kernel32.GetUserDefaultUILanguage() & 0x3FF == 0x0A else 'en'
        except (AttributeError, OSError):
            pass
    if sys.platform == 'darwin':
        try:
            r = subprocess.run(['defaults', 'read', '-g', 'AppleLanguages'], capture_output=True, text=True, timeout=5).stdout
            primero = r.replace('(', '').replace('"', '').split(',')[0].strip()
            if primero: return 'es' if primero.lower().startswith('es') else 'en'
        except (OSError, subprocess.SubprocessError):
            pass
    try:
        x = locale.getlocale()[0] or ''
    except ValueError:
        x = ''
    return 'es' if x.lower().startswith(('es', 'spanish')) else 'en'


def elegir(pedido=None):
    """El idioma pedido por opción (--idioma) o, si no hay, el del sistema."""
    return pedido if pedido in IDIOMAS else sistema()
