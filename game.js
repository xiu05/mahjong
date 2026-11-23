'use strict';
const Bot = require('./bot');
// Authoritative Mahjong game engine (simplified Chinese-style rules).
// Tiles: 0-8 characters(man), 9-17 circles(pin), 18-26 bamboo(sou),
// 27-30 winds E S W N, 31-33 dragons (red, green, white). 4 copies each = 136.

const TURN_MS = 40000;
const CLAIM_MS = 15000;
const NEXT_MS = 25000;
const DEAD_WALL = 14;
const HANDS_PER_GAME = 4; // dealer rotations before the game ends

function makeWall() {
  const w = [];
  for (let t = 0; t < 34; t++) for (let k = 0; k < 4; k++) w.push(t);
  for (let i = w.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [w[i], w[j]] = [w[j], w[i]];
  }
  return w;
}

function toCounts(tiles) {
  const c = new Array(34).fill(0);
  for (const t of tiles) c[t]++;
  return c;
}

function setsOk(c) {
  let i = 0;
  while (i < 34 && c[i] === 0) i++;
  if (i === 34) return true;
  if (c[i] >= 3) {
    c[i] -= 3;
    const r = setsOk(c);
    c[i] += 3;
    if (r) return true;
  }
  if (i < 27 && i % 9 <= 6 && c[i + 1] > 0 && c[i + 2] > 0) {
    c[i]--; c[i + 1]--; c[i + 2]--;
    const r = setsOk(c);
    c[i]++; c[i + 1]++; c[i + 2]++;
    if (r) return true;
  }
  return false;
}

const ORPHANS = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];

// Returns 'orphans' | 'sevenPairs' | 'standard' | null
function winType(c, nMelds) {
  let total = 0;
  for (let i = 0; i < 34; i++) total += c[i];
  if (total !== 14 - 3 * nMelds) return null;
  if (nMelds === 0) {
    if (ORPHANS.every(t => c[t] >= 1) && ORPHANS.some(t => c[t] === 2)) return 'orphans';
    let pairs = 0;
    for (let i = 0; i < 34; i++) if (c[i] === 2) pairs++;
    if (pairs === 7) return 'sevenPairs';
  }
  for (let i = 0; i < 34; i++) {
    if (c[i] >= 2) {
      c[i] -= 2;
      const ok = setsOk(c);
      c[i] += 2;
      if (ok) return 'standard';
    }
  }
  return null;
}

const isWin = (c, nMelds) => winType(c, nMelds) !== null;

function scoreHand(hand, melds, selfDraw, seatWind) {
  const c = toCounts(hand);
  const type = winType(c, melds.length);
  const fans = [];
  if (type === 'orphans') {
    fans.push({ name: 'Thirteen Orphans', fan: 8 });
  } else {
    if (type === 'sevenPairs') fans.push({ name: 'Seven Pairs', fan: 3 });
    const all = hand.concat(...melds.map(m => m.tiles));
    const suits = new Set(all.filter(t => t < 27).map(t => Math.floor(t / 9)));
    const honor = all.some(t => t >= 27);
    if (suits.size === 0) fans.push({ name: 'All Honors', fan: 6 });
    else if (suits.size === 1) fans.push(honor ? { name: 'Half Flush', fan: 3 } : { name: 'Full Flush', fan: 6 });
    if (type === 'standard') {
      let pairs = 0, ok = true;
      for (let i = 0; i < 34; i++) {
        if (c[i] === 2) pairs++;
        else if (c[i] !== 0 && c[i] !== 3) ok = false;
      }
      if (ok && pairs === 1 && melds.every(m => m.type !== 'chi')) fans.push({ name: 'All Triplets', fan: 3 });
    }
    const hasTriplet = t => c[t] >= 3 || melds.some(m => m.type !== 'chi' && m.tiles[0] === t);
    for (let t = 31; t <= 33; t++) if (hasTriplet(t)) fans.push({ name: 'Dragon Triplet', fan: 1 });
    if (hasTriplet(27 + seatWind)) fans.push({ name: 'Seat Wind', fan: 1 });
    if (melds.every(m => m.type === 'ankan')) fans.push({ name: 'Concealed Hand', fan: 1 });
  }
  if (selfDraw) fans.push({ name: 'Self Draw', fan: 1 });
  const total = fans.reduce((s, f) => s + f.fan, 0);
  return { type, fans, total };
}

