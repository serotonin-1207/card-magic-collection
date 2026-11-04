// 3D 장면 목록. 마술마다 더미 자리(piles), 처음 카드(start), 단계(plan), 끝 상태 조건(check)을 적는다.
// 단계는 planner로 만들어 지금 카드 순서를 보면서 다음 단계를 정한다.
import { CARD_T, Logic, isRed, markOf, nameOf, pickCards, pickHwatu, planner, rowSpots, clockSpot } from './core3d.js';

const OVERHAND_DECK = ['AS', '7D', 'KC', '3H', 'JS', '9C', 'QD', '5H', '2S', '10D', '6C', '8H', '4D', 'QS'];
const AMBITIOUS_DECK = ['9C', '4H', 'KD', '2S', 'JH', '6C', 'QS', '3D', '8H', '5S', '10C', '7D', 'AH', 'JD'];
const GLIDE_DECK = ['5C', 'JD', '8S', '3H', 'KS', '6D', '10S', '4C', 'AH', '7H', '2D', 'QS'];
const HINDU_DECK = ['QD', '3C', '9H', '6S', 'JC', '2H', 'KD', '5S', '10H', '7C', '4S', 'AD', 'JH', '8S'];
const RIFFLE_DECK = ['3H', '8S', 'QD', '2C', '7H', 'KS', '5D', '9C', 'JH', '4S', '10D', '6C'];
const DEAL21_DECK = ['2C', '9S', 'KD', '4H', 'JC', '7D', 'AS', '3H', 'QS', '5C', '10H', '8D', '6S', 'KC', '2D', '9H', 'JS', '4C', 'QD', '7H', '10S'];

// ── 오버핸드 셔플 ──
export function planOverhand(deck, chunk = 4) {
  const L = Logic();
  const events = [];
  const peel = L.overhandPeelTop(deck, chunk);
  let rightLen = deck.length;
  peel.forEach((s, i) => {
    events.push({
      type: 'move', from: 'right', to: 'left', n: rightLen - s.right.length,
      say: i === 0 ? '① 맨 위 한 장(A♠)만 먼저 왼쪽에 떨어뜨립니다' : '② 나머지는 몇 장씩 덩어리째 그 위에 얹습니다',
    });
    rightLen = s.right.length;
  });
  events.push({ type: 'hold', ms: 1800, say: 'A♠은 이제 맨 아래에 있습니다' });
  events.push({ type: 'pile', from: 'left', to: 'right', say: '③ 이 덱을 다시 들고 한 번 더 섞습니다' });
  const middle = peel[peel.length - 1].left;
  const run = L.overhandRunToLast(middle, 1, chunk);
  rightLen = middle.length;
  run.forEach((s, i) => {
    events.push({
      type: 'move', from: 'right', to: 'left', n: rightLen - s.right.length,
      say: i === run.length - 1 ? '⑤ 끝에 남겨 둔 한 장(A♠)을 마지막으로 얹습니다' : '④ 이번에도 덩어리째 내리고, 맨 끝 한 장은 남겨 둡니다',
    });
    rightLen = s.right.length;
  });
  events.push({ type: 'flip', pile: 'left', n: 1, say: '⑥ 맨 위 카드를 뒤집어 볼까요?' });
  events.push({ type: 'hold', ms: 2800, say: 'A♠이 맨 위로 돌아왔습니다' });
  return events;
}

// ── 리플 셔플 (빨강 검정 짝) ──
function planRiffle() {
  const L = Logic();
  const events = [];
  for (let i = 0; i < 6; i++) {
    events.push({ type: 'move', from: 'deck', to: 'right', n: 1, fast: true, say: '위에서 6장을 한 장씩 내려놓습니다. 그러면 이 덩어리는 순서가 뒤집힙니다' });
  }
  events.push({ type: 'pile', from: 'deck', to: 'left', say: '남은 6장을 옆에 둡니다' });
  const order = L.gilbreath(RIFFLE_DECK, 6, L.seeded(12));
  events.push({ type: 'riffle', from: ['left', 'right'], to: 'mix', order, say: '관객이 두 덩어리를 한 번 리플 셔플합니다' });
  events.push({ type: 'hold', ms: 1400, say: '섞인 것처럼 보이지만 규칙은 그대로 남아 있습니다' });
  events.push({ type: 'view', name: 'top', say: '위에서부터 두 장씩 집어 앞면으로 놓습니다' });
  // 쌍마다 두 장을 살짝 겹쳐 놓고, 쌍끼리는 2열 3줄로 떨어뜨려 놓는다
  const cards = [];
  for (let j = 0; j < 6; j++) {
    const x = j % 2 === 0 ? -0.6 : 0.6;
    const z = (Math.floor(j / 2) - 1) * 1.0;
    cards.push({ id: order[2 * j], x: x - 0.16, z, face: true });
    cards.push({ id: order[2 * j + 1], x: x + 0.16, z, y: CARD_T * 1.5, face: true });
  }
  events.push({ type: 'place', cards, say: '위에서부터 두 장씩 집어 앞면으로 놓습니다' });
  events.push({ type: 'hold', ms: 3200, say: '어느 쌍이나 빨강 하나, 검정 하나입니다' });
  return events;
}

