import { useNavigate } from "react-router-dom";
import { useMpStore } from "../../../store/multiplayerStore";
import { GameTable } from "../components/GameTable";
import type { GameState } from "../engine/types";

export function MpGameScreen() {
  const {
    gameState,
    playerId,
    room,
    sendBid,
    sendPlay,
    acknowledgeRound,
    leaveRoom,
    kickPlayer,
  } = useMpStore();
  const navigate = useNavigate();

  if (!gameState || !playerId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="panel p-6 text-white/70">Loading game…</div>
      </div>
    );
  }

  // This screen only renders for Kachu Ful rooms (RoomShell dispatches by
  // gameType), so the union state is safely a Kachu Ful GameState here.
  const state = gameState as GameState;
  const isHost = room?.hostId === playerId;

  return (
    <GameTable
      state={state}
      humanId={playerId}
      onBid={sendBid}
      onPlay={(cardId) => {
        const card = state.hands[playerId]?.find((c) => c.id === cardId);
        if (card) sendPlay(card);
      }}
      onAcknowledgeRound={acknowledgeRound}
      canAcknowledgeRound={isHost}
      acknowledgeLabel={isHost ? undefined : "Waiting for host to continue…"}
      onLeave={() => {
        leaveRoom();
        navigate("/online");
      }}
      leaveConfirmMessage="Leave this room?"
      onKick={isHost ? kickPlayer : undefined}
    />
  );
}
