import { useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useMpStore } from "../../store/multiplayerStore";
import { MpLobbyScreen } from "./MpLobbyScreen";
import { MpGameScreen } from "../../games/kachuful/screens/MpGameScreen";
import { MpGameOverScreen } from "../../games/kachuful/screens/MpGameOverScreen";
import { MpBlackjackScreen } from "../../games/blackjack/screens/MpBlackjackScreen";

export function RoomShell() {
  const { code } = useParams<{ code: string }>();
  const { room, roomCode, playerId, ensureConnected } = useMpStore();

  // Ensure socket is up (e.g. on hard refresh of /room/:code)
  useEffect(() => {
    ensureConnected();
  }, [ensureConnected]);

  // Not yet a member of this room → bounce to join page with code pre-filled
  if (!playerId || !room || (code && roomCode !== code.toUpperCase())) {
    if (!code) return <Navigate to="/online" replace />;
    return <Navigate to={`/online/join/${code.toUpperCase()}`} replace />;
  }

  // Blackjack: the table handles playing + round_over + game_over itself.
  if (room.gameType === "blackjack") {
    if (room.phase === "playing" || room.phase === "finished") {
      return <MpBlackjackScreen />;
    }
    return <MpLobbyScreen />;
  }

  // Kachu Ful
  if (room.phase === "finished") return <MpGameOverScreen />;
  if (room.phase === "playing") return <MpGameScreen />;
  return <MpLobbyScreen />;
}