// ── 21장의 예언 ──
const COL21 = [-0.85, -0.15, 0.55];
function planDeal21(sc) {
  const p = planner(sc);
  const pick = '9H';
  const asks = ['관객은 마음속으로 한 장을 고르고, 어느 열에 있는지만 말합니다', '이번에는 어느 열인지 다시 묻습니다', '마지막으로 한 번만 더 묻습니다'];
  p.add({ type: 'hold', ms: 1600, say: '21장을 뒷면으로 들고 시작합니다. 금색 카드가 관객이 고를 카드입니다' });
  for (let round = 0; round < 3; round++) {
    const deck = p.s.piles.hand.slice();
    const cards = deck.map((id, i) => {
      const r = Math.floor(i / 3);
      return { id, x: COL21[i % 3], z: -0.95 + r * 0.3, y: CARD_T / 2 + r * CARD_T * 1.5, face: true };
    });
    p.add({ type: 'place', cards, stagger: 170, lift: 0.18, dur: 700, say: round === 0 ? '맨 위 카드부터 왼쪽, 가운데, 오른쪽 순서로 한 장씩 돌아가며 놓습니다' : '다시 왼쪽, 가운데, 오른쪽 순서로 한 장씩 돌아가며 놓습니다' });
    const colIds = (c) => deck.filter((_, i) => i % 3 === c);
    const col = [0, 1, 2].find((c) => colIds(c).includes(pick));
    p.add({ type: 'hold', ms: 1800, say: asks[round] });
    const others = [0, 1, 2].filter((c) => c !== col);
    // 다른 열을 먼저 모으고, 고른 열을 그 위에, 나머지 열을 맨 위에 쌓는다
    p.add({ type: 'collect', ids: colIds(others[0]).slice().reverse(), to: 'hand', say: '다른 열 하나를 먼저 모읍니다' });
    p.add({ type: 'collect', ids: colIds(col).slice().reverse(), to: 'hand', say: '고른 열을 그 위에 쌓습니다. 고른 열은 반드시 가운데입니다' });
    p.add({ type: 'collect', ids: colIds(others[1]).slice().reverse(), to: 'hand', say: '나머지 열을 맨 위에 얹습니다' });
    p.add({ type: 'flip', pile: 'hand', n: 21, say: '모은 더미를 뒤집어 다시 뒷면이 위로 오게 듭니다' });
  }
  for (let i = 0; i < 10; i++) {
    p.add({ type: 'move', from: 'hand', to: 'count', n: 1, fast: true, gap: 120, say: '위에서 10장을 뒷면으로 내려놓습니다' });
  }
  p.add({ type: 'flipCard', ids: [p.s.piles.hand[0]], say: '11번째 카드를 뒤집으면…' });
  p.add({ type: 'hold', ms: 2800, say: '관객이 고른 하트 9입니다' });
  return p.events;
}

// ── 열쇠 카드 계열: 관객 카드를 맨 위에 올리고 한 번 컷하면 바닥 카드가 그 위로 온다 ──
function cutReveal({ deck, sel, key, keyTop, intro, pickSay, cutSay, revealSay, endSay, hw }) {
  return {
    piles: { deck: { x: -0.55 }, spect: { x: 0.6, z: 0.55 }, cut: { x: 0.6, z: -0.45 } },
    start: () => ({ deck: deck() }),
    fit: 1.45,
    marks: [sel],
    labels: [{ id: sel, text: `관객 ${markOf(sel)}` }, { id: key, text: `열쇠 ${markOf(key)}`, plain: true }, ...(keyTop ? [{ id: keyTop, text: markOf(keyTop), plain: true }] : [])],
    intro,
    plan: (sc) => {
      const p = planner(sc);
      p.add({ type: 'hold', ms: 1800, say: intro });
      p.add({ type: 'take', id: sel, to: 'spect', say: pickSay });
      p.add({ type: 'flipCard', ids: [sel], say: '관객이 카드를 보고 기억합니다' });
      p.add({ type: 'flipCard', ids: [sel], say: '다시 뒷면으로 돌립니다' });
      p.add({ type: 'take', id: sel, to: 'deck', slideOut: 0, say: '그 카드를 덱 맨 위에 올립니다' });
      p.add({ type: 'move', from: 'deck', to: 'cut', n: Math.floor(p.s.piles.deck.length / 2), say: '위쪽 절반을 들어 내려놓습니다' });
      p.add({ type: 'pile', from: 'deck', to: 'cut', say: cutSay });
      p.add({ type: 'hold', ms: 1600, say: cutSay });
      const order = p.s.piles.cut.slice();
      const dx = hw ? 0.12 : 0.13;
      p.add({ type: 'place', cards: rowSpots(order, { x0: -(order.length - 1) * dx / 2, dx, z: 0.05, face: true }), stagger: 70, say: revealSay });
      p.add({ type: 'hold', ms: 3000, say: endSay });
      return p.events;
    },
    check: (s) => {
      const xs = Object.keys(s.free).sort((a, b) => s.free[a].x - s.free[b].x);
      const i = xs.indexOf(key);
      return xs[i + 1] === sel && (!keyTop || xs[i + 2] === keyTop);
    },
  };
}

// ── 시계 예언 계열 ──
function clockScene({ deck, known, n, hw, intro }) {
  return {
    // 시계처럼 읽히도록 처음부터 위에서 내려다본다
    views: ['top', 'diag', 'side'],
    piles: { deck: { x: -1.8, z: 1.5 }, pocket: { x: 1.8, z: 1.5 }, twelve: { x: -1.8, z: -1.5 } },
    start: () => ({ deck: deck() }),
    fit: 2.5,
    fitV: 2.25,
    marks: [known],
    labels: [{ id: known, text: `예언 ${markOf(known)}` }],
    intro,
    plan: (sc) => {
      const p = planner(sc);
      p.add({ type: 'hold', ms: 2000, say: intro });
      p.add({ type: 'move', from: 'deck', to: 'pocket', n, say: `관객이 1~12 중 숫자(예: ${n})를 정해 그만큼 위에서 빼어 숨깁니다` });
      for (let i = 0; i < 12; i++) p.add({ type: 'move', from: 'deck', to: 'twelve', n: 1, fast: true, gap: 120, say: '12장을 한 장씩 내려놓습니다. 순서가 뒤집힙니다' });
      p.add({ type: 'pile', from: 'twelve', to: 'deck', say: '이 더미를 다시 덱 위에 올립니다' });
      const ring = p.s.piles.deck.slice(0, 12).map((id, i) => ({ id, ...clockSpot(i + 1, 1.2), face: false }));
      p.add({ type: 'place', cards: ring, stagger: 230, say: '위에서부터 1시, 2시 … 12시 자리에 차례로 놓습니다' });
      p.add({ type: 'view', name: 'top', say: `숨긴 장수와 같은 ${n}시 자리를 봅니다` });
      p.add({ type: 'flipCard', ids: [ring[n - 1].id], say: `${n}시 자리 카드를 뒤집으면…` });
      p.add({ type: 'hold', ms: 2800, say: `예언한 ${nameOf(known)}입니다` });
      return p.events;
    },
    check: (s) => s.face[known] === true && !!s.free[known],
  };
}

