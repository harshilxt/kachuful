import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useMpStore } from "../../store/multiplayerStore";
import { ArrowLeft, KeyRound, Plus } from "lucide-react";

export function MpHubScreen() {
  const { reset, pendingGameType } = useMpStore();
  const navigate = useNavigate();

  const handleBack = () => {
    reset();
    navigate(`/game/${pendingGameType}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 table-felt" />
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_30%,rgba(230,193,119,.4),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(91,156,125,.5),transparent_40%)]" />

      <button
        onClick={handleBack}
        className="absolute top-4 left-4 z-10 btn-ghost"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel relative w-full max-w-md p-7"
      >
        <div className="text-center mb-6">
          <div className="text-xs uppercase tracking-[0.3em] text-white/60">
            {pendingGameType === "blackjack"
              ? "Blackjack"
              : pendingGameType === "uno"
              ? "UNO"
              : "Kachu Ful"}{" "}
            · Online
          </div>
          <h1 className="font-display text-3xl font-bold mt-1 bg-gradient-to-b from-gold-400 to-gold-700 bg-clip-text text-transparent">
            Play with friends
          </h1>
          <p className="text-sm text-white/65 mt-2">
            Create a room and share the code, or join an existing room.
          </p>
        </div>

        <button
          onClick={() => navigate("/online/create")}
          className="w-full p-4 rounded-xl border border-gold-500/40 bg-gold-500/10 hover:bg-gold-500/20 transition flex items-center gap-4"
        >
          <div className="w-11 h-11 rounded-lg bg-gold-500/30 flex items-center justify-center">
            <Plus className="w-5 h-5 text-gold-300" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-base">Create Room</div>
            <div className="text-xs text-white/60">
              You'll get a code to share with friends
            </div>
          </div>
        </button>

        <button
          onClick={() => navigate("/online/join")}
          className="w-full mt-3 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition flex items-center gap-4"
        >
          <div className="w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-base">Join Room</div>
            <div className="text-xs text-white/60">
              Enter the code your friend gave you
            </div>
          </div>
        </button>

        <div className="text-[11px] text-white/45 text-center mt-5 leading-relaxed">
          Real-time over WebSockets. Server is authoritative for fairness
          (you can't peek at other players' cards).
        </div>
      </motion.div>
    </div>
  );
}
