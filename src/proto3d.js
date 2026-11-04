// 3D 보기. three.js로 그리고, npm run build:3d 로 js/proto3d.js 한 파일에 묶는다.
// 장면(scenes3d.js)은 "카드 상태가 이렇게 바뀐다"는 단계 목록이고, 이 엔진은 바뀌기 전과 후의 위치 사이를 움직여 보여 준다.
import {
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import { CARD_T, apply, isHwatu, isRed, newState, pileOf } from './core3d.js';
import { SCENARIOS, cardsOf } from './scenes3d.js';

export { SCENARIOS };

const CARD_W = 0.63;
const HWATU_W = 0.54;
const CARD_D = 0.88;
const VIEWS = {
  diag: { az: 0, el: 0.62 },
  side: { az: 0, el: 0.2 },
  top: { az: 0, el: 1.45 },
  below: { az: 0, el: -0.5 },
};
const VIEW_LABEL = { diag: '비스듬히', side: '옆에서', top: '위에서', below: '아래에서' };

export const viewsOf = (key) => (SCENARIOS[key].views || ['diag', 'side', 'top']).map((n) => [n, VIEW_LABEL[n]]);

// 단계마다 상태를 내놓는다 (검증용)
export function* run(key) {
  const sc = SCENARIOS[key];
  const s = newState(sc);
  for (const ev of sc.plan(sc)) {
    apply(s, ev);
    yield { ev, state: s };
  }
}

export function simulate(key) {
  let last = null;
  for (const step of run(key)) last = step.state;
  return { state: last, ok: SCENARIOS[key].check(last) };
}

// ── 위치 계산 ──
function rotateAboutX(v, c, a) {
  const y = v.y - c.y;
  const z = v.z - c.z;
  v.y = c.y + y * Math.cos(a) - z * Math.sin(a);
  v.z = c.z + y * Math.sin(a) + z * Math.cos(a);
  return v;
}

function pileCenter(sc, s, p) {
  const spec = sc.piles[p];
  const t = sc.t || CARD_T;
  return new Vector3(spec.x ?? 0, (spec.y ?? 0) + (s.piles[p].length * t) / 2, spec.z ?? 0);
}

function transformOf(sc, s, id) {
  const faceRot = s.face[id] ? Math.PI : 0;
  if (s.free[id]) {
    const f = s.free[id];
    return { pos: new Vector3(f.x, f.y, f.z), rotX: faceRot, rotY: f.rotY || 0 };
  }
  const p = pileOf(s, id);
  const spec = sc.piles[p];
  const list = s.piles[p];
  const t = sc.t || CARD_T;
  const k = list.length - 1 - list.indexOf(id);
  const o = s.offset[id] || { dy: 0, dz: 0 };
  const pos = new Vector3(spec.x ?? 0, (spec.y ?? 0) + t / 2 + k * t + o.dy, (spec.z ?? 0) + o.dz);
  const tilt = s.tilt[p];
  if (tilt) rotateAboutX(pos, pileCenter(sc, s, p), tilt);
  return { pos, rotX: faceRot + tilt, rotY: s.yaw[id] || 0 };
}

// ── 카드 그림 ─────────────────────────────
const canvas = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });

function drawPip(g, suit, cx, cy, size) {
  const path = new Path2D(globalThis.CardUI.PIPS[suit]);
  g.save();
  g.translate(cx - size / 2, cy - size / 2);
  g.scale(size / 24, size / 24);
  g.fill(path);
  g.restore();
}

