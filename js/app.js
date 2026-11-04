// 화면 구성과 이동. 저장은 이 기기의 localStorage에만 한다.
(function () {
  const CardUI = globalThis.CardUI;
  const { Stage, Player, miniCard, cardName, pipSvg } = CardUI;
  const L = globalThis.Logic;
  const TRICKS = globalThis.TRICKS;
  const CATS = globalThis.CATEGORIES;
  const app = document.getElementById('app');
  const main = document.getElementById('view');
  const nav = document.getElementById('nav');

  // ── 저장 ──────────────────────────────
  const KEY = 'card-magic-v1';
  let store = { fav: [], prac: {} };
  try {
    store = { ...store, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch (e) { /* 저장소를 못 쓰면 이번 실행 동안만 기억한다 */ }
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* 위와 같음 */ }
  };

  const PRACTICE = ['순서를 보지 않고 말할 수 있다', '혼자서 5번 연속 성공했다', '누군가에게 공연했다'];
  const pracOf = (id) => store.prac[id] || [false, false, false];
  const doneCount = (id) => pracOf(id).filter(Boolean).length;
  const mastered = () => TRICKS.filter((t) => doneCount(t.id) === PRACTICE.length).length;

  // ── 공용 조각 ─────────────────────────
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const face = (t) => {
    for (let i = t.show.length - 1; i >= 0; i--) {
      const hit = t.show[i].cards.find((c) => c.hl && CardUI.parse(c.id));
      if (hit) return hit.id.split('~')[0];
    }
    return t.deck === 'hwatu' ? 'H12G' : 'AS';
  };
  const levelText = ['', '쉬움', '보통', '어려움'];
  const levelPips = (n) => `<span class="pips" role="img" aria-label="난도 ${levelText[n]}">${[1, 2, 3].map((i) => pipSvg('S', i <= n ? 'on' : 'off')).join('')}</span>`;
  const timeText = (m) => (m >= 60 ? `연습 ${Math.round(m / 60)}시간` : `연습 ${m}분`);

  const trickRow = (t) => `
    <li><button class="row" data-go="t-${t.id}">
      ${miniCard(face(t), 'lead')}
      <span class="row-main">
        <span class="row-title">${esc(t.title)}${store.fav.includes(t.id) ? pipSvg('H', 'fav') : ''}</span>
        <span class="row-hook">${esc(t.hook)}</span>
        <span class="row-meta">${levelPips(t.level)}<span>${timeText(t.mins)}</span><span>${esc(t.cats.join(' · '))}</span>${doneCount(t.id) ? `<span class="gold">연습 ${doneCount(t.id)}/${PRACTICE.length}</span>` : ''}</span>
      </span>
    </button></li>`;

  // ── 현재 화면 정리 ────────────────────
  let cleanup = () => {};
  let route = 'home';
  const ui = { query: '', cat: '전체', deck: 'all' };
  const isHwatu = (t) => t.deck === 'hwatu';
  const DECKS = [
    { key: 'all', label: '전체', match: () => true },
    { key: 'trump', label: '트럼프', match: (t) => !isHwatu(t) },
    { key: 'hwatu', label: '화투', match: isHwatu },
  ];

  function makeStage(host, tall = false) {
    host.classList.add('felt');
    if (tall) host.classList.add('tall');
    const stage = new Stage(host);
    return stage;
  }

  // ── 홈 ────────────────────────────────
  function todayTrick() {
    const d = new Date();
    const n = d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate();
    return TRICKS[n % TRICKS.length];
  }

  function viewHome() {
    const pick = todayTrick();
    main.innerHTML = `
      <header class="top">
        <h1>카드 마술 모음</h1>
        <p>트럼프 ${TRICKS.filter((t) => !isHwatu(t)).length}가지 · 화투 ${TRICKS.filter(isHwatu).length}가지 · 공연을 보고 비법까지 배웁니다</p>
      </header>
      <section class="today" aria-label="오늘의 마술">
        <div id="hero" class="stage"></div>
        <div class="today-foot">
          <div>
            <span class="eyebrow">오늘의 마술</span>
            <h2>${esc(pick.title)}</h2>
            <p id="hero-say" class="say" aria-live="off"></p>
          </div>
          <button class="btn gold-btn" data-go="t-${pick.id}">배우기</button>
        </div>
      </section>
      <div class="find">
        <div class="decks" role="group" aria-label="카드 종류">
          ${DECKS.map((d) => `<button data-deck="${d.key}" aria-pressed="${ui.deck === d.key}">${d.label} ${TRICKS.filter(d.match).length}</button>`).join('')}
        </div>
        <label class="search"><span class="sr">마술 검색</span>
          <input id="q" type="search" placeholder="마술 이름이나 기술로 찾기" value="${esc(ui.query)}" autocomplete="off">
        </label>
        <div class="chips" role="group" aria-label="분류">
          ${['전체', ...CATS].map((c) => `<button class="chip" data-cat="${c}" aria-pressed="${ui.cat === c}">${c}</button>`).join('')}
        </div>
      </div>
      <ul id="list" class="rows"></ul>`;

    const stage = makeStage(main.querySelector('#hero'));
    const sayEl = main.querySelector('#hero-say');
    const player = new Player(stage, (f) => { sayEl.textContent = f.say; });
    player.load(pick.show, { loop: true });
    cleanup = () => { player.stop(); stage.destroy(); };

    const listEl = main.querySelector('#list');
    const paint = () => {
      const q = ui.query.trim().toLowerCase();
      const inDeck = DECKS.find((d) => d.key === ui.deck).match;
      const hits = TRICKS.filter((t) => inDeck(t) && (ui.cat === '전체' || t.cats.includes(ui.cat))
        && (!q || [t.title, t.en, t.hook, t.effect, ...t.cats, isHwatu(t) ? '화투' : '트럼프'].join(' ').toLowerCase().includes(q)));
      listEl.innerHTML = hits.length ? hits.map(trickRow).join('')
        : `<li class="empty">조건에 맞는 마술이 없습니다. 다른 말로 찾거나 분류를 전체로 바꿔 보세요.</li>`;
      main.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', c.dataset.cat === ui.cat));
      main.querySelectorAll('[data-deck]').forEach((c) => c.setAttribute('aria-pressed', c.dataset.deck === ui.deck));
    };
    main.querySelectorAll('[data-deck]').forEach((c) => c.addEventListener('click', () => { ui.deck = c.dataset.deck; paint(); }));
    main.querySelector('#q').addEventListener('input', (e) => { ui.query = e.target.value; paint(); });
    main.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () => { ui.cat = c.dataset.cat; paint(); }));
    paint();
  }

  // ── 마술 상세 ─────────────────────────
  function viewTrick(t) {
    let tab = 'show';
    let step = 0;

    main.innerHTML = `
      <div class="detail-head">
        <button class="back" data-back aria-label="뒤로">‹</button>
        <div class="detail-title"><h1>${esc(t.title)}</h1><span>${esc(t.en)}</span></div>
        <button class="fav-btn" id="fav" aria-pressed="${store.fav.includes(t.id)}" aria-label="저장">${pipSvg('H')}</button>
      </div>
      <div class="pin">
        <div id="st" class="stage"></div>
        <div class="cap"><p id="say" class="say" aria-live="polite"></p>
          <div class="cap-ctl">
            <span id="count" class="count"></span>
            <button class="ghost" id="speed" aria-pressed="false">느리게 보기</button>
            <button class="ghost" id="toggle">일시정지</button>
            <button class="ghost" id="again">다시 보기</button>
          </div>
        </div>
      </div>
      <div class="tabs" role="tablist">
        <button role="tab" data-tab="show">공연 보기</button>
        <button role="tab" data-tab="learn">비법 배우기</button>
        <button role="tab" data-tab="practice">연습</button>
      </div>
      <div id="pane" class="pane"></div>`;

    const stage = makeStage(main.querySelector('#st'));
    const sayEl = main.querySelector('#say');
    const countEl = main.querySelector('#count');
    const toggleEl = main.querySelector('#toggle');
    const pane = main.querySelector('#pane');
    const player = new Player(stage, (f, i, n, playing) => {
      sayEl.textContent = f.say;
      countEl.textContent = n > 1 ? `장면 ${i + 1}/${n}` : '';
      toggleEl.textContent = playing ? '일시정지' : '재생';
      toggleEl.hidden = n < 2;
    });
    cleanup = () => { player.stop(); stage.destroy(); };
    const speedEl = main.querySelector('#speed');
    player.setSlow(!!store.slow);
    speedEl.setAttribute('aria-pressed', !!store.slow);
    speedEl.addEventListener('click', () => {
      store.slow = !store.slow;
      save();
      player.setSlow(store.slow);
      speedEl.setAttribute('aria-pressed', store.slow);
    });

    const paneShow = () => `
      <p class="lead-text">${esc(t.effect)}</p>
      <dl class="facts">
        <div><dt>난도</dt><dd>${levelPips(t.level)} ${levelText[t.level]}</dd></div>
        <div><dt>연습 시간</dt><dd>${timeText(t.mins).replace('연습 ', '')}</dd></div>
        <div><dt>준비물</dt><dd>${esc(t.need)}</dd></div>
        ${t.origin ? `<div><dt>유래</dt><dd>${esc(t.origin)}</dd></div>` : ''}
      </dl>
      ${t.lab ? `<button class="btn wide" data-go="${t.lab}">앱과 직접 해 보기</button>` : ''}
      ${t.proto3d ? `<button class="btn wide" data-go="p3d-${t.proto3d}">3D로 보기</button>` : ''}
      <button class="btn gold-btn wide" data-tab="learn">비법 보기</button>
      <p class="hint">공연을 먼저 관객의 눈으로 본 뒤 비법을 여는 것이 좋습니다.</p>`;

    const paneLearn = () => {
      const s = t.steps[step];
      return `
      <div class="legend">${miniCard('AS', 'xr')}<span>금색 점선 카드는 관객에게 뒷면으로 보입니다. 앞면은 마술사만 압니다.</span></div>
      ${t.proto3d ? `<button class="btn wide" data-go="p3d-${t.proto3d}">손 안의 움직임을 3D로 보기</button>` : ''}
      <nav class="dots" aria-label="단계">${t.steps.map((_, i) => `<button data-step="${i}" aria-current="${i === step}">${i + 1}</button>`).join('')}</nav>
      <h2 class="step-title">${esc(s.t)}</h2>
      <p class="body-text">${esc(s.text)}</p>
      ${s.list ? `<ul class="code-table">${s.list.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${s.tip ? `<p class="tip"><b>요령</b>${esc(s.tip)}</p>` : ''}
      <div class="step-nav">
        <button class="btn" data-step="${step - 1}" ${step === 0 ? 'disabled' : ''}>이전 단계</button>
        ${step < t.steps.length - 1
          ? `<button class="btn gold-btn" data-step="${step + 1}">다음 단계</button>`
          : '<button class="btn gold-btn" data-tab="practice">연습 시작</button>'}
      </div>
      <section class="why"><h3>왜 되는 걸까요</h3><p>${esc(t.principle)}</p></section>
      <section class="why"><h3>자주 하는 실수</h3><ul>${t.mistakes.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></section>
      <section class="why"><h3>이렇게 말해 보세요</h3><p class="patter">${esc(t.patter)}</p></section>`;
    };

    const panePractice = () => {
      const p = pracOf(t.id);
      return `
      <h2 class="step-title">연습 체크</h2>
      <ul class="checks">${PRACTICE.map((x, i) => `<li><label><input type="checkbox" id="pr-${i}" data-pr="${i}" ${p[i] ? 'checked' : ''}><span>${x}</span></label></li>`).join('')}</ul>
      <section class="why"><h3>연습 순서</h3>
        <ol>
          <li>카드 없이 단계를 소리 내어 말합니다.</li>
          <li>카드를 들고 천천히 합니다. 막히는 단계만 다시 봅니다.</li>
          <li>휴대폰으로 찍어 관객 쪽에서 보이는 모습을 확인합니다.</li>
          <li>멘트를 붙여 처음부터 끝까지 합니다.</li>
        </ol>
      </section>
      <section class="why"><h3>이렇게 말해 보세요</h3><p class="patter">${esc(t.patter)}</p></section>`;
    };

    function paint() {
      main.querySelectorAll('.tabs [data-tab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === tab));
      if (tab === 'show') {
        pane.innerHTML = paneShow();
        player.load(t.show, { autoplay: true });
      } else if (tab === 'learn') {
        pane.innerHTML = paneLearn();
        player.load(t.steps[step].frames, { autoplay: true });
      } else {
        pane.innerHTML = panePractice();
        player.load(t.show, { autoplay: false });
        player.show(t.show.length - 1);
      }
    }

    main.querySelector('#toggle').addEventListener('click', () => player.toggle());
    main.querySelector('#again').addEventListener('click', () => player.restart());
    main.querySelector('#fav').addEventListener('click', (e) => {
      const on = !store.fav.includes(t.id);
      store.fav = on ? [...store.fav, t.id] : store.fav.filter((x) => x !== t.id);
      save();
      e.currentTarget.setAttribute('aria-pressed', on);
    });
    main.onclick = (e) => {
      const tabBtn = e.target.closest('[data-tab]');
      const stepBtn = e.target.closest('[data-step]');
      if (tabBtn) {
        tab = tabBtn.dataset.tab;
        paint();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (stepBtn && !stepBtn.disabled) {
        step = Number(stepBtn.dataset.step);
        paint();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    pane.addEventListener('change', (e) => {
      if (!e.target.dataset.pr) return;
      const p = pracOf(t.id).slice();
      p[Number(e.target.dataset.pr)] = e.target.checked;
      store.prac[t.id] = p;
      save();
    });
    paint();
  }

  // ── 체험 목록 ─────────────────────────
  function viewLab() {
    main.innerHTML = `
      <header class="top"><h1>체험</h1><p>앱이 마술사가 됩니다. 카드 없이 바로 당해 보세요.</p></header>
      <ul class="rows">
        <li><button class="row" data-go="lab21">${miniCard('9H', 'lead')}
          <span class="row-main"><span class="row-title">21장의 예언</span><span class="row-hook">마음속으로 한 장을 고르면, 세 번 묻고 맞힙니다.</span><span class="row-meta"><span>1분</span><span>항상 성공</span></span></span>
        </button></li>
        <li><button class="row" data-go="labkruskal">${miniCard('5D', 'lead')}
          <span class="row-main"><span class="row-title">길이 합쳐지는 카운트</span><span class="row-hook">비밀 숫자로 카드를 건너뛰면 도착한 카드를 맞힙니다.</span><span class="row-meta"><span>3분</span><span>직접 세어 보기</span></span></span>
        </button></li>
        <li><button class="row" data-go="labmonth">${miniCard('H7Y', 'lead')}
          <span class="row-main"><span class="row-title">생각한 달 맞히기</span><span class="row-hook">화투 묶음 네 개에 있는지만 답하면 달을 맞힙니다.</span><span class="row-meta"><span>1분</span><span>화투</span><span>항상 성공</span></span></span>
        </button></li>
      </ul>`;
  }

  // ── 체험: 21장 ────────────────────────
  function viewLab21() {
    main.innerHTML = `
      <div class="detail-head"><button class="back" data-back aria-label="뒤로">‹</button><div class="detail-title"><h1>21장의 예언</h1><span>체험</span></div></div>
      <div id="st" class="stage"></div>
      <p id="say" class="say lab-say" aria-live="polite"></p>
      <div id="ctl" class="lab-ctl"></div>`;
    const stage = makeStage(main.querySelector('#st'), true);
    const say = main.querySelector('#say');
    const ctl = main.querySelector('#ctl');
    cleanup = () => stage.destroy();
    let deck, round;
    const X = [20, 50, 80];

    function layout() {
      const cards = L.columns21(deck).flatMap((col, x) => col.map((id, y) => ({ id, x: X[x], y: 11 + y * 13, up: 1, s: 0.82 })));
      stage.render({ cards, labels: [] });
    }
    function ask() {
      layout();
      say.textContent = round === 0
        ? '이 중 한 장을 마음속으로 고르세요. 그 카드가 어느 줄에 있나요?'
        : `이번에는 어느 줄에 있나요? (${round + 1}/3번째 질문)`;
      ctl.innerHTML = ['왼쪽 줄', '가운데 줄', '오른쪽 줄'].map((n, i) => `<button class="btn" data-col="${i}">${n}</button>`).join('');
    }
    function reveal() {
      const cards = deck.map((id, i) => ({ id, x: 50 + i * 0.12, y: 50 - i * 0.2 }));
      stage.render({ cards, labels: [] });
      say.textContent = '카드를 모았습니다. 이제 당신의 카드를 찾습니다.';
      ctl.innerHTML = '';
      setTimeout(() => {
        if (!main.contains(say)) return;
        const pick = deck[10];
        stage.render({
          cards: deck.map((id, i) => (i === 10
            ? { id, x: 50, y: 46, up: 1, hl: 1, s: 1.9 }
            : { id, x: 8 + (i > 10 ? i - 1 : i) * 4.2, y: 92, s: 0.6 })),
          labels: [],
        });
        say.textContent = `당신이 고른 카드는 ${cardName(pick)}입니다.`;
        ctl.innerHTML = '<button class="btn gold-btn" data-restart>한 번 더</button><button class="btn" data-go="t-twenty-one">비법 보기</button>';
      }, 1300);
    }
    function start() {
      deck = L.shuffle(L.fullDeck()).slice(0, 21);
      round = 0;
      ask();
    }
    ctl.addEventListener('click', (e) => {
      if (e.target.closest('[data-restart]')) return start();
      const b = e.target.closest('[data-col]');
      if (!b) return;
      deck = L.gather21(deck, Number(b.dataset.col));
      round += 1;
      if (round < 3) ask();
      else reveal();
    });
    start();
  }

  // ── 체험: 쿠르스칼 ────────────────────
  function viewLabKruskal() {
    main.innerHTML = `
      <div class="detail-head"><button class="back" data-back aria-label="뒤로">‹</button><div class="detail-title"><h1>길이 합쳐지는 카운트</h1><span>체험</span></div></div>
      <p id="say" class="say lab-say" aria-live="polite"></p>
      <ol class="rule">
        <li>1부터 10 중에서 숫자를 하나 정합니다. 그 번째 카드가 출발점입니다.</li>
        <li>카드 값만큼 앞으로 갑니다. A는 1, J·Q·K는 5입니다.</li>
        <li>값만큼 갈 수 없으면 그 카드에서 멈춥니다. 왼쪽 위부터 오른쪽으로 읽습니다.</li>
      </ol>
      <div id="grid" class="kgrid"></div>
      <div id="ctl" class="lab-ctl"></div>`;
    const say = main.querySelector('#say');
    const grid = main.querySelector('#grid');
    const ctl = main.querySelector('#ctl');
    let deck, end;

    function draw(path = [], stop = -1) {
      grid.innerHTML = deck.map((id, i) => {
        const cls = [i === stop ? 'stop' : '', path.includes(i) ? 'walk' : ''].join(' ');
        return `<span class="kcell">${miniCard(id, cls)}<i>${i + 1}</i></span>`;
      }).join('');
    }
    function start() {
      deck = L.kruskalDeck();
      end = L.kruskalEnd(deck, 1);
      draw();
      say.textContent = '숫자를 비밀로 정하고 끝까지 세어 보세요. 멈춘 카드를 기억하면 됩니다.';
      ctl.innerHTML = '<button class="btn gold-btn" data-show>멈췄습니다</button><button class="btn" data-new>다른 덱</button>';
    }
    function shown() {
      draw([], end);
      say.textContent = `당신이 멈춘 카드는 ${cardName(deck[end])}입니다. 출발 숫자를 누르면 지나온 길을 보여 드립니다.`;
      ctl.innerHTML = `<div class="nums" role="group" aria-label="출발 숫자">${Array.from({ length: 10 }, (_, i) => `<button class="num" data-from="${i + 1}">${i + 1}</button>`).join('')}</div>
        <button class="btn gold-btn" data-new>한 번 더</button><button class="btn" data-go="t-kruskal">비법 보기</button>`;
    }
    ctl.addEventListener('click', (e) => {
      if (e.target.closest('[data-show]')) shown();
      else if (e.target.closest('[data-new]')) start();
      else if (e.target.closest('[data-from]')) {
        const from = Number(e.target.closest('[data-from]').dataset.from);
        draw(L.kruskalPath(deck, from), end);
        say.textContent = `${from}번째 카드에서 출발해도 ${cardName(deck[end])}에 도착합니다. 이 덱은 1~10 어디서 출발해도 합쳐지도록 앱이 골랐습니다.`;
      }
    });
    start();
  }

  // ── 체험: 생각한 달 맞히기 ─────────────
  function viewLabMonth() {
    main.innerHTML = `
      <div class="detail-head"><button class="back" data-back aria-label="뒤로">‹</button><div class="detail-title"><h1>생각한 달 맞히기</h1><span>체험 · 화투</span></div></div>
      <p id="say" class="say lab-say" aria-live="polite"></p>
      <div id="cards" class="month-ask"></div>
      <div id="ctl" class="lab-ctl"></div>`;
    const say = main.querySelector('#say');
    const cards = main.querySelector('#cards');
    const ctl = main.querySelector('#ctl');
    let answers;

    function start() {
      answers = [];
      say.textContent = '1월부터 12월 중 한 달을 마음속으로 정하세요.';
      cards.innerHTML = L.MONTHS.map((m) => miniCard(`H${m}P`)).join('');
      ctl.innerHTML = '<button class="btn gold-btn wide" data-begin>정했습니다</button>';
    }
    function ask() {
      const bit = L.BINARY_BITS[answers.length];
      say.textContent = `이 묶음에 그 달이 있나요? (${answers.length + 1}/4번째 질문)`;
      cards.innerHTML = L.monthsWithBit(bit).map((m) => miniCard(`H${m}P`)).join('');
      ctl.innerHTML = '<button class="btn" data-ans="1">있어요</button><button class="btn" data-ans="0">없어요</button>';
    }
    function finish() {
      const m = L.sumAnswers(answers);
      if (m < 1 || m > 12) {
        say.textContent = '답이 달력 범위를 벗어났습니다. 답하신 내용 중 잘못 본 묶음이 있습니다. 다시 해 볼까요?';
        cards.innerHTML = '';
      } else {
        say.textContent = `당신이 생각한 달은 ${m}월, ${cardName(`H${m}P`).split(' ')[1]}입니다.`;
        cards.innerHTML = L.HWATU_KINDS[m].split('').map((k) => miniCard(`H${m}${k}`, 'lead')).join('');
      }
      ctl.innerHTML = '<button class="btn gold-btn" data-restart>한 번 더</button><button class="btn" data-go="t-hw-think-month">비법 보기</button>';
    }
    ctl.addEventListener('click', (e) => {
      if (e.target.closest('[data-restart]')) return start();
      if (e.target.closest('[data-begin]')) return ask();
      const b = e.target.closest('[data-ans]');
      if (!b) return;
      answers.push(b.dataset.ans === '1');
      if (answers.length < 4) ask();
      else finish();
    });
    start();
  }

  // ── 3D 보기: 손기술 ───────────────────
  // three.js 묶음(js/proto3d.js)은 이 화면을 열 때만 불러온다. key는 마술의 proto3d 값이다.
  function viewProto3D(key) {
    const t = TRICKS.find((x) => x.proto3d === key);
    if (!t) {
      route = 'home';
      return viewHome();
    }
    main.innerHTML = `
      <div class="detail-head"><button class="back" data-back aria-label="뒤로">‹</button><div class="detail-title"><h1>${esc(t.title)}</h1><span>3D · ${esc(t.en)}</span></div></div>
      <div class="gl-wrap">
        <div id="gl" class="gl"></div>
        <p id="gl-msg" class="gl-msg">3D 화면을 준비하고 있습니다</p>
      </div>
      <p id="say" class="say lab-say" aria-live="polite"></p>
      <div class="cap-ctl">
        <span class="count"></span>
        <button class="ghost" id="speed" aria-pressed="${!!store.slow}">느리게 보기</button>
        <button class="ghost" id="toggle">일시정지</button>
        <button class="ghost" id="again">다시 보기</button>
      </div>
      <div id="views" class="decks" role="group" aria-label="보는 각도"></div>
      <p class="hint">화면을 손가락으로 끌면 원하는 각도로 돌려 볼 수 있습니다. 손 모양은 넣지 않았습니다.</p>`;
    const say = main.querySelector('#say');
    const msg = main.querySelector('#gl-msg');
    const toggle = main.querySelector('#toggle');
    const viewsEl = main.querySelector('#views');
    let alive = true;
    let scene = null;
    cleanup = () => {
      alive = false;
      if (scene) scene.destroy();
    };
    const markView = (name) => viewsEl.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.view === name));

    import(new URL('js/proto3d.js', document.baseURI).href)
      .then((mod) => {
        viewsEl.innerHTML = mod.viewsOf(key).map(([name, label]) => `<button data-view="${name}" aria-pressed="false">${label}</button>`).join('');
        return mod.mount(main.querySelector('#gl'), key, { onSay: (text) => { say.textContent = text; }, onView: markView, slow: !!store.slow });
      })
      .then((s) => {
        if (!alive) return s.destroy();
        scene = s;
        main.querySelector('#gl').scene = s;
        msg.hidden = true;
      })
      .catch(() => {
        if (alive) msg.textContent = '이 기기에서는 3D 화면을 열 수 없습니다. 이전 화면의 평면 애니메이션으로 보세요.';
      });

    main.querySelector('#speed').addEventListener('click', (e) => {
      store.slow = !store.slow;
      save();
      e.currentTarget.setAttribute('aria-pressed', store.slow);
      if (scene) scene.setSlow(store.slow);
    });
    toggle.addEventListener('click', () => {
      if (scene) toggle.textContent = scene.toggle() ? '일시정지' : '재생';
    });
    main.querySelector('#again').addEventListener('click', () => {
      if (!scene) return;
      scene.restart();
      toggle.textContent = '일시정지';
    });
    viewsEl.addEventListener('click', (e) => {
      const b = e.target.closest('[data-view]');
      if (b && scene) scene.setView(b.dataset.view);
    });
  }

  // ── 내 연습 ───────────────────────────
  let installPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installPrompt = e;
    const b = document.getElementById('install');
    if (b) b.hidden = false;
  });

  function viewMe() {
    const favs = TRICKS.filter((t) => store.fav.includes(t.id));
    const started = TRICKS.filter((t) => doneCount(t.id) > 0 && !store.fav.includes(t.id));
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone || globalThis.CARD_PREVIEW || globalThis.Capacitor;
    main.innerHTML = `
      <header class="top"><h1>내 연습</h1><p>공연까지 마친 마술 ${mastered()} / ${TRICKS.length}</p></header>
      <div class="meter" role="img" aria-label="${TRICKS.length}개 중 ${mastered()}개 완료">${TRICKS.map((t) => `<span class="${doneCount(t.id) === PRACTICE.length ? 'full' : doneCount(t.id) ? 'part' : ''}"></span>`).join('')}</div>
      ${favs.length || started.length
        ? `<ul class="rows">${[...favs, ...started].map(trickRow).join('')}</ul>`
        : '<p class="empty">아직 저장한 마술이 없습니다. 마술 화면 위쪽의 하트를 누르거나 연습 체크를 시작하면 여기에 모입니다.</p>'}
      ${standalone ? '' : `<section class="why install">
        <h3>휴대폰에 앱으로 설치하기</h3>
        <button class="btn gold-btn wide" id="install" ${installPrompt ? '' : 'hidden'}>이 기기에 설치</button>
        <p><b>아이폰</b> Safari로 열고 공유 버튼을 누른 뒤 "홈 화면에 추가"를 선택합니다.</p>
        <p><b>안드로이드</b> Chrome으로 열고 메뉴(⋮)에서 "앱 설치" 또는 "홈 화면에 추가"를 선택합니다.</p>
        <p>설치한 뒤에는 인터넷 없이도 열립니다.</p>
      </section>`}
      <section class="why"><h3>이 기기에만 저장됩니다</h3><p>저장한 마술과 연습 기록은 이 휴대폰 안에만 있습니다. 앱을 지우거나 브라우저 데이터를 지우면 함께 사라집니다.</p></section>`;
    const inst = main.querySelector('#install');
    if (inst) inst.addEventListener('click', async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      inst.hidden = true;
    });
  }

  // ── 이동 ──────────────────────────────
  const scrollMemo = {};
  function render() {
    cleanup();
    cleanup = () => {};
    main.onclick = null;
    const r = route;
    if (r === 'lab') viewLab();
    else if (r === 'lab21') viewLab21();
    else if (r === 'labkruskal') viewLabKruskal();
    else if (r === 'labmonth') viewLabMonth();
    else if (r.startsWith('p3d-')) viewProto3D(r.slice(4));
    else if (r === 'me') viewMe();
    else if (r.startsWith('t-') && TRICKS.find((t) => t.id === r.slice(2))) viewTrick(TRICKS.find((t) => t.id === r.slice(2)));
    else { route = 'home'; viewHome(); }
    const tab = route === 'me' ? 'me' : route.startsWith('lab') ? 'lab' : 'home';
    nav.querySelectorAll('[data-go]').forEach((b) => {
      if (b.dataset.go === tab) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
  }

  function go(next) {
    if (next === route) return;
    scrollMemo[route] = window.scrollY;
    route = next;
    try { history.pushState({ route }, '', '#' + route); } catch (e) { /* 주소를 못 바꾸는 환경에서도 화면은 이동한다 */ }
    render();
    window.scrollTo(0, 0);
  }

  app.addEventListener('click', (e) => {
    const g = e.target.closest('[data-go]');
    if (g) return go(g.dataset.go);
    if (e.target.closest('[data-back]')) {
      if (history.state && history.state.route) history.back();
      else go('home');
    }
  });

  window.addEventListener('popstate', (e) => {
    scrollMemo[route] = window.scrollY;
    route = (e.state && e.state.route) || (location.hash || '#home').slice(1);
    render();
    window.scrollTo(0, scrollMemo[route] || 0);
  });

  route = (location.hash || '#home').slice(1) || 'home';
  render();

  if (!globalThis.Capacitor && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    try {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    } catch (e) { /* 서비스 워커가 막힌 환경에서는 온라인으로만 동작한다 */ }
  }
})();
