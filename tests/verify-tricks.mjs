// 앱에 적힌 설명이 실제로 성립하는지 시뮬레이션으로 확인한다.  실행: node tests/verify-tricks.mjs
import assert from 'node:assert/strict';
import '../js/logic.js';
import '../js/tricks.js';

const { Logic: L, TRICKS } = globalThis;
const rng = L.seeded(7);
const results = [];
const check = (name, fn) => {
  fn();
  results.push(name);
  console.log('  ok  ' + name);
};

check('21장: 어떤 카드를 골라도 세 번 뒤 11번째 (21장 전부, 무작위 500회)', () => {
  for (let t = 0; t < 500; t++) {
    const start = L.shuffle(L.fullDeck(), rng).slice(0, 21);
    for (const pick of start) {
      let deck = start;
      for (let r = 0; r < 3; r++) deck = L.gather21(deck, L.columns21(deck).findIndex((c) => c.includes(pick)));
      assert.equal(deck.indexOf(pick), 10);
    }
  }
});

check('21장: 모을 때 순서가 뒤집혀도 11번째', () => {
  for (let t = 0; t < 200; t++) {
    const start = L.shuffle(L.fullDeck(), rng).slice(0, 21);
    const pick = start[t % 21];
    let deck = start;
    for (let r = 0; r < 3; r++) deck = L.gather21(deck, L.columns21(deck).findIndex((c) => c.includes(pick))).reverse();
    assert.equal(deck.indexOf(pick), 10);
  }
});

check('열쇠 카드: 컷을 몇 번 해도 관객 카드는 열쇠 카드 다음 장 (순환 기준)', () => {
  for (let t = 0; t < 2000; t++) {
    const deck = L.shuffle(L.fullDeck(), rng);
    const sel = deck.splice(20, 1)[0];
    const key = deck[deck.length - 1];
    deck.unshift(sel);
    let cur = deck;
    for (let c = 0; c < 6; c++) {
      const at = 1 + Math.floor(rng() * 51);
      cur = [...cur.slice(at), ...cur.slice(0, at)];
    }
    assert.equal(cur[(cur.indexOf(key) + 1) % 52], sel);
  }
});

check('십자 컷: 어디서 잘라도 뒤집는 카드는 원래 맨 위 카드', () => {
  const deck = L.shuffle(L.fullDeck(), rng);
  for (let at = 1; at < 52; at++) assert.equal(deck.slice(0, at)[0], deck[0]);
});

check('네 장의 에이스: 더미 크기 무관 맨 위가 모두 에이스', () => {
  const aces = ['AS', 'AH', 'AD', 'AC'];
  for (let t = 0; t < 2000; t++) {
    const rest = L.shuffle(L.fullDeck().filter((c) => !aces.includes(c)), rng);
    const cuts = [7, 7, 7].map(() => 7 + Math.floor(rng() * 6));
    const piles = [];
    let i = 0;
    cuts.forEach((n) => { piles.push(rest.slice(i, i + n)); i += n; });
    piles.push([...L.shuffle(aces, rng), ...rest.slice(i)]);
    const snaps = L.fourAces(piles);
    const end = snaps[snaps.length - 1].piles;
    assert.deepEqual(end.map((p) => p[0]).sort(), aces.slice().sort());
  }
});

check('돌아오는 카드: 두 번 섞어도 맨 위 카드는 다시 맨 위', () => {
  for (let chunk = 1; chunk <= 9; chunk++) {
    const deck = L.shuffle(L.fullDeck(), rng);
    const a = L.overhandPeelTop(deck, chunk);
    const bottom = a[a.length - 1].left;
    assert.equal(bottom[bottom.length - 1], deck[0]);
    const b = L.overhandRunToLast(bottom, 1, chunk);
    assert.equal(b[b.length - 1].left[0], deck[0]);
    assert.equal(b[b.length - 1].left.length, 52);
  }
});

check('올라오는 카드: 마지막 두 장을 함께 얹으면 관객 카드는 위에서 둘째', () => {
  const deck = L.shuffle(L.fullDeck(), rng);
  const a = L.overhandPeelTop(deck);
  const bottom = a[a.length - 1].left;
  const b = L.overhandRunToLast(bottom, 2);
  assert.equal(b[b.length - 1].left[1], deck[0]);
});

check('시계 예언: n=1~12 모두 n시 자리에 13번째 카드', () => {
  for (let t = 0; t < 300; t++) {
    const deck = L.shuffle(L.fullDeck(), rng);
    for (let n = 1; n <= 12; n++) assert.equal(L.clock(deck, n).positions[n - 1], deck[12]);
  }
});

