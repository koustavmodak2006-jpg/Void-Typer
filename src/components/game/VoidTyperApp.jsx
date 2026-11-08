import { useCallback, useState } from 'react';
import LandingScreen from './LandingScreen.jsx';
import PlayerModal from './PlayerModal.jsx';
import TutorialModal from './TutorialModal.jsx';
import SoundSettingsModal from './SoundSettingsModal.jsx';
import GameScreen from './GameScreen.jsx';
import ResultsScreen from './ResultsScreen.jsx';
import RecordsScreen from './RecordsScreen.jsx';
import { useAudioUnlock } from '../../hooks/useAudio.js';
import {
  getLastPlayerName,
  saveLastPlayerName,
  addRecord,
} from '../../utils/storage.js';

/**
 * VOID TYPER — application root / screen state machine.
 *
 * landing → (player modal) → game → results → (play again | menu | records)
 */
export default function VoidTyperApp() {
  useAudioUnlock();

  const [screen, setScreen] = useState('landing'); // landing | game | results | records
  const [modal, setModal] = useState(null); // player | howto | sound | null
  const [playerName, setPlayerName] = useState(() => getLastPlayerName());
  const [finalStats, setFinalStats] = useState(null);
  const [isBest, setIsBest] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  const [recordsReturnTo, setRecordsReturnTo] = useState('landing'); // where BACK goes

  const openPlayerModal = useCallback(() => setModal('player'), []);
  const openHowTo = useCallback(() => setModal('howto'), []);
  const openSound = useCallback(() => setModal('sound'), []);
  const closeModal = useCallback(() => setModal(null), []);

  const openRecords = useCallback((from) => {
    setRecordsReturnTo(from);
    setScreen('records');
    setModal(null);
  }, []);

  const confirmPlayer = useCallback((name) => {
    setPlayerName(name);
    saveLastPlayerName(name);
    setModal(null);
    setGameKey((k) => k + 1);
    setScreen('game');
  }, []);

  const handleGameOver = useCallback((stats) => {
    // Persist the completed session exactly once.
    const { record, isBest: best } = addRecord({
      playerName: stats.playerName,
      score: stats.score,
      wordsDestroyed: stats.wordsDestroyed,
      correctWords: stats.correctWords,
      incorrectSubmissions: stats.incorrectSubmissions,
      wpm: stats.wpm,
      accuracy: stats.accuracy,
      level: stats.level,
      elapsedMs: stats.elapsedMs,
      mistakes: stats.mistakes,
    });
    setFinalStats({ ...stats, playerName: record.playerName });
    setIsBest(best);
    setScreen('results');
  }, []);

  const playAgain = useCallback(() => {
    setGameKey((k) => k + 1);
    setScreen('game');
  }, []);

  const mainMenu = useCallback(() => {
    setScreen('landing');
    setModal(null);
  }, []);

  const backFromRecords = useCallback(() => {
    setScreen(recordsReturnTo);
  }, [recordsReturnTo]);

  return (
    <div className="vt-root">
      {screen === 'landing' ? (
        <LandingScreen
          onStart={openPlayerModal}
          onRecords={() => openRecords('landing')}
          onHowTo={openHowTo}
          onSound={openSound}
        />
      ) : null}

      {screen === 'game' ? (
        <GameScreen
          key={gameKey}
          playerName={playerName}
          onGameOver={handleGameOver}
          onAbort={mainMenu}
        />
      ) : null}

      {screen === 'results' && finalStats ? (
        <ResultsScreen
          stats={finalStats}
          isBest={isBest}
          onPlayAgain={playAgain}
          onMainMenu={mainMenu}
          onViewRecords={() => openRecords('results')}
        />
      ) : null}

      {screen === 'records' ? (
        <RecordsScreen onBack={backFromRecords} />
      ) : null}

      {modal === 'player' ? (
        <PlayerModal initialName={playerName} onConfirm={confirmPlayer} onCancel={closeModal} />
      ) : null}

      {modal === 'howto' ? <TutorialModal onClose={closeModal} /> : null}

      {modal === 'sound' ? <SoundSettingsModal onClose={closeModal} /> : null}
    </div>
  );
}
