'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  // Traza el polígono en su posición y rotación actuales. El path no forma parte
  // del estado de dibujo, así que sobrevive al restore() y cada subclass
  // puede fijar su propio estilo antes de trazar.
  tracePath() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.restore();
  }

  draw() {
    this.tracePath();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.stroke();
  }
}

// ── Estrella fugaz ────────────────────────────────────────────────────────────
const STAR_SPEED       = 260;   // px/s
const STAR_TTL         = 7;     // segundos antes de desvanecerse
const STAR_POINTS      = 200;
const STAR_SPAWN_EVERY = 12;    // segundos entre apariciones
const STAR_COLOR       = '#ffb454';
const STAR_GLOW        = 14;    // px de halo difuso
const STAR_PULSE       = 6;     // rad/s de oscilación del brillo (~1 Hz)
const STAR_TRAIL_LEN   = 12;

// Asteroide rápido y efímero: misma silueta que los demás, pero ámbar y
// brillante, con estela para que se note la velocidad
class ShootingStar extends Asteroid {
  constructor(x, y) {
    super(x, y, 3);

    const angle = Math.atan2(this.vy, this.vx);
    this.vx = Math.cos(angle) * STAR_SPEED;
    this.vy = Math.sin(angle) * STAR_SPEED;
    this.rotSpeed = rand(-0.4, 0.4);   // gira más despacio que un asteroide normal
    this.ttl   = STAR_TTL;
    this.trail = [];
  }

  update(dt) {
    const prevX = this.x;
    const prevY = this.y;
    super.update(dt);

    // Al cruzar un borde la posición se teletransporta: la estela se reinicia
    if (Math.abs(this.x - prevX) > W / 2 || Math.abs(this.y - prevY) > H / 2)
      this.trail.length = 0;

    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;

    this.trail.push([this.x, this.y]);
    if (this.trail.length > STAR_TRAIL_LEN) this.trail.shift();
  }

  drawTrail() {
    if (this.trail.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(this.trail[0][0], this.trail[0][1]);
    for (let i = 1; i < this.trail.length; i++)
      ctx.lineTo(this.trail[i][0], this.trail[i][1]);
    ctx.strokeStyle = 'rgba(255, 180, 84, 0.35)';
    ctx.lineWidth   = 3;
    ctx.lineJoin    = 'round';
    ctx.lineCap     = 'round';
    ctx.stroke();
  }

  draw() {
    // Parpadea los últimos segundos antes de expirar
    if (this.ttl < 2 && Math.floor(this.ttl * 8) % 2 === 0) return;

    ctx.save();
    this.drawTrail();

    this.tracePath();
    ctx.shadowColor = STAR_COLOR;
    ctx.shadowBlur  = STAR_GLOW;
    // El alpha late una vez por segundo y atenúa también el halo
    ctx.globalAlpha = 0.75 + 0.25 * Math.sin(this.ttl * STAR_PULSE);
    ctx.strokeStyle = STAR_COLOR;
    ctx.lineWidth   = 1.8;
    ctx.lineJoin    = 'round';
    ctx.stroke();
    ctx.restore();
  }
}

// ── Skins ─────────────────────────────────────────────────────────────────────
// El casco y la llama definen la identidad de la nave. Solo en memoria:
// localStorage no es accesible desde file:// (origen opaco).
const SKINS = [
  { name: 'Clásica', hull: '#fff', flame: 'rgba(255, 130, 0, 0.85)' },
  { name: 'Neón',    hull: '#4df', flame: '#bbf' },
  { name: 'Fuego',   hull: '#f60', flame: '#ff0' },
  { name: 'Veneno',  hull: '#5f5', flame: '#dfd' },
  { name: 'Oro',     hull: '#fd4', flame: '#fff' },
];

// ── Escudo ────────────────────────────────────────────────────────────────────
// Aguanta un número de impactos, no un tiempo: se repone recogiendo otro
const SHIELD_HITS      = 3;
const SHIELD_FLASH     = 0.3;  // segundos de destello tras absorber un golpe
const SHIELD_COLOR     = '#f6a';
const SHIELD_FILL      = 'rgba(246, 102, 153, 0.10)';
const SHIELD_FILL_HIT  = 'rgba(246, 102, 153, 0.28)';
const SHIELD_GAP       = 8;    // radio de la burbuja menos el de la nave

let skinIndex = 0;

function nextSkin() { skinIndex = (skinIndex + 1) % SKINS.length; }

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.boostTimer    = 0;
    this.tripleTimer   = 0;
    this.shieldHits    = 0;
    this.shieldFlash   = 0;
    this.dead          = false;
  }

  boost() {
    this.boostTimer = BOOST_DURATION;
  }

  tripleShot() {
    this.tripleTimer = TRIPLE_DURATION;
  }

  shield() {
    this.shieldHits = SHIELD_HITS;
  }

  get boosted() { return this.boostTimer > 0; }
  get tripled() { return this.tripleTimer > 0; }
  get shielded() { return this.shieldHits > 0; }

  // Consume un impacto; devuelve true si el escudo ha aguantado
  absorbHit() {
    this.shieldHits--;
    this.shieldFlash = SHIELD_FLASH;
    return this.shieldHits > 0;
  }

  get skin() { return SKINS[skinIndex]; }

  // El triple shot tiene prioridad sobre el boost si coexisten
  get tint() {
    if (this.tripled) return TRIPLE_COLOR;
    return this.boosted ? BOOST_COLOR : null;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.boostTimer    > 0) this.boostTimer    -= dt;
    if (this.tripleTimer   > 0) this.tripleTimer   -= dt;
    if (this.shieldFlash   > 0) this.shieldFlash   -= dt;

    const ROT   = 3.5;   // rad/s
    const THRUST = 260 * (this.boosted ? 2 : 1);  // px/s²
    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (!this.tripled) return [new Bullet(ox, oy, this.angle)];
    return [-1, 0, 1].map(k => new Bullet(ox, oy, this.angle + k * TRIPLE_SPREAD));
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Halo del power-up activo: la skin nunca se pierde de vista
    if (this.tint) {
      ctx.shadowColor = this.tint;
      ctx.shadowBlur  = 10;
    }

    ctx.strokeStyle = this.skin.hull;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Silueta clásica: triángulo con muesca trasera
    ctx.beginPath();
    ctx.moveTo( 20,  0);   // nariz
    ctx.lineTo(-12, -9);   // ala izquierda
    ctx.lineTo( -7,  0);   // muesca trasera
    ctx.lineTo(-12,  9);   // ala derecha
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8,  4);
      ctx.strokeStyle = this.tint || this.skin.flame;
      ctx.stroke();
    }

    ctx.restore();
    this.drawShield();
  }

  // Burbuja del escudo: translúcida en reposo, opaca y vibrando al absorber
  drawShield() {
    if (!this.shielded) return;
    const hit = this.shieldFlash > 0;

    ctx.save();
    ctx.translate(this.x, this.y);
    if (hit) ctx.translate(rand(-2, 2), rand(-2, 2));
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + SHIELD_GAP, 0, Math.PI * 2);
    ctx.fillStyle = hit ? SHIELD_FILL_HIT : SHIELD_FILL;
    ctx.fill();
    ctx.strokeStyle = SHIELD_COLOR;
    ctx.lineWidth   = hit ? 2.5 : 1.2;
    ctx.globalAlpha = hit ? 1 : 0.6;
    ctx.stroke();
    ctx.restore();
  }
}

