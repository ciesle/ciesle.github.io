const randomBetween = (min, max, random) => min + (max - min) * random();

// A randomly chosen target is reached by changing velocity linearly.
// Integrating each segment exactly keeps motion independent of frame rate.
export class RandomVelocity {
  constructor(maxSpeed, minDuration, maxDuration, random = Math.random) {
    Object.assign(this, { maxSpeed, minDuration, maxDuration, random });
    this.velocity = randomBetween(-maxSpeed, maxSpeed, random);
    this.retarget();
  }

  retarget(direction = 0) {
    this.start = this.velocity;
    this.target = direction
      ? direction * randomBetween(this.maxSpeed * 0.25, this.maxSpeed, this.random)
      : randomBetween(-this.maxSpeed, this.maxSpeed, this.random);
    this.duration = randomBetween(this.minDuration, this.maxDuration, this.random);
    this.elapsed = 0;
  }

  advance(seconds) {
    let distance = 0;
    while (seconds > 0) {
      const step = Math.min(seconds, this.duration - this.elapsed);
      const acceleration = (this.target - this.start) / this.duration;
      distance += this.velocity * step + acceleration * step * step / 2;
      this.elapsed += step;
      this.velocity = this.start + acceleration * this.elapsed;
      seconds -= step;
      if (this.elapsed >= this.duration) this.retarget();
    }
    return distance;
  }

  reverse(direction) {
    this.velocity = direction * Math.max(Math.abs(this.velocity), this.maxSpeed * 0.25);
    this.retarget(direction);
  }
}

export function overlaps(a, b, gap = 12) {
  return Math.abs(a.x - b.x) < a.halfWidth + b.halfWidth + gap
    && Math.abs(a.y - b.y) < a.halfHeight + b.halfHeight + gap;
}

// Steer away before reaching edges or another label. Exponential smoothing
// keeps velocity continuous; the final axis limits are only a safety net.
export function moveBody(body, bodies, bounds, seconds) {
  if (seconds <= 0) return;
  const maxSpeedX = body.vx.maxSpeed;
  const maxSpeedY = body.vy.maxSpeed;
  let targetX = body.vx.advance(seconds) / seconds;
  let targetY = body.vy.advance(seconds) / seconds;
  let minX = body.halfWidth + 8;
  let maxX = bounds.width - body.halfWidth - 8;
  let minY = body.halfHeight + 8;
  let maxY = bounds.height - body.halfHeight - 8;
  const pressure = distance => Math.max(0, 1 - Math.max(0, distance) / 48) ** 2;
  targetX += 2 * maxSpeedX * (pressure(body.x - minX) - pressure(maxX - body.x));
  targetY += 2 * maxSpeedY * (pressure(body.y - minY) - pressure(maxY - body.y));
  for (const other of bodies) {
    if (other === body) continue;
    const dx = body.x - other.x;
    const dy = body.y - other.y;
    const clearanceX = Math.abs(dx) - body.halfWidth - other.halfWidth - 12;
    const clearanceY = Math.abs(dy) - body.halfHeight - other.halfHeight - 12;
    if (clearanceX < 48 && clearanceY < 48) {
      if (clearanceX >= clearanceY) targetX += Math.sign(dx) * 2 * maxSpeedX * pressure(clearanceX);
      else targetY += Math.sign(dy) * 2 * maxSpeedY * pressure(clearanceY);
    }
  }
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const blend = 1 - Math.exp(-seconds * 1.2);
  body.motionX = (body.motionX ?? 0) + (clamp(targetX, -maxSpeedX, maxSpeedX) - (body.motionX ?? 0)) * blend;
  body.motionY = (body.motionY ?? 0) + (clamp(targetY, -maxSpeedY, maxSpeedY) - (body.motionY ?? 0)) * blend;
  for (const other of bodies) {
    if (other === body || Math.abs(body.y - other.y) >= body.halfHeight + other.halfHeight + 12) continue;
    const clearance = body.halfWidth + other.halfWidth + 12;
    if (body.x < other.x) maxX = Math.min(maxX, other.x - clearance);
    else minX = Math.max(minX, other.x + clearance);
  }
  body.x = clamp(body.x + body.motionX * seconds, minX, maxX);
  for (const other of bodies) {
    if (other === body || Math.abs(body.x - other.x) >= body.halfWidth + other.halfWidth + 12) continue;
    const clearance = body.halfHeight + other.halfHeight + 12;
    if (body.y < other.y) maxY = Math.min(maxY, other.y - clearance);
    else minY = Math.max(minY, other.y + clearance);
  }
  body.y = clamp(body.y + body.motionY * seconds, minY, maxY);
}

export function tiltAngle(center, phase) {
  return center + 15 * Math.sin(phase);
}

// Preserve existing positions when possible; otherwise find free space after a resize.
export function placeBodies(bodies, bounds, random = Math.random) {
  const original = bodies.map(body => ({ x: body.x, y: body.y }));
  const placed = [];
  for (const body of bodies) {
    const minX = body.halfWidth + 8;
    const maxX = bounds.width - body.halfWidth - 8;
    const minY = body.halfHeight + 8;
    const maxY = bounds.height - body.halfHeight - 8;
    const valid = (x, y) => x >= minX && x <= maxX && y >= minY && y <= maxY
      && placed.every(other => !overlaps({ ...body, x, y }, other));
    let position = valid(body.x, body.y) ? { x: body.x, y: body.y } : null;
    for (let attempt = 0; !position && attempt < 150; attempt++) {
      const x = randomBetween(minX, maxX, random);
      const y = randomBetween(minY, maxY, random);
      if (valid(x, y)) position = { x, y };
    }
    for (let y = minY; !position && y <= maxY; y += 4) {
      for (let x = minX; !position && x <= maxX; x += 4) {
        if (valid(x, y)) position = { x, y };
      }
    }
    if (!position) {
      bodies.forEach((item, index) => Object.assign(item, original[index]));
      return packBodies(bodies, bounds);
    }
    Object.assign(body, position);
    placed.push(body);
  }
  return true;
}

// Try exact edges and clearances as well as centers. A fixed-step scan can miss
// a narrow valid position, and an unlucky first position can block later labels.
function packBodies(bodies, bounds, placed = [], index = 0) {
  if (index === bodies.length) return true;
  const body = bodies[index];
  const minX = body.halfWidth + 8;
  const maxX = bounds.width - body.halfWidth - 8;
  const minY = body.halfHeight + 8;
  const maxY = bounds.height - body.halfHeight - 8;
  const xs = [body.x, minX, maxX, bounds.width / 2];
  const ys = [body.y, minY, maxY, bounds.height / 2];
  for (const other of placed) {
    xs.push(other.x - other.halfWidth - body.halfWidth - 12, other.x + other.halfWidth + body.halfWidth + 12);
    ys.push(other.y - other.halfHeight - body.halfHeight - 12, other.y + other.halfHeight + body.halfHeight + 12);
  }
  for (const x of xs) {
    for (const y of ys) {
      const position = { ...body, x, y };
      if (x < minX || x > maxX || y < minY || y > maxY || placed.some(other => overlaps(position, other))) continue;
      placed.push(position);
      if (packBodies(bodies, bounds, placed, index + 1)) {
        Object.assign(body, { x, y });
        return true;
      }
      placed.pop();
    }
  }
  return false;
}
