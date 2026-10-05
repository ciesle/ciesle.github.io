const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const randomBetween = (min, max, random) => min + (max - min) * random();

// Wave geometry is authored in a 1200x600 SVG viewBox and scaled to the
// rendered bounds before it is used by the fish.
export function waveSurface(layer, x, offset, bounds) {
  const svgX = x * 1200 / bounds.width - offset;
  const scaleY = bounds.height / 600;
  const angle = (svgX / 1200) * layer.cycles * Math.PI * 2 + layer.phase;
  return (layer.baseline + layer.amplitude * Math.sin(angle)) * scaleY;
}

export function jumpPose(jump, progress, surfaceY) {
  const t = clamp(progress, 0, 1);
  const dx = jump.endX - jump.startX;
  return {
    x: jump.startX + dx * t,
    y: surfaceY + jump.size - 4 * jump.height * t * (1 - t),
    angle: Math.atan2(-4 * jump.height * (1 - 2 * t), dx) * 180 / Math.PI,
  };
}

export function randomJump(bounds, random = Math.random) {
  const size = randomBetween(24, 40, random);
  const margin = size + 8;
  const minX = Math.min(margin, bounds.width / 2);
  const maxX = Math.max(bounds.width - margin, bounds.width / 2);
  const available = maxX - minX;
  const height = Math.max(size, randomBetween(bounds.height * 0.18, bounds.height * 0.36, random));
  const maxSpan = Math.min(available * 0.6, (height - size) * 5);
  const span = randomBetween(Math.min(available * 0.12, maxSpan), maxSpan, random);
  const direction = random() < 0.5 ? -1 : 1;
  const startX = direction > 0
    ? randomBetween(minX, maxX - span, random)
    : randomBetween(minX + span, maxX, random);
  return {
    startX,
    endX: clamp(startX + direction * span, minX, maxX),
    height,
    size,
    duration: randomBetween(1.4, 2.4, random),
  };
}

export function nextFishDelay(random = Math.random) {
  return randomBetween(5, 15, random);
}
