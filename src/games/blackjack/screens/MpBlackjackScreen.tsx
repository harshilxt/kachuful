import { useNavigate } from "react-router-dom";
import { useMpStore } from "../../../store/multiplayerStore";
import { BlackjackTable } from "../components/BlackjackTable";
import type { BjGameState } from "../engine/types";

export function MpBlackjackScreen() {
  const {
    gameState,
    playerId,
    room,
    sendAction,
    acknowledgeRound,
    leaveRoom,
    returnToLobby,
    kickPlayer,
  } = useMpStore();
  const navigate = useNavigate();

  if (!gameState || !playerId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="panel p-6 text-white/70">Loading table…</div>
      </div>
    );
  }

  const state = gameState as BjGameState;
  const isHost = room?.hostId === playerId;

  return (
    <BlackjackTable
      state={state}
      youId={playerId}
      isHost={isHost}
      onAction={sendAction}
      onNextRound={acknowledgeRound}
      onLeave={() => {
        leaveRoom();
        navigate("/online");
      }}
      onReturnToLobby={returnToLobby}
      onKick={isHost ? kickPlayer : undefined}
    />
  );
}