// ── 13까지(화투는 12까지) 세는 더미 ──
function pileScene({ deck, bases, top, sub, remaining, hw }) {
  return {
    t: 0.008,
    piles: { deck: { x: 0, z: -0.95 }, p1: { x: hw ? -0.65 : -0.75, z: 0.35 }, p2: { x: 0, z: 0.35 }, p3: { x: hw ? 0.65 : 0.75, z: 0.35 } },
    start: () => ({ deck: deck() }),
    fit: 1.2,
    fitV: 1.4,
    lookAt: [0, 0.1, -0.25],
    marks: bases.map((b) => b.id),
    labels: [],
    intro: '맨 위 카드의 값부터 세어 더미를 만듭니다',
    plan: (sc) => {
      const p = planner(sc);
      p.add({ type: 'hold', ms: 1600, say: hw ? `패를 한 장 앞면으로 놓고 그 달부터 12까지 세며 얹습니다` : 'A=1, J=11, Q=12, K=13으로 셉니다' });
      // 첫 장과 세는 카드를 모두 앞면으로 쌓은 뒤 더미를 뒤집으면, 첫 장이 맨 위에 뒷면으로 온다
      bases.forEach((b, k) => {
        const pile = `p${k + 1}`;
        p.add({ type: 'move', from: 'deck', to: pile, n: 1, face: true, say: `${markOf(b.id)}를 앞면으로 놓습니다` });
        p.add({ type: 'move', from: 'deck', to: pile, n: b.size - 1, face: true, say: `${b.value}부터 ${top}까지 세며 ${b.size - 1}장을 얹습니다 (${top + 1} − ${b.value} = ${b.size}장)` });
        p.add({ type: 'flip', pile, n: b.size, say: '더미를 통째로 뒤집어 놓습니다. 처음 카드는 이제 맨 위에 뒷면으로 있습니다' });
      });
      p.add({ type: 'hold', ms: 2200, say: `세 더미를 고르고 나머지를 받아 셉니다. 남은 카드는 ${remaining}장입니다` });
      p.add({ type: 'flipCard', ids: [bases[0].id, bases[1].id], stagger: 400, say: '두 더미의 맨 위(처음 놓은 카드)를 뒤집어 봅니다' });
      const answer = remaining - sub - bases[0].value - bases[1].value;
      p.add({ type: 'hold', ms: 2600, say: `${remaining} − ${sub} − ${bases[0].value} − ${bases[1].value} = ${answer}` });
      p.add({ type: 'flipCard', ids: [bases[2].id], say: `마지막 더미의 처음 카드는 ${answer}${hw ? '월' : ''}입니다` });
      p.add({ type: 'hold', ms: 2600, say: `마지막 더미의 처음 카드는 ${answer}${hw ? '월' : ''}입니다` });
      return p.events;
    },
    check: (s) => s.piles.p3[0] === bases[2].id && s.face[bases[2].id] === true && s.piles.deck.length === remaining,
  };
}

// ── 다운 언더 (마지막 남은 한 장) ──
function downUnderScene({ deck, sel, intro, endSay }) {
  return {
    piles: { hand: { x: 0.5, y: 0.3 }, table: { x: -0.5 } },
    start: () => ({ hand: deck() }),
    marks: [sel],
    labels: [{ id: sel, text: markOf(sel) }],
    intro,
    plan: (sc) => {
      const p = planner(sc);
      p.add({ type: 'hold', ms: 1800, say: intro });
      while (p.s.piles.hand.length > 1) {
        p.add({ type: 'move', from: 'hand', to: 'table', n: 1, fast: true, gap: 120, say: '한 장은 테이블에 내리고' });
        if (p.s.piles.hand.length > 1) p.add({ type: 'insert', pile: 'hand', at: 'bottom', fast: true, gap: 120, say: '다음 한 장은 맨 아래로 보냅니다' });
      }
      p.add({ type: 'flipCard', ids: [p.s.piles.hand[0]], say: '마지막 남은 한 장을 뒤집으면…' });
      p.add({ type: 'hold', ms: 2800, say: endSay });
      return p.events;
    },
    check: (s) => s.piles.hand.length === 1 && s.piles.hand[0] === sel && s.face[sel] === true,
  };
}

// ── 네 장의 에이스 / 고도리 모으기 ──
function gatherScene({ deck, targets, xs, fit, intro, hw }) {
  const k = targets.length;
  const piles = {};
  xs.forEach((x, i) => { piles[`p${i + 1}`] = { x }; });
  return {
    piles,
    start: () => ({ p1: deck() }),
    fit,
    marks: targets,
    labels: [],
    intro,
    plan: (sc) => {
      const p = planner(sc);
      const total = p.s.piles.p1.length;
      p.add({ type: 'hold', ms: 1800, say: intro });
      if (k === 4) {
        p.add({ type: 'move', from: 'p1', to: 'p3', n: total / 2, say: '관객이 위쪽 절반을 오른쪽에 내려놓습니다' });
        p.add({ type: 'move', from: 'p1', to: 'p2', n: total / 4, say: '왼쪽 덩어리의 위쪽 절반을 그 옆에' });
        p.add({ type: 'move', from: 'p3', to: 'p4', n: total / 4, say: '오른쪽 덩어리의 위쪽 절반을 맨 오른쪽에. 에이스는 맨 오른쪽 더미에 있습니다' });
      } else {
        p.add({ type: 'move', from: 'p1', to: 'p3', n: total / 3, say: '관객이 위쪽 3분의 1을 오른쪽 끝에 내려놓습니다' });
        p.add({ type: 'move', from: 'p1', to: 'p2', n: total / 3, say: '다음 덩어리를 가운데에. 새 세 장은 오른쪽 끝 더미에 있습니다' });
      }
      const names = Object.keys(piles);
      names.forEach((name, i) => {
        const label = i === names.length - 1 ? '마지막 더미' : `${i + 1}번째 더미`;
        p.add({ type: 'toBottom', pile: name, n: k - 1, say: `${label}: 위 ${k - 1}장을 덩어리째 맨 아래로` });
        names.filter((o) => o !== name).forEach((o) => p.add({ type: 'move', from: name, to: o, n: 1, fast: true, gap: 150, say: `${label}: 다음 ${k - 1}장을 다른 더미에 한 장씩` }));
      });
      p.add({ type: 'flipCard', ids: names.map((n) => p.s.piles[n][0]), say: '각 더미의 맨 위를 뒤집으면…' });
      p.add({ type: 'hold', ms: 2800, say: hw ? '고도리 세 장입니다' : '네 장 모두 에이스입니다' });
      return p.events;
    },
    check: (s) => Object.keys(piles).map((n) => s.piles[n][0]).sort().join() === targets.slice().sort().join() && targets.every((t) => s.face[t]),
  };
}