function chiOptions(c, t) {
  if (t >= 27) return [];
  const p = t % 9, out = [];
  if (p >= 2 && c[t - 2] && c[t - 1]) out.push([t - 2, t - 1]);
  if (p >= 1 && p <= 7 && c[t - 1] && c[t + 1]) out.push([t - 1, t + 1]);
  if (p <= 6 && c[t + 1] && c[t + 2]) out.push([t + 1, t + 2]);
  return out;
}

class Game {
  // seats: live array of {name, bot, connected}; notify(): called after any state change
  constructor(seats, notify, opts = {}) {
    this.seats = seats;
    this.notify = notify;
    this.speed = opts.speed === undefined ? 1 : opts.speed;
    this.scores = [1000, 1000, 1000, 1000];
    this.dealer = 0;
    this.rotations = 0;
    this.handNo = 0;
    this.timers = [];
    this.eventN = 0;
    this.event = null;
    this.stopped = false;
    this.persona = [0, 1, 2, 3].map(() => Bot.makePersona());
  }

  start() { this.startHand(); return this; }

  ms(x) { return Math.round(x * this.speed); }
  isAuto(i) { const s = this.seats[i]; return s.bot || !s.connected; }
  anyHuman() { return this.seats.some(s => !s.bot && s.connected); }
  seatWind(i) { return (i - this.dealer + 4) % 4; }
  stop() { this.stopped = true; this.clearTimers(); }

  clearTimers() { for (const t of this.timers) clearTimeout(t); this.timers = []; }
  later(ms, fn) { this.timers.push(setTimeout(() => { if (!this.stopped) fn(); }, Math.max(0, ms))); }

  flash(seat, text) { this.event = { n: ++this.eventN, seat, text }; }

  // ---- hand lifecycle ----
  startHand() {
    this.handNo++;
    this.wall = makeWall();
    this.hands = [[], [], [], []];
    this.melds = [[], [], [], []];
    this.discards = [[], [], [], []];
    for (let r = 0; r < 13; r++) for (let s = 0; s < 4; s++) this.hands[s].push(this.wall.shift());
    this.hands.forEach(h => h.sort((a, b) => a - b));
    this.result = null;
    this.ready = new Set();
    this.last = null;
    this.drawn = null;
    this.claims = {};
    this.responses = {};
    this.over = false;
    this.draw(this.dealer, false);
  }

  draw(seat, fromBack) {
    if (this.wall.length <= DEAD_WALL) { this.endDraw(); return false; }
    const t = fromBack ? this.wall.pop() : this.wall.shift();
    this.hands[seat].push(t);
    this.hands[seat].sort((a, b) => a - b);
    this.drawn = t;
    this.phase = 'turn';
    this.turn = seat;
    this.deadline = Date.now() + TURN_MS;
    this.changed();
    return true;
  }

  turnOptions(seat) {
    const hand = this.hands[seat], c = toCounts(hand);
    const o = { tsumo: false, ankan: [], addkan: [] };
    if (this.drawn !== null && isWin(c, this.melds[seat].length)) o.tsumo = true;
    for (let t = 0; t < 34; t++) if (c[t] === 4) o.ankan.push(t);
    for (const m of this.melds[seat]) if (m.type === 'pong' && c[m.tiles[0]] >= 1) o.addkan.push(m.tiles[0]);
    return o;
  }

