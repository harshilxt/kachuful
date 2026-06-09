/**
 * Realistic stress test:
 *   - N players with random 100-1500ms response delays (simulating thinking)
 *   - On specific (round, player) pairs, the player goes AFK for 25s
 *     to deliberately blow the 15s server-side timeout
 *   - On one (round, player) pair, the player closes their socket entirely
 *     to test AI takeover
 *   - Watchdog (server-side) should keep the game moving in all cases
 *
 *   node backend/test-stress.mjs <server-url> <num-players> [maxCards]
 */
import { io } from "socket.io-client";

const SERVER = process.argv[2] || "http://127.0.0.1:3201";
const N = parseInt(process.argv[3] || "6", 10);
const MAX_CARDS = parseInt(process.argv[4] || "8", 10);
const STALL_MS = 30000;
const NAMES = ["Alice", "Bob", "Carol", "Dave", "Eve", "Frank", "Grace", "Henry"];
const RANK = { "2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"10":10,J:11,Q:12,K:13,A:14 };

// (round_1based, player_index_0based) -> "afk" | "disconnect"
// Player index is into NAMES (Alice=0, Bob=1, …)
const STRESS = {
  "3,1": "afk",        // Round 3: Bob goes silent for 25s on his turn
  "5,3": "afk",        // Round 5: Dave goes silent on his turn
  "7,2": "disconnect", // Round 7: Carol's socket drops mid-round
  "10,4": "afk",       // Round 10: Eve goes silent
  "12,5": "afk",       // Round 12: Frank goes silent (the round that failed in production!)
};

const legal = (hand, lead) =>
  !lead
    ? [...hand]
    : (hand.filter(c => c.suit === lead).length
        ? hand.filter(c => c.suit === lead)
        : [...hand]);

const nextExp = (s) => {
  if (s.phase === "bidding") {
    for (const pid of s.bidOrder) if (s.bids[pid] == null) return pid;
    return null;
  }
  if (s.phase === "playing") return s.playOrder[s.currentTrick.length] ?? null;
  return null;
};

const dealerForbidden = (s) => {
  if (!s.settings.enforceDealerConstraint) return null;
  const did = s.players[s.dealerIndex].id;
  const rem = s.bidOrder.filter(p => s.bids[p] == null);
  if (rem.length !== 1 || rem[0] !== did) return null;
  const sum = s.bidOrder.filter(p => s.bids[p] != null).reduce((a, p) => a + s.bids[p], 0);
  const f = s.cardsPerPlayer - sum;
  return f < 0 || f > s.cardsPerPlayer ? null : f;
};

const pickBid = (s) => {
  const m = s.cardsPerPlayer;
  const d = Math.max(0, Math.min(m, Math.round(m / N)));
  const f = dealerForbidden(s);
  return f !== d ? d : (d === 0 ? 1 : d - 1);
};

const pickPlay = (h, s) =>
  [...legal(h, s.leadSuit)].sort((a, b) => RANK[a.rank] - RANK[b.rank])[0];

const rand = (lo, hi) => lo + Math.random() * (hi - lo);

const conn = () => new Promise((res, rej) => {
  const s = io(SERVER, { transports: ["websocket", "polling"], reconnection: false });
  const t = setTimeout(() => rej(new Error("connect timeout")), 90000);
  s.once("connect", () => { clearTimeout(t); res(s); });
  s.once("connect_error", (e) => { clearTimeout(t); rej(new Error("connect_error: " + e.message)); });
});

const ack = (s, ev, d) => new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error(ev + " ack timeout")), 30000);
  s.emit(ev, d, (resp) => { clearTimeout(t); res(resp); });
});

