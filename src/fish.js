import { getWaveOffset } from '../common/waves.js';
import { waveSurface, jumpPose, randomJump, nextFishDelay } from './fish-motion.js';

const water = document.querySelector('.water');
const stage = water?.querySelector('.water-fish');
if (stage) {
  const sprite = stage.querySelector('.fish-sprite');
  const mask = stage.querySelector('.fish-surface');
  const layers = [...water.querySelectorAll('.water-layer')]
    .filter(element => element.getAttribute('fill') !== '#ffffff')
    .map(element => ({
    element,
    baseline: Number(element.dataset.baseline),
    amplitude: Number(element.dataset.amplitude),
    cycles: Number(element.dataset.cycles),
    phase: Number(element.dataset.phase),
  }));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let pending = null;
  let frame = null;
  let active = null;
  let previous = null;

  const bounds = () => ({ width: water.clientWidth, height: water.clientHeight });
  const surface = (layer, x, area) => waveSurface(layer, x, getWaveOffset(layer.element), area);

  function schedule(delay = nextFishDelay()) {
    if (!document.hidden && !reducedMotion.matches) pending = setTimeout(start, delay * 1000);
  }

  function start() {
    pending = null;
    const area = bounds();
    if (!area.width || !area.height || !layers.length) { schedule(); return; }
    const layer = layers[Math.floor(Math.random() * layers.length)];
    active = { ...randomJump(area), layer, elapsed: 0, nextDelay: nextFishDelay() };
    stage.setAttribute('viewBox', `0 0 ${area.width} ${area.height}`);
    previous = null;
    // Render while hidden before revealing, avoiding a stale sprite on reappearance.
    draw(area);
    stage.toggleAttribute('hidden', false);
    frame = requestAnimationFrame(tick);
  }

  function draw(area) {
    const progress = Math.min(1, active.elapsed / active.duration);
    const x = active.startX + (active.endX - active.startX) * progress;
    const pose = jumpPose(active, progress, surface(active.layer, x, area));
    let path = `M0 ${-area.height} `;
    for (let sample = 0; sample < area.width; sample += 10) path += `L${sample} ${surface(active.layer, sample, area).toFixed(2)} `;
    path += `L${area.width} ${surface(active.layer, area.width, area).toFixed(2)} L${area.width} ${-area.height} Z`;
    mask.setAttribute('d', path);
    sprite.setAttribute('transform', `translate(${pose.x} ${pose.y}) rotate(${pose.angle}) scale(${active.size / 64}) translate(-32 -16)`);
  }

  function tick(time) {
    frame = null;
    if (document.hidden || reducedMotion.matches) { reset(); return; }
    const seconds = previous === null ? 0 : Math.min((time - previous) / 1000, .05);
    previous = time;
    active.elapsed += seconds;
    draw(bounds());
    if (active.elapsed >= active.duration) {
      stage.toggleAttribute('hidden', true);
      const delay = Math.max(0, active.nextDelay - active.duration);
      active = null;
      schedule(delay);
    } else frame = requestAnimationFrame(tick);
  }

  function reset() {
    clearTimeout(pending);
    if (frame !== null) cancelAnimationFrame(frame);
    pending = frame = active = previous = null;
    stage.toggleAttribute('hidden', true);
    schedule();
  }
  reducedMotion.addEventListener('change', reset);
  document.addEventListener('visibilitychange', reset);
  new ResizeObserver(reset).observe(water);
  schedule();
}
