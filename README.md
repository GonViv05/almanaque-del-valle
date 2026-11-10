<div align="center">

<img src="docs/img/chirivia.png" width="128" alt="Chirivía en pixel art">

# Almanaque del Valle

**La guía de Stardew Valley que conoce tu granja.** En español, sin internet y conectada a tu partida.

[Página de presentación](https://gonviv05.github.io/almanaque-del-valle/) · [Instalar](#instalación) · [Descargar ZIP](https://github.com/GonViv05/almanaque-del-valle/archive/refs/heads/main.zip)

<img src="docs/img/granja.png" alt="Pestaña Mi Granja: cosechas de hoy y cumpleaños" width="800">

</div>

## Qué hace

Es una wiki local con la estética del juego, armada con los datos de **tu propia instalación** de Stardew Valley. Se abre en el navegador y funciona sin conexión.

| Pestaña | Para qué sirve |
| --- | --- |
| **Mi Granja** | Qué está plantado, cuándo se cosecha y quién cumple años hoy, leído de tu partida |
| **Cultivos** | Tabla por estación y calculadora de semillas, abono, cosechas y ganancia |
| **Peces** | Filtros por estación, clima, hora y zona; marca los que ya atrapaste |
| **Animales** | Ciclo de vida, productos, precios y cómo conseguir cada uno |
| **Aldeanos** | Cumpleaños, regalos favoritos y por dónde andan |
| **Crafteos** | Las recetas de fabricación que sabés, cuántas te alcanzan con lo que tenés y cómo aprender las bloqueadas |
| **Cocina** | Qué podés cocinar ya, qué recetas tienen todos sus ingredientes en la estación y cómo se consigue cada una |
| **Artesanales** | Qué procesa cada máquina, cuánto vale lo que sale y qué conviene hacer con lo que tenés guardado |
| **Objetos** | Todos los ítems del juego (objetos, objetos grandes, armas, calzado, sombreros, ropa, herramientas, baratijas y muebles) por tipo y categoría, cada uno con su ficha: de dónde sale, para qué sirve y a quién le gusta |
| **Centro Cívico** | Salas, lotes y de dónde sale cada objeto |
| **Perdibles** | Lo que se te escapa si no lo hacés esta estación y lo más rentable para sembrar hoy |
| **Estadísticas** | Ingresos, niveles y contadores de tu partida |

Arriba de todo hay un **buscador** (tecla `/` o `Ctrl+K`) para objetos, aldeanos, recetas y festivales. Si buscás un aldeano, te dice dónde debería estar a la hora que elijas el día marcado en el almanaque. Tocando cualquier objeto (un ingrediente, un regalo, un lote) se abre su ficha con cómo conseguirlo. El **calendario** (al lado del reloj) es el tablero del pueblo con cumpleaños y festivales: un clic te lleva a ese día.

## Capturas

| | |
| --- | --- |
| ![Cultivos](docs/img/cultivos.png) | ![Peces](docs/img/peces.png) |
| ![Aldeanos](docs/img/aldeanos.png) | ![Centro Cívico](docs/img/centro.png) |
| ![Perdibles](docs/img/perdibles.png) | ![Estadísticas](docs/img/stats.png) |

## Instalación

Necesitás Stardew Valley instalado (Steam o GOG), Python 3.9+ y Node.js 22.7+. El repositorio no trae archivos del juego: el instalador los genera desde tu copia.

**Windows:** [descargá el ZIP](https://github.com/GonViv05/almanaque-del-valle/archive/refs/heads/main.zip), descomprimilo y hacé doble clic en `instalar.bat`. Si falta Python o Node, los instala con winget.

**macOS:** [descargá el ZIP](https://github.com/GonViv05/almanaque-del-valle/archive/refs/heads/main.zip), descomprimilo, mové la carpeta fuera de Descargas (por ejemplo a tu carpeta personal: macOS protege Descargas, Documentos y Escritorio de los programas en segundo plano como el vigía) y hacé doble clic en `instalar.command`. Si macOS no lo deja abrir por no ser de un desarrollador identificado, andá a *Ajustes del Sistema > Privacidad y seguridad* y elegí *Abrir igualmente*, o corrélo desde la Terminal:

```sh
cd ~/almanaque-del-valle-main
sh instalar.command
```

Si falta Python, se abre el instalador de las herramientas de línea de comandos de Apple; si falta Node.js, lo instala con Homebrew o te lleva a nodejs.org. Funciona con el juego de Steam o de GOG.

**Linux:**

```sh
git clone https://github.com/GonViv05/almanaque-del-valle.git
cd almanaque-del-valle
sh instalar.sh
```

El instalador encuentra el juego, genera la wiki, crea un acceso directo (en Mac, una app en tu carpeta Aplicaciones) y ofrece activar el vigía. Si no detecta el juego, te pide la carpeta.

| Opción | Efecto |
| --- | --- |
| `--juego "<ruta>"` | Usa esa carpeta del juego |
| `--con-vigia` / `--sin-vigia` | Activa o descarta el vigía sin preguntar |
| `--sin-acceso` | No crea el acceso directo |
| `--desinstalar` | Quita el vigía y el acceso directo |

Después de actualizar el juego, volvé a correr el instalador. Está probado con la versión 1.6.15.

## El vigía de la partida

`tools/vigia.py` corre en segundo plano y detecta cuando el juego guarda al dormir. Actualiza la wiki (cultivos, recetas aprendidas y lo que tenés en la mochila, los cofres y la heladera), registra tus ingresos diarios y avisa los cumpleaños con una notificación. Arranca solo al iniciar sesión (con systemd en Linux, launchd en Mac y la carpeta Inicio en Windows). **Tus guardados solo se leen**, y no es un mod: no hace falta SMAPI.

El ingreso diario total es real. El reparto por cultivo, pesca y ganadería es estimado, porque el juego solo guarda el total.

## Desarrollo

```sh
node tools/test-calc.mjs
python3 tools/test-vigia.py "<carpeta de una partida>"
```

`tools/notas-manuales.json` guarda los pocos datos que el juego tiene en su código y no en sus archivos. En la app aparecen marcados como nota manual.

---

Proyecto de fans, sin relación con ConcernedApe. Stardew Valley, sus sprites, textos y fuentes son propiedad de ConcernedApe.
