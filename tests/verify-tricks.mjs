// 앱에 적힌 설명이 실제로 성립하는지 시뮬레이션으로 확인한다.  실행: node tests/verify-tricks.mjs
import assert from 'node:assert/strict';
import '../js/logic.js';
import '../js/tricks.js';
import '../js/tricks-more.js';
import '../js/tricks-hwatu.js';

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

check('빨강 검정 짝: 몇 장을 내려놓고 어떻게 리플해도 모든 쌍이 두 색', () => {
  const red = L.fullDeck().filter(L.isRed);
  const black = L.fullDeck().filter((c) => !L.isRed(c));
  const start = red.flatMap((r, i) => [r, black[i]]);
  for (let t = 0; t < 5000; t++) {
    const k = 1 + Math.floor(rng() * 51);
    const out = L.gilbreath(start, k, rng);
    assert.equal(out.length, 52);
    for (let i = 0; i < 52; i += 2) assert.notEqual(L.isRed(out[i]), L.isRed(out[i + 1]), `k=${k} 자리 ${i}`);
  }
});

check('세 칸씩 도는 덱: 52장 전부 한 번씩, 어떤 컷에도 바닥 다음이 맨 위', () => {
  const deck = L.stebbinsDeck();
  assert.equal(new Set(deck).size, 52);
  for (let at = 0; at < 52; at++) {
    const c = L.cut(deck, at);
    assert.equal(L.stebbinsNext(c[51]), c[0]);
  }
  assert.equal(L.stebbinsNext('QS'), '2D'); // 설명의 Q+3=2 예시
});

check('뒤섞인 앞뒤: 어떤 뒤섞기 뒤에도 하나 걸러 뒤집으면 관객 카드만 반대', () => {
  for (let t = 0; t < 5000; t++) {
    const ids = L.shuffle(L.fullDeck(), rng).slice(0, 10);
    const sel = ids[Math.floor(rng() * 10)];
    let p = ids.map((id, i) => ({ id, up: (i % 2 === 1) !== (id === sel) }));
    const moves = Math.floor(rng() * 30);
    for (let m = 0; m < moves; m++) {
      p = L.flipTopTwo(p);
      p = L.cut(p, Math.floor(rng() * 10));
    }
    const f = L.flipEverySecond(p);
    const selUp = f.find((c) => c.id === sel).up;
    f.filter((c) => c.id !== sel).forEach((c) => assert.notEqual(c.up, selUp));
  }
});

check('네 명의 도둑: 숨긴 3장을 덱 가운데로 보내면 맨 위 4장은 잭', () => {
  const jacks = ['JS', 'JH', 'JD', 'JC'];
  const hidden = ['5D', '9C', '2H'];
  const rest = L.fullDeck().filter((c) => !jacks.includes(c) && !hidden.includes(c));
  let deck = [...hidden, ...jacks, ...rest];
  for (let i = 0; i < 3; i++) {
    const c = deck.shift();
    deck.splice(20, 0, c);
  }
  assert.deepEqual(deck.slice(0, 4), jacks);
});

check('두 잭의 포옹: 어디서 컷해도 잭·관객 카드·잭이 이어짐 (순환 기준)', () => {
  for (let t = 0; t < 2000; t++) {
    const rest = L.shuffle(L.fullDeck().filter((c) => !['JS', 'JC'].includes(c)), rng);
    const sel = rest.pop();
    const deck = [sel, 'JC', ...rest, 'JS'];
    const c = L.cut(deck, 1 + Math.floor(rng() * 51));
    const at = c.indexOf(sel);
    assert.equal(c[(at + 51) % 52], 'JS');
    assert.equal(c[(at + 1) % 52], 'JC');
  }
});