function faceCanvas(id) {
  const c = canvas(200, 280);
  const g = c.getContext('2d');
  const base = id.split('~')[0];
  const rank = base.slice(0, -1);
  const suit = base.slice(-1);
  g.fillStyle = '#fbf6ea';
  g.fillRect(0, 0, 200, 280);
  g.strokeStyle = '#d9cfb8';
  g.lineWidth = 5;
  g.strokeRect(2.5, 2.5, 195, 275);
  g.fillStyle = isRed(base) ? '#c21f30' : '#1d1a24';
  g.textAlign = 'center';
  g.textBaseline = 'top';
  g.font = '700 40px "Gowun Batang", serif';
  const corner = () => {
    g.fillText(rank, 30, 12);
    drawPip(g, suit, 30, 70, 26);
  };
  corner();
  g.save();
  g.translate(200, 280);
  g.rotate(Math.PI);
  corner();
  g.restore();
  if ('JQK'.includes(rank)) {
    g.textBaseline = 'middle';
    g.font = '700 118px "Gowun Batang", serif';
    g.fillText(rank, 100, 146);
  } else {
    drawPip(g, suit, 100, 140, 92);
  }
  return c;
}

// 화투 그림은 평면 화면과 같은 SVG를 그림으로 불러와 그린다
function svgImage(svg) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '))}`;
  });
}

async function hwatuCanvas(id) {
  const [, month, kind] = /^H(\d+)([A-Z])$/.exec(id);
  const c = canvas(200, 326);
  const g = c.getContext('2d');
  g.fillStyle = '#fbf6ea';
  g.fillRect(0, 0, 200, 326);
  const img = await svgImage(globalThis.CardUI.hwatuArt(Number(month), kind));
  if (img) g.drawImage(img, 0, 3, 200, 320);
  g.fillStyle = 'rgba(251,246,234,0.92)';
  g.fillRect(8, 8, month.length > 1 ? 50 : 34, 40);
  g.fillStyle = '#1d1a24';
  g.font = '700 32px "Gowun Batang", serif';
  g.textBaseline = 'top';
  g.fillText(month, 14, 12);
  return c;
}

function backCanvas(top, bottom, w = 200, h = 280) {
  const c = canvas(w, h);
  const g = c.getContext('2d');
  g.fillStyle = '#fbf6ea';
  g.fillRect(0, 0, w, h);
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  g.fillStyle = grad;
  g.fillRect(11, 11, w - 22, h - 22);
  g.save();
  g.beginPath();
  g.rect(11, 11, w - 22, h - 22);
  g.clip();
  g.strokeStyle = 'rgba(255,255,255,0.16)';
  g.lineWidth = 2.5;
  for (let x = -h; x < w + h; x += 11) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x + h, h);
    g.moveTo(x + h, 0);
    g.lineTo(x, h);
    g.stroke();
  }
  g.restore();
  return c;
}

function hwatuBackCanvas() {
  const c = canvas(200, 326);
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 200, 326);
  grad.addColorStop(0, '#b3202f');
  grad.addColorStop(1, '#7c1320');
  g.fillStyle = grad;
  g.fillRect(0, 0, 200, 326);
  g.strokeStyle = 'rgba(255,255,255,0.18)';
  g.lineWidth = 3;
  g.strokeRect(10, 10, 180, 306);
  return c;
}

function feltCanvas() {
  const c = canvas(512, 512);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(256, 256, 10, 256, 256, 256);
  grad.addColorStop(0, '#1c7a67');
  grad.addColorStop(0.35, '#13584b');
  grad.addColorStop(1, '#0a3d36');
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 512);
  return c;
}

const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const clamp01 = (k) => Math.min(1, Math.max(0, k));

