// 마술의 수학·절차를 그대로 계산하는 순수 함수. 앱과 tests/verify-tricks.mjs가 함께 쓴다.
(function () {
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const SUITS = ['C', 'D', 'H', 'S']; // 피치-체니 순서: 클럽 < 다이아 < 하트 < 스페이드

  const fullDeck = () => SUITS.flatMap((s) => RANKS.map((r) => r + s));
  const rankOf = (id) => id.slice(0, -1);
  const suitOf = (id) => id.slice(-1);
  const rankIndex = (id) => RANKS.indexOf(rankOf(id)); // A=0 … K=12

  // 시드를 주면 항상 같은 결과가 나오는 난수 (mulberry32)
  function seeded(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(list, rng = Math.random) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ── 21장의 예언 ──────────────────────────────
  const columns21 = (deck) => {
    const cols = [[], [], []];
    deck.forEach((c, i) => cols[i % 3].push(c));
    return cols;
  };

  // chosen: 고른 카드가 있는 열(0~2). 그 열을 가운데에 끼워 다시 모은다.
  function gather21(deck, chosen) {
    const cols = columns21(deck);
    const others = [0, 1, 2].filter((i) => i !== chosen);
    return [...cols[others[0]], ...cols[chosen], ...cols[others[1]]];
  }

  // ── 네 장의 에이스 ───────────────────────────
  // piles: 각 더미(앞쪽이 맨 위). 맨 오른쪽 더미 위에 모을 카드가 더미 수만큼. 단계마다 상태를 남긴다.
  function fourAces(piles) {
    const state = piles.map((p) => p.slice());
    const snaps = [];
    const snap = (pile, kind) => snaps.push({ pile, kind, piles: state.map((p) => p.slice()) });
    const others = piles.length - 1;
    state.forEach((_, i) => {
      state[i] = [...state[i].slice(others), ...state[i].slice(0, others)];
      snap(i, 'under');
      state.forEach((__, j) => {
        if (j !== i) state[j].unshift(state[i].shift());
      });
      snap(i, 'deal');
    });
    return snaps;
  }

  // ── 오버핸드 셔플 ────────────────────────────
  // 맨 위 한 장을 먼저 떨어뜨리고 나머지를 덩어리로 얹으면 그 카드는 맨 아래로 간다.
  function overhandPeelTop(deck, chunk = 4) {
    const snaps = [];
    let right = deck.slice(1);
    let left = [deck[0]];
    snaps.push({ left: left.slice(), right: right.slice() });
    while (right.length) {
      left = [...right.slice(0, chunk), ...left];
      right = right.slice(chunk);
      snaps.push({ left: left.slice(), right: right.slice() });
    }
    return snaps;
  }

  // 위에서부터 덩어리로 떨어뜨리고 마지막 keep장은 한 번에 맨 위에 얹는다.
  function overhandRunToLast(deck, keep = 1, chunk = 4) {
    const snaps = [];
    let right = deck.slice();
    let left = [];
    while (right.length > keep) {
      const n = Math.min(chunk, right.length - keep);
      left = [...right.slice(0, n), ...left];
      right = right.slice(n);
      snaps.push({ left: left.slice(), right: right.slice() });
    }
    left = [...right, ...left];
    snaps.push({ left: left.slice(), right: [] });
    return snaps;
  }

  // ── 시계 마술 ────────────────────────────────
  // n장을 먼저 빼고, 12장을 뒤집어 쌓아 되돌린 뒤, 위에서 12장을 시계 1~12시에 놓는다.
  function clock(deck, n) {
    const rest = deck.slice(n);
    const pile = rest.slice(0, 12).reverse();
    const again = [...pile, ...rest.slice(12)];
    return { positions: again.slice(0, 12), hour: n, card: again[n - 1] };
  }

  // ── 13까지 세는 더미 ─────────────────────────
  // 바닥 카드 값부터 13까지 세며 쌓는다. 더미 한 개의 장수는 14 - 값.
  const pileValue = (id) => rankIndex(id) + 1;

  function makePiles(deck) {
    const piles = [];
    let i = 0;
    while (i < deck.length) {
      const size = 14 - pileValue(deck[i]);
      if (i + size > deck.length) break;
      piles.push(deck.slice(i, i + size));
      i += size;
    }
    return { piles, leftover: deck.slice(i) };
  }

  const thirdPileValue = (remaining, a, b) => remaining - 10 - a - b;

  // ── 쿠르스칼 카운트 ──────────────────────────
  const kruskalValue = (id) => {
    const i = rankIndex(id);
    return i >= 10 ? 5 : i + 1;
  };

  function kruskalPath(deck, start) {
    const path = [];
    let i = start - 1;
    while (i < deck.length) {
      path.push(i);
      i += kruskalValue(deck[i]);
    }
    return path;
  }

  const kruskalEnd = (deck, start) => {
    const p = kruskalPath(deck, start);
    return p[p.length - 1];
  };

  // 시작 위치 1~starts가 모두 같은 카드에서 끝나는 배열을 찾는다.
  function kruskalDeck(rng = Math.random, length = 52, starts = 10) {
    const base = fullDeck();
    for (let tries = 0; tries < 200000; tries++) {
      const deck = shuffle(base, rng).slice(0, length);
      const end = kruskalEnd(deck, 1);
      let same = true;
      for (let s = 2; s <= starts; s++) {
        if (kruskalEnd(deck, s) !== end) { same = false; break; }
      }
      if (same) return deck;
    }
    throw new Error('수렴 배열을 찾지 못했습니다');
  }

  // ── 마지막 남은 한 장 (다운 언더) ────────────
  function downUnder(deck) {
    const hand = deck.slice();
    const snaps = [];
    const table = [];
    while (hand.length > 1) {
      table.unshift(hand.shift());
      hand.push(hand.shift());
      snaps.push({ hand: hand.slice(), table: table.slice() });
    }
    return { snaps, last: hand[0] };
  }

  // ── 피치-체니 5장 ────────────────────────────
  const ORDER_CODES = { LMH: 1, LHM: 2, MLH: 3, MHL: 4, HLM: 5, HML: 6 };
  const cardOrder = (id) => rankIndex(id) * 4 + SUITS.indexOf(suitOf(id));

  function cheneyEncode(hand) {
    const bySuit = {};
    hand.forEach((c) => (bySuit[suitOf(c)] = bySuit[suitOf(c)] || []).push(c));
    const pair = Object.values(bySuit).find((g) => g.length >= 2);
    let [a, b] = pair;
    // 시계 방향 거리가 1~6이 되도록 보여줄 카드 a, 숨길 카드 b를 정한다
    let d = (rankIndex(b) - rankIndex(a) + 13) % 13;
    if (d > 6) { [a, b] = [b, a]; d = 13 - d; }
    const rest = hand.filter((c) => c !== a && c !== b).sort((x, y) => cardOrder(x) - cardOrder(y));
    const [L, M, H] = rest;
    const code = Object.keys(ORDER_CODES).find((k) => ORDER_CODES[k] === d);
    const pick = { L, M, H };
    return { hidden: b, shown: [a, ...code.split('').map((k) => pick[k])], distance: d };
  }

  function cheneyDecode(shown) {
    const [first, ...rest] = shown;
    const sorted = rest.slice().sort((x, y) => cardOrder(x) - cardOrder(y));
    const code = rest.map((c) => 'LMH'[sorted.indexOf(c)]).join('');
    const d = ORDER_CODES[code];
    return RANKS[(rankIndex(first) + d) % 13] + suitOf(first);
  }

  // ── 빨강 검정 짝 (길브레스 원리) ─────────────
  const isRed = (id) => suitOf(id) === 'H' || suitOf(id) === 'D';

  // 위에서 k장을 한 장씩 내려놓아(순서 뒤집힘) 두 덩어리를 한 번 리플한다. 앞쪽이 맨 위.
  function gilbreath(deck, k, rng = Math.random) {
    const a = deck.slice(0, k).reverse();
    const b = deck.slice(k);
    const fromBottom = [];
    let i = a.length - 1;
    let j = b.length - 1;
    while (i >= 0 || j >= 0) {
      const takeA = j < 0 || (i >= 0 && rng() < 0.5);
      fromBottom.push(takeA ? a[i--] : b[j--]);
    }
    return fromBottom.reverse();
  }

  // ── 세 칸씩 도는 덱 (시 스테빈스 배열) ───────
  const STEBBINS_SUITS = ['C', 'H', 'S', 'D'];

  function stebbinsDeck() {
    return Array.from({ length: 52 }, (_, i) => RANKS[(i * 3) % 13] + STEBBINS_SUITS[i % 4]);
  }

  // 맨 아래 카드를 보면 맨 위 카드를 알 수 있다.
  const stebbinsNext = (id) => RANKS[(rankIndex(id) + 3) % 13] + STEBBINS_SUITS[(STEBBINS_SUITS.indexOf(suitOf(id)) + 1) % 4];

  const cut = (deck, at) => [...deck.slice(at), ...deck.slice(0, at)];

  // ── 뒤섞인 앞뒤 (허머 원리) ──────────────────
  // packet: {id, up} 목록. 맨 위 두 장을 한 덩어리로 뒤집는다.
  const flipTopTwo = (packet) => [
    { ...packet[1], up: !packet[1].up },
    { ...packet[0], up: !packet[0].up },
    ...packet.slice(2),
  ];
  // 짝수 번째 카드만 뒤집는다.
  const flipEverySecond = (packet) => packet.map((c, i) => (i % 2 === 1 ? { ...c, up: !c.up } : c));

  // ── 화투 ─────────────────────────────────────
  const HWATU_KINDS = {
    1: 'GTPQ', 2: 'YTPQ', 3: 'GTPQ', 4: 'YTPQ', 5: 'YTPQ', 6: 'YTPQ',
    7: 'YTPQ', 8: 'GYPQ', 9: 'YTPQ', 10: 'YTPQ', 11: 'GPQR', 12: 'GYTP',
  };

  const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
  const hwatuDeck = () => MONTHS.flatMap((m) => HWATU_KINDS[m].split('').map((k) => `H${m}${k}`));
  const monthOf = (id) => Number(/^H(\d+)/.exec(id)[1]);
  const nextMonth = (m) => (m % 12) + 1;

  // 1월부터 12월까지 도는 순서로 48장을 쌓는다.
  const cycleDeck = () => [0, 1, 2, 3].flatMap((round) => MONTHS.map((m) => `H${m}${HWATU_KINDS[m][round]}`));

  // 바닥 패의 달부터 12까지 세며 쌓는다. 더미 한 개의 장수는 13 - 달.
  function makeMonthPiles(deck) {
    const piles = [];
    let i = 0;
    while (i < deck.length) {
      const size = 13 - monthOf(deck[i]);
      if (i + size > deck.length) break;
      piles.push(deck.slice(i, i + size));
      i += size;
    }
    return { piles, leftover: deck.slice(i) };
  }

  const thirdMonth = (remaining, a, b) => remaining - 9 - a - b;

  // 생각한 달 맞히기: 묶음 네 개의 첫 값은 1, 2, 4, 8이다.
  const BINARY_BITS = [1, 2, 4, 8];
  const monthsWithBit = (bit) => MONTHS.filter((m) => m & bit);
  const sumAnswers = (answers) => answers.reduce((sum, yes, i) => sum + (yes ? BINARY_BITS[i] : 0), 0);

  // 마술사의 선택 규칙으로 후보를 줄인다. 어떤 선택에도 마지막은 target인지 전부 따져 본다.
  function equivoqueAlwaysEnds(cards, target) {
    if (cards.length === 1) return cards[0] === target;
    return cards.every((picked) => {
      // 예언 패를 고르면 그 패만 남기고, 다른 패를 고르면 그 패를 치운다.
      const rest = picked === target ? [target] : cards.filter((c) => c !== picked);
      return equivoqueAlwaysEnds(rest, target);
    });
  }

  const api = {
    RANKS, SUITS, fullDeck, rankOf, suitOf, rankIndex, seeded, shuffle,
    columns21, gather21, fourAces, overhandPeelTop, overhandRunToLast, clock,
    pileValue, makePiles, thirdPileValue, kruskalValue, kruskalPath, kruskalEnd, kruskalDeck,
    downUnder, cheneyEncode, cheneyDecode,
    isRed, gilbreath, stebbinsDeck, stebbinsNext, cut, flipTopTwo, flipEverySecond,
    HWATU_KINDS, MONTHS, hwatuDeck, monthOf, nextMonth, cycleDeck, makeMonthPiles, thirdMonth,
    BINARY_BITS, monthsWithBit, sumAnswers, equivoqueAlwaysEnds,
  };
  globalThis.Logic = api;
})();
