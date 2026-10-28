let libraries;

async function showModel(figure) {
  const viewport = figure.querySelector('.guidance-model__viewport');
  const status = figure.querySelector('.guidance-model__status');
  const resetButton = figure.querySelector('[data-reset-view]');
  let renderer;
  const geometries = [];
  let material;
  let controls;
  let observer;

  try {
    libraries ??= Promise.all([
      import('./vendor/three.module.js'),
      import('./vendor/STLLoader.js'),
      import('./vendor/OrbitControls.js'),
      import('./model-layout.js'),
    ]);
    const [THREE, { STLLoader }, { OrbitControls }, { createModelGroup }] = await libraries;
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.style.display = 'block';
    viewport.append(renderer.domElement);

    const loader = new STLLoader();
    for (const url of [figure.dataset.lidSrc, figure.dataset.caseSrc]) {
      geometries.push(await loader.loadAsync(url));
    }
    const scene = new THREE.Scene();
    material = new THREE.MeshStandardMaterial({ color: 0xb7c9df, roughness: 0.65 });
    const models = createModelGroup(...geometries, material);
    scene.add(models);
    const radius = new THREE.Box3().setFromObject(models).getBoundingSphere(new THREE.Sphere()).radius;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x445166, 2.5));
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(-1, -2, 3);
    scene.add(light);
    const fill = new THREE.DirectionalLight(0xffffff, 1.5);
    fill.position.set(1, 2, -3);
    scene.add(fill);

    const camera = new THREE.PerspectiveCamera(35, 1, radius / 100, radius * 100);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.minDistance = radius * 0.7;
    controls.maxDistance = radius * 12;
    controls.enablePan = false;
    controls.listenToKeyEvents(viewport);
    const render = () => renderer.render(scene, camera);
    controls.addEventListener('change', render);

    const reset = () => {
      const vertical = THREE.MathUtils.degToRad(camera.fov / 2);
      const horizontal = Math.atan(Math.tan(vertical) * camera.aspect);
      const distance = radius / Math.sin(Math.min(vertical, horizontal)) * 1.1;
      const direction = new THREE.Vector3(0.35, -0.55, 1);
      camera.position.copy(direction.normalize().multiplyScalar(distance));
      controls.target.set(0, 0, 0);
      controls.update();
      render();
    };
    const resize = () => {
      const { width, height } = viewport.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      render();
    };
    resize();
    reset();
    observer = new ResizeObserver(resize);
    observer.observe(viewport);
    resetButton.disabled = false;
    resetButton.addEventListener('click', reset);
    status.textContent = 'ドラッグで回転、ホイール・ピンチで拡大縮小できます。';
    renderer.domElement.setAttribute('aria-hidden', 'true');
  } catch (error) {
    observer?.disconnect();
    controls?.dispose();
    geometries.forEach(geometry => geometry.dispose());
    material?.dispose();
    renderer?.dispose();
    viewport.replaceChildren();
    status.textContent = '3Dモデルを表示できませんでした。下のSTLファイルからご覧ください。';
    console.error('STL viewer:', error);
  }
}

const figures = document.querySelectorAll('[data-stl-viewer]');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      void showModel(entry.target);
    }
  }, { rootMargin: '200px' });
  figures.forEach(figure => observer.observe(figure));
} else {
  figures.forEach(figure => { void showModel(figure); });
}
