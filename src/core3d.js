// 3D 장면의 카드 상태 계산. three.js와 화면에 의존하지 않아 테스트에서 그대로 돌린다.
// 상태: piles(더미별 카드, 앞쪽이 맨 위), face(앞면이 위인지), yaw(돌려 놓은 각도), offset(살짝 민 거리), free(더미 밖에 놓인 카드), tilt(더미 기울기)

export const CARD_T = 0.016;
export const Logic = () => globalThis.Logic;
export const isHwatu = (id) => /^H\d+[GYTPQR]$/.test(id);
export const isRed = (id) => !isHwatu(id) && /[HD](~\d)?$/.test(id);

const SUIT_KO = { S: '스페이드', H: '하트', D: '다이아', C: '클럽' };
const SUIT_MARK = { S: '♠', H: '♥', D: '♦', C: '♣' };
const baseId = (id) => id.split('~')[0];
// 카드 이름: "하트 9", 화투는 "9월"
export const nameOf = (id) => {
  if (isHwatu(id)) return `${Logic().monthOf(id)}월`;
  const b = baseId(id);
  return `${SUIT_KO[b.slice(-1)]} ${b.slice(0, -1)}`;
};
// 짧은 표시: "9♥", 화투는 "9월"
export const markOf = (id) => {
  if (isHwatu(id)) return `${Logic().monthOf(id)}월`;
  const b = baseId(id);
  return `${b.slice(0, -1)}${SUIT_MARK[b.slice(-1)]}`;
};

// 장면에 쓸 카드를 덱에서 고른다. 같은 seed면 항상 같은 카드가 나온다.
export function pickCards(n, exclude = [], seed = 7, suffix = '') {
  const L = Logic();
  return L.shuffle(L.fullDeck().filter((c) => !exclude.includes(c)), L.seeded(seed)).slice(0, n).map((c) => c + suffix);
}
export function pickHwatu(n, exclude = [], seed = 7) {
  const L = Logic();
  return L.shuffle(L.hwatuDeck().filter((c) => !exclude.includes(c)), L.seeded(seed)).slice(0, n);
}

export function newState(sc) {
  const piles = sc.start();
  const tilt = {};
  Object.keys(sc.piles).forEach((p) => {
    if (!piles[p]) piles[p] = [];
    tilt[p] = 0;
  });
  return { piles, tilt, face: { ...(sc.startFace ? sc.startFace() : {}) }, yaw: {}, offset: {}, free: {} };
}

export const pileOf = (s, id) => Object.keys(s.piles).find((p) => s.piles[p].includes(id));

function detach(s, id) {
  const p = pileOf(s, id);
  if (p) s.piles[p].splice(s.piles[p].indexOf(id), 1);
  delete s.free[id];
  return p;
}

const unique = (cards) => {
  const seen = new Set();
  return cards.filter((c) => (seen.has(c.id) ? false : seen.add(c.id)));
};

