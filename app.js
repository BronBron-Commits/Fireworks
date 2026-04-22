const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');

let w = 0;
let h = 0;
let dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
let lastTime = performance.now();

const moneyValueEl = document.getElementById('moneyValue');
const incomeValueEl = document.getElementById('incomeValue');

const particles = [];
const rockets = [];
const stars = [];
const skyline = [];

const state = {
  money: 0,
  sparkValue: 1,
  autoRate: 1.25
};

let audioCtx = null;
let audioUnlocked = false;

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function formatNumber(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Math.floor(n).toString();
}

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  audioUnlocked = true;
}

function makeNoiseBuffer(seconds = 0.2) {
  const sampleRate = audioCtx.sampleRate;
  const length = Math.floor(sampleRate * seconds);
  const buffer = audioCtx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function playLaunchSound() {
  if (!audioUnlocked || !audioCtx) return;

  const now = audioCtx.currentTime;

  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(rand(420, 520), now);
  osc.frequency.exponentialRampToValueAtTime(rand(680, 820), now + 0.18);

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.018, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1200, now);
  filter.Q.value = 1.2;

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(now);
  osc.stop(now + 0.22);
}

function playExplosionSound() {
  if (!audioUnlocked || !audioCtx) return;

  const now = audioCtx.currentTime;

  const noise = audioCtx.createBufferSource();
  noise.buffer = makeNoiseBuffer(0.35);

  const noiseFilter = audioCtx.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.setValueAtTime(rand(700, 1200), now);

  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0.04, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

  const tone = audioCtx.createOscillator();
  tone.type = 'triangle';
  tone.frequency.setValueAtTime(rand(140, 220), now);
  tone.frequency.exponentialRampToValueAtTime(rand(60, 90), now + 0.25);

  const toneGain = audioCtx.createGain();
  toneGain.gain.setValueAtTime(0.02, now);
  toneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(audioCtx.destination);

  tone.connect(toneGain);
  toneGain.connect(audioCtx.destination);

  noise.start(now);
  noise.stop(now + 0.36);

  tone.start(now);
  tone.stop(now + 0.26);
}

function resize() {
  w = window.innerWidth;
  h = window.innerHeight;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  buildStars();
  buildSkyline();
}
window.addEventListener('resize', resize, { passive: true });

function updateUI() {
  moneyValueEl.textContent = formatNumber(state.money);
  incomeValueEl.textContent = '+' + state.autoRate.toFixed(1) + '/s';
}

function buildStars() {
  stars.length = 0;
  const count = Math.max(60, Math.floor(w * h / 12000));
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rand(0, w),
      y: rand(0, h * 0.72),
      r: rand(0.6, 1.8),
      a: rand(0.15, 0.95),
      pulse: rand(0.5, 2.0)
    });
  }
}

function buildSkyline() {
  skyline.length = 0;
  let x = 0;

  while (x < w) {
    const bw = rand(40, 92);
    const bh = rand(h * 0.10, h * 0.30);
    const shade = rand(16, 34);
    const windowRate = rand(0.45, 0.78);

    const cols = Math.max(2, Math.floor((bw - 10) / 11));
    const rows = Math.max(3, Math.floor((bh - 10) / 11));
    const windows = [];

    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        if (Math.random() < windowRate) {
          windows.push({
            x: 5 + cx * 11,
            y: 6 + cy * 11,
            warm: Math.random() < 0.78
          });
        }
      }
    }

    skyline.push({
      x,
      y: h - bh,
      w: bw,
      h: bh,
      shade,
      windows
    });

    x += bw - rand(6, 16);
  }
}

