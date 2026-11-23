# Mahjong Kopitiam

Four-player online Mahjong with a hand-drawn, Peranakan-inspired look.

```bash
npm install
npm start        # http://localhost:3000  (PORT env var to change)
npm test         # rules unit tests + simulated full games
```

- Open a table, share the 4-letter code / invite link; up to 4 humans, empty seats become bots.
- Disconnected players are replaced by a bot and can reconnect to their seat (token in localStorage).
- Rules (simplified Chinese style): 136 tiles, chow (from the player on your left only), pong, kong
  (open / concealed / added), win by discard or self-draw, seven pairs, thirteen orphans.
  Scoring is fan based (flushes, all triplets, dragons, seat wind, self-draw, concealed...); 4 dealer rotations per game.
- The server is authoritative: clients only ever receive their own hand.