  claimOptions(seat, tile, from) {
    const c = toCounts(this.hands[seat]);
    const o = { win: false, pong: false, kong: false, chi: [] };
    c[tile]++;
    if (isWin(c, this.melds[seat].length)) o.win = true;
    c[tile]--;
    if (c[tile] >= 2) o.pong = true;
    if (c[tile] >= 3 && this.wall.length > DEAD_WALL) o.kong = true;
    if (seat === (from + 1) % 4) o.chi = chiOptions(c, tile);
    if (o.win || o.pong || o.kong || o.chi.length) return o;
    return null;
  }

  // ---- player actions; returns error string or null ----
  act(seat, m) {
    if (this.stopped) return 'Game stopped';
    if (this.phase === 'turn') return this.actTurn(seat, m);
    if (this.phase === 'claim') return this.actClaim(seat, m);
    if (this.phase === 'result' && m.action === 'ready') {
      this.ready.add(seat);
      const humans = this.seats.map((s, i) => i).filter(i => !this.isAuto(i));
      if (humans.every(i => this.ready.has(i))) this.advance();
      else this.changed(true);
      return null;
    }
    return 'Not allowed now';
  }

  actTurn(seat, m) {
    if (seat !== this.turn) return 'Not your turn';
    const hand = this.hands[seat];
    const opts = this.turnOptions(seat);
    switch (m.action) {
      case 'discard': {
        const idx = hand.indexOf(m.tile);
        if (idx < 0) return 'You do not have that tile';
        hand.splice(idx, 1);
        this.discards[seat].push(m.tile);
        this.last = { tile: m.tile, from: seat };
        this.drawn = null;
        this.beginClaims();
        return null;
      }
      case 'tsumo': {
        if (!opts.tsumo) return 'Cannot win';
        this.flash(seat, 'Win!');
        this.endWin(seat, null, null);
        return null;
      }
      case 'ankan': {
        if (!opts.ankan.includes(m.tile)) return 'Cannot kong';
        this.hands[seat] = hand.filter(t => t !== m.tile);
        this.melds[seat].push({ type: 'ankan', tiles: [m.tile, m.tile, m.tile, m.tile], from: seat });
        this.flash(seat, 'Kong');
        this.draw(seat, true);
        return null;
      }
      case 'addkan': {
        if (!opts.addkan.includes(m.tile)) return 'Cannot kong';
        hand.splice(hand.indexOf(m.tile), 1);
        const meld = this.melds[seat].find(x => x.type === 'pong' && x.tiles[0] === m.tile);
        meld.type = 'kong';
        meld.tiles.push(m.tile);
        this.flash(seat, 'Kong');
        this.draw(seat, true);
        return null;
      }
    }
    return 'Unknown action';
  }

  beginClaims() {
    const { tile, from } = this.last;
    this.claims = {};
    this.responses = {};
    for (let k = 1; k < 4; k++) {
      const s = (from + k) % 4;
      const o = this.claimOptions(s, tile, from);
      if (o) this.claims[s] = o;
    }
    if (Object.keys(this.claims).length === 0) {
      this.draw((from + 1) % 4, false);
      return;
    }
    this.phase = 'claim';
    this.turn = from;
    this.deadline = Date.now() + CLAIM_MS;
    this.changed();
  }

  dist(seat) { return (seat - this.last.from + 4) % 4; }

  prio(action, seat) {
    if (action === 'ron') return 300 - this.dist(seat);
    if (action === 'pong' || action === 'kong') return 200 - this.dist(seat);
    if (action === 'chi') return 100;
    return 0;
  }

  potential(seat) {
    const o = this.claims[seat];
    if (o.win) return this.prio('ron', seat);
    if (o.pong || o.kong) return this.prio('pong', seat);
    return 100;
  }

