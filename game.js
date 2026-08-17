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
const wrap = (v, max) => ((v % max) + max) % max;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const rand = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl = 1.1;
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
const RADII = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x = x;
    this.y = y;
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
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Estrella fugaz ─────────────────────────────────────────────────────────────
const STAR_POINTS = 50;

class ShootingStar {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 8;
    this.dead = false;
    this.ttl = rand(3, 5);
    this.life = this.ttl;

    const angle = rand(0, Math.PI * 2);
    const speed = rand(180, 260);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) {
      this.dead = true;
      explode(this.x, this.y, 4);
    }
  }

  draw() {
    const speed = Math.hypot(this.vx, this.vy);
    const ux = this.vx / speed;
    const uy = this.vy / speed;
    const TAIL = 55;
    const tx = this.x - ux * TAIL;
    const ty = this.y - uy * TAIL;

    ctx.save();
    ctx.globalAlpha = Math.min(1, this.ttl / 0.6);
    ctx.lineCap = 'round';

    const grad = ctx.createLinearGradient(this.x, this.y, tx, ty);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.35, '#ffd76a');
    grad.addColorStop(1, 'rgba(255,180,50,0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(tx, ty);
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x = W / 2;
    this.y = H / 2;
    this.angle = -Math.PI / 2;
    this.vx = 0;
    this.vy = 0;
    this.radius = 12;
    this.thrusting = false;
    this.invincible = 3;
    this.shootCooldown = 0;
    this.dead = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible > 0) this.invincible -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    const ROT = 3.5;   // rad/s
    const THRUST = 260;  // px/s²
    const DRAG = 0.987;
    const BOOST = speedTimer > 0 ? 2 : 1;

    if (keys['ArrowLeft']) this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * BOOST * dt;
      this.vy += Math.sin(this.angle) * THRUST * BOOST * dt;
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
    if (tripleShotTimer > 0) {
      const SPREAD = 0.21; // ~12°
      return [
        new Bullet(ox, oy, this.angle - SPREAD),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + SPREAD),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    const skin = SKINS[selectedSkin];
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = skin.color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(skin.verts[0][0], skin.verts[0][1]);
    for (let i = 1; i < skin.verts.length; i++)
      ctx.lineTo(skin.verts[i][0], skin.verts[i][1]);
    ctx.closePath();
    ctx.stroke();

    if (this.thrusting && Math.random() > 0.35) {
      const f = skin.flame;
      const len = rand(6, 14);
      const midX = (f[0][0] + f[1][0]) / 2;
      const midY = (f[0][1] + f[1][1]) / 2;
      ctx.beginPath();
      ctx.moveTo(f[0][0], f[0][1]);
      ctx.lineTo(midX - len, midY);
      ctx.lineTo(f[1][0], f[1][1]);
      ctx.strokeStyle = 'rgba(255, 130, 0, 0.85)';
      ctx.stroke();
    }

    // Escudo visual (pulsante)
    if (shieldTimer > 0 && this.invincible <= 0) {
      const pulse = Math.sin(Date.now() * 0.006) * 0.15 + 0.85;
      ctx.strokeStyle = `rgba(0, 200, 255, ${(0.7 * pulse).toFixed(2)})`;
      ctx.fillStyle = `rgba(0, 200, 255, ${(0.15 * pulse).toFixed(2)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Skins de nave ─────────────────────────────────────────────────────────────
const SKINS = [
  {
    name: 'CLÁSICA',
    verts: [[20, 0], [-12, -9], [-7, 0], [-12, 9]],
    color: '#fff',
    flame: [[-8, -4], [-8, 4]],
  },
  {
    name: 'ALFA',
    verts: [[24, 0], [-10, -6], [-6, 0], [-10, 6]],
    color: '#f44',
    flame: [[-8, -3], [-8, 3]],
  },
  {
    name: 'TITÁN',
    verts: [[16, 0], [-14, -12], [-10, -4], [-4, 0], [-10, 4], [-14, 12]],
    color: '#4af',
    flame: [[-6, -3], [-6, 3]],
  },
  {
    name: 'FANTASMA',
    verts: [[18, 0], [-8, -10], [-4, -3], [-10, 0], [-4, 3], [-8, 10]],
    color: '#a4f',
    flame: [[-10, -2], [-10, 2]],
  },
  {
    name: 'RAYO',
    verts: [[22, 0], [0, -8], [-14, 0], [0, 8]],
    color: '#ff0',
    flame: [[-8, -3], [-8, 3]],
  },
  {
    name: 'CENTINELA',
    verts: [[14, 0], [7, -10], [-7, -10], [-14, 0], [-7, 10], [7, 10]],
    color: '#0f0',
    flame: [[-8, -4], [-8, 4]],
  },
];

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
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

// ── Power-up (velocidad) ──────────────────────────────────────────────────────
const SPEED_BOOST = 5;        // duración en segundos
const TRIPLE_SHOT_DURATION = 5; // duración en segundos
const SHIELD_DURATION = 8;      // duración del escudo en segundos

class PowerUp {
  constructor(x, y, type = 'speed') {
    this.x = x;
    this.y = y;
    this.type = type;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(20, 45);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = 10;
    this.dead = false;
    this.bob = rand(0, Math.PI * 2);
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.bob += dt * 3;
  }

  draw() {
    const oy = Math.sin(this.bob) * 2;
    const isTriple = this.type === 'triple';
    const isShield = this.type === 'shield';
    const color = isTriple ? '#0f0' : isShield ? '#ff0' : '#0ff';
    const haloAlpha = isTriple ? 'rgba(0,255,0,0.15)' : isShield ? 'rgba(255,255,0,0.15)' : 'rgba(0,255,255,0.15)';

    ctx.save();
    ctx.translate(this.x, this.y + oy);
    ctx.strokeStyle = color;
    ctx.fillStyle = haloAlpha;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';

    // Halo suave
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();

    if (isTriple) {
      // Tres puntos en línea horizontal (triple shot)
      ctx.fillStyle = color;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.arc(i * 5, 0, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (isShield) {
      // Icono de escudo (forma de diamante)
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(6, 0);
      ctx.lineTo(0, 8);
      ctx.lineTo(-6, 0);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    } else {
      // Rayo (velocidad)
      ctx.beginPath();
      ctx.moveTo(3, -8);
      ctx.lineTo(-4, 1);
      ctx.lineTo(0, 1);
      ctx.lineTo(-3, 8);
      ctx.lineTo(4, -1);
      ctx.lineTo(0, -1);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx.restore();
  }
}


// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerUps, shootingStars;
let score, lives, level;
let state;      // 'menu' | 'playing' | 'dead' | 'gameover'
let deadTimer;
let speedTimer;      // tiempo restante del power-up de velocidad
let tripleShotTimer; // tiempo restante del power-up de triple disparo
let shieldTimer;     // tiempo restante del power-up de escudo
let starTimer;       // temporizador de aparición de estrellas fugaces

// ── Skins ─────────────────────────────────────────────────────────────────────
let selectedSkin = 0;
let menuCursor = 0;
let menuBlink = 0;

function loadSkin() {
  const saved = parseInt(localStorage.getItem('asteroids_skin'));
  if (!isNaN(saved) && saved >= 0 && saved < SKINS.length) selectedSkin = saved;
  menuCursor = selectedSkin;
}

function saveSkin(idx) {
  selectedSkin = idx;
  localStorage.setItem('asteroids_skin', idx);
}

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function spawnShootingStar() {
  const SAFE_DIST = 120;
  let x, y;
  do {
    x = rand(0, W);
    y = rand(0, H);
  } while (Math.hypot(x - ship.x, y - ship.y) < SAFE_DIST);
  shootingStars.push(new ShootingStar(x, y));
}

function initGame() {
  loadSkin();
  ship = new Ship();
  bullets = [];
  asteroids = [];
  particles = [];
  powerUps = [];
  shootingStars = [];
  score = 0;
  lives = 3;
  level = 1;
  state = 'menu';
  speedTimer = 0;
  tripleShotTimer = 0;
  shieldTimer = 0;
  starTimer = rand(2, 5);
}

function nextLevel() {
  level++;
  bullets = [];
  particles = [];
  powerUps = [];
  speedTimer = 0;
  tripleShotTimer = 0;
  shieldTimer = 0;
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  powerUps = [];
  speedTimer = 0;
  tripleShotTimer = 0;
  shieldTimer = 0;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (state === 'menu') {
    menuBlink += dt;
    if (pressed('ArrowLeft'))  menuCursor = (menuCursor - 1 + SKINS.length) % SKINS.length;
    if (pressed('ArrowRight')) menuCursor = (menuCursor + 1) % SKINS.length;
    if (pressed('Space')) {
      saveSkin(menuCursor);
      spawnAsteroids(4);
      ship.reset();
      state = 'playing';
    }
    return;
  }

  if (state === 'gameover') {
    if (pressed('Space')) { state = 'menu'; menuCursor = selectedSkin; }
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
  shootingStars.forEach(s => s.update(dt));
  particles.forEach(p => p.update(dt));

  bullets = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  shootingStars = shootingStars.filter(s => !s.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += POINTS[a.size];
        explode(a.x, a.y, a.size * 5);
        if (Math.random() < 0.15) {
          const r = Math.random();
          if (r < 0.33) powerUps.push(new PowerUp(a.x, a.y, 'triple'));
          else if (r < 0.66) powerUps.push(new PowerUp(a.x, a.y, 'shield'));
          else powerUps.push(new PowerUp(a.x, a.y)); // speed (default)
        }
        newAsteroids.push(...a.split());
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets = bullets.filter(b => !b.dead);

  // Bala vs estrella fugaz
  for (const b of bullets) {
    for (const s of shootingStars) {
      if (!s.dead && !b.dead && dist(b, s) < s.radius) {
        b.dead = true;
        s.dead = true;
        score += STAR_POINTS;
        explode(s.x, s.y, 6);
      }
    }
  }
  bullets = bullets.filter(b => !b.dead);
  shootingStars = shootingStars.filter(s => !s.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        if (shieldTimer > 0) {
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
        } else {
          killShip();
          break;
        }
      }
    }
  }

  // Nave vs estrella fugaz
  if (ship.invincible <= 0) {
    for (const s of shootingStars) {
      if (dist(ship, s) < ship.radius + s.radius) {
        if (shieldTimer > 0) {
          s.dead = true;
          score += STAR_POINTS;
          explode(s.x, s.y, 6);
        } else {
          killShip();
          break;
        }
      }
    }
  }

  // Aparición periódica de estrellas fugaces
  starTimer -= dt;
  if (starTimer <= 0) {
    if (shootingStars.length < 3) spawnShootingStar();
    starTimer = rand(3, 7);
  }

  // Power-ups: movimiento, recogida y temporizador
  powerUps.forEach(p => p.update(dt));
  if (ship.invincible <= 0) {
    for (const p of powerUps) {
      if (dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        if (p.type === 'shield') shieldTimer = SHIELD_DURATION;
        else if (p.type === 'triple') tripleShotTimer = TRIPLE_SHOT_DURATION;
        else speedTimer = SPEED_BOOST;
        explode(p.x, p.y, 10);
      }
    }
  }
  powerUps = powerUps.filter(p => !p.dead);
  if (speedTimer > 0) speedTimer = Math.max(0, speedTimer - dt);
  if (tripleShotTimer > 0) tripleShotTimer = Math.max(0, tripleShotTimer - dt);
  if (shieldTimer > 0) shieldTimer = Math.max(0, shieldTimer - dt);

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(9, 0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-3, 0);
  ctx.lineTo(-6, 5);
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

  // Indicador del power-up de velocidad activo
  if (speedTimer > 0) {
    const BW = 90;
    const x0 = W - 16 - BW;
    ctx.textAlign = 'right';
    ctx.fillStyle = '#0ff';
    ctx.font = '13px monospace';
    ctx.fillText('VELOCIDAD', W - 16, 40);

    ctx.fillStyle = 'rgba(0,255,255,0.25)';
    ctx.fillRect(x0, 48, BW, 5);
    ctx.fillStyle = '#0ff';
    ctx.fillRect(x0, 48, BW * (speedTimer / SPEED_BOOST), 5);
  }

  // Indicador del power-up de triple shot activo
  if (tripleShotTimer > 0) {
    const BW = 90;
    const x0 = W - 16 - BW;
    const yOff = (speedTimer > 0 ? 20 : 0);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#0f0';
    ctx.font = '13px monospace';
    ctx.fillText('TRIPLE SHOT', W - 16, 40 + yOff);

    ctx.fillStyle = 'rgba(0,255,0,0.25)';
    ctx.fillRect(x0, 48 + yOff, BW, 5);
    ctx.fillStyle = '#0f0';
    ctx.fillRect(x0, 48 + yOff, BW * (tripleShotTimer / TRIPLE_SHOT_DURATION), 5);
  }

  // Indicador del power-up de escudo activo
  if (shieldTimer > 0) {
    const BW = 90;
    const x0 = W - 16 - BW;
    const yOff = (speedTimer > 0 ? 20 : 0) + (tripleShotTimer > 0 ? 20 : 0);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ff0';
    ctx.font = '13px monospace';
    ctx.fillText('ESCUDO', W - 16, 40 + yOff);

    ctx.fillStyle = 'rgba(255,255,0,0.25)';
    ctx.fillRect(x0, 48 + yOff, BW, 5);
    ctx.fillStyle = '#ff0';
    ctx.fillRect(x0, 48 + yOff, BW * (shieldTimer / SHIELD_DURATION), 5);
  }
}

function drawSkinPreview(idx, x, y, scale) {
  const skin = SKINS[idx];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = skin.color;
  ctx.lineWidth = 1.5 / scale;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(skin.verts[0][0], skin.verts[0][1]);
  for (let i = 1; i < skin.verts.length; i++)
    ctx.lineTo(skin.verts[i][0], skin.verts[i][1]);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawMenu() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 36px monospace';
  ctx.fillText('SELECCIONA TU NAVE', W / 2, 80);

  const GAP = 120;
  const startX = W / 2 - ((SKINS.length - 1) * GAP) / 2;
  const ROW_Y = 220;

  for (let i = 0; i < SKINS.length; i++) {
    const x = startX + i * GAP;
    const isSelected = i === menuCursor;

    if (isSelected) {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.arc(x, ROW_Y, 48, 0, Math.PI * 2);
      ctx.fill();
    }

    drawSkinPreview(i, x, ROW_Y, isSelected ? 1.6 : 1.2);

    ctx.textAlign = 'center';
    ctx.font = isSelected ? 'bold 14px monospace' : '13px monospace';
    ctx.fillStyle = isSelected ? SKINS[i].color : 'rgba(255,255,255,0.5)';
    ctx.fillText(SKINS[i].name, x, ROW_Y + 60);

    if (i === selectedSkin) {
      ctx.font = '11px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillText('ACTIVA', x, ROW_Y + 76);
    }
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '14px monospace';
  ctx.fillText('← →  SELECCIONAR   ·   ESPACIO  JUGAR', W / 2, H - 60);
}

function drawOverlay(title, sub) {
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font = '18px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  if (state === 'menu') {
    drawMenu();
    return;
  }

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  shootingStars.forEach(s => s.draw());
  powerUps.forEach(p => p.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA SELECCIONAR NAVE`);
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