// ── 무대 ──────────────────────────────────
// host 안에 key 장면의 3D 무대를 만든다. WebGL을 쓸 수 없으면 예외를 던진다.
export async function mount(host, key, { onSay = () => {}, onView = () => {}, slow = false } = {}) {
  const sc = SCENARIOS[key];
  const T = sc.t || CARD_T;
  try {
    await document.fonts.load('700 40px "Gowun Batang"');
  } catch (e) { /* 글꼴이 없으면 기본 세리프로 그린다 */ }

  const allIds = cardsOf(sc);
  const hwCanvases = {};
  await Promise.all(allIds.filter(isHwatu).map(async (id) => { hwCanvases[id] = await hwatuCanvas(id); }));

  const renderer = new WebGLRenderer({ antialias: true });
  // 고해상도 휴대폰에서도 부드럽게 돌도록 렌더링 배율을 1.5로 제한한다
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  host.appendChild(renderer.domElement);

  // 테이블 끝이 보이지 않게 배경과 안개를 펠트의 가장 어두운 색으로 맞춘다
  const scene = new Scene();
  scene.background = new Color('#0a3d36');
  scene.fog = new Fog('#0a3d36', 5, 11);
  const camera = new PerspectiveCamera(36, 1, 0.05, 40);

  scene.add(new HemisphereLight('#fff6e6', '#6e7a72', 1.6));
  const sun = new DirectionalLight('#ffffff', 2.2);
  sun.position.set(1.3, 3.4, 1.8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -2.6, right: 2.6, top: 2.6, bottom: -2.6, near: 0.5, far: 10 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  // 덱을 기울이거나 아래에서 볼 때 카드 앞면이 어둡지 않도록 아래쪽에서 약한 빛을 비춘다
  const under = new DirectionalLight('#fff6e6', 1.3);
  under.position.set(0.6, -3, 2.2);
  scene.add(under);

  const disposables = [];
  const keep = (x) => (disposables.push(x), x);
  const texture = (c) => {
    const t = keep(new CanvasTexture(c));
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return t;
  };

  // 테이블은 윗면만 그려서, 아래에서 볼 때는 보이지 않는다
  const table = new Mesh(keep(new CircleGeometry(20, 96)), keep(new MeshStandardMaterial({ map: texture(feltCanvas()), roughness: 0.95 })));
  table.rotation.x = -Math.PI / 2;
  table.receiveShadow = true;
  scene.add(table);

  // 카드는 얇은 상자. 윗면이 뒷면, 아랫면이 앞면이다. 앞면으로 놓으려면 x축으로 반 바퀴 돌린다.
  const cardGeo = keep(new BoxGeometry(CARD_W, T, CARD_D));
  const hwatuGeo = keep(new BoxGeometry(HWATU_W, T, CARD_D));
  const backs = {
    red: keep(new MeshStandardMaterial({ map: texture(backCanvas('#8e1c2e', '#6f1524')), roughness: 0.55 })),
    blue: keep(new MeshStandardMaterial({ map: texture(backCanvas('#27508f', '#1b3a6b')), roughness: 0.55 })),
    hwatu: keep(new MeshStandardMaterial({ map: texture(hwatuBackCanvas()), roughness: 0.5 })),
  };
  const edgeMat = keep(new MeshStandardMaterial({ color: '#efe6d2', roughness: 0.8 }));
  const hwEdgeMat = keep(new MeshStandardMaterial({ color: '#5a0f18', roughness: 0.7 }));
  const goldMat = keep(new MeshStandardMaterial({ color: '#dcb76f', emissive: '#5a3f10', emissiveIntensity: 0.5, roughness: 0.4 }));
  const meshes = {};
  allIds.forEach((id) => {
    const hw = isHwatu(id);
    const faceMat = keep(new MeshStandardMaterial({ map: texture(hw ? hwCanvases[id] : faceCanvas(id)), roughness: 0.55 }));
    const edge = sc.marks.includes(id) ? goldMat : hw ? hwEdgeMat : edgeMat;
    const back = hw ? backs.hwatu : sc.blue && sc.blue(id) ? backs.blue : backs.red;
    const m = new Mesh(hw ? hwatuGeo : cardGeo, [edge, edge, back, faceMat, edge, edge]);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    meshes[id] = m;
  });

  const labels = sc.labels.map((l) => {
    const el = document.createElement('span');
    el.className = `gl-label${l.plain ? ' plain' : ''}`;
    host.appendChild(el);
    return { ...l, el };
  });

  // ── 단계대로 움직이기 ──
  const firstView = (sc.views || ['diag'])[0];
  const want = { ...VIEWS[firstView] };
  const now = { ...VIEWS[firstView] };
  const setView = (name) => {
    Object.assign(want, VIEWS[name] || VIEWS.diag);
    onView(name);
  };

  let state;
  let events;
  let index;
  let current;
  let wait;
  let playing = true;
  let slowMul = slow ? 1.8 : 1;

  function reset() {
    state = newState(sc);
    events = sc.plan(sc);
    allIds.forEach((id) => {
      const t = transformOf(sc, state, id);
      meshes[id].position.copy(t.pos);
      meshes[id].rotation.set(t.rotX, t.rotY, 0);
    });
    index = 0;
    current = null;
    wait = 1400 * slowMul;
    setView(firstView);
    onSay(sc.intro);
  }

  function begin(ev) {
    onSay(ev.say);
    const before = {};
    allIds.forEach((id) => { before[id] = { pos: meshes[id].position.clone(), rotX: meshes[id].rotation.x, rotY: meshes[id].rotation.y }; });
    let pivot = null;
    const hint = apply(state, ev);
    if (hint.view) setView(hint.view);
    if (hint.pivot === 'cards') {
      pivot = new Vector3();
      hint.cards.forEach((c) => pivot.add(before[c.id].pos));
      pivot.multiplyScalar(1 / hint.cards.length);
    } else if (hint.pivot) {
      pivot = pileCenter(sc, state, hint.pivot);
    }
    const dur = hint.dur * slowMul;
    const parts = hint.cards.map((c) => ({ ...c, m: meshes[c.id], from: before[c.id], to: transformOf(sc, state, c.id), delay: (c.delay || 0) * slowMul }));
    const tmp = new Vector3();
    return {
      t: 0,
      update(t) {
        let done = t >= dur;
        parts.forEach((p) => {
          const k = clamp01((t - p.delay) / dur);
          if (k < 1) done = false;
          const e = ease(k);
          const m = p.m;
          if (pivot) {
            const a = e * hint.delta;
            m.position.copy(rotateAboutX(tmp.copy(p.from.pos), pivot, a));
            m.position.y += Math.sin(Math.PI * e) * (p.lift || 0);
            m.rotation.x = p.from.rotX + a;
          } else if (p.slideOut) {
            // 덱 앞쪽으로 빼낸 다음 옮긴다
            const out = tmp.copy(p.from.pos);
            out.z += p.slideOut;
            if (e < 0.4) {
              m.position.lerpVectors(p.from.pos, out, e / 0.4);
            } else {
              const q = (e - 0.4) / 0.6;
              m.position.lerpVectors(out, p.to.pos, q);
              m.position.y += Math.sin(Math.PI * q) * (p.lift || 0);
            }
            m.rotation.x = p.from.rotX + (p.to.rotX - p.from.rotX) * e;
            m.rotation.y = p.from.rotY + (p.to.rotY - p.from.rotY) * e;
          } else {
            m.position.lerpVectors(p.from.pos, p.to.pos, e);
            m.position.y += Math.sin(Math.PI * e) * (p.lift || 0);
            m.position.z += Math.sin(Math.PI * e) * (p.zArc || 0);
            m.rotation.x = p.from.rotX + (p.to.rotX - p.from.rotX) * e;
            m.rotation.y = p.from.rotY + (p.to.rotY - p.from.rotY) * e;
            m.rotation.z = Math.sin(Math.PI * e) * (p.tiltZ || 0);
          }
        });
        return done;
      },
      finish() {
        parts.forEach((p) => {
          p.m.position.copy(p.to.pos);
          p.m.rotation.set(p.to.rotX, p.to.rotY, 0);
        });
      },
    };
  }

  function step(dt) {
    if (!playing) return;
    if (wait > 0) {
      wait -= dt;
      return;
    }
    if (!current) current = begin(events[index]);
    current.t += dt;
    if (current.update(current.t)) {
      current.finish();
      current = null;
      wait = (events[index].gap ?? 450) * slowMul;
      index += 1;
      if (index >= events.length) reset();
    }
  }

  // ── 카메라: 손가락으로 끌어 돌리고, 버튼으로 각도를 고른다 ──
  const lookAt = new Vector3(...(sc.lookAt || [0, 0.12, 0]));
  let radius = 3.2;
  let width = 1;
  let height = 1;

  function placeCamera(dt) {
    const k = Math.min(1, dt * 0.005);
    now.az += (want.az - now.az) * k;
    now.el += (want.el - now.el) * k;
    camera.position.set(
      lookAt.x + radius * Math.cos(now.el) * Math.sin(now.az),
      lookAt.y + radius * Math.sin(now.el),
      lookAt.z + radius * Math.cos(now.el) * Math.cos(now.az),
    );
    camera.lookAt(lookAt);
  }

  const el = renderer.domElement;
  let drag = null;
  const onDown = (e) => {
    drag = { x: e.clientX, y: e.clientY };
    el.setPointerCapture(e.pointerId);
  };
  const onMove = (e) => {
    if (!drag) return;
    want.az -= (e.clientX - drag.x) * 0.009;
    want.el = Math.min(1.5, Math.max(-0.9, want.el + (e.clientY - drag.y) * 0.007));
    drag = { x: e.clientX, y: e.clientY };
  };
  const onUp = () => { drag = null; };
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);

  function resize() {
    width = host.clientWidth || 1;
    height = host.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // 장면의 카드가 잘리지 않을 거리
    const tan = Math.tan((camera.fov * Math.PI) / 360);
    radius = Math.max(2.4, (sc.fit || 1.02) / (tan * camera.aspect), (sc.fitV || 0) / tan);
    // 안개는 카드보다 먼 테이블 끝만 가리도록 카메라 거리에 맞춘다
    scene.fog.near = radius + 1.5;
    scene.fog.far = radius + 9;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  // 더미 속에 묻혀도 그 카드의 높이를 가리키도록 카드 옆에 붙인다. 주 표시는 화면 가운데 쪽 옆에,
  // 보조 표시(plain)는 반대쪽 옆에 붙여 두 표시가 겹치지 않게 한다.
  const tmp = new Vector3();
  function placeLabels() {
    labels.forEach((l) => {
      const m = meshes[l.id];
      const side = (m.position.x < lookAt.x ? 1 : -1) * (l.plain ? -1 : 1);
      tmp.copy(m.position);
      tmp.x += side * ((isHwatu(l.id) ? HWATU_W : CARD_W) / 2 + 0.03);
      tmp.project(camera);
      const x = (tmp.x * 0.5 + 0.5) * width;
      const y = (-tmp.y * 0.5 + 0.5) * height;
      const text = side > 0 ? `◂ ${l.text}` : `${l.text} ▸`;
      if (l.el.textContent !== text) l.el.textContent = text;
      l.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(${side > 0 ? '0' : '-100%'}, -50%)`;
    });
  }

  function draw() {
    renderer.render(scene, camera);
    placeLabels();
  }

  let last = performance.now();
  let raf = 0;
  function frame(t) {
    const dt = Math.min(64, t - last);
    last = t;
    step(dt);
    placeCamera(dt);
    draw();
    raf = requestAnimationFrame(frame);
  }

  reset();
  placeCamera(1000);
  raf = requestAnimationFrame(frame);

  return {
    // 시간을 ms만큼 앞으로 돌리고 그 장면을 그린다 (점검용)
    advance(ms) {
      for (let left = ms; left > 0; left -= 32) step(Math.min(32, left));
      placeCamera(1000);
      draw();
    },
    get position() {
      return { index, total: events.length };
    },
    get canvas() {
      return el;
    },
    setView,
    setSlow(on) {
      slowMul = on ? 1.8 : 1;
    },
    toggle() {
      playing = !playing;
      return playing;
    },
    restart() {
      reset();
      playing = true;
    },
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      labels.forEach((l) => l.el.remove());
      el.remove();
    },
  };
}
