'use strict';
// Human-like bot brain: tile efficiency (shanten + useful-tile counting), reading the table
// (safe tiles, opponents with open melds), folding when behind, and per-seat personalities.

function toCounts(tiles) {
  const c = new Array(34).fill(0);
  for (const t of tiles) c[t]++;
  return c;
}

const ORPH = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];

// ---------- shanten (number of tiles away from tenpai; -1 = complete) ----------
function stdShanten(c, m) {
  let best = 8;
  function rec(i, sets, taat, pair) {
    while (i < 34 && c[i] === 0) i++;
    if (i >= 34) {
      const t = Math.min(taat, 4 - sets);
      const v = 8 - 2 * sets - Math.max(0, t) - (pair ? 1 : 0);
      if (v < best) best = v;
      return;
    }
    if (best <= -1) return;
    const suit = i < 27, p = i % 9;
    if (c[i] >= 3) { c[i] -= 3; rec(i, sets + 1, taat, pair); c[i] += 3; }
    if (c[i] >= 2) {
      c[i] -= 2;
      if (!pair) rec(i, sets, taat, true); else rec(i, sets, taat + 1, pair);
      c[i] += 2;
    }
    if (suit && p <= 6 && c[i + 1] && c[i + 2]) {
      c[i]--; c[i + 1]--; c[i + 2]--; rec(i, sets + 1, taat, pair); c[i]++; c[i + 1]++; c[i + 2]++;
    }
    if (suit && p <= 7 && c[i + 1]) { c[i]--; c[i + 1]--; rec(i, sets, taat + 1, pair); c[i]++; c[i + 1]++; }
    if (suit && p <= 6 && c[i + 2]) { c[i]--; c[i + 2]--; rec(i, sets, taat + 1, pair); c[i]++; c[i + 2]++; }
    c[i]--; rec(i, sets, taat, pair); c[i]++;
  }
  rec(0, m, 0, false);
  return best;
}

function shanten(c, m) {
  let best = stdShanten(c, m);
  if (m === 0 && best > 0) {
    let pairs = 0, kinds = 0;
    for (let i = 0; i < 34; i++) { if (c[i] >= 2) pairs++; if (c[i] >= 1) kinds++; }
    best = Math.min(best, 6 - pairs + Math.max(0, 7 - kinds));
    let k = 0, pr = false;
    for (const t of ORPH) { if (c[t] >= 1) k++; if (c[t] >= 2) pr = true; }
    best = Math.min(best, 13 - k - (pr ? 1 : 0));
  }
  return best;
}

// ---------- table reading ----------
const isHonor = (t) => t >= 27;
const isTerm = (t) => t < 27 && (t % 9 === 0 || t % 9 === 8);

function visibleCounts(g, seat) {
  const v = toCounts(g.hands[seat]);
  for (let s = 0; s < 4; s++) {
    for (const t of g.discards[s]) v[t]++;
    for (const m of g.melds[s]) for (const t of m.tiles) v[t]++;
  }
  return v;
}

// how scary is opponent `o` (0.4 calm .. 2+ very dangerous)
function threat(g, o) {
  let th = 0.4 + 0.65 * g.melds[o].length;
  if (g.wall.length < 40) th += 0.25;
  if (g.discards[o].length >= 12) th += 0.15;
  return th;
}

function tileDanger(g, seat, t, vis) {
  let worst = 0;
  for (let o = 0; o < 4; o++) {
    if (o === seat) continue;
    const th = threat(g, o);
    let base;
    if (g.discards[o].includes(t)) base = 0.04;                 // they threw it already: safe
    else if (isHonor(t)) base = vis[t] >= 3 ? 0.08 : vis[t] === 2 ? 0.3 : 0.55;
    else if (isTerm(t)) base = 0.35;
    else { const p = t % 9; base = p === 1 || p === 7 ? 0.55 : 0.8; }
    // an opponent showing one suit in melds probably collects it
    if (!isHonor(t)) {
      const suits = g.melds[o].filter(x => x.tiles[0] < 27).map(x => Math.floor(x.tiles[0] / 9));
      if (suits.length && suits.every(s => s === suits[0]) && suits[0] === Math.floor(t / 9) && !g.discards[o].includes(t)) base *= 1.5;
    }
    worst = Math.max(worst, th * base);
  }
  return worst;
}

