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
  return Math.abs(a.x - b.x) < a.halfWidth + b.halfWidth + gap - 1e-7
    && Math.abs(a.y - b.y) < a.halfHeight + b.halfHeight + gap - 1e-7;
}

function sizeAt(body, y) {
  return body.sizeAt ? body.sizeAt(y) : { halfWidth: body.halfWidth, halfHeight: body.halfHeight };
}

function withSize(body, y, position = body) {
  return { ...body, ...position, ...sizeAt(body, y), y };
}

function inside(body, bounds) {
  return body.x >= body.halfWidth + 8 && body.x <= bounds.width - body.halfWidth - 8
    && body.y >= body.halfHeight + 8 && body.y <= bounds.height - body.halfHeight - 8;
}

function conflicts(a, b) {
  if (overlaps(a, b)) return true;
  if (a.order === undefined || b.order === undefined) return false;
  return a.order < b.order ? a.x + 12 > b.x + 1e-7 : b.x + 12 > a.x + 1e-7;
}

// Steer away before reaching edges or another label. Exponential smoothing
// keeps velocity continuous; the final axis limits are only a safety net.
export function moveBody(body, bodies, bounds, seconds) {
  if (seconds <= 0) return;
  Object.assign(body, sizeAt(body, body.y));
  const maxSpeedX = body.vx.maxSpeed;
  const maxSpeedY = body.vy.maxSpeed;
  let targetX = body.vx.advance(seconds) / seconds;
  let targetY = body.vy.advance(seconds) / seconds;
  let minX = body.halfWidth + 8;
  let maxX = bounds.width - body.halfWidth - 8;
  let minY = body.halfHeight + 8;
  let maxY = bounds.height - body.halfHeight - 8;
  for (const other of bodies) {
    if (other === body || body.order === undefined || other.order === undefined) continue;
    if (body.order < other.order) maxX = Math.min(maxX, other.x - 12);
    else minX = Math.max(minX, other.x + 12);
  }
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
  const previousX = body.x;
  body.x = clamp(body.x + body.motionX * seconds, minX, maxX);
  for (const other of bodies) {
    if (other === body || Math.abs(body.x - other.x) >= body.halfWidth + other.halfWidth + 12) continue;
    const clearance = body.halfHeight + other.halfHeight + 12;
    if (body.y < other.y) maxY = Math.min(maxY, other.y - clearance);
    else minY = Math.max(minY, other.y + clearance);
  }
  const previousY = body.y;
  body.y = clamp(body.y + body.motionY * seconds, minY, maxY);
  const candidate = withSize(body, body.y);
  if (!inside(candidate, bounds) || bodies.some(other => other !== body && conflicts(candidate, other))) {
    body.x = previousX;
    body.y = previousY;
  }
  Object.assign(body, sizeAt(body, body.y));
}

export function tiltAngle(phase) {
  return 20 * Math.sin(phase);
}

export function depthScale(y, height) {
  return 0.3 + 2 * Math.max(0, Math.min(1, y / height));
}

// Reserve enough space for the requested size and any angle up to 20 degrees.
export function labelBounds(width, height, scale = 2.3) {
  const sine = Math.sin(20 * Math.PI / 180);
  return {
    halfWidth: scale * (width + height * sine) / 2 + 2,
    halfHeight: scale * (height + width * sine) / 2 + 2,
  };
}

const layoutCache = new WeakMap();

function bodyThird(body, bounds) {
  return Math.min(2, Math.floor(body.y / (bounds.fullHeight ?? bounds.height) * 3));
}

function validLayout(bodies, bounds) {
  const current = bodies.map(body => withSize(body, body.y));
  return current.every((body, index) => inside(body, bounds)
    && current.slice(0, index).every(other => !conflicts(body, other)));
}

function layoutCacheMatches(cache, bodies, bounds) {
  return cache.width === bounds.width && cache.height === bounds.height
    && cache.fullHeight === (bounds.fullHeight ?? bounds.height)
    && cache.bodies.length === bodies.length
    && cache.bodies.every((item, index) => item.sizeAt === bodies[index].sizeAt
      && (item.sizeAt || (item.halfWidth === bodies[index].halfWidth && item.halfHeight === bodies[index].halfHeight))
      && item.order === bodies[index].order);
}

// Initial positions span both outer thirds; later movement remains unrestricted.
function initialXRange(body, bounds, index) {
  return {
    min: Math.max(body.halfWidth + 8, index === 2 ? bounds.width * 2 / 3 : 0),
    max: Math.min(bounds.width - body.halfWidth - 8, index === 0 ? bounds.width / 3 : bounds.width),
  };
}

function yCandidates(body, band, bounds, index) {
  const fullHeight = bounds.fullHeight ?? bounds.height;
  const low = Math.max(0, band * fullHeight / 3);
  const high = Math.min(bounds.height, (band + 1) * fullHeight / 3 - 0.001);
  const ys = [low, high];
  for (let y = Math.ceil(low / 8) * 8; y <= high; y += 8) ys.push(y);
  return [...new Set(ys)].sort((a, b) => Math.abs(a - (low + high) / 2) - Math.abs(b - (low + high) / 2))
    .filter(y => {
      const candidate = withSize(body, y, { x: bounds.width / 2, y });
      const range = initialXRange(candidate, bounds, index);
      return range.min <= range.max && bodyThird(candidate, bounds) === band && inside(candidate, bounds);
    });
}

