import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMpStore } from "../../store/multiplayerStore";
import {
  Check,
  Copy,
  Crown,
  Link as LinkIcon,
  LogOut,
  Play,
  UserMinus,
  Users,
  WifiOff,
  AlertCircle,
} from "lucide-react";
import { cn } from "../../lib/utils";

export function MpLobbyScreen() {
  const {
    room,
    playerId,
    leaveRoom,
    kickPlayer,
    toggleReady,
    startGame,
    updateSettings,
    errorMessage,
    clearError,
  } = useMpStore();
  const navigate = useNavigate();
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  const handleLeave = () => {
    leaveRoom();
    navigate("/online");
  };

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/50">
        <div className="panel p-6">Loading room…</div>
      </div>
    );
  }

  const me = room.players.find((p) => p.id === playerId);
  const isHost = me?.isHost ?? false;
  const allReady = room.players.every((p) => p.ready || p.id === room.hostId);
  const enoughPlayers = room.players.length >= room.minPlayers;
  const canStart = isHost && enoughPlayers && allReady;

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/online/join/${room.code}`
      : `/online/join/${room.code}`;

  const handleCopy = async (which: "code" | "link") => {
    try {
      const value = which === "code" ? room.code : shareUrl;
      await navigator.clipboard.writeText(value);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  };

  return (
    <div className="min-h-screen relative table-felt overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0 [background-image:radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.55)_100%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel relative w-full max-w-xl p-6"
      >
        <div className="flex items-start justify-between mb-4 gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-xs uppercase tracking-[0.3em] text-white/55">
              Room Code
            </div>
            <button
              onClick={() => handleCopy("code")}
              className="group flex items-center gap-3 mt-1.5"
            >
              <div className="font-display text-3xl tracking-[0.3em] text-gold-400">
                {room.code}
              </div>
              <span
                className={cn(
                  "chip transition",
                  copied === "code"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-white/5 text-white/70 group-hover:bg-white/10"
                )}
              >
                {copied === "code" ? (
                  <>
                    <Check className="w-3 h-3" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> Copy
                  </>
                )}
              </span>
            </button>
            <button
              onClick={() => handleCopy("link")}
              className="group mt-2 flex items-center gap-2 w-full max-w-full text-left rounded-md border border-white/10 bg-white/5 hover:bg-white/10 transition px-2.5 py-1.5"
              title="Click to copy the join link"
            >
              <LinkIcon className="w-3.5 h-3.5 text-white/60 shrink-0" />
              <span className="text-[11px] text-white/70 truncate flex-1">
                {shareUrl}
              </span>
              <span
                className={cn(
                  "chip shrink-0 transition",
                  copied === "link"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-white/5 text-white/70 group-hover:bg-white/10"
                )}
              >
                {copied === "link" ? (
                  <>
                    <Check className="w-3 h-3" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> Link
                  </>
                )}
              </span>
            </button>
            <div className="text-[11px] text-white/50 mt-1">
              Share the link — friends land on the join screen with the code
              pre-filled.
            </div>
          </div>
          <button
            onClick={handleLeave}
            className="btn-ghost text-xs"
            title="Leave room"
          >
            <LogOut className="w-3.5 h-3.5" /> Leave
          </button>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <div className="text-xs uppercase tracking-widest text-white/60 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Players ({room.players.length}/
            {room.maxPlayers})
          </div>
          {!enoughPlayers && (
            <div className="text-[11px] text-amber-300/85">
              Need {room.minPlayers - room.players.length} more
            </div>
          )}
        </div>

        <div className="space-y-2 mb-5 max-h-[50vh] overflow-y-auto scrollbar-thin pr-1">
          <AnimatePresence>
            {room.players.map((p) => {
              const isMe = p.id === playerId;
              const ready = p.ready || p.isHost;
              return (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg border transition",
                    ready
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-white/10 bg-white/5",
                    !p.connected && "opacity-50"
                  )}
                >
                  <div
                    className={cn(
                      "w-9 h-9 rounded-full bg-gradient-to-br from-felt-300 to-felt-600 flex items-center justify-center text-xl shrink-0",
                      isMe && "from-gold-400 to-gold-700"
                    )}
                  >
                    {p.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{p.name}</span>
                      {isMe && (
                        <span className="chip bg-gold-500/20 text-gold-300 text-[10px]">
                          You
                        </span>
                      )}
                      {p.isHost && (
                        <Crown
                          className="w-3.5 h-3.5 text-gold-400"
                          aria-label="Host"
                        />
                      )}
                      {!p.connected && (
                        <span title="Disconnected" className="text-white/40">
                          <WifiOff className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-white/50">
                      {p.isHost
                        ? "Host"
                        : p.ready
                        ? "Ready"
                        : "Waiting…"}
                    </div>
                  </div>
                  {ready ? (
                    <div className="chip bg-emerald-500/20 text-emerald-300">
                      <Check className="w-3 h-3" /> Ready
                    </div>
                  ) : (
                    <div className="chip bg-white/10 text-white/60">
                      …
                    </div>
                  )}
                  {isHost && !p.isHost && (
                    <button
                      onClick={() => {
                        if (confirm(`Remove ${p.name} from the room?`)) {
                          kickPlayer(p.id);
                        }
                      }}
                      title={`Remove ${p.name}`}
                      className="ml-1 w-7 h-7 rounded-md flex items-center justify-center text-white/40 hover:text-red-300 hover:bg-red-500/15 transition"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {Array.from({
            length: Math.max(0, room.minPlayers - room.players.length),
          }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-dashed border-white/10 text-white/40 text-sm"
            >
              <div className="w-9 h-9 rounded-full border border-dashed border-white/15" />
              <span>Waiting for player…</span>
            </div>
          ))}
        </div>

        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 flex items-start gap-2 text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-md px-2.5 py-2"
            onClick={clearError}
          >
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </motion.div>
        )}

        {room.gameType === "blackjack"
          ? (() => {
              const s = room.settings as {
                startingChips?: number;
                minBet?: number;
                maxBet?: number;
              };
              return (
                <div className="mb-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm">
                  <div className="text-xs uppercase tracking-widest text-white/60 mb-1.5">
                    Blackjack
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-gold-300 font-bold">
                        ${s.startingChips ?? 1000}
                      </div>
                      <div className="text-[10px] text-white/50">Chips</div>
                    </div>
                    <div>
                      <div className="text-gold-300 font-bold">
                        ${s.minBet ?? 10}
                      </div>
                      <div className="text-[10px] text-white/50">Min bet</div>
                    </div>
                    <div>
                      <div className="text-gold-300 font-bold">
                        ${s.maxBet ?? 500}
                      </div>
                      <div className="text-[10px] text-white/50">Max bet</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-white/45 mt-2">
                    Dealer stands on 17 · Blackjack pays 3:2 · up to 7 players.
                  </div>
                </div>
              );
            })()
          : room.gameType === "mendikot" ? (
              <div className="mb-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm">
                <div className="text-xs uppercase tracking-widest text-white/60 mb-1.5">
                  Mendikot
                </div>
                <div className="text-white/70 text-[13px] leading-relaxed">
                  4 players in 2 teams — partners sit opposite. Capture the four{" "}
                  <b className="text-gold-300">10s</b> to win. Empty seats are
                  filled with AI, so the game always starts with exactly 4
                  players.
                </div>
              </div>
            ) : (() => {
              const maxCards =
                (room.settings as { maxCards?: number }).maxCards ?? 7;
              const playerCount = Math.max(1, room.players.length);
              const deckCap = Math.floor(52 / playerCount);
              const effectivePeak = Math.min(maxCards, deckCap);
              const effectiveRounds = 2 * effectivePeak - 1;
              const capped = maxCards > deckCap;
              return (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs uppercase tracking-widest text-white/60">
                      Game Length {!isHost && "· host controls"}
                    </div>
                    <div className="text-[11px] text-white/65">
                      <span className="text-gold-400 font-semibold">
                        {effectiveRounds}
                      </span>{" "}
                      rounds
                    </div>
                  </div>
                  <div className="grid grid-cols-6 gap-1">
                    {[2, 3, 4, 5, 6, 7].map((max) => {
                      const isSelected = maxCards === max;
                      return (
                        <button
                          key={max}
                          disabled={!isHost}
                          onClick={() =>
                            isHost && updateSettings({ maxCards: max })
                          }
                          className={cn(
                            "h-11 rounded-md border text-center transition leading-tight",
                            isSelected
                              ? "border-gold-400 bg-gold-500/15 text-gold-300 shadow-glow-soft"
                              : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
                            !isHost && "cursor-not-allowed opacity-70"
                          )}
                          title={`${2 * max - 1} rounds (1 → ${max} → 1)`}
                        >
                          <div className="text-sm font-semibold">{max}</div>
                          <div className="text-[9px] opacity-80">
                            {2 * max - 1}r
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="text-[10px] text-white/45 mt-1.5">
                    Cards per round: 1 → {effectivePeak} → 1.
                    {capped && (
                      <span className="text-amber-300/90 ml-1">
                        Capped to {effectivePeak} by deck size ({playerCount}{" "}
                        players × {effectivePeak} cards).
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

        {isHost ? (
          <button
            onClick={startGame}
            disabled={!canStart}
            className="btn-primary w-full"
          >
            <Play className="w-4 h-4" />
            {!enoughPlayers
              ? `Waiting for ${room.minPlayers - room.players.length} more player${room.minPlayers - room.players.length === 1 ? "" : "s"}…`
              : !allReady
              ? "Waiting for everyone to ready up…"
              : "Start Game"}
          </button>
        ) : (
          <button
            onClick={() => toggleReady(!me?.ready)}
            className={cn(
              "btn w-full",
              me?.ready
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                : "bg-gold-500 text-ink-900 hover:bg-gold-400"
            )}
          >
            {me?.ready ? (
              <>
                <Check className="w-4 h-4" /> Ready — click to unready
              </>
            ) : (
              <>
                <Play className="w-4 h-4" /> Ready Up
              </>
            )}
          </button>
        )}

        <div className="text-[11px] text-white/40 text-center mt-4">
          {room.gameType === "blackjack"
            ? "Place a bet, then beat the dealer's hand without going over 21."
            : room.gameType === "mendikot"
            ? "Choose a secret trump, win tricks, and capture the four 10s with your partner."
            : "Trump rotates ♠ → ♦ → ♣ → ♥ each round. Make exactly your bid: score 10 + bid. Miss it: score 0."}
        </div>
      </motion.div>
    </div>
  );
}
