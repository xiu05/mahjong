'use strict';
const { Game, isWin, toCounts, scoreHand } = require('./game');
const assert = require('assert');

// --- win detection unit tests
const c = (arr) => toCounts(arr);
assert(isWin(c([0,1,2,3,4,5,9,10,11,18,19,20,27,27]), 0), 'standard');
assert(!isWin(c([0,1,2,3,4,5,9,10,11,18,19,21,27,27]), 0), 'not win');
assert(isWin(c([0,0,2,2,4,4,9,9,18,18,27,27,33,33]), 0), 'seven pairs');
assert(isWin(c([0,8,9,17,18,26,27,28,29,30,31,32,33,33]), 0), 'orphans');
assert(isWin(c([0,1,2,5,5]), 3), 'with 3 melds');
assert.strictEqual(scoreHand([0,0,0,1,1,1,2,2,2,3,3,3,4,4],[],false,0).fans.some(f=>f.name==='Full Flush'), true);
console.log('unit tests ok');

// --- full simulated games: 1 absent "human" (auto after timeout) + 3 bots
async function sim(n) {
  let stats = { wins: 0, draws: 0 };
  for (let g = 0; g < n; g++) {
    const seats = [0,1,2,3].map(i => ({ name: 'P'+i, bot: i > 0, connected: i === 0 }));
    await new Promise((resolve, reject) => {
      const game = new Game(seats, () => {
        // tile conservation invariant
        const total = game.wall.length + game.hands.reduce((s,h)=>s+h.length,0)
          + game.melds.reduce((s,m)=>s+m.reduce((a,x)=>a+x.tiles.length,0),0)
          + game.discards.reduce((s,d)=>s+d.length,0);
        try { assert.strictEqual(total, 136); } catch (e) { game.stop(); reject(e); }
        if (game.phase === 'result') { game.result.type === 'win' ? stats.wins++ : stats.draws++;
          assert.strictEqual(game.result.deltas.reduce((a,b)=>a+b,0), 0); }
        if (game.phase === 'over') { game.stop(); resolve(); }
      }, { speed: 0.002 });
      game.start();
      // speed up result phase: mark human ready
      const iv = setInterval(() => { if (game.phase === 'result') game.act(0, { action: 'ready' }); if (game.stopped) clearInterval(iv); }, 1);
      setTimeout(() => { game.stop(); reject(new Error('timeout, phase ' + game.phase)); }, 60000);
    });
  }
  return stats;
}
sim(8).then(s => { console.log('simulation ok', s); process.exit(0); }, e => { console.error(e); process.exit(1); });