check('화투: 48장, 달마다 4장, 광 5·열끗 9·띠 10·피 24', () => {
  const d = L.hwatuDeck();
  assert.equal(new Set(d).size, 48);
  const count = (k) => d.filter((c) => k.includes(c.slice(-1))).length;
  assert.equal(count('G'), 5);
  assert.equal(count('Y'), 9);
  assert.equal(count('T'), 10);
  assert.equal(count('PQR'), 24);
  L.MONTHS.forEach((m) => assert.equal(d.filter((c) => L.monthOf(c) === m).length, 4));
});

check('생각한 달 맞히기: 12달 전부 정답, 한 벌로 묶음을 만들 수 있음', () => {
  L.MONTHS.forEach((m) => {
    const answers = L.BINARY_BITS.map((b) => L.monthsWithBit(b).includes(m));
    assert.equal(L.sumAnswers(answers), m);
    assert.ok(answers.filter(Boolean).length <= 4, '한 달의 패는 4장뿐');
  });
  L.BINARY_BITS.forEach((b) => assert.equal(L.monthsWithBit(b)[0], b));
});

check('고도리 모으기: 세 더미 크기 무관 맨 위가 고도리 세 장', () => {
  const birds = ['H2Y', 'H4Y', 'H8Y'];
  for (let t = 0; t < 2000; t++) {
    const rest = L.shuffle(L.hwatuDeck().filter((c) => !birds.includes(c)), rng);
    const a = 6 + Math.floor(rng() * 10);
    const b = 6 + Math.floor(rng() * 10);
    const piles = [rest.slice(0, a), rest.slice(a, a + b), [...birds, ...rest.slice(a + b)]];
    const end = L.fourAces(piles).at(-1).piles;
    assert.deepEqual(end.map((p) => p[0]).sort(), birds.slice().sort());
  }
});

check('열두 달 순환: 48장 전부 한 번씩, 어떤 컷에도 바닥 다음 달이 맨 위', () => {
  const deck = L.cycleDeck();
  assert.equal(new Set(deck).size, 48);
  for (let at = 0; at < 48; at++) {
    const c = L.cut(deck, at);
    assert.equal(L.nextMonth(L.monthOf(c[47])), L.monthOf(c[0]));
  }
});

check('달 더미: 공식이 항상 세 번째 바닥 달을 맞힘', () => {
  let tested = 0;
  for (let t = 0; t < 5000; t++) {
    const { piles } = L.makeMonthPiles(L.shuffle(L.hwatuDeck(), rng));
    if (piles.length < 3) continue;
    const picked = L.shuffle(piles, rng).slice(0, 3);
    const remaining = 48 - picked.flat().length;
    const [a, b, c] = picked.map((p) => L.monthOf(p[0]));
    assert.equal(L.thirdMonth(remaining, a, b), c);
    tested++;
  }
  assert.ok(tested > 1000);
});

check('열두 달 시계: 화투 48장에서 n=1~12 모두 n번째 자리에 13번째 패', () => {
  for (let t = 0; t < 300; t++) {
    const deck = L.shuffle(L.hwatuDeck(), rng);
    for (let n = 1; n <= 12; n++) assert.equal(L.clock(deck, n).positions[n - 1], deck[12]);
  }
});

check('오광의 선택: 어떤 순서로 골라도 끝에는 비광', () => {
  assert.ok(L.equivoqueAlwaysEnds(['H1G', 'H3G', 'H12G', 'H8G', 'H11G'], 'H12G'));
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
  const hwatu = new Set(L.hwatuDeck());
  const real = { test: (id) => /^(10|[2-9AJQK])[SHDC](~\d)?$/.test(id) || hwatu.has(id) };
  const generic = /^[a-z]+\d+$/;
  assert.equal(new Set(TRICKS.map((t) => t.id)).size, TRICKS.length);
  for (const t of TRICKS) {
    assert.ok(t.show.length >= 3 && t.steps.length >= 3, t.id);
    assert.ok(t.show.concat(t.steps.flatMap((s) => s.frames)).every((f) => f.cards.every((c) => !hwatu.has(c.id) || c.hw)), `${t.id} 화투 패가 화투 모양이 아님`);
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
