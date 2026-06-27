import { useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { DashboardScreen } from "./screens/DashboardScreen";
import { KachufulHomeScreen } from "./games/kachuful/screens/KachufulHomeScreen";
import { BlackjackHomeScreen } from "./games/blackjack/screens/BlackjackHomeScreen";
import { UnoHomeScreen } from "./games/uno/screens/UnoHomeScreen";
import { SolitaireHomeScreen } from "./games/solitaire/screens/SolitaireHomeScreen";
import { SolitaireGameScreen } from "./games/solitaire/screens/SolitaireGameScreen";
import { GameScreen } from "./games/kachuful/screens/SpGameScreen";
import { GameOverScreen } from "./games/kachuful/screens/SpGameOverScreen";
import { MpHubScreen } from "./screens/multiplayer/MpHubScreen";
import { MpCreateScreen } from "./screens/multiplayer/MpCreateScreen";
import { MpJoinScreen } from "./screens/multiplayer/MpJoinScreen";
import { RoomShell } from "./screens/multiplayer/RoomShell";
import { AboutPage } from "./screens/pages/AboutPage";
import { PrivacyPage } from "./screens/pages/PrivacyPage";
import { TermsPage } from "./screens/pages/TermsPage";
import { ContactPage } from "./screens/pages/ContactPage";
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
      <Route path="/" element={<DashboardScreen />} />
      <Route path="/game/kachuful" element={<KachufulHomeScreen />} />
      <Route path="/game/blackjack" element={<BlackjackHomeScreen />} />
      <Route path="/game/uno" element={<UnoHomeScreen />} />
      <Route path="/game/solitaire" element={<SolitaireHomeScreen />} />
      <Route path="/game/solitaire/play" element={<SolitaireGameScreen />} />
      <Route path="/play" element={<GameScreen />} />
      <Route path="/play/over" element={<GameOverScreen />} />
      <Route path="/online" element={<MpHubScreen />} />
      <Route path="/online/create" element={<MpCreateScreen />} />
      <Route path="/online/join" element={<MpJoinScreen />} />
      <Route path="/online/join/:code" element={<MpJoinScreen />} />
      <Route path="/room/:code" element={<RoomShell />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
