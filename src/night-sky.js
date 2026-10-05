import { createBirdFlight, birdPose } from './bird-motion.js';
import { getWaveOffset } from '../common/waves.js';
import { randomJump, jumpPose, waveSurface } from './fish-motion.js';

const moon = document.querySelector('.moon-button');
const stage = document.querySelector('.bird-flight-layer');
if (moon && stage) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const activeBirds = new Set();

  function spawnBird() {
    let bird = null;
    let flight = null;
    let frame = null;
    let timer = null;
    let elapsed = 0;
    let previous = null;
    let fish = null;
    let hunt = null;
    let drop = null;
    let fishPosition = null;

    function stop() {
      if (frame !== null) cancelAnimationFrame(frame);
      clearTimeout(timer);
      bird?.remove();
      fish?.remove();
      bird = fish = hunt = drop = fishPosition = flight = frame = timer = previous = null;
      activeBirds.delete(stop);
    }

    function surface(x) {
      return hunt.waterTop + waveSurface(hunt.layer, x, getWaveOffset(hunt.layer.element), hunt.area);
    }

    function flightPose() {
      const pose = birdPose(flight, elapsed / flight.duration);
      if (!hunt) return pose;
      const descending = elapsed <= hunt.catchAt;
      const duration = descending ? hunt.catchAt : flight.duration - hunt.catchAt;
      const t = Math.min(1, Math.max(0, descending ? elapsed / duration : (elapsed - hunt.catchAt) / duration));
      const from = descending ? flight.startY : hunt.catchY;
      const to = descending ? hunt.catchY : flight.endY;
      const y = from + (to - from) * (1 - Math.cos(Math.PI * t)) / 2;
      const dy = (to - from) * Math.PI * Math.sin(Math.PI * t) / (2 * duration);
      const progress = Math.min(1, elapsed / flight.duration);
      const leftTime = Math.max(0, progress - .001);
      const rightTime = Math.min(1, progress + .001);
      const dx = (birdPose(flight, rightTime).x - birdPose(flight, leftTime).x) / ((rightTime - leftTime) * flight.duration);
      return { ...pose, y, tilt: pose.direction * Math.atan2(dy, Math.abs(dx)) * 180 / Math.PI };
    }

    function draw() {
      if (hunt && elapsed < hunt.catchAt) {
        hunt.catchY = surface(hunt.catchX) + hunt.jump.size - hunt.jump.height;
      }
      const pose = flightPose();
      if (bird) {
        bird.style.transform = `translate(${pose.x - flight.size / 2}px, ${pose.y - flight.size / 2}px) rotate(${pose.tilt}deg) scaleX(${pose.direction})`;
        bird.classList.toggle('sky-bird--carrying', Boolean(fish && hunt && !drop && elapsed >= hunt.catchAt));
      }
      if (!fish) return;
      if (drop) {
        const seconds = elapsed - drop.at;
        const x = drop.x + drop.vx * seconds;
        const y = drop.y + 350 * seconds ** 2;
        if (y + hunt.jump.size / 2 >= surface(x)) {
          fish.remove();
          fish = drop = fishPosition = null;
        } else {
          fish.style.transform = `translate(${x - hunt.jump.size / 2}px, ${y - hunt.jump.size / 4}px) rotate(90deg)`;
        }
        return;
      }
      if (elapsed < hunt.launchAt) { fish.style.visibility = 'hidden'; return; }
      let x, y, angle;
      if (elapsed < hunt.catchAt) {
        const t = (elapsed - hunt.launchAt) / hunt.jump.duration;
        x = hunt.jump.startX + (hunt.jump.endX - hunt.jump.startX) * t;
        const jump = jumpPose(hunt.jump, t, surface(x));
        y = jump.y;
        angle = jump.angle;
        fish.style.visibility = y + hunt.jump.size / 4 < surface(x) ? 'visible' : 'hidden';
      } else {
        const tilt = pose.tilt * Math.PI / 180;
        const beak = pose.direction * flight.size * .25;
        x = pose.x + beak * Math.cos(tilt);
        y = pose.y + beak * Math.sin(tilt);
        // Keep the catch continuous, then let the fish hang below the beak.
        const settle = Math.min(1, (elapsed - hunt.catchAt) / .3);
        y += settle * hunt.jump.size / 3;
        angle = hunt.jump.endX > hunt.jump.startX ? -90 * settle : 180 + 90 * settle;
        fish.style.visibility = 'visible';
      }
      fish.style.transform = `translate(${x - hunt.jump.size / 2}px, ${y - hunt.jump.size / 4}px) rotate(${angle}deg)`;
      fishPosition = { x, y };
    }

    function dropFish() {
      if (!bird || !fish || !hunt || drop || elapsed < hunt.catchAt || !fishPosition) return;
      drop = { ...fishPosition, vx: flightPose().vx, at: elapsed };
      bird.classList.toggle('sky-bird--carrying', false);
      draw();
    }

    function tick(time) {
      frame = null;
      if ((!bird && !drop) || document.hidden || reducedMotion.matches) { stop(); return; }
      elapsed += previous === null ? 0 : Math.min((time - previous) / 1000, .05);
      previous = time;
      draw();
      if (elapsed >= flight.duration && bird) {
        bird.remove();
        bird = null;
        if (!drop) { stop(); return; }
      }
      if (!bird && !drop) stop();
      else frame = requestAnimationFrame(tick);
    }

    function prepareHunt() {
      const water = document.querySelector('.water');
      const layers = water && typeof water.querySelectorAll === 'function'
        ? [...water.querySelectorAll('.water-layer')].slice(2).filter(layer => layer.getAttribute('fill') !== '#ffffff') : [];
      if (!layers.length) return;
      const element = layers[Math.floor(Math.random() * layers.length)];
      const area = { width: water.clientWidth, height: water.clientHeight };
      const jump = randomJump(area);
      const catchAt = flight.duration / 2;
      const pose = birdPose(flight, .5);
      const catchX = pose.x + pose.direction * flight.size * .25;
      const span = jump.endX - jump.startX;
      jump.startX = catchX - span / 2;
      jump.endX = catchX + span / 2;
      hunt = {
        jump, area, catchX, catchAt, launchAt: catchAt - jump.duration / 2,
        waterTop: water.getBoundingClientRect().top - stage.getBoundingClientRect().top,
        layer: { element, baseline: Number(element.dataset.baseline), amplitude: Number(element.dataset.amplitude), cycles: Number(element.dataset.cycles), phase: Number(element.dataset.phase) },
      };
      hunt.catchY = surface(catchX) + jump.size - jump.height;
      fish = document.createElement('img');
      fish.className = 'sky-caught-fish';
      fish.alt = '';
      fish.draggable = false;
      fish.width = jump.size;
      fish.height = jump.size / 2;
      fish.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 32"%3E%3Cpath fill="white" d="M14 16C25 1 47 2 62 16C47 30 25 31 14 16L2 27L5 16L2 5Z"/%3E%3C/svg%3E';
      fish.style.cssText = 'position:absolute;left:0;top:0;object-fit:contain;will-change:transform';
      fish.style.visibility = 'hidden';
    }

    activeBirds.add(stop);
    bird = document.createElement('img');
    bird.className = 'sky-bird';
    bird.alt = '';
    bird.draggable = false;
    bird.addEventListener('click', dropFish);
    const width = stage.clientWidth;
    flight = createBirdFlight(width, Math.min(stage.clientHeight, Math.max(160, Math.min(240, width * .18))));
    bird.width = bird.height = flight.size;
    // Transparent padding triples the hit area; the negative margin keeps the image centered.
    bird.style.padding = `${flight.size}px`;
    bird.style.margin = `${-flight.size}px`;
    if (reducedMotion.matches) {
      bird.src = '/common/bird-rest.png';
      const rect = moon.getBoundingClientRect();
      const origin = stage.getBoundingClientRect();
      bird.style.transform = `translate(${rect.left - origin.left - flight.size}px, ${rect.top - origin.top}px)`;
      stage.appendChild(bird);
      timer = setTimeout(stop, 2000);
    } else {
      bird.src = '/common/bird-flap.gif';
      elapsed = 0;
      previous = null;
      prepareHunt();
      draw();
      stage.appendChild(bird);
      if (fish) stage.appendChild(fish);
      frame = requestAnimationFrame(tick);
    }
  }

  function stopAll() {
    for (const stop of activeBirds) stop();
  }
  moon.addEventListener('click', spawnBird);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopAll(); });
  reducedMotion.addEventListener('change', stopAll);
  window.addEventListener('resize', stopAll);
}