  actClaim(seat, m) {
    const o = this.claims[seat];
    if (!o) return 'No claim available';
    if (this.responses[seat]) return 'Already answered';
    const a = m.action;
    if (a === 'pass') this.responses[seat] = { action: 'pass' };
    else if (a === 'ron' && o.win) this.responses[seat] = { action: 'ron' };
    else if (a === 'pong' && o.pong) this.responses[seat] = { action: 'pong' };
    else if (a === 'kong' && o.kong) this.responses[seat] = { action: 'kong' };
    else if (a === 'chi') {
      const pair = (m.tiles || []).slice().sort((x, y) => x - y);
      const ok = o.chi.some(p => p[0] === pair[0] && p[1] === pair[1]);
      if (!ok) return 'Invalid chi';
      this.responses[seat] = { action: 'chi', tiles: pair };
    } else return 'Invalid claim';
    this.maybeResolve();
    return null;
  }

  maybeResolve() {
    const seats = Object.keys(this.claims).map(Number);
    const pending = seats.filter(s => !this.responses[s]);
    let best = null;
    for (const s of seats) {
      const r = this.responses[s];
      if (!r || r.action === 'pass') continue;
      const p = this.prio(r.action, s);
      if (!best || p > best.p) best = { seat: s, r, p };
    }
    if (pending.length && !(best && pending.every(s => best.p > this.potential(s)))) {
      this.changed(true);
      return;
    }
    this.resolveClaims(best);
  }

  resolveClaims(best) {
    const { tile, from } = this.last;
    this.claims = {};
    this.responses = {};
    if (!best) { this.draw((from + 1) % 4, false); return; }
    const { seat, r } = best;
    const hand = this.hands[seat];
    const removeN = (n) => { for (let i = 0; i < n; i++) hand.splice(hand.indexOf(tile), 1); };
    if (r.action === 'ron') {
      this.flash(seat, 'Win!');
      this.endWin(seat, from, tile);
      return;
    }
    this.discards[from].pop();
    if (r.action === 'pong') {
      removeN(2);
      this.melds[seat].push({ type: 'pong', tiles: [tile, tile, tile], from });
      this.flash(seat, 'Pong');
    } else if (r.action === 'kong') {
      removeN(3);
      this.melds[seat].push({ type: 'kong', tiles: [tile, tile, tile, tile], from });
      this.flash(seat, 'Kong');
      this.last = null;
      this.draw(seat, true);
      return;
    } else {
      for (const t of r.tiles) hand.splice(hand.indexOf(t), 1);
      this.melds[seat].push({ type: 'chi', tiles: [...r.tiles, tile].sort((a, b) => a - b), from, claimed: tile });
      this.flash(seat, 'Chi');
    }
    this.last = null;
    this.drawn = null;
    this.phase = 'turn';
    this.turn = seat;
    this.deadline = Date.now() + TURN_MS;
    this.changed();
  }

  // ---- hand end ----
  endWin(winner, from, tile) {
    const hand = this.hands[winner].slice();
    if (tile !== null) hand.push(tile);
    const sc = scoreHand(hand, this.melds[winner], from === null, this.seatWind(winner));
    const base = 10 * (1 + sc.total);
    const deltas = [0, 0, 0, 0];
    if (from === null) {
      for (let s = 0; s < 4; s++) if (s !== winner) { deltas[s] = -base; deltas[winner] += base; }
    } else {
      deltas[from] = -base * 2;
      deltas[winner] = base * 2;
    }
    this.finish({ type: 'win', winner, from, tile, kind: sc.type, fans: sc.fans, total: sc.total, deltas, wintiles: hand.sort((a, b) => a - b) });
    if (winner !== this.dealer) this.rotateDealer();
  }

  endDraw() {
    this.finish({ type: 'draw', deltas: [0, 0, 0, 0] });
  }

  rotateDealer() {
    this.dealer = (this.dealer + 1) % 4;
    this.rotations++;
    if (this.rotations >= HANDS_PER_GAME) this.over = true;
  }

