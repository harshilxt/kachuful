import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useGameStore } from "../store/gameStore";
import { GameTable } from "../components/GameTable";

export function GameScreen() {
  const {
    state,
    humanId,
    beginRound,
    submitBid,
    submitPlay,
    acknowledgeRoundSummary,
    resetGame,
  } = useGameStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (state && state.phase === "idle") beginRound();
  }, [state, beginRound]);

  useEffect(() => {
    if (state && state.phase === "game_over") navigate("/play/over");
  }, [state, navigate]);

  if (!state || !humanId) return <Navigate to="/" replace />;

  return (
    <GameTable
      state={state}
      humanId={humanId}
      onBid={submitBid}
      onPlay={submitPlay}
      onAcknowledgeRound={acknowledgeRoundSummary}
      onLeave={() => {
        resetGame();
        navigate("/");
      }}
    />
  );
}
