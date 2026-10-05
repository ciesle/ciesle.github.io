import { RandomVelocity } from '../src/water-motion.js';

// Shared by the top page and every article header/footer.
const waves = [...document.querySelectorAll('[data-wave]')].map(element => ({
  element,
  offset: 0,
  period: Number(element.dataset.period),
  velocity: new RandomVelocity(54, 6, 18),
}));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let frame = null;
let previousTime = null;

function tick(time) {
  frame = null;
  if (document.hidden || reducedMotion.matches) { previousTime = null; return; }
  const seconds = previousTime === null ? 0 : Math.min((time - previousTime) / 1000, 0.05);
  previousTime = time;
  for (const wave of waves) {
    wave.offset += wave.velocity.advance(seconds);
    wave.offset = ((wave.offset + wave.period / 2) % wave.period + wave.period) % wave.period - wave.period / 2;
    wave.element.setAttribute('transform', `translate(${wave.offset.toFixed(3)} 0)`);
  }
  frame = requestAnimationFrame(tick);
}

function resume() {
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null;
  previousTime = null;
  if (waves.length && !document.hidden && !reducedMotion.matches) frame = requestAnimationFrame(tick);
}

reducedMotion.addEventListener('change', resume);
document.addEventListener('visibilitychange', resume);
resume();