// ── Power-ups ─────────────────────────────────────────────────────────────────
const DROP_CHANCE    = 0.12;  // probabilidad de soltar uno al destruir un asteroide
const POWERUP_TTL    = 10;    // segundos en el campo antes de expirar
const BOOST_DURATION = 5;     // segundos de velocidad x2
const BOOST_COLOR    = '#4df';
const TRIPLE_DURATION = 5;    // segundos de disparo triple
const TRIPLE_COLOR   = '#5f5';
const TRIPLE_SPREAD  = 0.21;  // rad de separación de las 3 balas (~12°)

class PowerUp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = rand(-25, 25);
    this.vy = rand(-25, 25);
    this.radius = 10;
    this.rot    = rand(0, Math.PI * 2);
    this.rotSpeed = rand(-1, 1);
    this.ttl  = POWERUP_TTL;
    this.color = BOOST_COLOR;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  // Efecto que otorga al recogerlo
  applyTo(ship) { ship.boost(); }

  // Silueta del icono, ya en el espacio local rotado
  drawIcon() {
    for (const dx of [-6, 3]) {
      ctx.moveTo(dx, -6);
      ctx.lineTo(dx + 6, 0);
      ctx.lineTo(dx, 6);
    }
  }

  draw() {
    // Parpadea los últimos segundos antes de expirar
    if (this.ttl < 2 && Math.floor(this.ttl * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = this.color;
    ctx.lineWidth   = 2;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    this.drawIcon();
    ctx.stroke();
    ctx.restore();
  }
}

// Power-up "Triple shot": 3 balas en abanico durante 5 s
class TriplePowerUp extends PowerUp {
  constructor(x, y) {
    super(x, y);
    this.color = TRIPLE_COLOR;
  }

  applyTo(ship) { ship.tripleShot(); }

  drawIcon() {
    for (const a of [-0.4, 0, 0.4]) {
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * 7, Math.sin(a) * 7);
    }
  }
}

// Power-up "Escudo": aguanta 3 impactos
class ShieldPowerUp extends PowerUp {
  constructor(x, y) {
    super(x, y);
    this.color = SHIELD_COLOR;
  }