async function main() {
  console.log(`[test] server=${SERVER} players=${N} maxCards=${MAX_CARDS}`);
  console.log(`[test] stress events:`, STRESS);
  console.log(`[test] connecting host...`);

  const host = await conn();
  const cr = await ack(host, "room:create", { name: NAMES[0] });
  if (!cr.ok) { console.error("create failed:", cr.error); process.exit(3); }
  const code = cr.code;
  console.log(`[test] room: ${code}`);

  const players = [{ name: NAMES[0], idx: 0, sock: host, playerId: cr.playerId }];
  for (let i = 1; i < N; i++) {
    const s = await conn();
    const j = await ack(s, "room:join", { code, name: NAMES[i] });
    if (!j.ok) { console.error(`${NAMES[i]} join failed:`, j.error); process.exit(3); }
    players.push({ name: NAMES[i], idx: i, sock: s, playerId: j.playerId });
    console.log(`[test] ${NAMES[i]} joined`);
  }

  // Set game length to maxCards
  host.emit("room:settings", { settings: { maxCards: MAX_CARDS } });
  await new Promise(r => setTimeout(r, 200));

  // Shared state
  const events = [];
  let last = null, lastAt = Date.now(), lastRoundLogged = 0;
  let stalled = false, stallInfo = null;
  let watchdogHits = 0; // count of times the same turn lingered to >18s
  const afkLog = [];   // log of when we forced AFK
  const disconnected = new Set(); // player names currently disconnected

  for (const p of players) {
    p.sock.on("game:state", (st) => {
      last = st;
      lastAt = Date.now();
      if ((st.phase === "bidding" || st.phase === "playing") && st.round + 1 > lastRoundLogged) {
        console.log(`[test] >> Round ${st.round + 1}/${st.totalRounds} cards=${st.cardsPerPlayer} trump=${st.trump || "NT"}`);
        lastRoundLogged = st.round + 1;
      }
      events.push({ ts: Date.now(), phase: st.phase, round: st.round + 1, trick: st.currentTrick.length, expected: nextExp(st) });

      const exp = nextExp(st);
      if (exp !== p.playerId) return;

      // Stress trigger?
      const key = `${st.round + 1},${p.idx}`;
      const stress = STRESS[key];
      const phaseKey = `${st.round + 1},${p.idx},${st.phase}`;
      if (stress && !p["_stressFired_" + phaseKey]) {
        p["_stressFired_" + phaseKey] = true;
        if (stress === "afk") {
          afkLog.push({ round: st.round + 1, name: p.name, phase: st.phase });
          console.log(`[test] **AFK** ${p.name} on round ${st.round + 1} ${st.phase} -- waiting silently 25s`);
          // Do nothing — watchdog should fire at ~18s
          return;
        }
        if (stress === "disconnect" && !disconnected.has(p.name)) {
          disconnected.add(p.name);
          console.log(`[test] **DISCONNECT** ${p.name} closing socket on round ${st.round + 1} ${st.phase}`);
          p.sock.close();
          return;
        }
      }

      // Realistic delay before acting
      const delay = rand(80, 600);
      if (st.phase === "bidding") {
        setTimeout(() => p.sock.emit("game:bid", { bid: pickBid(st) }), delay);
      } else if (st.phase === "playing") {
        const h = st.hands[p.playerId] || [];
        if (!h.length) return;
        setTimeout(() => p.sock.emit("game:play", { card: pickPlay(h, st) }), delay);
      }
    });
    p.sock.on("room:error", (e) => console.log(`[test] ${p.name} room:error: ${e.message}`));
    p.sock.on("disconnect", () => console.log(`[test] ${p.name} socket disconnected`));
  }

  host.on("game:state", (st) => {
    if (st.phase === "round_summary") {
      console.log(`[test]    round ${st.round + 1} summary -> next`);
      setTimeout(() => host.emit("game:next"), rand(400, 1200));
    }
  });

  for (let i = 1; i < N; i++) players[i].sock.emit("room:ready", { ready: true });
  await new Promise(r => setTimeout(r, 800));
  host.emit("room:start");
  console.log(`[test] game started\n`);

  const sc = setInterval(() => {
    const idle = Date.now() - lastAt;
    if (idle > STALL_MS) {
      stalled = true;
      stallInfo = {
        idleMs: idle,
        lastState: last ? {
          phase: last.phase,
          round: last.round + 1,
          totalRounds: last.totalRounds,
          trickSoFar: last.currentTrick.length,
          cardsPerPlayer: last.cardsPerPlayer,
          expectedId: nextExp(last),
          expectedName: last.players.find(p => p.id === nextExp(last))?.name,
          message: last.message,
          tricksWon: last.tricksWon,
          totals: last.totals,
        } : null,
      };
      clearInterval(sc);
    }
  }, 2000);

  const MAX = 12 * 60 * 1000;
  const t0 = Date.now();
  while (Date.now() - t0 < MAX) {
    if (stalled) break;
    if (last && last.phase === "game_over") break;
    await new Promise(r => setTimeout(r, 500));
  }
  clearInterval(sc);

  const fin = last && last.phase === "game_over";
  const elapsed = Math.round((Date.now() - t0) / 1000);

  console.log(`\n========== RESULT ==========`);
  console.log(`finished : ${fin}`);
  console.log(`stalled  : ${stalled}`);
  console.log(`elapsed  : ${elapsed}s`);
  console.log(`events   : ${events.length}`);
  console.log(`AFK forced: ${afkLog.length}x`);
  afkLog.forEach((a, i) => console.log(`  ${i + 1}. round ${a.round} ${a.name} ${a.phase}`));
  console.log(`Disconnect forced: ${disconnected.size}x (${[...disconnected].join(", ")})`);
  if (last) {
    console.log(`\nReached round: ${last.round + 1} / ${last.totalRounds}`);
    console.log(`Final phase: ${last.phase}`);
    console.log(`Final totals: ${JSON.stringify(last.totals)}`);
  }
  if (stalled && stallInfo) {
    console.log(`\n=== STALL DETAILS ===`);
    console.log(JSON.stringify(stallInfo, null, 2));
    console.log(`\nLast 12 events:`);
    events.slice(-12).forEach((e, i) => console.log(` ${i}: ${JSON.stringify(e)}`));
  }

  for (const p of players) p.sock.disconnect();
  process.exit(stalled ? 2 : fin ? 0 : 1);
}

main().catch((e) => { console.error("[test] FATAL:", e.message); process.exit(3); });
