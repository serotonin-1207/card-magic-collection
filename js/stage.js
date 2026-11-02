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

  const parse = (id) => {
    const m = /^(10|[2-9AJQK])([SHDC])/.exec(id);
    return m ? { rank: m[1], suit: m[2], red: m[2] === 'H' || m[2] === 'D' } : null;
  };

  const cardName = (id) => {
    const c = parse(id);
    return c ? `${SUIT_NAME[c.suit]} ${c.rank}` : '';
  };

  function faceHTML(id) {
    const c = parse(id);
    if (!c) return '';
    const court = 'JQK'.includes(c.rank);
    return `<span class="corner"><b>${c.rank}</b>${pipSvg(c.suit)}</span>
      <span class="center ${court ? 'court' : ''}">${court ? `<b>${c.rank}</b>` : pipSvg(c.suit)}</span>
      <span class="big"><b>${c.rank}</b>${pipSvg(c.suit)}</span>`;
  }

  // 체험 화면·목록에서 쓰는 움직이지 않는 작은 카드
  function miniCard(id, cls = '') {
    const c = parse(id);
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
