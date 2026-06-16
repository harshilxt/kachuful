import { useNavigate } from "react-router-dom";
import { useMpStore } from "../../../store/multiplayerStore";
import { UnoTable } from "../components/UnoTable";
import type { UnoGameState } from "../engine/types";

export function MpUnoScreen() {
  const {
    gameState,
    playerId,
    room,
    sendAction,
    acknowledgeRound,
    returnToLobby,
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
    <UnoTable
      state={gameState as unknown as UnoGameState}
      youId={playerId}
      isHost={isHost}
      onAction={sendAction}
      onNextRound={acknowledgeRound}
      onReturnToLobby={returnToLobby}
      onLeave={() => {
        leaveRoom();
        navigate("/online");
      }}
      onKick={isHost ? kickPlayer : undefined}
    />
  );
}
