/* ───────────────────────────────────────────────────────────────
   Фоновая 3D-модель Земли для главной страницы.
   Сетка из точек + дуги-«полоски», соединяющие точки на поверхности.
   Глобус постоянно вращается и увеличивается при прокрутке страницы.
   Зависит от three.min.js (глобальная переменная THREE).
   ─────────────────────────────────────────────────────────────── */
(function () {
  if (typeof THREE === 'undefined') return;
  const canvas = document.getElementById('globeCanvas');
  if (!canvas) return;

  // Уважаем настройку «уменьшенного движения».
  const reducedMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
  camera.position.set(0, 0, 340);

  const root = new THREE.Group();          // отвечает за масштаб (скролл)
  const globe = new THREE.Group();         // отвечает за вращение
  root.add(globe);
  scene.add(root);

  const R = 100;
  const ACCENT = 0x38bdf8;
  const BLUE = 0x3b82f6;

  // ── Базовая сфера (тёмная «вода») ───────────────────────────────
  globe.add(new THREE.Mesh(
    new THREE.SphereGeometry(R, 64, 64),
    new THREE.MeshBasicMaterial({ color: 0x0a1830, transparent: true, opacity: 0.55 })
  ));

  // ── Сетка широт/долгот ──────────────────────────────────────────
  globe.add(new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.SphereGeometry(R * 1.002, 36, 24)),
    new THREE.LineBasicMaterial({ color: BLUE, transparent: true, opacity: 0.10 })
  ));

  // ── Точки на поверхности (узлы) ─────────────────────────────────
  const DOTS = 1900;
  const dotPos = new Float32Array(DOTS * 3);
  const golden = Math.PI * (1 + Math.sqrt(5));
  for (let i = 0; i < DOTS; i++) {
    const phi = Math.acos(1 - 2 * (i + 0.5) / DOTS);
    const theta = golden * i;
    const r = R * 1.012;
    dotPos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    dotPos[i * 3 + 1] = r * Math.cos(phi);
    dotPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const dotGeo = new THREE.BufferGeometry();
  dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPos, 3));
  globe.add(new THREE.Points(dotGeo, new THREE.PointsMaterial({
    color: 0x5aa2ff, size: 1.4, transparent: true, opacity: 0.55, sizeAttenuation: true
  })));

  // ── Дуги-«полоски», соединяющие случайные точки ─────────────────
  function randomSurfacePoint() {
    const u = Math.random(), v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    return new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta),
      Math.cos(phi),
      Math.sin(phi) * Math.sin(theta)
    ).multiplyScalar(R);
  }

  const arcs = [];
  const ARC_COUNT = 38;
  for (let i = 0; i < ARC_COUNT; i++) {
    const a = randomSurfacePoint();
    const b = randomSurfacePoint();
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const lift = R + a.distanceTo(b) * 0.5 + 6;
    mid.setLength(lift);
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const pts = curve.getPoints(60);
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: ACCENT, transparent: true, opacity: 0.45
    });
    const line = new THREE.Line(geo, mat);
    line.userData.phase = Math.random() * Math.PI * 2;
    globe.add(line);
    arcs.push(line);

    // Светящиеся концы дуг.
    const ends = new THREE.BufferGeometry().setFromPoints([a, b]);
    globe.add(new THREE.Points(ends, new THREE.PointsMaterial({
      color: 0x8fd4ff, size: 3.4, transparent: true, opacity: 0.9, sizeAttenuation: true
    })));
  }

  // ── Атмосферное свечение (френель) ──────────────────────────────
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.18, 64, 64),
    new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color(0x2e7dff) } },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec3 vNormal;
        uniform vec3 uColor;
        void main() {
          float intensity = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
          gl_FragColor = vec4(uColor, 1.0) * intensity;
        }`
    })
  );
  globe.add(glow);

  // Лёгкий наклон оси.
  globe.rotation.x = 0.42;

  // ── Масштаб при прокрутке ───────────────────────────────────────
  let targetScale = 1;
  let currentScale = 1;
  function updateScrollTarget() {
    const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const frac = Math.min(Math.max(window.scrollY / max, 0), 1);
    targetScale = 1 + frac * 1.7;            // у низа страницы — крупнее
  }
  window.addEventListener('scroll', updateScrollTarget, { passive: true });
  updateScrollTarget();

  // ── Размеры ─────────────────────────────────────────────────────
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // ── Анимация ────────────────────────────────────────────────────
  const clock = new THREE.Clock();
  function tick() {
    const t = clock.getElapsedTime();
    if (!reducedMotion) globe.rotation.y += 0.0016;
    currentScale += (targetScale - currentScale) * 0.06;
    root.scale.setScalar(currentScale);
    for (let i = 0; i < arcs.length; i++) {
      const m = arcs[i].material;
      m.opacity = 0.28 + 0.32 * (0.5 + 0.5 * Math.sin(t * 1.3 + arcs[i].userData.phase));
    }
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
})();