// ── 순환 배열 (세 칸씩 도는 덱 / 열두 달 순환) ──
function cycleScene({ deck, next, intro, ruleSay, hw }) {
  return {
    t: 0.007,
    piles: { deck: { x: -0.45 }, cut: { x: 0.45 }, spect: { x: 0.45, z: 1.05 } },
    start: () => ({ deck: deck() }),
    fit: 1.25,
    fitV: 1.45,
    lookAt: [0, 0.1, 0.15],
    marks: [],
    labels: [],
    intro,
    plan: (sc) => {
      const p = planner(sc);
      const first = p.s.piles.deck.slice(0, 6);
      const dx = hw ? 0.3 : 0.34;
      p.add({ type: 'place', cards: rowSpots(first, { x0: -0.85, dx, z: 1.05, face: true }), stagger: 160, say: ruleSay });
      p.add({ type: 'hold', ms: 2600, say: ruleSay });
      p.add({ type: 'collect', ids: first, to: 'deck', face: false, say: '다시 덱 위에 그대로 모읍니다' });
      p.add({ type: 'move', from: 'deck', to: 'cut', n: 17, say: '관객이 위쪽 덩어리를 내려놓습니다' });
      p.add({ type: 'pile', from: 'deck', to: 'cut', say: '아래 덩어리를 그 위에 얹어 컷을 마칩니다. 순서는 그대로 돌기만 합니다' });
      const bottom = p.s.piles.cut[p.s.piles.cut.length - 1];
      const top = p.s.piles.cut[0];
      p.add({ type: 'tilt', pile: 'cut', angle: -1.2, say: '덱을 정리하는 척 기울여 맨 아래 카드를 슬쩍 봅니다' });
      p.add({ type: 'hold', ms: 2200, say: `맨 아래는 ${nameOf(bottom)}입니다` });
      p.add({ type: 'tilt', pile: 'cut', angle: 0, say: `맨 아래는 ${nameOf(bottom)}입니다` });
      p.add({ type: 'take', id: top, to: 'spect', slideOut: 0, say: '관객이 맨 위 카드를 가져갑니다' });
      p.add({ type: 'hold', ms: 2600, say: next(bottom, top) });
      p.add({ type: 'flipCard', ids: [top], say: `맞습니다. ${nameOf(top)}입니다` });
      p.add({ type: 'hold', ms: 2400, say: `맞습니다. ${nameOf(top)}입니다` });
      return p.events;
    },
    check: (s) => {
      const t = s.piles.spect[0];
      const b = s.piles.cut[s.piles.cut.length - 1];
      return s.face[t] === true && (hw ? Logic().nextMonth(Logic().monthOf(b)) === Logic().monthOf(t) : Logic().stebbinsNext(b) === t);
    },
  };
}

// ── 뒤섞인 앞뒤 (허머) ──
const HUMMER_IDS = ['2S', '9H', 'KC', '6D', '4D', 'JS', '7C', 'QH', '5S', '8D'];
function planHummer(sc) {
  const p = planner(sc);
  const sel = '6D';
  const rowAt = (ids) => rowSpots(ids, { x0: -0.765, dx: 0.17, z: 0.5 });
  p.add({ type: 'place', cards: rowAt(p.s.piles.a.slice()), stagger: 60, dur: 600, say: '앞뒤를 번갈아 놓은 카드 10장입니다. 관객이 앞면 카드 하나를 기억하고 뒤집어 둡니다' });
  p.add({ type: 'hold', ms: 2600, say: '관객 카드 6♦만 번갈아 놓인 규칙에서 벗어나 있습니다' });
  p.add({ type: 'collect', ids: HUMMER_IDS.slice(), to: 'a', say: '순서와 방향 그대로 한 묶음으로 모읍니다' });
  let cur = 'a';
  const cuts = [3, 6, 2, 7];
  cuts.forEach((n, i) => {
    const other = cur === 'a' ? 'b' : 'a';
    p.add({ type: 'flip', pile: cur, n: 2, say: '관객이 맨 위 두 장을 함께 뒤집고' });
    p.add({ type: 'move', from: cur, to: other, n, say: '원하는 곳에서 컷합니다' });
    p.add({ type: 'pile', from: cur, to: other, say: '원하는 곳에서 컷합니다' });
    cur = other;
  });
  p.add({ type: 'hold', ms: 1600, say: '완전히 뒤섞였습니다. 탁자 아래로 가져갑니다' });
  const order = p.s.piles[cur].slice();
  p.add({ type: 'flipCard', ids: order.filter((_, i) => i % 2 === 1), stagger: 120, say: '둘째, 넷째, 여섯째… 카드만 제자리에서 뒤집습니다' });
  p.add({ type: 'place', cards: rowAt(p.s.piles[cur].slice()), stagger: 60, dur: 600, say: '펼치면 관객 카드만 방향이 다릅니다' });
  p.add({ type: 'hold', ms: 3000, say: '펼치면 관객 카드만 방향이 다릅니다' });
  return p.events;
}

// ── 뒤집히는 카드 ──
function planReversed(sc) {
  const p = planner(sc);
  const sel = 'JD';
  p.add({ type: 'hold', ms: 2000, say: '맨 아래 카드 2♠ 한 장만 앞뒤를 반대로 넣어 두었습니다' });
  p.add({ type: 'take', id: sel, to: 'spect', say: '관객이 덱 가운데에서 한 장을 뽑습니다' });
  p.add({ type: 'flipCard', ids: [sel], say: '관객이 카드를 보는 사이에' });
  p.add({ type: 'flip', pile: 'deck', n: p.s.piles.deck.length, say: '마술사는 덱을 통째로 뒤집습니다. 맨 위에 보이는 것은 2♠의 뒷면입니다' });
  p.add({ type: 'hold', ms: 2200, say: '겉보기에는 그대로지만 그 아래는 전부 앞면입니다' });
  p.add({ type: 'flipCard', ids: [sel], say: '관객이 카드를 뒷면으로 돌립니다' });
  p.add({ type: 'take', id: sel, to: 'deck', at: 6, slideOut: 0, say: '뒷면 그대로 덱 가운데에 넣습니다' });
  p.add({ type: 'flipCard', ids: [p.s.piles.deck[0]], say: '탁자 아래에서 맨 위 카드(2♠) 한 장만 바로잡습니다' });
  p.add({ type: 'flip', pile: 'deck', n: p.s.piles.deck.length, say: '덱 전체를 다시 뒤집습니다' });
  const order = p.s.piles.deck.slice();
  p.add({ type: 'place', cards: rowSpots(order, { x0: -((order.length - 1) * 0.13) / 2, dx: 0.13, z: 0.2 }), stagger: 70, say: '펼치면 관객 카드만 앞면입니다' });
  p.add({ type: 'hold', ms: 3000, say: '펼치면 관객 카드만 앞면입니다' });
  return p.events;
}

