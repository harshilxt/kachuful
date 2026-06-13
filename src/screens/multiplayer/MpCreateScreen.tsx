import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMpStore } from "../../store/multiplayerStore";
import { ArrowLeft, Loader2, Sparkles, AlertCircle } from "lucide-react";

export function MpCreateScreen() {
  const { name, setName, createRoom, pending, errorMessage, pendingGameType } =
    useMpStore();
  const navigate = useNavigate();
  const [localName, setLocalName] = useState(name || "");

  const gameLabel = pendingGameType === "blackjack" ? "Blackjack" : "Kachu Ful";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localName.trim()) return;
    setName(localName);
    try {
      const code = await createRoom(localName, pendingGameType);
      navigate(`/room/${code}`);
    } catch {}
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 table-felt" />

      <button
        onClick={() => navigate("/online")}
        className="absolute top-4 left-4 z-10 btn-ghost"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel relative w-full max-w-md p-7"
      >
        <div className="text-center mb-5">
          <div className="text-xs uppercase tracking-[0.3em] text-white/60">
            Create {gameLabel} Room
          </div>
          <h1 className="font-display text-2xl font-bold mt-1">Pick a name</h1>
        </div>

        <label className="block">
          <span className="text-xs uppercase tracking-widest text-white/60">
            Display name
          </span>
          <input
            autoFocus
            value={localName}
            maxLength={18}
            onChange={(e) => setLocalName(e.target.value)}
            placeholder="Enter your name"
            className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 outline-none focus:border-gold-500 transition"
          />
          <div className="text-[10px] text-white/40 mt-1">
            Visible to other players in the room
          </div>
        </label>

        {errorMessage && (
          <div className="mt-3 flex items-start gap-2 text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-md px-2.5 py-2">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={!localName.trim() || pending}
          className="btn-primary w-full mt-5"
        >
          {pending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Creating…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" /> Create Room
            </>
          )}
        </button>
      </motion.form>
    </div>
  );
}