check('13까지 세는 더미: 공식이 항상 세 번째 바닥 값을 맞힘', () => {
  let tested = 0;
  for (let t = 0; t < 5000; t++) {
    const { piles, leftover } = L.makePiles(L.shuffle(L.fullDeck(), rng));
    if (piles.length < 3) continue;
    const picked = L.shuffle(piles, rng).slice(0, 3);
    const used = picked.flat().length;
    const remaining = 52 - used;
    assert.equal(remaining, 52 - picked.reduce((s, p) => s + p.length, 0));
    const [a, b, c] = picked.map((p) => L.pileValue(p[0]));
    assert.equal(L.thirdPileValue(remaining, a, b), c);
    tested += leftover.length >= 0 ? 1 : 0;
  }
  assert.ok(tested > 1000);
});

check('쿠르스칼: 52장 수렴 확률 출력, 체험용 덱은 1~10 전부 같은 카드', () => {
  let hit = 0;
  const N = 20000;
  for (let t = 0; t < N; t++) {
    const deck = L.shuffle(L.fullDeck(), rng);
    const s = 1 + Math.floor(rng() * 10);
    if (L.kruskalEnd(deck, s) === L.kruskalEnd(deck, 1)) hit++;
  }
  const rate = hit / N;
  console.log(`      시작 1 vs 무작위 시작(1~10) 수렴률 ${(rate * 100).toFixed(1)}%`);
  assert.ok(rate > 0.7 && rate < 0.95, '앱의 "대략 80~85%" 설명과 어긋남: ' + rate);
  for (let t = 0; t < 20; t++) {
    const deck = L.kruskalDeck(rng);
    const end = L.kruskalEnd(deck, 1);
    for (let s = 2; s <= 10; s++) assert.equal(L.kruskalEnd(deck, s), end);
  }
});

check('마지막 남은 한 장: 8·16·32장 모두 맨 아래 카드가 남음', () => {
  for (const n of [2, 4, 8, 16, 32]) {
    const deck = L.shuffle(L.fullDeck(), rng).slice(0, n);
    assert.equal(L.downUnder(deck).last, deck[n - 1]);
  }
});

check('다섯 장의 암호: 무작위 20만 손패 전부 복호화 성공', () => {
  for (let t = 0; t < 200000; t++) {
    const hand = L.shuffle(L.fullDeck(), rng).slice(0, 5);
    const e = L.cheneyEncode(hand);
    assert.ok(e.distance >= 1 && e.distance <= 6);
    assert.equal(L.cheneyDecode(e.shown), e.hidden);
  }
});

check('다섯 장의 암호: 앱 설명의 예시(스페이드 3 + 거리 4 = 스페이드 7, M H L)와 일치', () => {
  const e = L.cheneyEncode(['3S', '10H', 'KD', '7S', '6C']);
  assert.equal(e.shown[0], '3S');
  assert.equal(e.hidden, '7S');
  assert.equal(e.distance, 4);
  assert.deepEqual(e.shown.slice(1), ['10H', 'KD', '6C']); // 6C=L, 10H=M, KD=H → M H L
});

// ── 콘텐츠 무결성 ──
check('공연 화면에 비법 표시가 없음 (금색 투시 카드·비밀 라벨 금지)', () => {
  for (const t of TRICKS) {
    t.show.forEach((f, i) => {
      assert.ok(!f.cards.some((c) => c.xr), `${t.id} show[${i}] 투시 카드`);
      assert.ok(!f.labels.some((l) => l.tone === 'secret'), `${t.id} show[${i}] 비밀 라벨`);
    });
  }
});

check('모든 프레임: 카드 id 유일, 좌표가 무대 안, 카드 이름 형식 유효', () => {
  const real = /^(10|[2-9AJQK])[SHDC](~\d)?$/;
  const generic = /^[a-z]+\d+$/;
  assert.equal(new Set(TRICKS.map((t) => t.id)).size, TRICKS.length);
  for (const t of TRICKS) {
    assert.ok(t.show.length >= 3 && t.steps.length >= 3, t.id);
    const frames = [...t.show, ...t.steps.flatMap((s) => {
      assert.ok(s.frames.length >= 1, `${t.id} ${s.t} 프레임 없음`);
      return s.frames;
    })];
    frames.forEach((f, i) => {
      const seen = new Set();
      f.cards.forEach((c) => {
        assert.ok(real.test(c.id) || generic.test(c.id), `${t.id}#${i} 카드 ${c.id}`);
        assert.ok(!seen.has(c.id), `${t.id}#${i} 중복 ${c.id}: ${f.say}`);
        seen.add(c.id);
        assert.ok(c.x >= 0 && c.x <= 100 && c.y >= 0 && c.y <= 100, `${t.id}#${i} ${c.id} 좌표 ${c.x},${c.y}`);
        assert.ok(!generic.test(c.id) || !c.up, `${t.id}#${i} 이름 없는 카드 ${c.id}를 앞면으로 공개`);
      });
    });
  }
});

console.log(`\n통과 ${results.length}건, 마술 ${TRICKS.length}종`);