function drawBackground(t) {
  ctx.clearRect(0, 0, w, h);

  const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
  skyGrad.addColorStop(0, '#09111f');
  skyGrad.addColorStop(0.55, '#050914');
  skyGrad.addColorStop(1, '#02030a');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);

  for (const s of stars) {
    const alpha = s.a + Math.sin(t * 0.001 * s.pulse + s.x * 0.01) * 0.08;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${Math.max(0.08, alpha)})`;
    ctx.fill();
  }

  const moonX = w * 0.82;
  const moonY = h * 0.18;
  const moonR = Math.min(w, h) * 0.05;

  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR * 1.8, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(180,210,255,0.08)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(240,245,255,0.9)';
  ctx.fill();

  const horizonGlow = ctx.createLinearGradient(0, h * 0.72, 0, h);
  horizonGlow.addColorStop(0, 'rgba(90,120,255,0)');
  horizonGlow.addColorStop(1, 'rgba(90,120,255,0.10)');
  ctx.fillStyle = horizonGlow;
  ctx.fillRect(0, h * 0.72, w, h * 0.28);

  for (const b of skyline) {
    ctx.fillStyle = `rgba(${b.shade}, ${b.shade + 6}, ${b.shade + 14}, 0.96)`;
    ctx.fillRect(b.x, b.y, b.w, b.h);

    for (const win of b.windows) {
      const wx = b.x + win.x;
      const wy = b.y + win.y;

      ctx.fillStyle = win.warm
        ? 'rgba(255, 214, 110, 0.82)'
        : 'rgba(140, 200, 255, 0.62)';
      ctx.fillRect(wx, wy, 4, 6);

      ctx.fillStyle = win.warm
        ? 'rgba(255, 214, 110, 0.10)'
        : 'rgba(140, 200, 255, 0.08)';
      ctx.fillRect(wx - 1, wy - 1, 6, 8);
    }
  }
}

function launch(x = rand(w * 0.15, w * 0.85)) {
  rockets.push({
    x,
    y: h + 10,
    vx: rand(-0.6, 0.6),
    vy: rand(-13.8, -10.5),
    targetY: rand(h * 0.12, h * 0.45),
    hue: rand(0, 360),
    trail: []
  });

  playLaunchSound();
}

function explode(x, y, hue) {
  const count = Math.floor(rand(48, 78));
  state.money += state.sparkValue * rand(4, 7);
  updateUI();
  playExplosionSound();

  for (let i = 0; i < count; i++) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(1.1, 5.8);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: rand(42, 82),
      maxLife: 82,
      hue: hue + rand(-22, 22),
      size: rand(1.6, 3.3),
      gravity: rand(0.03, 0.06)
    });
  }
}

function updateRockets() {
  for (let i = rockets.length - 1; i >= 0; i--) {
    const r = rockets[i];
    r.x += r.vx;
    r.y += r.vy;
    r.vy += 0.042;

    ctx.beginPath();
    ctx.arc(r.x, r.y, 2.4, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${r.hue} 100% 72%)`;
    ctx.fill();

    if (r.y <= r.targetY || r.vy >= -0.45) {
      explode(r.x, r.y, r.hue);
      rockets.splice(i, 1);
    }
  }
}

function updateParticles() {
  ctx.globalCompositeOperation = 'lighter';

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.gravity;
    p.vx *= 0.992;
    p.vy *= 0.992;
    p.life--;

    const alpha = Math.max(0, p.life / p.maxLife);

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${p.hue} 100% 66% / ${alpha})`;
    ctx.fill();

    if (p.life <= 0) particles.splice(i, 1);
  }

  ctx.globalCompositeOperation = 'source-over';
}

let autoTimer = 0;

function updateAuto(dt) {
  autoTimer += dt;
  while (autoTimer >= state.autoRate) {
    autoTimer -= state.autoRate;
    launch();
  }
}

function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  drawBackground(now);
  updateAuto(dt);
  updateRockets();
  updateParticles();

  requestAnimationFrame(loop);
}

window.addEventListener('pointerdown', (e) => {
  ensureAudio();
  launch(e.clientX);
}, { passive: true });

resize();
updateUI();
requestAnimationFrame(loop);
