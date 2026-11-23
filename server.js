'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const { Game } = require('./game');

const PORT = process.env.PORT || 3000;
const PUB = path.join(__dirname, 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(PUB, p));
  if (!file.startsWith(PUB)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

const rooms = new Map();
const emptySeat = () => ({ empty: true, name: '', token: null, bot: false, connected: false, ws: null });
const clean = (s, n) => String(s || '').replace(/[<>]/g, '').trim().slice(0, n);

function newCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  for (;;) {
    let c = '';
    for (let i = 0; i < 4; i++) c += letters[crypto.randomInt(letters.length)];
    if (!rooms.has(c)) return c;
  }
}

class Room {
  constructor(code) {
    this.code = code;
    this.seats = [0, 1, 2, 3].map(emptySeat);
    this.host = -1;
    this.game = null;
    this.touched = Date.now();
  }
  humans() { return this.seats.map((s, i) => i).filter(i => !this.seats[i].empty && !this.seats[i].bot); }
  freeSeat() { return this.seats.findIndex(s => s.empty); }
  send(i, obj) {
    const s = this.seats[i];
    if (s.ws && s.ws.readyState === 1) s.ws.send(JSON.stringify(obj));
  }
  broadcast() {
    this.touched = Date.now();
    for (let i = 0; i < 4; i++) {
      if (this.seats[i].bot || this.seats[i].empty) continue;
      if (this.game) this.send(i, { t: 'game', code: this.code, host: this.host, ...this.game.view(i) });
      else this.send(i, {
        t: 'lobby', code: this.code, you: i, host: this.host,
        seats: this.seats.map(s => ({ name: s.name, bot: s.bot, empty: s.empty, connected: s.connected })),
      });
    }
  }
  chat(from, text) {
    for (let i = 0; i < 4; i++) this.send(i, { t: 'chat', from, text });
  }
  reassignHost() {
    if (this.host >= 0 && this.seats[this.host].connected) return;
    const h = this.humans().find(i => this.seats[i].connected);
    this.host = h === undefined ? -1 : h;
  }
}

function join(room, ws, name, token) {
  // reconnect by token
  let i = token ? room.seats.findIndex(s => !s.empty && !s.bot && s.token === token) : -1;
  if (i < 0) {
    if (room.game) return 'Game already in progress';
    i = room.freeSeat();
    if (i < 0) return 'Room is full';
    token = crypto.randomUUID();
    room.seats[i] = { empty: false, name: name || 'Player', token, bot: false, connected: true, ws };
  } else {
    const s = room.seats[i];
    if (s.ws && s.ws !== ws) { s.ws.detached = true; try { s.ws.close(); } catch (e) { /* ignore */ } }
    s.ws = ws; s.connected = true;
    if (name) s.name = name;
  }
  ws.room = room; ws.seat = i;
  if (room.host < 0) room.host = i;
  room.send(i, { t: 'joined', code: room.code, token: room.seats[i].token, seat: i });
  room.reassignHost();
  room.broadcast();
  if (room.game) room.game.poke();
  return null;
}

function detach(ws) {
  const room = ws.room;
  if (!room || ws.detached) return;
  const i = ws.seat, s = room.seats[i];
  if (!s || s.ws !== ws) return;
  s.ws = null; s.connected = false;
  if (!room.game) room.seats[i] = emptySeat();
  room.reassignHost();
  room.broadcast();
  if (room.game) room.game.poke();
}

function handle(ws, m) {
  const err = (msg) => ws.send(JSON.stringify({ t: 'error', msg }));
  if (m.t === 'create') {
    const room = new Room(newCode());
    rooms.set(room.code, room);
    const e = join(room, ws, clean(m.name, 14), null);
    if (e) err(e);
    return;
  }
  if (m.t === 'join') {
    const room = rooms.get(clean(m.room, 4).toUpperCase());
    if (!room) return err('Room not found');
    const e = join(room, ws, clean(m.name, 14), m.token || null);
    if (e) err(e);
    return;
  }
  const room = ws.room;
  if (!room) return err('Not in a room');
  const i = ws.seat;
  switch (m.t) {
    case 'addbot': {
      if (room.game || i !== room.host) return;
      const k = room.freeSeat();
      if (k < 0) return;
      room.seats[k] = { empty: false, name: 'Bot ' + (k + 1), token: null, bot: true, connected: true, ws: null };
      room.broadcast();
      return;
    }
    case 'kick': {
      if (room.game || i !== room.host) return;
      const s = room.seats[m.seat];
      if (!s || s.empty || m.seat === i) return;
      if (s.ws) { room.send(m.seat, { t: 'kicked' }); s.ws.room = null; }
      room.seats[m.seat] = emptySeat();
      room.broadcast();
      return;
    }
    case 'start': {
      if (room.game || i !== room.host) return;
      for (let k = 0; k < 4; k++) {
        if (room.seats[k].empty) room.seats[k] = { empty: false, name: 'Bot ' + (k + 1), token: null, bot: true, connected: true, ws: null };
      }
      room.game = new Game(room.seats, () => room.broadcast());
      room.game.start();
      return;
    }
    case 'act': {
      if (!room.game) return;
      const e = room.game.act(i, { action: m.action, tile: m.tile, tiles: m.tiles });
      if (e) err(e);
      return;
    }
    case 'again': {
      if (!room.game || i !== room.host || room.game.phase !== 'over') return;
      room.game.stop();
      room.game = null;
      // humans who dropped are removed, bots stay
      for (let k = 0; k < 4; k++) if (!room.seats[k].bot && !room.seats[k].connected) room.seats[k] = emptySeat();
      room.broadcast();
      return;
    }
    case 'chat': {
      const text = clean(m.text, 120);
      if (text) room.chat(room.seats[i].name, text);
      return;
    }
    case 'leave': {
      const s = room.seats[i];
      s.token = null;
      ws.room = null;
      s.ws = null; s.connected = false;
      if (!room.game) room.seats[i] = emptySeat();
      room.reassignHost();
      room.broadcast();
      if (room.game) room.game.poke();
      return;
    }
  }
}

const wss = new WebSocketServer({ server, maxPayload: 4096 });
wss.on('connection', (ws) => {
  ws.alive = true;
  ws.on('pong', () => { ws.alive = true; });
  ws.on('message', (raw) => {
    let m;
    try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m || typeof m.t !== 'string') return;
    try { handle(ws, m); } catch (e) { console.error(e); }
  });
  ws.on('close', () => detach(ws));
  ws.on('error', () => {});
});

setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.alive) { ws.terminate(); continue; }
    ws.alive = false;
    ws.ping();
  }
  const now = Date.now();
  for (const [code, room] of rooms) {
    const anyone = room.seats.some(s => !s.bot && !s.empty && s.connected);
    if (!anyone && now - room.touched > 30 * 60 * 1000) {
      if (room.game) room.game.stop();
      rooms.delete(code);
    }
  }
}, 30000);

server.listen(PORT, () => console.log('Mahjong server on http://localhost:' + PORT));