// ── 네 명의 도둑 ──
const JACKS = ['JS', 'JH', 'JD', 'JC'];
const HIDDEN = ['5D', '9C', '2H'];
function planBurglars(sc) {
  const p = planner(sc);
  // 숨긴 세 장은 부채 맨 뒤(첫 잭 아래)에 겹쳐 둔다. 부채를 접어 뒤집으면 이 세 장이 맨 위로 온다.
  const fan = [
    ...HIDDEN.map((id, i) => ({ id, x: -0.75, z: 0.15, y: CARD_T * (0.5 + i), rotY: 0.24, face: true })),
    { id: 'JS', x: -0.75, z: 0.15, y: CARD_T * 3.5, rotY: 0.24, face: true },
    { id: 'JH', x: -0.53, z: 0.08, y: CARD_T * 4.5, rotY: 0.08, face: true },
    { id: 'JD', x: -0.31, z: 0.08, y: CARD_T * 5.5, rotY: -0.08, face: true },
    { id: 'JC', x: -0.09, z: 0.15, y: CARD_T * 6.5, rotY: -0.24, face: true },
  ];
  p.add({ type: 'place', cards: fan, stagger: 60, dur: 700, say: '잭 네 장을 펼쳐 보여 줍니다' });
  p.add({ type: 'hold', ms: 2000, say: '앞에서는 잭 네 장만 보입니다' });
  p.add({ type: 'view', name: 'side', say: '옆에서 보면 첫 번째 잭 아래에 세 장이 겹쳐 숨어 있습니다' });
  p.add({ type: 'hold', ms: 2200, say: '옆에서 보면 첫 번째 잭 아래에 세 장이 겹쳐 숨어 있습니다' });
  p.add({ type: 'view', name: 'diag', say: '부채를 접어 뒤집어 덱 위에 올립니다' });
  p.add({ type: 'collect', ids: [...HIDDEN, 'JS', 'JH', 'JD', 'JC'], to: 'deck', face: false, say: '부채를 접어 뒤집어 덱 위에 올리면 맨 위 3장은 잭이 아닌 숨긴 카드입니다' });
  [9, 5, 11].forEach((at, i) => p.add({ type: 'insert', pile: 'deck', at, say: ['"첫 번째 도둑은 3층으로" 맨 위 카드를 가운데에 넣습니다', '"두 번째는 2층으로"', '"세 번째는 1층으로"'][i] }));
  const top = p.s.piles.deck[0];
  p.add({ type: 'flipCard', ids: [top], say: '네 번째 도둑은 진짜 잭이니 보여 줘도 됩니다' });
  p.add({ type: 'flipCard', ids: [top], say: '다시 맨 위에 둡니다' });
  const four = p.s.piles.deck.slice(0, 4);
  p.add({ type: 'place', cards: four.map((id, i) => ({ id, x: -0.68 + i * 0.45, z: 0.75, face: true })), stagger: 200, say: '덱을 톡 두드리고 맨 위 네 장을 뒤집으면…' });
  p.add({ type: 'hold', ms: 2800, say: '네 도둑이 모두 옥상(맨 위)으로 도망쳐 있습니다' });
  return p.events;
}

// ── 내가 하는 대로 ──
function planDoAsIDo(sc) {
  const p = planner(sc);
  p.add({ type: 'hold', ms: 2000, say: '빨간 덱은 마술사, 파란 덱은 관객의 것입니다' });
  p.add({ type: 'hold', ms: 2000, say: '덱을 바꾸기 전에 빨간 덱의 맨 아래 카드 3♠를 슬쩍 기억합니다' });
  p.add({ type: 'pile', from: 'L', to: 'M', say: '덱을 서로 바꿉니다' });
  p.add({ type: 'pile', from: 'R', to: 'L', say: '덱을 서로 바꿉니다' });
  p.add({ type: 'pile', from: 'M', to: 'R', say: '덱을 서로 바꿉니다' });
  p.add({ type: 'take', id: '8H', to: 'R', say: '관객은 빨간 덱 가운데에서 한 장(8♥)을 골라 기억하고 맨 위에 올립니다' });
  p.add({ type: 'take', id: p.s.piles.L[5], to: 'L', say: '마술사도 똑같이 하는 척합니다. 이 카드는 기억하지 않아도 됩니다' });
  p.add({ type: 'move', from: 'R', to: 'M', n: 6, say: '관객이 빨간 덱을 컷합니다' });
  p.add({ type: 'pile', from: 'R', to: 'M', say: '열쇠 카드 3♠가 8♥ 바로 위로 내려앉습니다' });
  p.add({ type: 'pile', from: 'L', to: 'R', say: '덱을 다시 바꿉니다' });
  p.add({ type: 'pile', from: 'M', to: 'L', say: '덱을 다시 바꿉니다' });
  const order = p.s.piles.L.slice();
  p.add({ type: 'place', cards: rowSpots(order, { x0: -((order.length - 1) * 0.13) / 2, dx: 0.13, z: -0.95, face: true }), stagger: 70, say: '마술사는 빨간 덱을 훑어 3♠ 다음 장(8♥)을 찾습니다' });
  p.add({ type: 'take', id: '8H~2', to: 'O', say: '관객은 파란 덱에서 자기 카드를 찾아 내놓습니다' });
  p.add({ type: 'flipCard', ids: ['8H~2'], say: '함께 뒤집으면…' });
  p.add({ type: 'hold', ms: 2800, say: '두 사람의 카드가 똑같이 하트 8입니다' });
  return p.events;
}