function leftmostX(body, y, placed, bounds, index) {
  const candidate = withSize(body, y);
  const { min: minX, max: maxX } = initialXRange(candidate, bounds, index);
  const xs = [minX, maxX, (minX + maxX) / 2];
  for (const other of placed) {
    xs.push(other.x - 12, other.x + 12,
      other.x - other.halfWidth - candidate.halfWidth - 12,
      other.x + other.halfWidth + candidate.halfWidth + 12);
  }
  return xs.filter(x => x >= minX && x <= maxX)
    .sort((a, b) => a - b)
    .find(x => {
      const positioned = { ...candidate, x };
      return inside(positioned, bounds) && placed.every(other => !conflicts(positioned, other));
    });
}

function witnessForLayout(bodies, bounds, bands) {
  const placed = [];
  const visit = index => {
    if (index === bodies.length) return placed.map(body => ({ ...body }));
    const body = bodies[index];
    for (const y of yCandidates(body, bands[index], bounds, index)) {
      const x = leftmostX(body, y, placed, bounds, index);
      if (x === undefined) continue;
      placed.push(withSize(body, y, { x, y }));
      const result = visit(index + 1);
      if (result) return result;
      placed.pop();
    }
    return null;
  };
  return visit(0);
}

// Return feasible band assignments in body order. Feasibility does not consume randomness.
export function availableLayouts(bodies, bounds) {
  const cached = layoutCache.get(bodies);
  if (cached && layoutCacheMatches(cached, bodies, bounds)) return cached.layouts;
  const layouts = [];
  if (bodies.length === 3) {
    for (let mask = 0; mask < 27; mask++) {
      const bands = [mask % 3, Math.floor(mask / 3) % 3, Math.floor(mask / 9) % 3];
      if (bands.every(band => band === bands[0])) continue;
      const witness = witnessForLayout(bodies, bounds, bands);
      if (witness) layouts.push({ bands, witness });
    }
  }
  layoutCache.set(bodies, {
    width: bounds.width,
    height: bounds.height,
    fullHeight: bounds.fullHeight ?? bounds.height,
    bodies: bodies.map(body => ({ sizeAt: body.sizeAt, halfWidth: body.sizeAt ? null : body.halfWidth, halfHeight: body.sizeAt ? null : body.halfHeight, order: body.order })),
    layouts,
  });
  return layouts;
}

function randomPosition(body, [low, high], bounds, random, index) {
  const y = randomBetween(low, high, random);
  const radius = sizeAt(body, y);
  const range = initialXRange(radius, bounds, index);
  const x = randomBetween(range.min, range.max, random);
  return withSize(body, y, { x, y });
}

// Preserve a complete valid layout, otherwise choose a feasible band assignment uniformly.
export function placeBodies(bodies, bounds, random = Math.random) {
  if (bodies.length === 0) return true;
  if (bodies.length === 3 && validLayout(bodies, bounds)
    && bodies.some(body => bodyThird(body, bounds) !== bodyThird(bodies[0], bounds))) {
    bodies.forEach(body => Object.assign(body, sizeAt(body, body.y)));
    return true;
  }

  if (bodies.length === 3) {
    const layouts = availableLayouts(bodies, bounds);
    if (!layouts.length) return false;
    const layout = layouts[Math.min(layouts.length - 1, Math.floor(random() * layouts.length))];
    const ranges = bodies.map((body, i) => {
      const ys = yCandidates(body, layout.bands[i], bounds, i);
      return [Math.min(...ys), Math.max(...ys)];
    });
    for (let attempt = 0; attempt < 3000; attempt++) {
      const positions = bodies.map((body, i) => randomPosition(body, ranges[i], bounds, random, i));
      if (validLayout(positions, bounds)) {
        positions.forEach(({ x, y, halfWidth, halfHeight }, i) => Object.assign(bodies[i], { x, y, halfWidth, halfHeight }));
        return true;
      }
    }
    // Preserve the selected combination, but spread its fallback across the available width.
    const minShift = Math.max(...layout.witness.map((body, i) => initialXRange(body, bounds, i).min - body.x));
    const maxShift = Math.min(...layout.witness.map((body, i) => initialXRange(body, bounds, i).max - body.x));
    const shift = randomBetween(minShift, maxShift, random);
    layout.witness.forEach(({ x, y, halfWidth, halfHeight }, i) => Object.assign(bodies[i], { x: x + shift, y, halfWidth, halfHeight }));
    return true;
  }

  // One- and two-body callers retain their established placement behavior.
  const placed = [];
  for (const body of bodies) {
    const existing = withSize(body, body.y);
    let position = inside(existing, bounds) && placed.every(other => !conflicts(existing, other)) ? existing : null;
    for (let attempt = 0; !position && attempt < 300; attempt++) {
      const y = randomBetween(0, bounds.height, random);
      const radius = sizeAt(body, y);
      const x = randomBetween(radius.halfWidth + 8, bounds.width - radius.halfWidth - 8, random);
      const candidate = withSize(body, y, { x, y });
      if (inside(candidate, bounds) && placed.every(other => !conflicts(candidate, other))) position = candidate;
    }
    if (!position) return false;
    Object.assign(body, position);
    placed.push(body);
  }
  return true;
}
