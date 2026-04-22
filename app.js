const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');

let w = 0;
let h = 0;
let dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

function resize() {
  w = window.innerWidth;
  h = window.innerHeight;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize, { passive: true });
resize();

const particles = [];
const rockets = [];
let autoMode = true;

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function launch(x = rand(w * 0.15, w * 0.85)) {
  rockets.push({
    x,
    y: h + 10,
    vx: rand(-0.8, 0.8),
    vy: rand(-13.5, -10.5),
    targetY: rand(h * 0.12, h * 0.45),
    hue: rand(0, 360)
  });
}

function explode(x, y, hue) {
  const count = Math.floor(rand(45, 85));
  for (let i = 0; i < count; i++) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(1.0, 5.8);
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: rand(45, 80),
      maxLife: 80,
      hue: hue + rand(-18, 18),
      size: rand(1.5, 3.2)
    });
  }
}

function step() {
  ctx.fillStyle = 'rgba(2, 3, 10, 0.18)';
  ctx.fillRect(0, 0, w, h);

  for (let i = rockets.length - 1; i >= 0; i--) {
    const r = rockets[i];
    r.x += r.vx;
    r.y += r.vy;
    r.vy += 0.045;

    ctx.beginPath();
    ctx.arc(r.x, r.y, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${r.hue} 100% 70%)`;
    ctx.fill();

    if (r.y <= r.targetY || r.vy >= -0.6) {
      explode(r.x, r.y, r.hue);
      rockets.splice(i, 1);
    }
  }

  ctx.globalCompositeOperation = 'lighter';
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.045;
    p.vx *= 0.992;
    p.vy *= 0.992;
    p.life--;

    const alpha = Math.max(0, p.life / p.maxLife);

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${p.hue} 100% 65% / ${alpha})`;
    ctx.fill();

    if (p.life <= 0) particles.splice(i, 1);
  }
  ctx.globalCompositeOperation = 'source-over';

  requestAnimationFrame(step);
}
requestAnimationFrame(step);

function burstAt(x) {
  launch(x);
}

window.addEventListener('pointerdown', (e) => {
  burstAt(e.clientX);
}, { passive: true });

document.getElementById('burstBtn').addEventListener('click', () => {
  launch();
});

const autoBtn = document.getElementById('autoBtn');
autoBtn.addEventListener('click', () => {
  autoMode = !autoMode;
  autoBtn.textContent = `Auto: ${autoMode ? 'On' : 'Off'}`;
});

setInterval(() => {
  if (autoMode) {
    const amount = Math.random() < 0.35 ? 2 : 1;
    for (let i = 0; i < amount; i++) launch();
  }
}, 700);
