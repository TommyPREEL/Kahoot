import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { socket } from './socket';
import {
  GameView,
  Quiz,
  PlayerStanding,
  QuestionStartPayload,
  QuestionResultsPayload,
} from './types';

import HomePage from './components/HomePage';
import HostSetup from './components/host/HostSetup';
import HostLobby from './components/host/HostLobby';
import HostGame from './components/host/HostGame';
import PlayerJoin from './components/player/PlayerJoin';
import PlayerLobby from './components/player/PlayerLobby';
import PlayerAnswering from './components/player/PlayerAnswering';
import FinalPodium from './components/shared/FinalPodium';
import Confetti from './components/shared/Confetti';

export default function App() {
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get('code') ?? '';

  const [view, setView] = useState<GameView>(
    initialCode ? 'player-join' : 'home'
  );

  // Host state
  const [roomCode, setRoomCode]     = useState('');
  const [qrCode, setQrCode]         = useState('');
  const [quiz, setQuiz]             = useState<Quiz | null>(null);
  const [players, setPlayers]       = useState<{ id: string; nickname: string }[]>([]);

  // Shared game state
  const [question, setQuestion]     = useState<QuestionStartPayload | null>(null);
  const [results, setResults]       = useState<QuestionResultsPayload | null>(null);
  const [finalStandings, setFinalStandings] = useState<PlayerStanding[]>([]);
  const [answeredCount, setAnsweredCount]   = useState(0);
  const [playerCount, setPlayerCount]       = useState(0);
  const [showConfetti, setShowConfetti]     = useState(false);

  // Player state
  const [nickname, setNickname]     = useState('');
  const [myResults, setMyResults]   = useState<QuestionResultsPayload | null>(null);

  // ── Socket event setup ───────────────────────────────────────────────────
  useEffect(() => {
    socket.on('game-starting', () => {
      if (view === 'host-lobby') setView('host-game');
      if (view === 'player-lobby') setView('player-answering');
    });

    socket.on('question-start', (payload: QuestionStartPayload) => {
      setQuestion(payload);
      setResults(null);
      setAnsweredCount(0);
      setView(prev =>
        prev.startsWith('host') ? 'host-game' : 'player-answering'
      );
    });

    socket.on('player-answered', (data: { answeredCount: number; totalPlayers: number; nickname: string }) => {
      setAnsweredCount(data.answeredCount);
    });

    socket.on('question-results', (payload: QuestionResultsPayload) => {
      setResults(payload);
      setMyResults(payload);
      setView(prev =>
        prev.startsWith('host') ? 'host-game' : 'player-results'
      );
    });

    socket.on('game-end', (payload: { players: PlayerStanding[] }) => {
      setFinalStandings(payload.players);
      setShowConfetti(true);
      setView('player-final');
      setTimeout(() => setShowConfetti(false), 6000);
    });

    socket.on('host-disconnected', () => {
      alert('The host disconnected. Returning to home.');
      window.location.href = '/';
    });

    socket.on('kicked', () => {
      alert('You were kicked from the game.');
      window.location.href = '/';
    });

    socket.on('player-joined', (data: { id: string; nickname: string; playerCount: number }) => {
      setPlayers(prev => {
        if (prev.find(p => p.id === data.id)) return prev;
        return [...prev, { id: data.id, nickname: data.nickname }];
      });
      setPlayerCount(data.playerCount);
    });

    socket.on('player-left', (data: { id: string; playerCount: number }) => {
      setPlayers(prev => prev.filter(p => p.id !== data.id));
      setPlayerCount(data.playerCount);
    });

    return () => {
      socket.off('game-starting');
      socket.off('question-start');
      socket.off('player-answered');
      socket.off('question-results');
      socket.off('game-end');
      socket.off('host-disconnected');
      socket.off('kicked');
      socket.off('player-joined');
      socket.off('player-left');
    };
  }, [view]);

  // ── Host callbacks ───────────────────────────────────────────────────────
  const handleCreateRoom = useCallback((q: Quiz, code: string, qr: string) => {
    setQuiz(q);
    setRoomCode(code);
    setQrCode(qr);
    setPlayers([]);
    setView('host-lobby');
  }, []);

  const handleStartGame = useCallback(() => {
    socket.emit('start-game', { code: roomCode }, (res: { ok: boolean; error?: string }) => {
      if (!res.ok) alert(res.error ?? 'Could not start game');
    });
  }, [roomCode]);

  const handleNextQuestion = useCallback(() => {
    socket.emit('next-question', { code: roomCode });
  }, [roomCode]);

  // ── Player callbacks ─────────────────────────────────────────────────────
  const handleJoined = useCallback((code: string, nick: string) => {
    setRoomCode(code);
    setNickname(nick);
    setView('player-lobby');
  }, []);

  // ── View switcher ─────────────────────────────────────────────────────────
  if (view === 'home') {
    return <HomePage onHost={() => setView('host-setup')} onJoin={() => setView('player-join')} />;
  }

  if (view === 'host-setup') {
    return <HostSetup onCreated={handleCreateRoom} onBack={() => setView('home')} />;
  }

  if (view === 'host-lobby') {
    return (
      <HostLobby
        roomCode={roomCode}
        qrCode={qrCode}
        players={players}
        onStart={handleStartGame}
        onBack={() => setView('home')}
      />
    );
  }

  if (view === 'host-game') {
    return (
      <HostGame
        roomCode={roomCode}
        question={question}
        results={results}
        players={players}
        answeredCount={answeredCount}
        totalPlayers={playerCount || players.length}
        onNext={handleNextQuestion}
        totalQuestions={quiz?.questions.length ?? 0}
      />
    );
  }

  if (view === 'player-join') {
    return <PlayerJoin initialCode={initialCode} onJoined={handleJoined} onBack={() => setView('home')} />;
  }

  if (view === 'player-lobby') {
    return <PlayerLobby nickname={nickname} roomCode={roomCode} />;
  }

  if (view === 'player-answering' || view === 'player-results') {
    return (
      <PlayerAnswering
        question={question}
        results={view === 'player-results' ? myResults : null}
        nickname={nickname}
      />
    );
  }

  if (view === 'player-final') {
    return (
      <>
        {showConfetti && <Confetti />}
        <FinalPodium
          players={finalStandings}
          myNickname={nickname}
          onPlayAgain={() => { window.location.href = '/'; }}
        />
      </>
    );
  }

  return null;
}