  applyTo(ship) { ship.shield(); }

  drawIcon() {
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
  }
}

// El drop reparte entre los tipos
const POWERUP_CLASSES = [PowerUp, TriplePowerUp, ShieldPowerUp];

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerups;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let starTimer;

// Posición aleatoria lejos del centro, para no aparecer encima de la nave
function randomSpot() {
  const SAFE_DIST = 130;
  let x, y;
  do {
    x = rand(0, W);
    y = rand(0, H);
  } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
  return { x, y };
}

function spawnAsteroids(count) {
  for (let i = 0; i < count; i++) {
    const { x, y } = randomSpot();
    asteroids.push(new Asteroid(x, y, 3));
  }
}

// La estrella fugaz solo aparece si el campo tiene asteroides que destruir
function spawnShootingStar() {
  const alreadyThere = asteroids.some(a => a instanceof ShootingStar);
  if (alreadyThere || !asteroids.some(a => !(a instanceof ShootingStar))) return;
  const { x, y } = randomSpot();
  asteroids.push(new ShootingStar(x, y));
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerups  = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  starTimer = STAR_SPAWN_EVERY;
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerups  = [];
  asteroids = [];   // las estrellas fugaces se van volando
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

// Algún asteroide destruido suelta un power-up del tipo que toque
function dropPowerUp(x, y) {
  if (Math.random() < DROP_CHANCE) {
    const PowerUpClass = POWERUP_CLASSES[randInt(0, POWERUP_CLASSES.length - 1)];
    powerups.push(new PowerUpClass(x, y));
  }
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  // Se consume antes de cualquier rama: en 'dead' el return temprano dejaría
  // el flanco pendiente y el cambio se dispararía al volver a 'playing'
  if (pressed('KeyS')) nextSkin();

  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerups.forEach(p => p.update(dt));

  // Aparición periódica de la estrella fugaz
  starTimer -= dt;
  if (starTimer <= 0) {
    starTimer = STAR_SPAWN_EVERY;
    spawnShootingStar();
  }

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerups  = powerups.filter(p => !p.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        if (a instanceof ShootingStar) {
          score += STAR_POINTS;
          explode(a.x, a.y, 18);
        } else {
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          dropPowerUp(a.x, a.y);
          newAsteroids.push(...a.split());
        }
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs power-up: recarga su temporizador a 5 s
  const collected = powerups.filter(p => dist(ship, p) < ship.radius + p.radius);
  for (const p of collected) {
    p.applyTo(ship);
    explode(p.x, p.y, 6);
  }
  if (collected.length > 0)
    powerups = powerups.filter(p => !collected.includes(p));

  // Nave vs asteroide: el escudo absorbe el golpe y se lleva el asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) >= ship.radius + a.radius * 0.82) continue;

      if (ship.shielded) {
        ship.absorbHit();
        a.dead = true;
        explode(a.x, a.y, 10);
        asteroids = asteroids.filter(x => !x.dead);
      } else {
        killShip();
      }
      break;
    }
  }

  // Nivel completado (las estrellas fugaces no lo bloquean)
  const solidLeft = asteroids.some(a => !(a instanceof ShootingStar));
  if (!solidLeft) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo( 9,  0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-3,  0);
  ctx.lineTo(-6,  5);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  // Skin en uso
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText(`NAVE: ${SKINS[skinIndex].name}`, 14, H - 14);

  drawPowerUpBars();
  drawShieldMeter();
}

// Impactos de escudo que quedan: lleno = disponible
function drawShieldMeter() {
  const SEG_W = 38, GAP = 3, y = 56;
  for (let i = 0; i < SHIELD_HITS; i++) {
    const x = W - 14 - (SEG_W + GAP) * (i + 1) + GAP;
    const on = i < ship.shieldHits;
    ctx.fillStyle = on ? SHIELD_COLOR : 'rgba(255,255,255,0.2)';
    ctx.fillRect(x, y, SEG_W, 5);
  }
}

// Barra de tiempo restante de un power-up activo
function drawPowerUpBar(x, y, width, color, ratio) {
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(x, y, width, 5);

  ctx.fillStyle = color;
  ctx.fillRect(x, y, width * ratio, 5);
}

// Barras apiladas, una por power-up activo
function drawPowerUpBars() {
  const BAR_W = 120;
  const x = W - 14 - BAR_W;
  let y = 34;

  if (ship.boosted) {
    drawPowerUpBar(x, y, BAR_W, BOOST_COLOR, ship.boostTimer / BOOST_DURATION);
    y += 9;
  }
  if (ship.tripled)
    drawPowerUpBar(x, y, BAR_W, TRIPLE_COLOR, ship.tripleTimer / TRIPLE_DURATION);
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  powerups.forEach(p => p.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