  finish(result) {
    for (let i = 0; i < 4; i++) this.scores[i] += result.deltas[i];
    result.hands = this.hands.map(h => h.slice().sort((a, b) => a - b));
    result.melds = this.melds.map(m => m.map(x => ({ ...x, tiles: x.tiles.slice() })));
    result.final = this.over;
    this.result = result;
    this.phase = 'result';
    this.claims = {};
    this.responses = {};
    this.ready = new Set();
    this.deadline = Date.now() + NEXT_MS;
    this.changed();
  }

  advance() {
    if (this.over) { this.phase = 'over'; this.deadline = 0; this.changed(); }
    else this.startHand();
  }

  // ---- bots ----
  botTurn(seat) {
    if (this.phase !== 'turn' || this.turn !== seat) return;
    const o = this.turnOptions(seat);
    if (o.tsumo) { this.act(seat, { action: 'tsumo' }); return; }
    const k = Bot.chooseKongOnTurn(this, seat, o);
    if (k && !this.act(seat, k)) return;
    this.act(seat, { action: 'discard', tile: Bot.chooseDiscard(this, seat) });
  }

  botClaim(seat) {
    if (this.phase !== 'claim' || !this.claims[seat] || this.responses[seat]) return;
    const a = Bot.chooseClaim(this, seat);
    if (this.act(seat, a)) this.act(seat, { action: 'pass' });
  }

  // ---- timers / notification ----
  changed(keepTimers) {
    this.notify();
    this.setupTimers();
  }

  poke() { this.setupTimers(); }

  setupTimers() {
    this.clearTimers();
    if (this.stopped || !this.anyHuman()) return;
    const remaining = Math.max(0, this.deadline - Date.now());
        if (this.phase === 'turn') {
      const s = this.turn;
      if (this.isAuto(s)) this.later(this.ms(Bot.delay(this, s, 'discard')), () => this.botTurn(s));
      else this.later(remaining * this.speed, () => this.botTurn(s));
    } else if (this.phase === 'claim') {
      for (const s of Object.keys(this.claims).map(Number)) {
        if (this.responses[s]) continue;
        if (this.isAuto(s)) this.later(this.ms(Bot.delay(this, s, 'claim')), () => this.botClaim(s));
      }
      this.later(remaining * this.speed, () => {
        if (this.phase !== 'claim') return;
        for (const s of Object.keys(this.claims).map(Number)) {
          if (!this.responses[s]) this.responses[s] = { action: 'pass' };
        }
        this.maybeResolve();
      });
    } else if (this.phase === 'result') {
      this.later(remaining * this.speed, () => this.advance());
    }
  }

  // ---- per-seat view (hides other hands) ----
  view(seat) {
    let options = null;
    if (this.phase === 'turn' && this.turn === seat) options = { turn: this.turnOptions(seat) };
    else if (this.phase === 'claim' && this.claims[seat] && !this.responses[seat]) options = { claim: this.claims[seat] };
    return {
      phase: this.phase,
      you: seat,
      dealer: this.dealer,
      handNo: this.handNo,
      rotations: this.rotations,
      totalHands: HANDS_PER_GAME,
      scores: this.scores,
      names: this.seats.map(s => s.name),
      bots: this.seats.map(s => !!s.bot),
      away: this.seats.map(s => !s.bot && !s.connected),
      wall: Math.max(0, this.wall.length - DEAD_WALL),
      turn: this.turn,
      hand: this.hands[seat],
      drawn: this.phase === 'turn' && this.turn === seat ? this.drawn : null,
      counts: this.hands.map(h => h.length),
      melds: this.melds,
      discards: this.discards,
      last: this.last,
      options,
      pending: this.phase === 'claim' ? Object.keys(this.claims).map(Number).filter(s => !this.responses[s]) : [],
      msLeft: this.deadline ? Math.max(0, this.deadline - Date.now()) : 0,
      event: this.event,
      result: this.phase === 'result' || this.phase === 'over' ? this.result : null,
      ready: [...this.ready],
      over: this.phase === 'over',
    };
  }
}

module.exports = { Game, isWin, winType, scoreHand, toCounts, chiOptions, makeWall };
