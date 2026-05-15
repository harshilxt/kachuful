import { useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useMpStore } from "../../store/multiplayerStore";
import { MpLobbyScreen } from "./MpLobbyScreen";
import { MpGameScreen } from "./MpGameScreen";
import { MpGameOverScreen } from "./MpGameOverScreen";

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

  if (room.phase === "finished") return <MpGameOverScreen />;
  if (room.phase === "playing") return <MpGameScreen />;
  return <MpLobbyScreen />;
}
