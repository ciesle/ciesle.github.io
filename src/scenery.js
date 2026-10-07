const TAU = Math.PI * 2;

function wavePath(baseline, amplitude, cycles, phase) {
  const points = Array.from({ length: 721 }, (_, index) => {
    const x = index * 5 - 1200;
    const y = baseline + amplitude * Math.sin(x / 1200 * TAU * cycles + phase);
    return `${x},${y.toFixed(2)}`;
  });
  return `M${points.join(' L')} L2400,600 L-1200,600 Z`;
}

function randomizeWater(water, random) {
  if (!water) return;
  for (const layer of water.querySelectorAll('.water-layer')) {
    const phase = random() * TAU;
    layer.dataset.phase = String(phase);
    layer.setAttribute('d', wavePath(
      Number(layer.dataset.baseline),
      Number(layer.dataset.amplitude),
      Number(layer.dataset.cycles),
      phase,
    ));
  }
}

function randomizeClouds(clouds, random) {
  for (const cloud of clouds) {
    if (cloud.classList.contains('night-sky__cloud--far')) {
      cloud.style.right = `${105 + random() * 30}%`;
    } else if (cloud.classList.contains('night-sky__cloud--near')) {
      cloud.style.right = `${60 + random() * 30}%`;
    } else if (cloud.classList.contains('night-sky__cloud--front')) {
      cloud.style.right = `${-4 + random() * 16}%`;
    } else if (cloud.classList.contains('night-sky__cloud--edge')) {
      cloud.style.right = `${-80 + random() * 48}px`;
    }
  }
}

export function randomizeScenery(document, random = Math.random) {
  randomizeWater(document.querySelector('.water'), random);
  randomizeClouds(document.querySelectorAll('.night-sky__cloud'), random);
}

if (typeof document !== 'undefined') randomizeScenery(document);