export const SCENARIOS = {
  overhand: {
    piles: { right: { x: 0.52 }, left: { x: -0.52 } },
    start: () => ({ right: OVERHAND_DECK.slice(), left: [] }),
    marks: ['AS'],
    labels: [{ id: 'AS', text: 'A♠' }],
    intro: '맨 위 카드 A♠(금색 테두리)이 어디로 가는지 지켜보세요',
    plan: () => planOverhand(OVERHAND_DECK),
    check: (s) => s.piles.left[0] === 'AS' && s.face.AS === true,
  },
  ambitious: {
    piles: { deck: { x: 0 } },
    start: () => ({ deck: AMBITIOUS_DECK.slice() }),
    marks: ['4H'],
    labels: [{ id: '4H', text: '4♥' }, { id: '9C', text: '9♣', plain: true }],
    intro: '관객이 고른 4♥는 위에서 둘째입니다. 맨 위에는 다른 카드 9♣가 있습니다',
    plan: () => [
      { type: 'hold', ms: 1800, say: '관객이 고른 4♥는 위에서 둘째입니다. 맨 위에는 다른 카드 9♣가 있습니다' },
      { type: 'view', name: 'side', say: '맨 위 두 장의 끝을 정확히 맞춰 한 덩어리로 잡습니다' },
      { type: 'flip', pile: 'deck', n: 2, say: '두 장을 한 장처럼 뒤집습니다. 관객에게는 4♥가 보입니다' },
      { type: 'hold', ms: 2200, say: '옆에서 보면 두 장이지만, 정면에서는 한 장처럼 보입니다' },
      { type: 'flip', pile: 'deck', n: 2, say: '두 장을 함께 다시 뒷면으로 돌립니다. 이제 맨 위는 9♣입니다' },
      { type: 'view', name: 'diag', say: '관객은 맨 위 카드가 여전히 4♥라고 믿습니다' },
      { type: 'insert', pile: 'deck', at: 7, say: '맨 위 카드(사실은 9♣)를 덱 가운데에 꽂습니다' },
      { type: 'hold', ms: 1400, say: '손가락을 한 번 튕기면…' },
      { type: 'flip', pile: 'deck', n: 1, say: '맨 위 카드를 뒤집으면 4♥가 올라와 있습니다' },
      { type: 'hold', ms: 2800, say: '4♥가 덱 가운데에서 맨 위로 돌아왔습니다' },
    ],
    check: (s) => s.piles.deck[0] === '4H' && s.face['4H'] === true && s.piles.deck.indexOf('9C') === 7,
  },
  glide: {
    piles: { hand: { x: -0.3, y: 0.55 }, table: { x: 0.58, z: 0.4 } },
    fit: 1.12,
    start: () => ({ hand: GLIDE_DECK.slice(), table: [] }),
    lookAt: [0.1, 0.3, 0],
    views: ['diag', 'side', 'below'],
    marks: ['QS'],
    labels: [{ id: 'QS', text: 'Q♠' }, { id: '2D', text: '2♦', plain: true }],
    intro: '덱을 뒷면이 위로 오게 들고 있습니다. 맨 아래 카드를 기억하세요',
    plan: () => [
      { type: 'view', name: 'below', say: '아래에서 보면 맨 아래 카드는 스페이드 퀸입니다' },
      { type: 'hold', ms: 1800, say: '관객에게 이 카드를 보여 줍니다' },
      { type: 'shift', ids: ['QS'], dz: -0.18, say: '약지로 맨 아래 카드만 몸 쪽으로 살짝 당깁니다' },
      { type: 'hold', ms: 1800, say: '앞쪽에 둘째 장(2♦)의 끝이 드러납니다' },
      { type: 'take', id: '2D', to: 'table', say: '오른손은 드러난 둘째 장을 빼내 테이블에 내려놓습니다' },
      { type: 'shift', ids: ['QS'], dz: 0.18, say: '당겼던 맨 아래 카드는 제자리로 밀어 넣습니다' },
      { type: 'view', name: 'diag', say: '관객은 스페이드 퀸이 테이블에 놓였다고 믿습니다' },
      { type: 'flip', pile: 'table', n: 1, say: '테이블의 카드를 뒤집으면…' },
      { type: 'hold', ms: 2800, say: '스페이드 퀸이 다이아 2로 바뀌었습니다' },
    ],
    check: (s) => s.piles.table[0] === '2D' && s.face['2D'] === true && s.piles.hand[s.piles.hand.length - 1] === 'QS',
  },
  hindu: {
    piles: { right: { x: 0.42, y: 0.5 }, left: { x: -0.5, z: 0.1 } },
    start: () => ({ right: HINDU_DECK.slice(), left: [] }),
    lookAt: [0, 0.25, 0],
    marks: ['8S'],
    labels: [{ id: '8S', text: '8♠ 예언' }],
    intro: '예언은 이 덱의 맨 아래 카드, 스페이드 8입니다',
    plan: () => [
      { type: 'hold', ms: 1600, say: '오른손은 덱의 짧은 쪽을 위에서 잡고 있습니다' },
      { type: 'move', from: 'right', to: 'left', n: 3, fast: true, say: '왼손으로 위쪽 몇 장을 끌어내립니다' },
      { type: 'move', from: 'right', to: 'left', n: 2, fast: true, say: '계속 내립니다. 오른손 덱의 맨 아래 카드는 그대로입니다' },
      { type: 'move', from: 'right', to: 'left', n: 3, fast: true, say: '계속 내립니다. 오른손 덱의 맨 아래 카드는 그대로입니다' },
      { type: 'move', from: 'right', to: 'left', n: 2, fast: true, say: '계속 내립니다. 오른손 덱의 맨 아래 카드는 그대로입니다' },
      { type: 'hold', ms: 1300, say: '관객이 "멈춰"라고 말합니다' },
      { type: 'tilt', pile: 'right', angle: -1.25, say: '오른손 덩어리를 들어 바닥 카드를 관객에게 보여 줍니다' },
      { type: 'hold', ms: 2600, say: '언제 멈춰도 보이는 카드는 처음 바닥 카드, 스페이드 8입니다' },
      { type: 'tilt', pile: 'right', angle: 0, say: '덩어리를 다시 내립니다' },
      { type: 'hold', ms: 2000, say: '봉투 속 예언도 스페이드 8입니다' },
    ],
    check: (s) => s.piles.right[s.piles.right.length - 1] === '8S' && s.tilt.right === 0,
  },
  riffle: {
    piles: { deck: { x: 0, z: -0.25 }, right: { x: 0.55, z: 0.3 }, left: { x: -0.55, z: 0.3 }, mix: { x: 0, z: -0.25 } },
    start: () => ({ deck: RIFFLE_DECK.slice() }),
    fit: 1.15,
    fitV: 1.5,
    marks: [],
    labels: [],
    intro: '빨강과 검정이 번갈아 놓인 카드 12장입니다',
    plan: planRiffle,
    check: (s) => {
      const placed = Object.keys(s.free);
      if (placed.length !== 12) return false;
      const byPos = placed.sort((a, b) => (s.free[a].z - s.free[b].z) || (s.free[a].x - s.free[b].x));
      for (let i = 0; i < 12; i += 2) if (isRed(byPos[i]) === isRed(byPos[i + 1])) return false;
      return true;
    },
  },

  deal21: {
    piles: { hand: { x: 1.25, z: -0.15 }, count: { x: 1.25, z: -1.1 } },
    start: () => ({ hand: DEAL21_DECK.slice() }),
    fit: 1.65,
    fitV: 1.5,
    lookAt: [0.2, 0.1, -0.05],
    marks: ['9H'],
    labels: [{ id: '9H', text: '고른 카드 9♥' }],
    intro: '21장을 뒷면으로 들고 시작합니다',
    plan: planDeal21,
    check: (s) => s.piles.hand[0] === '9H' && s.face['9H'] === true && s.piles.count.length === 10,
  },
  keycard: cutReveal({
    deck: () => { const rest = pickCards(12, ['QH', '7C'], 21); return [...rest.slice(0, 6), 'QH', ...rest.slice(6), '7C']; },
    sel: 'QH', key: '7C',
    intro: '맨 아래 카드 7♣를 열쇠 카드로 기억합니다',
    pickSay: '관객이 덱 가운데에서 한 장을 뽑습니다',
    cutSay: '아래쪽 절반을 그 위에 얹습니다. 열쇠 카드 7♣가 관객 카드 위로 내려앉습니다',
    revealSay: '앞면이 보이게 펼치면 열쇠 카드 바로 다음이 관객 카드입니다',
    endSay: '7♣ 다음 장, 하트 퀸이 관객의 카드입니다',
  }),
  sandwich: cutReveal({
    deck: () => { const rest = pickCards(11, ['10H', 'JC', 'JS'], 22); return ['JC', ...rest.slice(0, 6), '10H', ...rest.slice(6), 'JS']; },
    sel: '10H', key: 'JS', keyTop: 'JC',
    intro: '검은 잭 J♣는 맨 위, J♠는 맨 아래에 두었습니다',
    pickSay: '관객이 덱 가운데에서 한 장을 뽑습니다',
    cutSay: '아래쪽 절반을 얹으면 J♠가 관객 카드 위로 내려앉습니다',
    revealSay: '펼치면 두 잭이 관객 카드를 끌어안고 있습니다',
    endSay: 'J♠, 하트 10, J♣가 나란히 붙어 있습니다',
  }),
  hwkey: cutReveal({
    deck: () => { const rest = pickHwatu(12, ['H9Y', 'H1G'], 23); return [...rest.slice(0, 6), 'H9Y', ...rest.slice(6), 'H1G']; },
    sel: 'H9Y', key: 'H1G', hw: true,
    intro: '맨 아래 패, 1월 송학 광을 짝꿍 패로 기억합니다',
    pickSay: '관객이 화투 가운데에서 한 장을 뽑습니다',
    cutSay: '아래쪽 절반을 그 위에 얹습니다. 짝꿍 패가 관객 패 위로 내려앉습니다',
    revealSay: '앞면이 보이게 펼치면 짝꿍 패 바로 다음이 관객의 패입니다',
    endSay: '1월 광 다음 장, 9월 국화가 관객의 패입니다',
  }),
  crosscut: {
    piles: { deck: { x: -0.5 }, a: { x: 0.45 } },
    start: () => ({ deck: ['7D', ...pickCards(13, ['7D'], 24)] }),
    fit: 1.15,
    marks: ['7D'],
    labels: [{ id: '7D', text: '예언 7♦' }],
    intro: '맨 위 카드 7♦를 예언으로 적어 두었습니다',
    plan: () => [
      { type: 'hold', ms: 1800, say: '맨 위 카드 7♦를 예언으로 적어 두었습니다' },
      { type: 'move', from: 'deck', to: 'a', n: 7, say: '관객이 위쪽 덩어리를 들어 내려놓습니다. 7♦는 그 덩어리 맨 위에 있습니다' },
      { type: 'pile', from: 'deck', to: 'a', yaw: Math.PI / 2, say: '남은 덩어리를 90도 돌려 그 위에 십자로 올립니다' },
      { type: 'view', name: 'side', say: '잠시 다른 이야기로 시간을 끕니다' },
      { type: 'hold', ms: 2400, say: '십자 아래에는 처음의 맨 위 카드 7♦가 그대로 있습니다' },
      { type: 'view', name: 'diag', say: '관객은 어느 덩어리가 위였는지 잊어버립니다' },
      { type: 'move', from: 'a', to: 'deck', n: 7, say: '십자로 올린 덩어리를 들어 치웁니다' },
      { type: 'flipCard', ids: ['7D'], say: '"잘린 자리"의 카드를 뒤집으면…' },
      { type: 'hold', ms: 2800, say: '예언한 다이아 7입니다' },
    ],
    check: (s) => s.piles.a[0] === '7D' && s.face['7D'] === true,
  },
  fouraces: gatherScene({
    deck: () => ['AS', 'AH', 'AD', 'AC', ...pickCards(20, ['AS', 'AH', 'AD', 'AC'], 25)],
    targets: ['AS', 'AH', 'AD', 'AC'],
    xs: [-1.05, -0.35, 0.35, 1.05],
    fit: 1.7,
    intro: '덱 맨 위 4장이 에이스입니다',
  }),
  godori: gatherScene({
    deck: () => ['H2Y', 'H4Y', 'H8Y', ...pickHwatu(15, ['H2Y', 'H4Y', 'H8Y'], 26)],
    targets: ['H2Y', 'H4Y', 'H8Y'],
    xs: [-0.7, 0, 0.7],
    fit: 1.1,
    intro: '화투 맨 위 3장이 고도리 새 세 마리입니다',
    hw: true,
  }),
  reversed: {
    piles: { deck: { x: -0.4 }, spect: { x: 0.6, z: 0.45 } },
    start: () => { const rest = pickCards(12, ['JD', '2S'], 27); return { deck: [...rest.slice(0, 6), 'JD', ...rest.slice(6), '2S'] }; },
    startFace: () => ({ '2S': true }),
    fit: 1.3,
    marks: ['JD'],
    labels: [{ id: 'JD', text: '관객 J♦' }, { id: '2S', text: '2♠', plain: true }],
    intro: '맨 아래 카드 2♠ 한 장만 앞뒤를 반대로 넣어 두었습니다',
    plan: planReversed,
    check: (s) => Object.keys(s.free).length === 14 && Object.keys(s.free).every((id) => s.face[id] === (id === 'JD')),
  },
  clock: clockScene({
    deck: () => { const rest = pickCards(17, ['JS'], 28); return [...rest.slice(0, 12), 'JS', ...rest.slice(12)]; },
    known: 'JS', n: 5,
    intro: '위에서 13번째 카드 J♠를 예언으로 적어 둡니다',
  }),
  hwclock: clockScene({
    deck: () => { const rest = pickHwatu(20, ['H8G'], 29); return [...rest.slice(0, 12), 'H8G', ...rest.slice(12)]; },
    known: 'H8G', n: 9, hw: true,
    intro: '위에서 13번째 패, 8월 공산 광을 예언으로 적어 둡니다',
  }),
  thirteen: pileScene({
    deck: () => {
      const fixed = ['5H', '9D', '8C'];
      const rest = pickCards(49, fixed, 30);
      return ['5H', ...rest.slice(0, 8), '9D', ...rest.slice(8, 12), '8C', ...rest.slice(12, 17), ...rest.slice(17)];
    },
    bases: [{ id: '5H', value: 5, size: 9 }, { id: '9D', value: 9, size: 5 }, { id: '8C', value: 8, size: 6 }],
    top: 13, sub: 10, remaining: 32,
  }),
  monthpiles: pileScene({
    deck: () => {
      const fixed = ['H3T', 'H8Y', 'H6T'];
      const rest = pickHwatu(45, fixed, 31);
      return ['H3T', ...rest.slice(0, 9), 'H8Y', ...rest.slice(9, 13), 'H6T', ...rest.slice(13, 19), ...rest.slice(19)];
    },
    bases: [{ id: 'H3T', value: 3, size: 10 }, { id: 'H8Y', value: 8, size: 5 }, { id: 'H6T', value: 6, size: 7 }],
    top: 12, sub: 9, remaining: 26, hw: true,
  }),
  lastcard: downUnderScene({
    deck: () => [...pickCards(15, ['10C'], 32), '10C'],
    sel: '10C',
    intro: '관객 카드 10♣는 16장 묶음의 맨 아래에 있습니다',
    endSay: '끝까지 남은 카드는 관객의 클럽 10입니다',
  }),
  lastgwang: downUnderScene({
    deck: () => [...pickHwatu(15, ['H12G'], 33), 'H12G'],
    sel: 'H12G',
    intro: '비광은 16장 묶음의 맨 아래에 있습니다',
    endSay: '끝까지 살아남은 패는 비광입니다',
  }),
  doasido: {
    piles: { L: { x: -0.65 }, R: { x: 0.65 }, M: { x: 0, z: 0.6 }, O: { x: 0, z: 0.75 } },
    start: () => {
      const red = pickCards(10, ['8H', '3S'], 34);
      const blue = pickCards(11, ['8H'], 35, '~2');
      return { L: [...red.slice(0, 5), '8H', ...red.slice(5), '3S'], R: [...blue.slice(0, 6), '8H~2', ...blue.slice(6)] };
    },
    blue: (id) => id.endsWith('~2'),
    fit: 1.5,
    fitV: 1.5,
    marks: ['8H', '8H~2'],
    labels: [{ id: '8H', text: '관객 8♥' }, { id: '3S', text: '열쇠 3♠', plain: true }],
    intro: '빨간 덱은 마술사, 파란 덱은 관객의 것입니다',
    plan: planDoAsIDo,
    check: (s) => {
      const red = Object.keys(s.free).sort((a, b) => s.free[a].x - s.free[b].x);
      return red[red.indexOf('3S') + 1] === '8H' && s.face['8H~2'] === true;
    },
  },
  stebbins: cycleScene({
    deck: () => Logic().stebbinsDeck(),
    next: (b, t) => `바닥 ${markOf(b)}에 3을 더하고 다음 무늬로: 맨 위는 ${markOf(t)}`,
    intro: '덱은 숫자 +3, 무늬 클·하·스·다 순서로 놓여 있습니다',
    ruleSay: '숫자는 3씩 커지고 무늬는 클럽, 하트, 스페이드, 다이아 순서로 돕니다',
  }),
  monthcycle: cycleScene({
    deck: () => Logic().cycleDeck(),
    next: (b, t) => `바닥이 ${markOf(b)}이니 맨 위는 그다음 달, ${markOf(t)}`,
    intro: '화투는 1월부터 12월까지 네 바퀴 순서로 놓여 있습니다',
    ruleSay: '1월, 2월, 3월 … 순서로 놓여 있습니다',
    hw: true,
  }),
  hummer: {
    piles: { a: { x: -0.45, y: 0.25 }, b: { x: 0.45, y: 0.25 } },
    start: () => ({ a: HUMMER_IDS.slice() }),
    startFace: () => Object.fromEntries(HUMMER_IDS.map((id, i) => [id, i % 2 === 1 && id !== '6D'])),
    fit: 1.45,
    marks: ['6D'],
    labels: [{ id: '6D', text: '관객 6♦' }],
    intro: '앞뒤를 번갈아 놓은 카드 10장입니다',
    plan: planHummer,
    check: (s) => {
      const others = HUMMER_IDS.filter((id) => id !== '6D').map((id) => !!s.face[id]);
      return others.every((f) => f === others[0]) && !!s.face['6D'] !== others[0] && Object.keys(s.free).length === 10;
    },
  },
  burglars: {
    piles: { deck: { x: 0.75, z: -0.3 } },
    start: () => ({ deck: [...HIDDEN, ...JACKS, ...pickCards(12, [...JACKS, ...HIDDEN], 36)] }),
    fit: 1.45,
    marks: JACKS,
    labels: [],
    intro: '잭 네 장이 오늘의 도둑입니다',
    plan: planBurglars,
    check: (s) => JACKS.every((j) => s.free[j] && s.face[j]) && HIDDEN.every((h) => s.piles.deck.includes(h)),
  },
};

// 장면에 쓰인 모든 카드
export const cardsOf = (sc) => Object.values(sc.start()).flat();