const maxThreat = (g, seat) => Math.max(...[0, 1, 2, 3].filter(o => o !== seat).map(o => threat(g, o)));

function keepBias(g, seat, t, c) {
  let k = 0;
  if (isHonor(t)) {
    if (t >= 31 || t === 27 + g.seatWind(seat)) k += 3;
    if (c[t] >= 2) k += 4;
  } else {
    const p = t % 9;
    k += p >= 2 && p <= 6 ? 1.5 : p === 1 || p === 7 ? 0.7 : 0;
    if (c[t] >= 2) k += 2;
  }
  return k;
}

function remaining(vis, u) { return Math.max(0, 4 - vis[u]); }

function ukeire(c, m, sh0, vis) {
  let n = 0;
  for (let u = 0; u < 34; u++) {
    if (remaining(vis, u) === 0) continue;
    // only tiles that could possibly connect
    let rel = c[u] > 0;
    if (!rel && u < 27) {
      const p = u % 9;
      rel = (p >= 1 && c[u - 1]) || (p >= 2 && c[u - 2]) || (p <= 7 && c[u + 1]) || (p <= 6 && c[u + 2]);
    }
    if (!rel) continue;
    c[u]++;
    if (shanten(c, m) < sh0) n += remaining(vis, u);
    c[u]--;
  }
  return n;
}

// dominant suit (for flush leaning): returns suit index or -1
function flushSuit(c, m, g, seat) {
  const cnt = [0, 0, 0];
  let honors = 0;
  for (let t = 0; t < 34; t++) { if (t < 27) cnt[Math.floor(t / 9)] += c[t]; else honors += c[t]; }
  for (const x of g.melds[seat]) { if (x.tiles[0] < 27) cnt[Math.floor(x.tiles[0] / 9)] += 3; else honors += 3; }
  const best = cnt.indexOf(Math.max(...cnt));
  return cnt[best] + honors >= 10 && cnt[best] >= 6 ? best : -1;
}

// ---------- decisions ----------
function chooseDiscard(g, seat) {
  const p = g.persona[seat];
  const hand = g.hands[seat], c = toCounts(hand), m = g.melds[seat].length;
  const vis = visibleCounts(g, seat);
  const fs = flushSuit(c, m, g, seat);
  const th = maxThreat(g, seat);
  const cands = [];
  for (const t of new Set(hand)) {
    c[t]--;
    const sh = shanten(c, m);
    cands.push({ t, sh, c: null });
    c[t]++;
  }
  const bestSh = Math.min(...cands.map(x => x.sh));
  const fold = bestSh >= 3 && th >= 1.3 && p.caution > 0.8;
  let best = null;
  for (const x of cands) {
    const t = x.t;
    let score;
    if (!fold && x.sh > bestSh + 0) score = -1000 * (x.sh - bestSh);
    else if (fold) score = -60 * (x.sh - bestSh);
    else score = 0;
    if (!fold || x.sh === bestSh) {
      c[t]--;
      score += 8 * ukeire(c, m, x.sh, vis);
      c[t]++;
    }
    score -= 4 * keepBias(g, seat, t, c);
    const danger = tileDanger(g, seat, t, vis);
    const w = fold ? 70 : (bestSh >= 2 ? 22 : bestSh === 1 ? 12 : 5) * p.caution * Math.min(1.6, Math.max(0.3, th - 0.2));
    score -= danger * w;
    if (fs >= 0 && !isHonor(t) && Math.floor(t / 9) !== fs) score += 5 * p.flush;
    if (fs >= 0 && !isHonor(t) && Math.floor(t / 9) === fs) score -= 4 * p.flush;
    if (t === g.drawn) score += 0.5; // slight preference to throw the tile just drawn when equal
    score += (Math.random() - 0.5) * 2 * p.noise;
    if (!best || score > best.score) best = { t, score };
  }
  return best.t;
}

