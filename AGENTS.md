# Asteroids

Clon de Asteroids en canvas HTML5. Todo el proyecto son 4 archivos: `index.html`, `game.js`, `favicon.svg`, `README.md`. Práctica de la serie `01-demo`, `02-weather`, `03-asteroids`.

## Sin toolchain — no inventes comandos

No hay `package.json`, lockfile, bundler, linter, formatter, typechecker, tests ni CI. No corras ni añadas comandos `npm`/`bun`/`pnpm`, y no "arregles" un script faltante instalando tooling sin que lo pida el usuario.

Para ver los cambios basta abrir `index.html` en el navegador: no hay servidor ni código de servidor. `npx serve .` (README) es solo opcional y necesita red; funciona igual abrir el archivo directo porque no hay módulos ES ni `fetch`.

## `game.js` es un script clásico, no un módulo

`index.html` lo carga con `<script src="game.js">` sin `type="module"`. Todo es global: entidades, estado y funciones comparten el mismo scope.

- **No introduced `import`/`export` sin cambiar también la etiqueta del script**, y eso rompe abrir el archivo con `file://` (CORS bloquea los módulos). El flujo "abre `index.html` y ya" es parte del proyecto.
- Cada entidad (`Bullet`, `Asteroid`, `Ship`, `Particle`) tiene `update(dt)` + `draw()` y una bandera `dead`; el filtrado de muertas vive en `update()`, no en las clases. Mantén ese patrón al añadir entidades.
- El estado global mutable (`ship, bullets, asteroids, particles, score, lives, level, state, deadTimer`) se declara con `let` y lo reinicia `initGame()`. Las constantes de balance van arriba de cada sección: `RADII`/`SPEEDS`/`POINTS` (índice = tamaño 1..3), y dentro de `Ship.update` las de física.

## El tamaño del canvas está duplicado

`W = 800` / `H = 600` en `game.js` **y** los atributos `width`/`height` del `<canvas>` en `index.html`. Todo el wrapping, el spawn con distancia segura al centro y el HUD dependen de esas constantes: si cambias uno y no el otro, el juego dibuja descentrado y las colisiones no cuadran.

## Input por flanco, y el Space During Death

`keys[e.code]` es estado sostenido; `justPressed[e.code]` marca el flanco y `pressed(code)` lo consume. Solo hay que llamar a `pressed()` para el flanco que interese.

**Trampa:** `update()` no consume `pressed()` en el estado `dead`, así que un `Space` pulsado durante la pausa de reaparición queda pendiente y **dispara en cuanto el juego vuelve a `playing`**. Lo mismo aplica a `gameover`, salvo que ahí sí se consume (reinicia). Si añades acciones por flanco, revisa los estados donde no se consumen.

La nave se rota y propulsa con `keys[]` (mantener), no con `pressed()`. `ArrowDown` está en la lista de `preventDefault` pero no hace nada.

## Máquina de estados

`state` es `'playing' | 'dead' | 'gameover'`, con salida en `update()`: `dead` congela nave y balas (solo partículas y asteroides siguen), `gameover` congela todo salvo partículas. El paso de nivel dispara en cuanto `asteroids.length === 0`; `nextLevel()` llama a `ship.reset()`, que además restaura los 3 s de invencibilidad.

## Otras decisiones que no se deducen del código

- **Espacio toroidal:** toda posición pasa por `wrap(v, max)`. Las partículas son la excepción (no hacen wrap, se apagan por TTL).
- **`dt` está capteado a 0.05 s** en el loop para sobrevivir a un frame perdido, pero `DRAG` (0.987) se aplica **una vez por frame, no por segundo**: el rozamiento del ship depende del framerate. No lo "corrijas" con un `Math.pow` sin avisar, cambia la sensación del juego.
- La colisión nave-asteroide perdona (`a.radius * 0.82`); la bala-asteroide usa el radio completo.
- Las constantes de física están declaradas dentro del método que las usa (`SPEED` en `Bullet`, `ROT`/`THRUST`/`DRAG` en `Ship.update`), no arriba del archivo. `NOSE = 21` define el punto de salida de la bala.

## El README promete cosas que no existen

`README.md` menciona power-ups y "tipos de asteroides únicos como la estrella fugaz": **no hay ni una línea de eso en `game.js`**. Trátalo como feature pendiente de implementar, no como documentación de un bug. Si la implementas, el README ya está escrito: no hace falta tocarlo.

## Idioma

Comentarios y strings de UI en español (`SCORE`, `NIVEL`, `GAME OVER`, `PUNTAJE`), identificadores en inglés. El HUD y el overlay ya están en español; mantenlo.

## Git

Un solo commit en `main`. Confirma con el usuario antes de crear ramas, CI o tooling.
