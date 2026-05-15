import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMpStore } from "../../store/multiplayerStore";
import { ArrowLeft, Loader2, KeyRound, AlertCircle } from "lucide-react";
import { ROOM_CODE_LENGTH } from "../../lib/protocol";

export function MpJoinScreen() {
  const { name, setName, joinRoom, pending, errorMessage, clearError } =
    useMpStore();
  const params = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const [localName, setLocalName] = useState(name || "");
  const [code, setCode] = useState((params.code ?? "").toUpperCase());

  // When the URL code changes, sync our input
  useEffect(() => {
    if (params.code) setCode(params.code.toUpperCase());
  }, [params.code]);

  useEffect(() => {
    clearError();
  }, [code, localName, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localName.trim() || code.length !== ROOM_CODE_LENGTH) return;
    setName(localName);
    try {
      const joined = await joinRoom(code, localName);
      navigate(`/room/${joined}`);
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
            Join Room
          </div>
          <h1 className="font-display text-2xl font-bold mt-1">
            {params.code
              ? `Joining room ${params.code.toUpperCase()}`
              : "Enter the room code"}
          </h1>
        </div>

        <label className="block mb-3">
          <span className="text-xs uppercase tracking-widest text-white/60">
            Display name
          </span>
          <input
            autoFocus={!!params.code}
            value={localName}
            maxLength={18}
            onChange={(e) => setLocalName(e.target.value)}
            placeholder="Your name"
            className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 outline-none focus:border-gold-500 transition"
          />
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-widest text-white/60">
            Room code
          </span>
          <input
            autoFocus={!params.code}
            value={code}
            maxLength={ROOM_CODE_LENGTH}
            onChange={(e) =>
              setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
            }
            placeholder={"X".repeat(ROOM_CODE_LENGTH)}
            className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-3 outline-none focus:border-gold-500 transition font-display text-2xl tracking-[0.4em] text-center uppercase"
          />
        </label>

        {errorMessage && (
          <div className="mt-3 flex items-start gap-2 text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-md px-2.5 py-2">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={
            !localName.trim() || code.length !== ROOM_CODE_LENGTH || pending
          }
          className="btn-primary w-full mt-5"
        >
          {pending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Joining…
            </>
          ) : (
            <>
              <KeyRound className="w-4 h-4" /> Join Room
            </>
          )}
        </button>
      </motion.form>
    </div>
  );
}
