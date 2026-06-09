import { io } from "socket.io-client";

const SERVER = process.argv[2] || "https://kachuful-server.onrender.com";
const N = parseInt(process.argv[3] || "7", 10);
const STALL_MS = 25000;
const NAMES = ["Alice","Bob","Carol","Dave","Eve","Frank","Grace","Henry"];
const RANK = {"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"10":10,J:11,Q:12,K:13,A:14};

const legal = (hand,lead) => !lead ? [...hand] : (hand.filter(c=>c.suit===lead).length ? hand.filter(c=>c.suit===lead) : [...hand]);
const nextExp = (s) => {
  if (s.phase==="bidding") { for (const pid of s.bidOrder) if (s.bids[pid]==null) return pid; return null; }
  if (s.phase==="playing") return s.playOrder[s.currentTrick.length] ?? null;
  return null;
};
const forbidden = (s) => {
  if (!s.settings.enforceDealerConstraint) return null;
  const did = s.players[s.dealerIndex].id;
  const rem = s.bidOrder.filter(p=>s.bids[p]==null);
  if (rem.length!==1 || rem[0]!==did) return null;
  const sum = s.bidOrder.filter(p=>s.bids[p]!=null).reduce((a,p)=>a+s.bids[p],0);
  const f = s.cardsPerPlayer - sum;
  return (f<0||f>s.cardsPerPlayer) ? null : f;
};
const pickBid = (s) => { const m=s.cardsPerPlayer, d=Math.max(0,Math.min(m,Math.round(m/N))), f=forbidden(s); return f!==d ? d : (d===0?1:d-1); };
const pickPlay = (h,s) => [...legal(h,s.leadSuit)].sort((a,b)=>RANK[a.rank]-RANK[b.rank])[0];
const conn = () => new Promise((res,rej)=>{ const s=io(SERVER,{transports:["websocket","polling"],reconnection:true}); const t=setTimeout(()=>rej(new Error("connect timeout")),90000); s.once("connect",()=>{clearTimeout(t);res(s);}); s.once("connect_error",e=>{clearTimeout(t);rej(new Error("connect_error: "+e.message));}); });
const ack = (s,ev,d) => new Promise((res,rej)=>{ const t=setTimeout(()=>rej(new Error(ev+" ack timeout")),30000); s.emit(ev,d,r=>{clearTimeout(t);res(r);}); });

async function main() {
  console.log("[test] server="+SERVER+" players="+N);
  console.log("[test] connecting host...");
  const host = await conn();
  console.log("[test] host "+host.id);

  const players=[]; const events=[]; let last=null, lastAt=Date.now(), lastRound=0, stalled=false, stallInfo=null;
  const cr = await ack(host,"room:create",{name:NAMES[0]});
  if (!cr.ok) { console.error("create failed: "+cr.error); process.exit(3); }
  console.log("[test] room: "+cr.code);
  players.push({name:NAMES[0],sock:host,playerId:cr.playerId});

  for (let i=1;i<N;i++) {
    const s=await conn();
    const j=await ack(s,"room:join",{code:cr.code,name:NAMES[i]});
    if (!j.ok) { console.error(NAMES[i]+" join failed: "+j.error); process.exit(3); }
    players.push({name:NAMES[i],sock:s,playerId:j.playerId});
    console.log("[test] "+NAMES[i]+" joined");
  }

  for (const p of players) {
    p.sock.on("game:state",(st)=>{
      last=st; lastAt=Date.now();
      if ((st.phase==="bidding"||st.phase==="playing") && st.round+1>lastRound) {
        console.log("[test] >> Round "+(st.round+1)+"/"+st.totalRounds+" cards="+st.cardsPerPlayer+" trump="+(st.trump||"NT"));
        lastRound=st.round+1;
      }
      events.push({phase:st.phase,round:st.round+1,trick:st.currentTrick.length,expected:nextExp(st)});
      const exp=nextExp(st);
      if (exp!==p.playerId) return;
      if (st.phase==="bidding") setTimeout(()=>p.sock.emit("game:bid",{bid:pickBid(st)}),50);
      else if (st.phase==="playing") { const h=st.hands[p.playerId]||[]; if (h.length) setTimeout(()=>p.sock.emit("game:play",{card:pickPlay(h,st)}),50); }
    });
    p.sock.on("room:error",e=>console.log("[test] "+p.name+" room:error: "+e.message));
  }
  host.on("game:state",(st)=>{ if (st.phase==="round_summary") { console.log("[test]    round "+(st.round+1)+" summary -> next"); setTimeout(()=>host.emit("game:next"),400); }});

  for (let i=1;i<N;i++) players[i].sock.emit("room:ready",{ready:true});
  await new Promise(r=>setTimeout(r,800));
  host.emit("room:start");
  console.log("[test] game started\n");

  const sc=setInterval(()=>{ const idle=Date.now()-lastAt; if (idle>STALL_MS) { stalled=true; stallInfo={idleMs:idle,lastState:last?{phase:last.phase,round:last.round+1,totalRounds:last.totalRounds,trickSoFar:last.currentTrick.length,cardsPerPlayer:last.cardsPerPlayer,expectedId:nextExp(last),expectedName:last.players.find(p=>p.id===nextExp(last))?.name,message:last.message,tricksWon:last.tricksWon,totals:last.totals}:null}; clearInterval(sc); }},2000);

  const MAX=9*60*1000, t0=Date.now();
  while (Date.now()-t0<MAX) { if (stalled) break; if (last&&last.phase==="game_over") break; await new Promise(r=>setTimeout(r,500)); }
  clearInterval(sc);

  const fin=last&&last.phase==="game_over";
  console.log("\n========== RESULT ==========");
  console.log("finished: "+fin);
  console.log("stalled : "+stalled);
  console.log("elapsed : "+Math.round((Date.now()-t0)/1000)+"s");
  console.log("events  : "+events.length);
  if (last) {
    console.log("\nReached round: "+(last.round+1)+" / "+last.totalRounds);
    console.log("Final phase: "+last.phase);
    console.log("Final totals: "+JSON.stringify(last.totals));
  }
  if (stalled&&stallInfo) {
    console.log("\n=== STALL DETAILS ===");
    console.log(JSON.stringify(stallInfo,null,2));
    console.log("\nLast 10 events:");
    events.slice(-10).forEach((e,i)=>console.log(" "+i+": "+JSON.stringify(e)));
  }
  for (const p of players) p.sock.disconnect();
  process.exit(stalled?2:fin?0:1);
}
main().catch(e=>{console.error("[test] FATAL: "+e.message);process.exit(3);});
