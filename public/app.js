'use strict';
(() => {
  const $ = (id) => document.getElementById(id);
  const WINDS = ['東', '南', '西', '北'];
  const NUMS = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const INK = '#1f3a2e', RED = '#d63a2f', BLUE = '#2b4c9b', GREEN = '#1f7a3d', ROSE = '#e0708a';

  /* ---------- hand-drawn tile faces (SVG symbols) ---------- */
  const PIN = {
    1: [[20, 27]],
    2: [[20, 14], [20, 40]],
    3: [[10, 11], [20, 27], [30, 43]],
    4: [[11, 16], [29, 16], [11, 38], [29, 38]],
    5: [[11, 14], [29, 14], [20, 27], [11, 40], [29, 40]],
    6: [[11, 10], [29, 10], [11, 27], [29, 27], [11, 44], [29, 44]],
    7: [[9, 8], [20, 13], [31, 18], [11, 34], [29, 34], [11, 46], [29, 46]],
    8: [[11, 8], [29, 8], [11, 20], [29, 20], [11, 32], [29, 32], [11, 44], [29, 44]],
    9: [[9, 10], [20, 10], [31, 10], [9, 27], [20, 27], [31, 27], [9, 44], [20, 44], [31, 44]],
  };
  const SOU = {
    2: [[20, 14], [20, 40]],
    3: [[20, 13], [11, 40], [29, 40]],
    4: [[11, 14], [29, 14], [11, 40], [29, 40]],
    5: [[11, 14], [29, 14], [20, 27], [11, 40], [29, 40]],
    6: [[10, 14], [20, 14], [30, 14], [10, 40], [20, 40], [30, 40]],
    7: [[20, 9], [10, 27], [20, 27], [30, 27], [10, 44], [20, 44], [30, 44]],
    8: [[8, 14], [16, 14], [24, 14], [32, 14], [8, 40], [16, 40], [24, 40], [32, 40]],
    9: [[10, 9], [20, 9], [30, 9], [10, 27], [20, 27], [30, 27], [10, 45], [20, 45], [30, 45]],
  };

  function pinDot(x, y, n, i, r) {
    const c = [BLUE, RED, GREEN][(n === 1 ? 1 : n === 5 && i === 2 ? 1 : i % 3 === 1 && n > 5 ? 2 : 0)];
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${c}" stroke-width="2"/>` +
      `<circle cx="${x}" cy="${y}" r="${r * 0.55}" fill="${n === 1 ? ROSE : c}" stroke="${INK}" stroke-width=".8"/>`;
  }
  function stick(x, y, c, h) {
    return `<rect x="${x - 2.6}" y="${y - h / 2}" width="5.2" height="${h}" rx="2.4" fill="${c}" stroke="${INK}" stroke-width="1.2"/>` +
      `<path d="M${x - 2.6} ${y}h5.2" stroke="${INK}" stroke-width="1"/>`;
  }
  function faceSVG(t) {
    if (t < 9) {
      return `<text x="20" y="25" text-anchor="middle" font-size="25" font-family="Ma Shan Zheng,serif" fill="${BLUE}" stroke="${BLUE}" stroke-width=".6">${NUMS[t]}</text>` +
        `<text x="20" y="49" text-anchor="middle" font-size="25" font-family="Ma Shan Zheng,serif" fill="${RED}" stroke="${RED}" stroke-width=".6">萬</text>`;
    }
    if (t < 18) {
      const n = t - 8, r = n === 1 ? 12 : n >= 8 ? 5.2 : n >= 5 ? 6 : 7;
      return PIN[n].map(([x, y], i) => pinDot(x, y, n, i, r)).join('');
    }
    if (t < 27) {
      const n = t - 17;
      if (n === 1) {
        return `<path d="M6 46c6-4 16-6 28-4" stroke="#8a5a3a" stroke-width="2.4" fill="none" stroke-linecap="round"/>` +
          `<path d="M10 34c-3 4-6 8-7 12M12 34c-2 5-3 9-3 13" stroke="${RED}" stroke-width="2" fill="none" stroke-linecap="round"/>` +
          `<ellipse cx="20" cy="31" rx="11" ry="7" fill="${GREEN}" stroke="${INK}" stroke-width="1.6"/>` +
          `<path d="M13 30c4 5 11 5 15 0" stroke="${BLUE}" stroke-width="2" fill="none"/>` +
          `<circle cx="29" cy="21" r="5" fill="${BLUE}" stroke="${INK}" stroke-width="1.6"/>` +
          `<path d="M33 20l6 2-6 3z" fill="${RED}" stroke="${INK}" stroke-width="1.2"/>` +
          `<circle cx="30" cy="20" r="1.1" fill="#fff"/><path d="M18 38l-2 6M23 38l1 6" stroke="${INK}" stroke-width="1.6"/>`;
      }
      const h = n >= 8 ? 20 : n >= 6 ? 20 : 22;
      return SOU[n].map(([x, y], i) => stick(x, y, (n === 7 && i === 0) || (n === 5 && i === 2) ? RED : i % 4 === 3 && n > 4 ? BLUE : GREEN, h)).join('');
    }
    if (t < 31) {
      return `<text x="20" y="38" text-anchor="middle" font-size="34" font-family="Ma Shan Zheng,serif" fill="${BLUE}" stroke="${BLUE}" stroke-width=".8">${WINDS[t - 27]}</text>`;
    }
    if (t === 31) return `<text x="20" y="39" text-anchor="middle" font-size="38" font-family="Ma Shan Zheng,serif" fill="${RED}" stroke="${RED}" stroke-width="1">中</text>`;
    if (t === 32) return `<text x="20" y="39" text-anchor="middle" font-size="36" font-family="Ma Shan Zheng,serif" fill="${GREEN}" stroke="${GREEN}" stroke-width=".8">發</text>`;
    return `<path d="M9 9q11-2 22 0q2 18 0 36q-11 2-22 0q-2-18 0-36z" fill="none" stroke="${BLUE}" stroke-width="2.4" stroke-linejoin="round"/>` +
      `<path d="M13 14q7-1 14 0M13 40q7 1 14 0" stroke="${BLUE}" stroke-width="1.2" fill="none"/>`;
  }
  (function buildDefs() {
    let s = '';
    for (let t = 0; t < 34; t++) s += `<symbol id="t${t}" viewBox="0 0 40 54">${faceSVG(t)}</symbol>`;
    $('tileDefs').innerHTML = s;
  })();

  const tileHTML = (t, cls = '', attrs = '') =>
    `<div class="tile ${cls}" ${attrs}><svg viewBox="0 0 40 54"><use href="#t${t}"/></svg></div>`;
  const backHTML = (cls = 'xs') => `<div class="tile back ${cls}"></div>`;

  /* ---------- comic burst backgrounds ---------- */
  function burstURI(color) {
    const n = 15, cx = 100, cy = 70;
    let seed = 7, pts = [];
    const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < n * 2; i++) {
      const a = (Math.PI * 2 * i) / (n * 2) - Math.PI / 2;
      const rx = i % 2 ? 66 + rnd() * 6 : 96 + rnd() * 3, ry = i % 2 ? 46 + rnd() * 4 : 66 + rnd() * 3;
      pts.push((cx + Math.cos(a) * rx).toFixed(1) + ',' + (cy + Math.sin(a) * ry).toFixed(1));
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 140"><polygon points="${pts.join(' ')}" fill="#fffaf0" stroke="${color}" stroke-width="5" stroke-linejoin="round"/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }
  const BURST = { pong: burstURI(RED), chow: burstURI(BLUE), kong: burstURI(GREEN), win: burstURI('#c2185b'), pass: burstURI('#777') };
  const BURST_FLASH = { Pong: ['pong', 'PONG!'], Chi: ['chow', 'CHOW!'], Kong: ['kong', 'KONG!'], 'Win!': ['win', 'MAHJONG!'] };

  /* ---------- networking ---------- */
  let ws = null, view = null, lobby = null, myToken = null, retry = 0, lastEvent = -1;
  let sel = null, deadline = 0, totalMs = 1;
  const store = {
    get() { try { return JSON.parse(localStorage.getItem('mj_session')); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem('mj_session', JSON.stringify(v)); } catch (e) { /* ignore */ } },
    clear() { try { localStorage.removeItem('mj_session'); } catch (e) { /* ignore */ } },
  };
  const send = (o) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };

  function connect() {
    ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
    ws.onopen = () => {
      retry = 0;
      const s = store.get();
      if (s && s.room && s.token) send({ t: 'join', room: s.room, token: s.token, name: s.name });
    };
    ws.onmessage = (e) => onMsg(JSON.parse(e.data));
    ws.onclose = () => {
      setTimeout(connect, Math.min(5000, 500 * ++retry));
    };
  }

  function onMsg(m) {
    if (m.t === 'joined') {
      const s = store.get() || {};
      store.set({ room: m.code, token: m.token, name: s.name || $('name').value.trim() });
    } else if (m.t === 'lobby') { lobby = m; view = null; render(); }
    else if (m.t === 'game') { view = m; lobby = null; render(); }
    else if (m.t === 'error') {
      if (/not found/i.test(m.msg)) store.clear();
      if (!lobby && !view) { $('homeErr').textContent = m.msg; show('home'); } else toast(m.msg);
    } else if (m.t === 'kicked') { store.clear(); lobby = view = null; show('home'); toast('You were removed from the table'); }
  }


  /* ---------- sound effects (synthesised, no audio files) ---------- */
  const Sfx = (() => {
    let ctx = null, master = null, on = true;
    try { on = localStorage.getItem('mj_sound') !== 'off'; } catch (e) { /* ignore */ }
    function init() {
      if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination);
      return ctx;
    }
    const out = (pan) => {
      if (!pan || !ctx.createStereoPanner) return master;
      const p = ctx.createStereoPanner(); p.pan.value = pan; p.connect(master); return p;
    };
    function tone(freq, dur, { type = 'sine', vol = 0.3, at = 0, pan = 0, slide = 0, attack = 0.005 } = {}) {
      const t0 = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t0);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(out(pan)); o.start(t0); o.stop(t0 + dur + 0.05);
    }
    function noise(dur, { vol = 0.3, at = 0, pan = 0, freq = 2500, q = 1 } = {}) {
      const t0 = ctx.currentTime + at, len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol;
      src.connect(f); f.connect(g); g.connect(out(pan)); src.start(t0);
    }
    const bell = (f, at, vol = 0.22, pan = 0) => { tone(f, 0.9, { type: 'triangle', vol, at, pan }); tone(f * 2.01, 0.5, { type: 'sine', vol: vol * 0.4, at, pan }); };
    const sounds = {
      // tile slapped on the table
      discard(pan) { noise(0.07, { vol: 0.55, pan, freq: 1800, q: 0.8 }); tone(170, 0.09, { vol: 0.5, pan, slide: -70 }); },
      draw(pan) { noise(0.04, { vol: 0.18, pan, freq: 3500, q: 2 }); },
      select() { tone(900, 0.04, { type: 'square', vol: 0.05 }); },
      turn() { bell(784, 0, 0.18); bell(1175, 0.12, 0.16); },
      alert() { tone(660, 0.1, { type: 'triangle', vol: 0.18 }); tone(880, 0.12, { type: 'triangle', vol: 0.18, at: 0.09 }); },
      shuffle() { for (let i = 0; i < 9; i++) noise(0.05, { vol: 0.22, at: i * 0.06, freq: 1200 + Math.random() * 2500, q: 0.7, pan: (Math.random() - 0.5) * 0.8 }); },
      pong(pan) { sounds.discard(pan); setTimeout(() => sounds.discard(pan), 110); tone(330, 0.25, { type: 'sawtooth', vol: 0.12, at: 0.05, pan }); },
      chow(pan) { tone(520, 0.14, { type: 'triangle', vol: 0.25, pan }); tone(780, 0.22, { type: 'triangle', vol: 0.25, at: 0.11, pan }); noise(0.05, { vol: 0.3, pan, freq: 2200 }); },
      kong(pan) { [0, 0.11, 0.22].forEach((a, i) => { noise(0.07, { vol: 0.5, at: a, pan, freq: 1400 }); tone(140 - i * 15, 0.16, { vol: 0.55, at: a, pan }); }); tone(220, 0.5, { type: 'sawtooth', vol: 0.1, at: 0.3, pan }); },
      win() { [523, 659, 784, 1047, 1319].forEach((f, i) => bell(f, i * 0.11, 0.24)); noise(0.6, { vol: 0.12, at: 0.45, freq: 6000, q: 0.5 }); },
      lose() { [440, 392, 330].forEach((f, i) => tone(f, 0.35, { type: 'triangle', vol: 0.2, at: i * 0.2 })); },
      draw_game() { [392, 392, 330].forEach((f, i) => tone(f, 0.3, { type: 'sine', vol: 0.2, at: i * 0.22 })); },
      tick() { tone(1400, 0.03, { type: 'square', vol: 0.05 }); },
    };
    return {
      get on() { return on; },
      toggle() { on = !on; try { localStorage.setItem('mj_sound', on ? 'on' : 'off'); } catch (e) { /* ignore */ } if (on) { init(); sounds.select(); } return on; },
      unlock: init,
      play(name, pan) { if (!on || !init()) return; try { sounds[name](pan); } catch (e) { /* ignore */ } },
    };
  })();
  ['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, () => Sfx.unlock(), { once: true }));
  const panFor = (v, seat) => [0, 0.55, 0, -0.55][(seat - v.you + 4) % 4];

  let prev = null;
  function soundDiff(p, v) {
    if (!p || p.handNo !== v.handNo) { if (!p || v.handNo !== (p && p.handNo)) Sfx.play('shuffle'); }
    else {
      const total = (x) => x.discards.reduce((a, d) => a + d.length, 0);
      if (v.last && total(v) > total(p) && v.last.from !== undefined) Sfx.play('discard', panFor(v, v.last.from));
      if (v.event && (!p.event || v.event.n !== p.event.n)) {
        const k = { Pong: 'pong', Chi: 'chow', Kong: 'kong', 'Win!': null }[v.event.text];
        if (k) Sfx.play(k, panFor(v, v.event.seat));
      }
      const myTurn = (x) => x.phase === 'turn' && x.turn === x.you && x.drawn !== null;
      if (myTurn(v) && !myTurn(p)) Sfx.play('turn');
      else if (!myTurn(v) && v.hand.length + v.melds[v.you].length * 3 > p.hand.length + p.melds[v.you].length * 3 && v.phase === 'turn') Sfx.play('draw');
      if (v.options && v.options.claim && !(p.options && p.options.claim)) Sfx.play('alert');
    }
    if (v.phase === 'result' && (!p || p.phase !== 'result')) {
      const r = v.result;
      if (r.type === 'win') Sfx.play(r.winner === v.you ? 'win' : 'lose'); else Sfx.play('draw_game');
    }
  }

  /* ---------- screens ---------- */
  function show(name) {
    for (const id of ['home', 'lobby', 'game']) $(id).hidden = id !== name;
  }
  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 2600);
  }
  function render() {
    if (lobby) { show('lobby'); $('modal').hidden = true; renderLobby(); }
    else if (view) { show('game'); renderGame(); }
    else show('home');
  }

  function renderLobby() {
    const l = lobby, isHost = l.host === l.you;
    $('roomCode').textContent = l.code;
    $('seats').innerHTML = l.seats.map((s, i) => `
      <div class="seatcard ${s.empty ? 'empty' : ''}"><div>
        <span class="wind">${WINDS[i]}</span>
        <div class="nm">${s.empty ? 'Open seat' : esc(s.name)}</div>
        <div class="tag">${s.empty ? '—' : s.bot ? 'bot' : i === l.host ? 'host' : i === l.you ? 'you' : 'player'}${i === l.you && i === l.host ? ' (you)' : ''}</div>
      </div>${isHost && !s.empty && i !== l.you ? `<button class="x" data-kick="${i}" title="Remove">×</button>` : ''}</div>`).join('');
    $('hostRow').hidden = !isHost;
    $('waitHost').hidden = isHost;
    $('btnBot').disabled = l.seats.every(s => !s.empty);
  }

  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- game rendering ---------- */
  function zoneHTML(v, rel) {
    const s = (v.you + rel) % 4, wind = (s - v.dealer + 4) % 4;
    const mine = rel === 0;
    const melds = v.melds[s].map(m =>
      `<div class="meld">${m.tiles.map((t, i) => (m.type === 'ankan' && (i === 0 || i === 3)) ? backHTML(mine ? 'sm' : 'xs') : tileHTML(t, mine ? 'sm' : 'xs')).join('')}</div>`).join('');
    const backs = mine ? '' : `<div class="backs">${Array.from({ length: v.counts[s] }, () => backHTML('xs')).join('')}</div>`;
    const pool = v.discards[s].map((t, i, a) => {
      const latest = v.last && v.last.from === s && i === a.length - 1 && (v.phase === 'claim' || v.phase === 'turn') ? ' latest' : '';
      return tileHTML(t, 'sm' + latest);
    }).join('');
    const tag = v.bots[s] ? ' 🤖' : '';
    return `<div class="zhead">
        <span class="badge ${s === v.dealer ? 'dealer' : ''}" title="${s === v.dealer ? 'Dealer' : ''}">${WINDS[wind]}</span>
        <span class="nm">${esc(v.names[s])}${tag}</span>${v.away[s] ? '<span class="away">away</span>' : ''}
        <span class="cnt">${v.counts[s]} tiles</span><span class="sc">${v.scores[s]}</span></div>
      ${backs}${melds ? `<div class="melds">${melds}</div>` : ''}<div class="pool">${pool}</div>`;
  }

  function renderGame() {
    const v = view;
    try { soundDiff(prev, v); } catch (e) { /* ignore */ }
    prev = v;
    $('stHand').textContent = `Hand ${v.handNo} · Round ${Math.min(v.rotations + 1, v.totalHands)}/${v.totalHands}`;
    $('stWall').textContent = `· ${v.wall} tiles left`;
    for (let rel = 0; rel < 4; rel++) {
      const el = $('z' + rel), s = (v.you + rel) % 4;
      el.innerHTML = zoneHTML(v, rel);
      el.classList.toggle('turn', v.phase === 'turn' && v.turn === s);
      el.classList.toggle('pend', v.phase === 'claim' && v.pending.includes(s));
    }
    $('compass').innerHTML = `<b>${v.wall}</b><i>tiles left</i>` +
      [0, 1, 2, 3].map(rel => {
        const s = (v.you + rel) % 4;
        return `<span class="w w${rel} ${v.turn === s && (v.phase === 'turn' || v.phase === 'claim') ? 'on' : ''}">${WINDS[(s - v.dealer + 4) % 4]}</span>`;
      }).join('');

    // hand
    const myTurn = v.phase === 'turn' && v.turn === v.you;
    const rest = v.hand.slice();
    if (v.drawn !== null) rest.splice(rest.indexOf(v.drawn), 1);
    if (sel !== null && !v.hand.includes(sel)) sel = null;
    let selUsed = false;
    const tileBtn = (t, extra) => {
      const isSel = !selUsed && t === sel;
      if (isSel) selUsed = true;
      return tileHTML(t, (isSel ? 'sel ' : '') + extra, `data-t="${t}"`);
    };
    $('hand').innerHTML = rest.map(t => tileBtn(t, '')).join('') + (v.drawn !== null ? tileBtn(v.drawn, 'drawn') : '');
    $('hand').classList.toggle('locked', !myTurn);

    // hint
    let hint = '';
    if (v.phase === 'turn') hint = myTurn ? 'Your turn! Tap a tile to pick it, tap it again to throw it away' : `Waiting for ${v.names[v.turn]}…`;
    else if (v.phase === 'claim') hint = v.options && v.options.claim ? 'A tile was thrown. Want it? Choose a button above, or Pass' : 'Others are deciding…';
    $('hint').textContent = hint;

    renderActions(v);
    if (v.event && v.event.n !== lastEvent) {
      if (lastEvent !== -1) flash(v.event);
      lastEvent = v.event.n;
    } else if (!v.event) lastEvent = -1;
    if (v.event && lastEvent === -1) lastEvent = v.event.n;

    // timers
    deadline = Date.now() + v.msLeft;
    totalMs = Math.max(v.msLeft, 1);
    renderModal(v);
  }

  function mini(ts) { return `<span class="mini">${ts.map(t => tileHTML(t, 'xs')).join('')}</span>`; }
  function burstBtn(kind, label, data, extra = '') {
    return `<button class="burst ${kind}" style="background-image:${BURST[kind]}" data-act='${JSON.stringify(data)}'>${label}${extra}</button>`;
  }
  function renderActions(v) {
    let h = '';
    const o = v.options;
    if (o && o.turn) {
      if (o.turn.tsumo) h += burstBtn('win', 'WIN!', { action: 'tsumo' });
      for (const t of o.turn.ankan) h += burstBtn('kong', 'KONG', { action: 'ankan', tile: t }, mini([t]));
      for (const t of o.turn.addkan) h += burstBtn('kong', 'KONG', { action: 'addkan', tile: t }, mini([t]));
    } else if (o && o.claim) {
      const c = o.claim, t = v.last.tile;
      if (c.win) h += burstBtn('win', 'WIN!', { action: 'ron' });
      if (c.kong) h += burstBtn('kong', 'KONG', { action: 'kong' });
      if (c.pong) h += burstBtn('pong', 'PONG', { action: 'pong' });
      for (const p of c.chi) h += burstBtn('chow', 'CHOW', { action: 'chi', tiles: p }, mini([...p, t].sort((a, b) => a - b)));
      h += burstBtn('pass', 'Pass', { action: 'pass' });
    }
    $('actions').innerHTML = h;
  }

  function flash(ev) {
    const [kind, text] = BURST_FLASH[ev.text] || ['pong', ev.text];
    const el = $('flash');
    el.style.backgroundImage = BURST[kind];
    el.style.color = { pong: RED, chow: BLUE, kong: GREEN, win: '#c2185b' }[kind];
    el.innerHTML = `<div>${text}<small>${esc(view.names[ev.seat])}</small></div>`;
    el.hidden = false;
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    clearTimeout(flash.t); flash.t = setTimeout(() => { el.hidden = true; }, 1350);
  }

  function revealRow(v, r, s) {
    const hand = r.type === 'win' && r.winner === s ? r.wintiles : r.hands[s];
    const melds = r.melds[s].map(m => `<div class="meld">${m.tiles.map(t => tileHTML(t, 'xs')).join('')}</div>`).join('');
    return `<div class="rev ${r.type === 'win' && r.winner === s ? 'w' : ''}"><span class="nm">${esc(v.names[s])}</span>
      <div class="tiles">${hand.map(t => tileHTML(t, 'xs')).join('')}${melds ? '<span style="width:8px"></span>' : ''}${melds}</div></div>`;
  }

  function renderModal(v) {
    const modal = $('modal');
    if (!v.result) { modal.hidden = true; return; }
    const r = v.result, isHost = v.host === v.you;
    let h = '';
    if (v.phase === 'over') {
      const order = [0, 1, 2, 3].sort((a, b) => v.scores[b] - v.scores[a]);
      h += `<h2>Game over!</h2><p class="sub" style="text-align:center">Final standings</p>` +
        order.map((s, i) => `<div class="rank"><span class="n">${i + 1}</span><span>${esc(v.names[s])}${s === v.you ? ' (you)' : ''}</span><span class="s">${v.scores[s]}</span></div>`).join('');
      h += isHost ? `<div class="row"><button class="btn jade" id="btnAgain">Back to table</button></div>` : `<p class="sub" style="text-align:center">Waiting for the host…</p>`;
    } else {
      h += r.type === 'win'
        ? `<h2>${esc(v.names[r.winner])} wins!</h2><p class="sub" style="text-align:center">${r.from === null ? 'Self-drawn' : 'Off ' + esc(v.names[r.from]) + '’s discard'}${r.kind === 'sevenPairs' ? ' · Seven pairs' : r.kind === 'orphans' ? ' · Thirteen orphans' : ''}</p>
           <div class="fans">${r.fans.length ? r.fans.map(f => `<span>${f.name} +${f.fan}</span>`).join('') : '<span>Chicken hand</span>'}</div>
           <p style="text-align:center;margin:0">${r.total} fan</p>`
        : `<h2>Draw!</h2><p class="sub" style="text-align:center">The wall ran out. Dealer stays.</p>`;
      h += `<div class="deltas">${[0, 1, 2, 3].map(s => `<div>${esc(v.names[s])}<b class="${r.deltas[s] > 0 ? 'pos' : r.deltas[s] < 0 ? 'neg' : ''}">${r.deltas[s] > 0 ? '+' : ''}${r.deltas[s]}</b>${v.scores[s]}</div>`).join('')}</div>`;
      h += [0, 1, 2, 3].map(s => revealRow(v, r, s)).join('');
      const ready = v.ready.includes(v.you);
      h += `<div class="row"><button class="btn jade" id="btnReady" ${ready ? 'disabled' : ''}>${r.final ? 'See results' : 'Next hand'}</button></div>
            <p class="sub" style="text-align:center" id="nextIn"></p>`;
    }
    modal.hidden = false;
    $('modalBody').innerHTML = h;
  }

  /* ---------- timers ---------- */
  setInterval(() => {
    if (!view) return;
    const left = Math.max(0, deadline - Date.now());
    const bar = $('timerBar');
    bar.style.transform = `scaleX(${view.phase === 'over' ? 0 : Math.min(1, left / Math.max(totalMs, 1))})`;
    $('timerBar').parentNode.classList.toggle('urgent', left < 6000 && view.phase !== 'over');
    const n = $('nextIn');
    if (n) n.textContent = `Next hand in ${Math.ceil(left / 1000)}s`;
  }, 200);

  /* ---------- events ---------- */
  function startName() {
    const name = $('name').value.trim() || 'Player';
    try { localStorage.setItem('mj_name', name); } catch (e) { /* ignore */ }
    store.clear();
    store.set({ room: null, token: null, name });
    return name;
  }
  $('btnCreate').onclick = () => { $('homeErr').textContent = ''; send({ t: 'create', name: startName() }); };
  $('btnJoin').onclick = () => {
    const code = $('code').value.trim().toUpperCase();
    if (code.length !== 4) { $('homeErr').textContent = 'Enter the 4-letter table code'; return; }
    $('homeErr').textContent = '';
    send({ t: 'join', room: code, name: startName() });
  };
  const leave = () => { send({ t: 'leave' }); store.clear(); lobby = view = prev = null; lastEvent = -1; history.replaceState(null, '', location.pathname); show('home'); $('modal').hidden = true; };
  $('btnLeave').onclick = leave;
  $('btnLeave2').onclick = () => { if (confirm('Leave the game? A bot will take your seat.')) leave(); };
  const syncSound = () => { $('btnSound').textContent = 'Sound: ' + (Sfx.on ? 'on' : 'off'); };
  syncSound();
  $('btnSound').onclick = () => { Sfx.toggle(); syncSound(); };
  $('btnFull').onclick = () => {
    const el = document.documentElement;
    if (document.fullscreenElement) { document.exitFullscreen(); return; }
    (el.requestFullscreen ? el.requestFullscreen() : Promise.reject()).then(() => { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); }, () => toast('Full screen is not available here. Try “Add to Home Screen”.'));
  };
  $('rotateX').onclick = () => { $('rotate').style.display = 'none'; };
  $('btnBot').onclick = () => send({ t: 'addbot' });
  $('btnStart').onclick = () => send({ t: 'start' });
  $('btnCopy').onclick = () => {
    const url = location.origin + location.pathname + '?room=' + lobby.code;
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast('Invite link copied'), () => prompt('Copy this link:', url));
  };
  $('seats').onclick = (e) => { const k = e.target.dataset.kick; if (k !== undefined) send({ t: 'kick', seat: +k }); };
  $('hand').onclick = (e) => {
    const el = e.target.closest('.tile');
    if (!el || !view) return;
    const t = +el.dataset.t;
    const myTurn = view.phase === 'turn' && view.turn === view.you;
    if (myTurn && sel === t) { sel = null; send({ t: 'act', action: 'discard', tile: t }); }
    else { sel = t; Sfx.play('select'); renderGame(); }
  };
  $('actions').onclick = (e) => {
    const b = e.target.closest('.burst');
    if (b) send({ t: 'act', ...JSON.parse(b.dataset.act) });
  };
  $('modalBody').onclick = (e) => {
    if (e.target.id === 'btnReady') { send({ t: 'act', action: 'ready' }); e.target.disabled = true; }
    if (e.target.id === 'btnAgain') send({ t: 'again' });
  };

  /* ---------- plain-language help ---------- */
  const T = (...ts) => `<span class="mini" style="display:inline-flex;gap:2px;vertical-align:middle;margin:0 4px">${ts.map(t => tileHTML(t, 'xs')).join('')}</span>`;
  function openHelp() {
    $('helpBody').innerHTML = `<h2>How to play</h2>
      <div class="helpstep"><b>1. The goal</b><p>Be the first to arrange your tiles into <b>4 groups of 3</b> and <b>1 pair</b>. That's a win.</p></div>
      <div class="helpstep"><b>2. What is a group?</b>
        <p><u>Run</u> — 3 numbers in a row, same suit: ${T(0, 1, 2)}</p>
        <p><u>Triplet</u> — 3 identical tiles: ${T(31, 31, 31)}</p>
        <p><u>Pair</u> — 2 identical tiles: ${T(27, 27)}</p></div>
      <div class="helpstep"><b>3. Your turn</b>
        <p>You get one new tile (it sits a little apart on the right). Then you must <b>throw one tile away</b>: tap a tile to lift it, tap again to throw it.</p></div>
      <div class="helpstep"><b>4. When someone else throws a tile</b>
        <p>Buttons pop up only if the tile helps you. You can ignore them (<b>Pass</b>).</p>
        <p><span style="color:${RED}"><b>PONG</b></span> — you have 2 of it, take it to make a triplet.<br>
        <span style="color:${BLUE}"><b>CHOW</b></span> — it completes a run with your tiles. Only from the player just before you.<br>
        <span style="color:${GREEN}"><b>KONG</b></span> — you have 3 of it, take it to make a group of 4 (you then draw a bonus tile).<br>
        <span style="color:#c2185b"><b>WIN!</b></span> — it completes your whole hand.</p></div>
      <div class="helpstep"><b>5. Tile types</b>
        <p>${T(0, 1, 2)} 萬 numbers &nbsp; ${T(9, 10, 11)} circles &nbsp; ${T(18, 19, 20)} sticks<br>
        ${T(27, 28, 29, 30)} winds &nbsp; ${T(31, 32, 33)} dragons (can only make triplets and pairs)</p></div>
      <div class="helpstep"><b>6. Tips</b><p>Throw away tiles that are alone and have no friends nearby. Pairs of dragons or winds are worth keeping. If the clock runs out, a bot plays for you.</p></div>
      <div class="row"><button class="btn jade" id="btnHelpClose">Got it</button></div>`;
    $('help').hidden = false;
  }
  $('btnHelp').onclick = $('btnHelp2').onclick = openHelp;
  $('help').onclick = (e) => { if (e.target.id === 'help' || e.target.id === 'btnHelpClose') $('help').hidden = true; };

  try { $('name').value = localStorage.getItem('mj_name') || ''; } catch (e) { /* ignore */ }
  const q = new URLSearchParams(location.search).get('room');
  if (q) $('code').value = q.toUpperCase().slice(0, 4);
  connect();
})();
