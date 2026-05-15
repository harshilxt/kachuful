import { useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { HomeScreen } from "./screens/HomeScreen";
import { GameScreen } from "./screens/GameScreen";
import { GameOverScreen } from "./screens/GameOverScreen";
import { MpHubScreen } from "./screens/multiplayer/MpHubScreen";
import { MpCreateScreen } from "./screens/multiplayer/MpCreateScreen";
import { MpJoinScreen } from "./screens/multiplayer/MpJoinScreen";
import { RoomShell } from "./screens/multiplayer/RoomShell";
import { useGameStore } from "./store/gameStore";
import { useMpStore } from "./store/multiplayerStore";
import { setMpNavigator } from "./lib/mpNavigator";

if (typeof window !== "undefined" && import.meta.env.DEV) {
  (window as unknown as { __store: typeof useGameStore }).__store = useGameStore;
  (window as unknown as { __mp: typeof useMpStore }).__mp = useMpStore;
}

export default function App() {
  const navigate = useNavigate();

  useEffect(() => {
    setMpNavigator(navigate);
    return () => setMpNavigator(null);
  }, [navigate]);

  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/play" element={<GameScreen />} />
      <Route path="/play/over" element={<GameOverScreen />} />
      <Route path="/online" element={<MpHubScreen />} />
      <Route path="/online/create" element={<MpCreateScreen />} />
      <Route path="/online/join" element={<MpJoinScreen />} />
      <Route path="/online/join/:code" element={<MpJoinScreen />} />
      <Route path="/room/:code" element={<RoomShell />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
