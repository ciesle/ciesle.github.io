function flightRandom() {
  if (globalThis.crypto?.getRandomValues) {
    const value = new Uint32Array(1);
    globalThis.crypto.getRandomValues(value);
    return value[0] / 0x100000000;
  }
  return Math.random();
}

export function createBirdFlight(width, height, random = flightRandom) {
  const size = 48 + random() * 24;
  const fromRight = random() < .5;
  const startY = 28 + random() * Math.max(0, height - 96);
  const endY = 28 + random() * Math.max(0, height - 96);
  return {
    startX: fromRight ? width + size : -size,
    controlX1: width * (fromRight ? .7 : .3),
    controlX2: width * (fromRight ? .35 : .65),
    endX: fromRight ? -size : width + size,
    startY, endY,
    controlY: Math.max(24, Math.min(startY, endY) - 20 - random() * 28),
    size, duration: 4.5 + random() * 2.5,
  };
}

export function birdPose(flight, progress) {
  const t = Math.max(0, Math.min(1, progress));
  const u = 1 - t;
  const x = u ** 3 * flight.startX + 3 * u ** 2 * t * flight.controlX1
    + 3 * u * t ** 2 * flight.controlX2 + t ** 3 * flight.endX;
  const dx = 3 * u ** 2 * (flight.controlX1 - flight.startX)
    + 6 * u * t * (flight.controlX2 - flight.controlX1)
    + 3 * t ** 2 * (flight.endX - flight.controlX2);
  const y = u ** 2 * flight.startY + 2 * u * t * flight.controlY + t ** 2 * flight.endY;
  const dy = 2 * u * (flight.controlY - flight.startY) + 2 * t * (flight.endY - flight.controlY);
  const direction = dx < 0 ? -1 : 1;
  return { x, y, vx: dx / flight.duration, direction, tilt: direction * Math.atan2(dy, Math.abs(dx)) * 180 / Math.PI };
}
