/**
 * Test: host kicks a player mid-game.
 *
 *   node backend/test-kick.mjs <server-url>
 *
 * Behavior expected:
 *   1. 4 players join, ready, start game (default 13 rounds)
 *   2. Play through round 1 + 2 normally
 *   3. During round 3 bidding, host kicks Carol
 *   4. Carol receives room:left + her seat is marked AI in game state
 *   5. Game continues automatically — AI bot plays Carol's seat
 *   6. Carol tries to rejoin → server rejects with "You were removed from this room"
 *   7. Game runs to completion
 */
import { io } from "socket.io-client";

const SERVER = process.argv[2] || "https://kachuful-server.onrender.com";
const NAMES = ["Alice", "Bob", "Carol", "Dave"];
const RANK = { "2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"10":10,J:11,Q:12,K:13,A:14 };

const legal = (h, l) => !l ? [...h] : (h.filter(c=>c.suit===l).length ? h.filter(c=>c.suit===l) : [...h]);
const nextExp = (s) => {
  if (s.phase === "bidding") { for (const p of s.bidOrder) if (s.bids[p] == null) return p; return null; }
  if (s.phase === "playing") return s.playOrder[s.currentTrick.length] ?? null;
  return null;
};
const conn = () => new Promise((res, rej) => {
  const s = io(SERVER, { transports: ["websocket","polling"], reconnection: false });
  const t = setTimeout(() => rej(new Error("connect timeout")), 90000);
  s.once("connect", () => { clearTimeout(t); res(s); });
  s.once("connect_error", e => { clearTimeout(t); rej(new Error("connect_error: " + e.message)); });
});
const ack = (s, ev, d) => new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error(ev + " ack timeout")), 30000);
  s.emit(ev, d, r => { clearTimeout(t); res(r); });
});

async function main() {
  console.log(`[test] server=${SERVER}`);
  const host = await conn();
  const cr = await ack(host, "room:create", { name: NAMES[0] });
  if (!cr.ok) { console.error("create failed:", cr.error); process.exit(3); }
  const code = cr.code;
  console.log(`[test] room=${code} host=${NAMES[0]}`);

  const players = [{ name: NAMES[0], sock: host, playerId: cr.playerId, idx: 0 }];
  for (let i = 1; i < 4; i++) {
    const s = await conn();
    const j = await ack(s, "room:join", { code, name: NAMES[i] });
    if (!j.ok) { console.error(NAMES[i] + " join failed:", j.error); process.exit(3); }
    players.push({ name: NAMES[i], sock: s, playerId: j.playerId, idx: i });
    console.log(`[test] ${NAMES[i]} joined (${j.playerId})`);
  }

  const carol = players[2];
  let kickFired = false;
  let kickRound = 3;
  let carolReceivedLeft = false;
  let carolSeatAi = false;
  const events = [];
  let last = null, lastAt = Date.now(), lastRoundLogged = 0;

  for (const p of players) {
    p.sock.on("game:state", (st) => {
      last = st; lastAt = Date.now();
      if ((st.phase==="bidding"||st.phase==="playing") && st.round+1 > lastRoundLogged) {
        console.log(`[test] >> Round ${st.round+1}/${st.totalRounds} cards=${st.cardsPerPlayer} trump=${st.trump||"NT"}`);
        lastRoundLogged = st.round+1;
      }
      // Track Carol's AI flag
      const carolSt = st.players.find(x => x.id === carol.playerId);
      if (carolSt && carolSt.isBot && !carolSeatAi) {
        carolSeatAi = true;
        console.log(`[test] CONFIRMED: Carol's seat is now AI in game state`);
      }
      events.push({ phase: st.phase, round: st.round+1, expected: nextExp(st) });

      const exp = nextExp(st);
      if (exp !== p.playerId) return;

      // HOST: kick Carol during round 3 bidding
      if (!kickFired && p === players[0] && st.phase === "bidding" && st.round+1 === kickRound) {
        // fire the kick BEFORE host's own action
        kickFired = true;
        console.log(`[test] >>> HOST KICKING Carol on round ${kickRound} bidding`);
        host.emit("room:kick", { playerId: carol.playerId });
        // host still needs to bid eventually — do it after a short delay
        setTimeout(() => host.emit("game:bid", { bid: 0 }), 700);
        return;
      }

      // Normal action
      if (st.phase === "bidding") {
        setTimeout(() => p.sock.emit("game:bid", { bid: 0 }), 150);
      } else if (st.phase === "playing") {
        const h = st.hands[p.playerId] || [];
        if (!h.length) return;
        const card = [...legal(h, st.leadSuit)].sort((a,b)=>RANK[a.rank]-RANK[b.rank])[0];
        setTimeout(() => p.sock.emit("game:play", { card }), 150);
      }
    });
    p.sock.on("room:error", e => console.log(`[test] ${p.name} room:error: ${e.message}`));
  }

  carol.sock.on("room:left", () => {
    carolReceivedLeft = true;
    console.log(`[test] CONFIRMED: Carol received room:left from server`);
  });
  carol.sock.on("disconnect", () => {
    console.log(`[test] Carol socket disconnected`);
  });

  host.on("game:state", (st) => {
    if (st.phase === "round_summary") {
      console.log(`[test]    round ${st.round+1} summary -> next`);
      setTimeout(() => host.emit("game:next"), 400);
    }
  });

  for (let i = 1; i < 4; i++) players[i].sock.emit("room:ready", { ready: true });
  await new Promise(r => setTimeout(r, 800));
  host.emit("room:start");
  console.log(`[test] game started\n`);

  // Wait until game over or 5 minutes
  const t0 = Date.now();
  while (Date.now() - t0 < 5 * 60 * 1000) {
    if (last && last.phase === "game_over") break;
    await new Promise(r => setTimeout(r, 500));
  }

  const fin = last && last.phase === "game_over";

  // Now try to rejoin as Carol — should be rejected
  console.log(`\n[test] Carol attempting to rejoin as "Carol"...`);
  let banResult = null;
  try {
    const carol2 = await conn();
    const j = await ack(carol2, "room:join", { code, name: "Carol" });
    banResult = j;
    carol2.disconnect();
  } catch (e) {
    banResult = { ok: false, error: "timeout/" + e.message };
  }

  console.log(`\n========== RESULT ==========`);
  console.log(`finished                : ${fin}`);
  console.log(`elapsed                 : ${Math.round((Date.now()-t0)/1000)}s`);
  console.log(`Carol received room:left: ${carolReceivedLeft}`);
  console.log(`Carol seat marked AI    : ${carolSeatAi}`);
  console.log(`Rejoin as Carol blocked : ${banResult && !banResult.ok} (error: ${banResult?.error || 'NONE'})`);
  if (last) {
    console.log(`\nFinal round: ${last.round+1} / ${last.totalRounds}`);
    console.log(`Final phase: ${last.phase}`);
    console.log(`Final totals: ${JSON.stringify(last.totals)}`);
  }
  const allPass = fin && carolReceivedLeft && carolSeatAi && banResult && !banResult.ok;
  console.log(`\n${allPass ? "ALL CHECKS PASSED" : "FAILED"}`);
  for (const p of players) p.sock.disconnect();
  process.exit(allPass ? 0 : 1);
}

main().catch(e => { console.error("[test] FATAL:", e.message); process.exit(3); });
