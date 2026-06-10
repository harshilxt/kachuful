import { useNavigate } from "react-router-dom";
import { useMpStore } from "../../store/multiplayerStore";
import { GameTable } from "../../components/GameTable";

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

  const isHost = room?.hostId === playerId;

  return (
    <GameTable
      state={gameState}
      humanId={playerId}
      onBid={sendBid}
      onPlay={(cardId) => {
        const card = gameState.hands[playerId]?.find((c) => c.id === cardId);
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
