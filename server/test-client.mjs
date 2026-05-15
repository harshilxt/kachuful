import { io } from "socket.io-client";

const code = process.argv[2];
const name = process.argv[3] || "TestBot";
if (!code) {
  console.error("Usage: node test-client.mjs <CODE> [name]");
  process.exit(1);
}

const s = io("http://localhost:3001");
s.on("connect", () => {
  console.log("[client] connected", s.id);
  s.emit("room:join", { code, name }, (resp) => {
    console.log("[client] join response", resp);
    if (!resp.ok) process.exit(1);
  });
});
s.on("room:state", (room) => {
  console.log(
    "[client] room:state | players:",
    room.players.map((p) => `${p.name}${p.isHost ? "(host)" : ""}${p.ready ? " ready" : ""}`).join(", "),
    "| phase:",
    room.phase
  );
});
s.on("game:state", (state) => {
  console.log(
    "[client] game:state | round",
    state.round + 1,
    "phase",
    state.phase,
    "trump",
    state.trump
  );
});
setTimeout(() => {
  s.emit("room:ready", { ready: true });
  console.log("[client] sent ready=true");
}, 500);