// best shanten reachable after calling (removing `take` tiles from hand, adding a meld, then discarding)
function afterCall(g, seat, take) {
  const c = toCounts(g.hands[seat]), m = g.melds[seat].length + 1;
  for (const t of take) c[t]--;
  let best = 9;
  for (let d = 0; d < 34; d++) {
    if (!c[d]) continue;
    c[d]--;
    best = Math.min(best, shanten(c, m));
    c[d]++;
  }
  return best;
}

function chooseClaim(g, seat) {
  const o = g.claims[seat], t = g.last.tile, p = g.persona[seat];
  if (o.win) return { action: 'ron' };
  const c = toCounts(g.hands[seat]), m = g.melds[seat].length;
  const before = shanten(c, m);
  const value = t >= 31 || t === 27 + g.seatWind(seat) || t === 27;
  const th = maxThreat(g, seat);
  let pairs = 0;
  for (let i = 0; i < 34; i++) if (c[i] >= 2) pairs++;
  const chiitoiish = m === 0 && pairs >= 4;
  const r = Math.random();

  if (o.kong && (value || t < 27 && r < 0.15) && before <= 2 && r < p.eager) return { action: 'kong' };
  if (o.pong && !chiitoiish) {
    const after = afterCall(g, seat, [t, t]);
    const gain = before - after;
    if (before > 0 || gain > 0) {
      if (gain > 0 && (value || r < p.eager + 0.35) && !(after >= 2 && th >= 1.3)) return { action: 'pong' };
      if (gain === 0 && value && r < p.eager * 0.8 && before <= 2) return { action: 'pong' };
    }
  }
  if (o.chi.length && !chiitoiish && before >= 1) {
    let bestOpt = null;
    for (const pair of o.chi) {
      const after = afterCall(g, seat, pair);
      if (!bestOpt || after < bestOpt.after) bestOpt = { pair, after };
    }
    // humans open up for chows less eagerly than for pongs; more so when already close
    if (before - bestOpt.after > 0 && r < p.eager * 0.75 && !(bestOpt.after >= 2 && th >= 1.3)) {
      return { action: 'chi', tiles: bestOpt.pair };
    }
  }
  return { action: 'pass' };
}

function chooseKongOnTurn(g, seat, o) {
  const p = g.persona[seat];
  const c = toCounts(g.hands[seat]), m = g.melds[seat].length;
  if (maxThreat(g, seat) >= 1.5 && Math.random() < 0.5) return null;
  for (const t of o.addkan) if (Math.random() < (t === g.drawn ? 0.8 : 0.55)) return { action: 'addkan', tile: t };
  for (const t of o.ankan) {
    const here = shanten(c, m);
    c[t] -= 4;
    const kept = shanten(c, m + 1);
    c[t] += 4;
    if (kept <= here && Math.random() < 0.55 + p.eager * 0.3) return { action: 'ankan', tile: t };
  }
  return null;
}

// how long a "person" would take
function delay(g, seat, kind) {
  const p = g.persona[seat];
  const r = Math.random();
  let ms;
  if (kind === 'discard') {
    ms = 650 + r * 1300;
    if (Math.random() < 0.14) ms += 1400 + Math.random() * 2200; // a longer think
    if (g.drawn !== null && g.hands[seat].filter(t => t === g.drawn).length === 1 && shanten(toCounts(g.hands[seat]), g.melds[seat].length) > 3) ms *= 0.7;
  } else {
    ms = 700 + r * 1500;
    if (Math.random() < 0.1) ms += 1200 + Math.random() * 1500;
  }
  return Math.round(ms * p.speed);
}

function makePersona() {
  return {
    caution: 0.6 + Math.random() * 0.9,
    eager: 0.25 + Math.random() * 0.6,
    flush: Math.random() < 0.5 ? Math.random() : 0,
    noise: 1 + Math.random() * 5,
    speed: 0.8 + Math.random() * 0.6,
  };
}

module.exports = { shanten, chooseDiscard, chooseClaim, chooseKongOnTurn, delay, makePersona };
