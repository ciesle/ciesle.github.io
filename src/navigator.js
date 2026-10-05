import '../common/waves.js';
import './fish.js';
import './night-sky.js';
import { RandomVelocity, moveBody, placeBodies, tiltAngle } from './water-motion.js';

const water = document.querySelector('.water');
const links = [...document.querySelectorAll('.water-link')];
const bodies = links.map((element, index) => ({
  element,
  x: 0, y: 0, halfWidth: 0, halfHeight: 0,
  initialX: [0.18, 0.5, 0.82][index],
  initialY: [0.29, 0.44, 0.33][index],
  vx: new RandomVelocity(7, 5, 14),
  vy: new RandomVelocity(3.5, 5, 14),
  tiltCenter: [-15, 0, 15][index],
  tiltPhase: 0,
  tiltVelocity: new RandomVelocity(0.22, 6, 16),
}));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let bounds = { width: 0, height: 0 };
let ready = false;
let frame = null;
let previousTime = null;

function drawBody(body) {
  body.element.style.setProperty('--move-x', `${body.x - bounds.width * body.initialX}px`);
  body.element.style.setProperty('--move-y', `${body.y - water.clientHeight * body.initialY}px`);
  body.element.style.setProperty('--tilt', `${tiltAngle(body.tiltCenter, body.tiltPhase)}deg`);
}

function measure() {
  if (!water) return;
  const old = bounds;
  bounds = { width: water.clientWidth, height: water.clientHeight * 0.94 };
  if (!bounds.width || !bounds.height) { ready = false; return; }
  for (const body of bodies) {
    // Conservative bounds cover the rotated text, ripples, focus ring and shadow.
    const width = body.element.offsetWidth;
    const height = body.element.offsetHeight;
    body.halfWidth = width / 2 + height * 0.25 + 6;
    body.halfHeight = height / 2 + width * 0.25 + 6;
    body.x = old.width ? body.x / old.width * bounds.width : bounds.width * body.initialX;
    body.y = old.height ? body.y / old.height * bounds.height : water.clientHeight * body.initialY;
  }
  // A greedy placement can get crowded on narrow screens; retry with fresh positions.
  ready = false;
  for (let attempt = 0; !ready && attempt < 20; attempt++) {
    if (attempt) bodies.forEach(body => { body.x = -1; body.y = -1; });
    ready = placeBodies(bodies, bounds);
  }
  if (ready) bodies.forEach(drawBody);
}

function tick(time) {
  frame = null;
  if (document.hidden || reducedMotion.matches) { previousTime = null; return; }
  const seconds = previousTime === null ? 0 : Math.min((time - previousTime) / 1000, 0.05);
  previousTime = time;
  if (ready) {
    for (const body of bodies) {
      moveBody(body, bodies, bounds, seconds);
      body.tiltPhase += body.tiltVelocity.advance(seconds);
      drawBody(body);
    }
  }
  frame = requestAnimationFrame(tick);
}

function resume() {
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null;
  previousTime = null;
  if (!document.hidden && !reducedMotion.matches) frame = requestAnimationFrame(tick);
}

const observer = new ResizeObserver(measure);
if (water) observer.observe(water);
links.forEach(link => observer.observe(link));
measure();
document.fonts.ready.then(measure);
reducedMotion.addEventListener('change', resume);
document.addEventListener('visibilitychange', resume);
resume();