// 단계 하나를 상태에 적용하고, 어떤 카드를 어떻게 움직여 보여 줄지 돌려준다.
// cards: 움직일 카드와 움직임(lift 위로 띄우기, zArc 앞으로 빼기, slideOut 앞으로 빼낸 뒤 옮기기, tiltZ 기울이기, delay)
// pivot/delta: 묶음을 한 점을 중심으로 x축 회전(뒤집기, 기울이기)
export function apply(s, ev) {
  switch (ev.type) {
    case 'move': {
      const chunk = s.piles[ev.from].splice(0, ev.n);
      chunk.forEach((id) => {
        s.yaw[id] = ev.yaw || 0;
        if (ev.face !== undefined) s.face[id] = ev.face;
      });
      s.piles[ev.to].unshift(...chunk);
      return { dur: ev.fast ? 600 : ev.n === 1 ? 950 : 1100, cards: chunk.map((id, j) => ({ id, lift: ev.fast ? 0.2 : 0.3, tiltZ: 0.2, delay: j * 30 })) };
    }
    case 'pile': {
      // 한 더미를 통째로 다른 자리(비었거나 다른 더미 위)로 옮긴다
      const all = s.piles[ev.from];
      all.forEach((id) => { s.yaw[id] = ev.yaw || 0; });
      s.piles[ev.to] = [...all, ...s.piles[ev.to]];
      s.piles[ev.from] = [];
      return { dur: 1300, cards: all.map((id) => ({ id, lift: 0.4 })) };
    }
    case 'flip': {
      // 맨 위 n장을 한 덩어리로 뒤집는다. 순서가 거꾸로 되고 앞뒤가 바뀐다.
      const top = s.piles[ev.pile].splice(0, ev.n);
      top.forEach((id) => { s.face[id] = !s.face[id]; });
      const ids = top.slice();
      s.piles[ev.pile].unshift(...top.reverse());
      return { dur: 1300, pivot: 'cards', delta: Math.PI, cards: ids.map((id) => ({ id, lift: 0.36 })) };
    }
    case 'flipCard': {
      // 카드를 제자리에서 한 장씩 뒤집는다
      ev.ids.forEach((id) => { s.face[id] = !s.face[id]; });
      return { dur: 1000, cards: ev.ids.map((id, i) => ({ id, lift: 0.3, delay: i * (ev.stagger ?? 140) })) };
    }
    case 'insert': {
      // 맨 위 카드를 같은 더미의 at번째(위에서부터, 'bottom'이면 맨 아래)로 꽂는다
      const p = s.piles[ev.pile];
      const id = p.shift();
      if (ev.at === 'bottom') p.push(id);
      else p.splice(ev.at, 0, id);
      return { dur: ev.fast ? 650 : 1600, cards: unique([{ id, zArc: ev.fast ? 0.55 : 0.75 }, ...p.map((x) => ({ id: x }))]) };
    }
    case 'toBottom': {
      // 맨 위 n장을 덩어리째 맨 아래로 옮긴다
      const p = s.piles[ev.pile];
      const chunk = p.splice(0, ev.n);
      p.push(...chunk);
      return { dur: ev.fast ? 650 : 1200, cards: unique([...chunk.map((id, j) => ({ id, zArc: 0.9, delay: j * 30 })), ...p.map((id) => ({ id }))]) };
    }
    case 'shift': {
      ev.ids.forEach((id) => {
        const o = s.offset[id] || (s.offset[id] = { dy: 0, dz: 0 });
        o.dz += ev.dz || 0;
        o.dy += ev.dy || 0;
      });
      return { dur: 900, cards: ev.ids.map((id) => ({ id })) };
    }
    case 'take': {
      // 특정 카드 한 장을 빼내 다른 더미의 at번째(기본은 맨 위)에 놓는다
      const fromName = detach(s, ev.id);
      s.yaw[ev.id] = 0;
      const to = s.piles[ev.to];
      to.splice(ev.at ?? 0, 0, ev.id);
      const rest = [...(fromName ? s.piles[fromName] : []), ...to].map((id) => ({ id }));
      return { dur: 1700, cards: unique([{ id: ev.id, lift: 0.3, slideOut: ev.slideOut ?? 0.95 }, ...rest]) };
    }
    case 'collect': {
      // 놓여 있던 카드들을 모아 더미 맨 위에 얹는다(ids는 위쪽이 앞). face를 주면 그 방향으로 놓는다.
      const ids = ev.ids.slice();
      ids.forEach((id) => {
        detach(s, id);
        s.yaw[id] = 0;
        if (ev.face !== undefined) s.face[id] = ev.face;
      });
      s.piles[ev.to].unshift(...ids);
      return { dur: 900, cards: ids.slice().reverse().map((id, i) => ({ id, lift: 0.25, delay: i * (ev.stagger ?? 60) })) };
    }
    case 'tilt': {
      const delta = ev.angle - s.tilt[ev.pile];
      s.tilt[ev.pile] = ev.angle;
      return { dur: 1400, pivot: ev.pile, delta, cards: s.piles[ev.pile].map((id) => ({ id })) };
    }
    case 'riffle': {
      ev.from.forEach((p) => { s.piles[p] = []; });
      s.piles[ev.to] = ev.order.slice();
      const n = ev.order.length;
      return { dur: 520, cards: ev.order.map((id, i) => ({ id, lift: 0.14, delay: (n - 1 - i) * 110 })) };
    }
    case 'place': {
      // 카드를 더미 밖 원하는 자리에 놓는다. face를 생략하면 지금 방향 그대로 놓는다.
      ev.cards.forEach((c) => {
        detach(s, c.id);
        s.free[c.id] = { x: c.x, y: c.y ?? CARD_T / 2, z: c.z, rotY: c.rotY || 0 };
        if (c.face !== undefined) s.face[c.id] = !!c.face;
      });
      return { dur: ev.dur || 900, cards: ev.cards.map((c, i) => ({ id: c.id, lift: ev.lift ?? 0.25, delay: i * (ev.stagger ?? 120) })) };
    }
    case 'view':
      return { dur: 1000, view: ev.name, cards: [] };
    default:
      return { dur: ev.ms || 1000, cards: [] };
  }
}

// 장면 단계를 만들면서 상태를 함께 따라간다. 다음 단계를 지금 카드 순서에 맞춰 만들 때 쓴다.
export function planner(sc) {
  const s = newState(sc);
  const events = [];
  return {
    s,
    events,
    add(ev) {
      apply(s, ev);
      events.push(ev);
      return ev;
    },
  };
}

// 카드를 한 줄로 펼친 자리. 뒤 카드가 앞 카드를 조금씩 덮는다.
export const rowSpots = (ids, { x0, dx, z = 0, face, y0 = CARD_T / 2 }) => ids.map((id, i) => ({ id, x: x0 + i * dx, z, y: y0 + i * CARD_T * 0.7, face }));

// 시계 모양 자리: h시(1~12)
export const clockSpot = (h, r, cz = 0) => {
  const a = (h / 12) * Math.PI * 2 - Math.PI / 2;
  return { x: Math.cos(a) * r, z: cz + Math.sin(a) * r };
};
