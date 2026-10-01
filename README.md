# Asteroids

Clon del clásico arcade **Asteroids** implementado en canvas HTML5 puro, sin dependencias ni bundler.

## Descripción

Nave espacial en un campo de asteroides con envolvimiento de bordes (el espacio es toroidal). Destruye asteroides para sumar puntos: los grandes se parten en medianos, los medianos en pequeños. Incluye power-ups especiales y tipos de asteroides únicos como la estrella fugaz.

## Tecnologías

- **HTML5 Canvas** — renderizado 2D
- **JavaScript (ES6+)** — lógica del juego en un solo archivo `game.js`
- Sin frameworks, sin bundler, sin dependencias

## Cómo correr

Abre `index.html` directamente en el navegador (doble clic), o usa un servidor local:

```bash
npx serve .
```

Luego visita `http://localhost:3000`.

## Controles

| Tecla     | Acción                  |
| --------- | ----------------------- |
| `←` `→`   | Rotar nave              |
| `↑`       | Propulsar               |
| `Espacio` | Disparar                |
| `S`       | Cambiar skin de la nave |

## Puntuación

| Asteroide | Puntos |
| --------- | ------ |
| Grande    | 20     |
| Mediano   | 50     |
| Pequeño   | 100    |

## Características

- 3 vidas con invencibilidad temporal al reaparecer (parpadeo)
- Asteroides se parten en fragmentos más pequeños al ser destruidos
- Partículas de explosión al destruir asteroides
- **5 skins de nave** (casco y llama de colores distintos) que se alternan con `S`. La elección vive en memoria, así que se pierde al recargar: `localStorage` no es accesible desde `file://` por ser un origen opaco
- **Estrella fugaz**: cada 12 s entra un asteroide de 260 px/s que se desvanece a los 7 s. Vale 200 puntos y no se parte, pero mata a la nave como cualquier otro
- Power-ups (12% de probabilidad de soltar uno al destruir un asteroide, el tipo se sortea al azar):
  - **Velocidad**: la nave se mueve al doble de velocidad durante 5 segundos (halo cyan).
  - **Triple shot**: cada disparo lanza 3 balas en abanico de ±12° durante 5 segundos (halo verde).
  - **Escudo**: aguanta 3 impactos de asteroide o estrella fugaz. Cada golpe se lleva el asteroide, pero sin puntos ni fragmentos. No tiene temporizador: se repone recogiendo otro escudo.

  Los dos primeros se acumulan y cada uno muestra su barra de tiempo restante en el HUD. El casco nunca cambia de color: el power-up activo se comunica con el halo y la llama. El escudo se cuenta por impactos, con tres segmentos en la esquina superior derecha.
