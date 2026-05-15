import { io } from "socket.io-client";

const code = process.argv[2];
const count = parseInt(process.argv[3] || "7", 10);
const baseName = process.argv[4] || "Bot";

if (!code) {
  console.error("Usage: node test-multi.mjs <CODE> [count] [baseName]");
  process.exit(1);
}

const sockets = [];
for (let i = 0; i < count; i++) {
  const s = io("http://localhost:3001");
  sockets.push(s);
  s.on("connect", () => {
    s.emit("room:join", { code, name: `${baseName}${i + 1}` }, (resp) => {
      if (!resp.ok) console.error(`[${i}] join failed:`, resp.error);
      else {
        console.log(`[${i}] joined as ${baseName}${i + 1}`);
        s.emit("room:ready", { ready: true });
      }
    });
  });
}

// Keep alive so disconnects don't fire
process.stdin.resume();
console.log(`Connecting ${count} clients to room ${code}. Ctrl-C to exit.`);
