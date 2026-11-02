// 펠트 무대: 프레임을 받아 카드를 애니메이션으로 옮긴다.
(function () {
  const PIPS = {
    H: 'M12 21s-8.5-5.6-8.5-11.4C3.5 6.4 6 4 8.8 4c1.4 0 2.6.7 3.2 2 .6-1.3 1.8-2 3.2-2 2.8 0 5.3 2.4 5.3 5.6C20.5 15.4 12 21 12 21z',
    D: 'M12 2.5 19.5 12 12 21.5 4.5 12z',
    S: 'M12 2.5s8.5 6 8.5 11.5c0 2.6-2 4.5-4.4 4.5-1 0-2-.4-2.9-1.1.2 1.6.9 2.9 2 4.1H8.8c1.1-1.2 1.8-2.5 2-4.1-.9.7-1.9 1.1-2.9 1.1-2.4 0-4.4-1.9-4.4-4.5C3.5 8.5 12 2.5 12 2.5z',
    C: 'M12 3a4.2 4.2 0 0 1 3.6 6.4 4.2 4.2 0 1 1-2.2 6.7c.2 1.9.9 3.2 2 4.4H8.6c1.1-1.2 1.8-2.5 2-4.4a4.2 4.2 0 1 1-2.2-6.7A4.2 4.2 0 0 1 12 3z',
  };
  const SUIT_NAME = { S: '스페이드', H: '하트', D: '다이아', C: '클럽' };

  const pipSvg = (suit, cls = '') => `<svg class="pip ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${PIPS[suit]}"/></svg>`;

  // ── 화투 그림 ── 달마다 꽃과 풀을 도형으로 간단히 그린다 (viewBox 50×80)
  const MONTH_NAME = ['', '송학', '매조', '벚꽃', '흑싸리', '난초', '모란', '홍싸리', '공산', '국화', '단풍', '오동', '비'];
  const KIND_NAME = { G: '광', Y: '열끗', T: '띠', P: '피', Q: '피', R: '쌍피' };
  const ANIMAL = { 2: '꾀꼬리', 4: '두견새', 5: '다리', 6: '나비', 7: '멧돼지', 8: '기러기', 9: '술잔', 10: '사슴', 12: '제비' };

  const dot = (x, y, r, f) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}"/>`;
  const poly = (pts, f) => `<polygon points="${pts}" fill="${f}"/>`;
  const line = (d, s, w = 2) => `<path d="${d}" fill="none" stroke="${s}" stroke-width="${w}" stroke-linecap="round"/>`;
  const flower = (x, y, r, f, c) => [0, 72, 144, 216, 288].map((a) => dot(x + Math.cos((a * Math.PI) / 180) * r, y + Math.sin((a * Math.PI) / 180) * r, r * 0.72, f)).join('') + dot(x, y, r * 0.55, c);
  const hang = (x, top, n, f) => Array.from({ length: n }, (_, i) => `<ellipse cx="${x + (i % 2 ? 3 : -3)}" cy="${top + i * 6}" rx="3" ry="4.4" fill="${f}"/>`).join('');

  const MONTH_ART = {
    1: () => poly('25,38 8,62 42,62', '#1f6b3a') + poly('25,50 4,76 46,76', '#16552d') + `<rect x="22" y="62" width="6" height="14" fill="#5a3a22"/>`,
    2: () => line('M6 72 Q18 46 44 26', '#2b2320', 3) + flower(16, 58, 4, '#c8263a', '#f4d35e') + flower(30, 44, 4, '#c8263a', '#f4d35e') + flower(40, 30, 3.4, '#c8263a', '#f4d35e'),
    3: () => flower(14, 62, 5.5, '#f19bb0', '#c8263a') + flower(34, 66, 6, '#f19bb0', '#c8263a') + flower(25, 46, 5, '#f19bb0', '#c8263a') + flower(40, 42, 4, '#f19bb0', '#c8263a'),
    4: () => line('M8 22 Q26 18 42 26', '#2b2320', 2.4) + hang(13, 28, 8, '#2b2320') + hang(27, 26, 9, '#2b2320') + hang(39, 30, 7, '#2b2320'),
    5: () => line('M12 76 Q14 44 8 26', '#1f6b3a', 2.6) + line('M25 76 Q26 44 24 22', '#1f6b3a', 2.6) + line('M38 76 Q36 46 42 28', '#1f6b3a', 2.6) + flower(25, 44, 3.6, '#6d4aa3', '#f4d35e') + flower(12, 54, 3, '#6d4aa3', '#f4d35e'),
    6: () => flower(25, 46, 10, '#c8263a', '#f4d35e') + poly('10,68 25,60 18,78', '#1f6b3a') + poly('40,68 25,60 32,78', '#1f6b3a'),
    7: () => line('M8 22 Q26 18 42 26', '#2b2320', 2.4) + hang(13, 28, 8, '#c8263a') + hang(27, 26, 9, '#c8263a') + hang(39, 30, 7, '#1f6b3a'),
    8: () => `<path d="M0 80 V56 Q25 30 50 56 V80 Z" fill="#2b2320"/>`,
    9: () => flower(25, 46, 9, '#e0a81c', '#b04a1a') + line('M25 58 V78', '#1f6b3a', 3) + poly('25,70 12,64 16,76', '#1f6b3a'),
    10: () => [[14, 34], [36, 32], [25, 50], [12, 64], [38, 64]].map(([x, y]) => poly(`${x},${y - 8} ${x + 3},${y - 2} ${x + 8},${y - 3} ${x + 4},${y + 2} ${x + 6},${y + 8} ${x},${y + 4} ${x - 6},${y + 8} ${x - 4},${y + 2} ${x - 8},${y - 3} ${x - 3},${y - 2}`, '#c8381f')).join(''),
    11: () => `<ellipse cx="25" cy="58" rx="19" ry="16" fill="#2b2320"/>` + dot(14, 30, 3, '#e0a81c') + dot(25, 26, 3, '#e0a81c') + dot(36, 30, 3, '#e0a81c') + line('M25 74 V42', '#5a3a22', 3),
    12: () => line('M12 18 Q10 48 6 76', '#2b2320', 2) + line('M24 16 Q24 48 22 76', '#2b2320', 2) + line('M38 18 Q40 48 44 76', '#2b2320', 2) + [[14, 40], [30, 30], [34, 56], [16, 62]].map(([x, y]) => line(`M${x} ${y} l-3 9`, '#27508f', 1.6)).join(''),
  };

  const RIBBON = { 1: '#c8263a', 2: '#c8263a', 3: '#c8263a', 4: '#a8483a', 5: '#a8483a', 7: '#a8483a', 6: '#27508f', 9: '#27508f', 10: '#27508f', 12: '#7a1626' };

  function hwatuArt(month, kind) {
    let over = '';
    if (kind === 'G') {
      over = dot(38, 15, 8.5, '#c8263a') + `<text x="38" y="19" text-anchor="middle" font-size="10.5" font-weight="700" fill="#fff">光</text>`;
    } else if (kind === 'T') {
      over = `<rect x="18" y="12" width="14" height="42" rx="1" fill="${RIBBON[month]}" transform="rotate(8 25 33)"/>`;
    } else if (kind === 'Y') {
      over = `<rect x="4" y="66" width="42" height="12" rx="2" fill="#2b2320"/><text x="25" y="75.5" text-anchor="middle" font-size="9" font-weight="700" fill="#f4d35e">${ANIMAL[month]}</text>`;
    } else if (kind === 'R') {
      over = `<rect x="4" y="66" width="42" height="12" rx="2" fill="#c8263a"/><text x="25" y="75.5" text-anchor="middle" font-size="9" font-weight="700" fill="#fff">쌍피</text>`;
    }
    return `<svg class="hw-art" viewBox="0 0 50 80" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${MONTH_ART[month]()}${over}</svg>`;
  }

  const parse = (id) => {
    const h = /^H(\d+)([GYTPQR])$/.exec(id);
    if (h) return { hwatu: true, month: Number(h[1]), kind: h[2] };
    const m = /^(10|[2-9AJQK])([SHDC])/.exec(id);
    return m ? { rank: m[1], suit: m[2], red: m[2] === 'H' || m[2] === 'D' } : null;
  };

  const cardName = (id) => {
    const c = parse(id);
    if (!c) return '';
    if (c.hwatu) return `${c.month}월 ${MONTH_NAME[c.month]} ${KIND_NAME[c.kind]}`;
    return `${SUIT_NAME[c.suit]} ${c.rank}`;
  };

  function faceHTML(id) {
    const c = parse(id);
    if (!c) return '';
    if (c.hwatu) return `${hwatuArt(c.month, c.kind)}<span class="hw-n">${c.month}</span>`;
    const court = 'JQK'.includes(c.rank);
    return `<span class="corner"><b>${c.rank}</b>${pipSvg(c.suit)}</span>
      <span class="center ${court ? 'court' : ''}">${court ? `<b>${c.rank}</b>` : pipSvg(c.suit)}</span>
      <span class="big"><b>${c.rank}</b>${pipSvg(c.suit)}</span>`;
  }

  // 체험 화면·목록에서 쓰는 움직이지 않는 작은 카드
  function miniCard(id, cls = '') {
    const c = parse(id);
    if (c && c.hwatu) return `<span class="mini hw ${cls}" aria-label="${cardName(id)}">${hwatuArt(c.month, c.kind)}<span class="hw-n">${c.month}</span></span>`;
    return `<span class="mini ${c && c.red ? 'red' : ''} ${cls}" aria-label="${cardName(id)}"><b>${c ? c.rank : ''}</b>${c ? pipSvg(c.suit) : ''}</span>`;
  }

  class Stage {
    constructor(el) {
      this.el = el;
      this.cards = new Map();
      this.labels = [];
      this.frame = null;
      this.labelLayer = document.createElement('div');
      this.labelLayer.className = 'labels';
      el.appendChild(this.labelLayer);
      if (globalThis.ResizeObserver) {
        this.ro = new ResizeObserver(() => this.frame && this.render(this.frame, true));
        this.ro.observe(el);
      }
    }

    destroy() {
      if (this.ro) this.ro.disconnect();
    }

    make(item) {
      const n = document.createElement('div');
      const c = parse(item.id);
      n.className = `pc ${c && c.red ? 'red' : ''}`;
      n.dataset.id = item.id;
      n.innerHTML = `<div class="pc-in"><div class="pc-side pc-front">${faceHTML(item.id)}<i class="eye" aria-hidden="true"></i></div><div class="pc-side pc-back"></div></div>`;
      this.el.insertBefore(n, this.labelLayer);
      return n;
    }

    render(frame, instant = false) {
      this.frame = frame;
      const W = this.el.clientWidth;
      const H = this.el.clientHeight;
      if (!W || !H) return;
      const cw = W * 0.155;
      this.el.style.setProperty('--cw', cw + 'px');
      const seen = new Set();

      frame.cards.forEach((item, i) => {
        seen.add(item.id);
        let n = this.cards.get(item.id);
        const isNew = !n;
        if (isNew) {
          n = this.make(item);
          this.cards.set(item.id, n);
        }
        n.classList.remove('gone');
        const s = item.s || 1;
        const px = (item.x / 100) * W - cw / 2;
        const py = (item.y / 100) * H - (cw * 1.4) / 2;
        const tf = `translate3d(${px.toFixed(1)}px,${py.toFixed(1)}px,0) rotate(${item.r || 0}deg) scale(${s})`;
        n.style.zIndex = 10 + i;
        n.classList.toggle('up', !!(item.up || item.xr));
        n.classList.toggle('xr', !!item.xr);
        n.classList.toggle('hl', !!item.hl);
        n.classList.toggle('sm', s < 0.7);
        n.classList.toggle('blue', !!item.blue);
        n.classList.toggle('hw', !!item.hw);
        if (isNew || instant) {
          n.classList.add('still');
          n.style.transform = tf;
          if (isNew) n.style.opacity = 0;
          void n.offsetWidth;
          n.classList.remove('still');
          n.style.opacity = 1;
        } else {
          n.style.transform = tf;
          n.style.opacity = 1;
        }
      });

      this.cards.forEach((n, id) => {
        if (!seen.has(id)) {
          n.classList.add('gone');
          n.classList.remove('hl');
        }
      });

      this.labelLayer.innerHTML = frame.labels.map((l) => {
        const el = document.createElement('span');
        el.textContent = l.t;
        return `<span class="lb ${l.tone === 'secret' ? 'secret' : ''}" style="left:${l.x}%;top:${l.y}%">${el.innerHTML}</span>`;
      }).join('');
    }
  }

  // 프레임을 순서대로 재생한다.
  class Player {
    constructor(stage, onFrame) {
      this.stage = stage;
      this.onFrame = onFrame || (() => {});
      this.frames = [];
      this.i = 0;
      this.timer = 0;
      this.playing = false;
      this.loop = false;
    }

    load(frames, { autoplay = true, loop = false } = {}) {
      this.stop();
      this.frames = frames;
      this.loop = loop;
      this.i = 0;
      this.show(0);
      if (autoplay) this.play();
    }

    show(i) {
      this.i = i;
      const f = this.frames[i];
      this.stage.render(f);
      this.onFrame(f, i, this.frames.length, this.playing);
    }

    dwell(f) {
      return f.ms || Math.max(1700, (f.say || '').length * 62);
    }

    tick() {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        if (!this.playing) return;
        if (this.i + 1 < this.frames.length) {
          this.show(this.i + 1);
          this.tick();
        } else if (this.loop) {
          this.show(0);
          this.tick();
        } else {
          this.playing = false;
          this.onFrame(this.frames[this.i], this.i, this.frames.length, false);
        }
      }, this.dwell(this.frames[this.i]));
    }

    play() {
      if (this.i + 1 >= this.frames.length && !this.loop) this.show(0);
      this.playing = true;
      this.onFrame(this.frames[this.i], this.i, this.frames.length, true);
      this.tick();
    }

    pause() {
      this.playing = false;
      clearTimeout(this.timer);
      this.onFrame(this.frames[this.i], this.i, this.frames.length, false);
    }

    toggle() {
      if (this.playing) this.pause();
      else this.play();
    }

    restart() {
      this.stop();
      this.show(0);
      this.play();
    }

    stop() {
      this.playing = false;
      clearTimeout(this.timer);
    }
  }

  globalThis.CardUI = { Stage, Player, miniCard, cardName, pipSvg, parse };
})();
