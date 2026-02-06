(() => {
  const container = document.getElementById("rose-container");
  const THREERef = window.THREE;
  if (!container || !THREERef) return;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  let renderer;
  try {
    renderer = new THREERef.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
  } catch {
    return;
  }

  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const scene = new THREERef.Scene();
  const camera = new THREERef.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0.4, 4.2);

  const group = new THREERef.Group();
  group.scale.set(1.15, 1.15, 1.15);
  scene.add(group);

  scene.add(new THREERef.AmbientLight(0xffd8e8, 0.9));
  const keyLight = new THREERef.PointLight(0xff6fa4, 1.25, 15);
  keyLight.position.set(2.5, 3.5, 4);
  scene.add(keyLight);
  const rimLight = new THREERef.PointLight(0xfff1f7, 0.7, 12);
  rimLight.position.set(-3, -2, 3);
  scene.add(rimLight);

  const petalGroup = new THREERef.Group();
  const petalGeometry = new THREERef.CircleGeometry(0.45, 32);
  const petalMaterial = new THREERef.MeshStandardMaterial({
    color: 0xff4f86,
    roughness: 0.35,
    metalness: 0.22,
    emissive: 0x22060f,
    side: THREERef.DoubleSide,
  });

  const petalCount = 24;
  for (let i = 0; i < petalCount; i += 1) {
    const petal = new THREERef.Mesh(petalGeometry, petalMaterial.clone());
    const angle = (i / petalCount) * Math.PI * 2;
    const radius = 0.18 + i * 0.035;
    const lift = -0.2 + i * 0.01;
    const scale = Math.max(0.45, 0.95 - i * 0.02);
    petal.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, lift);
    petal.rotation.set(Math.PI / 2, 0, angle);
    petal.scale.setScalar(scale);
    petalGroup.add(petal);
  }
  group.add(petalGroup);

  const budGeometry = new THREERef.SphereGeometry(0.28, 24, 24);
  const budMaterial = new THREERef.MeshStandardMaterial({
    color: 0xff7ca8,
    roughness: 0.25,
    metalness: 0.1,
    emissive: 0x330914,
  });
  const bud = new THREERef.Mesh(budGeometry, budMaterial);
  bud.position.set(0, 0, 0.2);
  group.add(bud);

  const sparkleCount = 160;
  const sparklePositions = new Float32Array(sparkleCount * 3);
  for (let i = 0; i < sparkleCount; i += 1) {
    sparklePositions[i * 3] = (Math.random() - 0.5) * 3.2;
    sparklePositions[i * 3 + 1] = (Math.random() - 0.5) * 3.2;
    sparklePositions[i * 3 + 2] = (Math.random() - 0.5) * 3.2;
  }
  const sparkleGeometry = new THREERef.BufferGeometry();
  sparkleGeometry.setAttribute(
    "position",
    new THREERef.BufferAttribute(sparklePositions, 3)
  );
  const sparkleMaterial = new THREERef.PointsMaterial({
    color: 0xfff1f7,
    size: 0.06,
    transparent: true,
    opacity: 0.8,
  });
  const sparkles = new THREERef.Points(sparkleGeometry, sparkleMaterial);
  group.add(sparkles);

  const resize = () => {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  let rafId = null;
  let running = false;

  const render = (time) => {
    if (!running) return;
    const t = time * 0.001;
    group.rotation.y = t * 0.5;
    group.rotation.x = Math.sin(t * 0.6) * 0.18;
    group.position.y = Math.sin(t * 0.8) * 0.08;
    sparkles.rotation.y = -t * 0.4;
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(render);
  };

  const start = () => {
    if (running || prefersReducedMotion) return;
    running = true;
    render(0);
  };

  const stop = () => {
    running = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    renderer.render(scene, camera);
  };

  window.addEventListener("resize", resize);
  resize();
  renderer.render(scene, camera);

  window.rose3D = {
    start,
    stop,
  };
})();
