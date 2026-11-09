import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { socket, CreatedRoom, resendPendingAnswer } from "./socket";
import { saveSession, getSession, clearSession } from "./session";
import {
  GameView,
  Quiz,
  PlayerStanding,
  QuestionStartPayload,
  QuestionResultsPayload,
  SavedQuiz,
} from "./types";

import HomePage from "./components/HomePage";
import HostSetup from "./components/host/HostSetup";
import HostLobby from "./components/host/HostLobby";
import HostGame from "./components/host/HostGame";
import QuizLibrary from "./components/host/QuizLibrary";
import PlayerJoin from "./components/player/PlayerJoin";
import PlayerLobby from "./components/player/PlayerLobby";
import PlayerAnswering from "./components/player/PlayerAnswering";
import FinalPodium from "./components/shared/FinalPodium";
import Confetti from "./components/shared/Confetti";
import Icon from "./components/shared/Icon";

type LobbyPlayer = { id: string; nickname: string; connected: boolean };
type PauseReason = "host" | "host-disconnected";
type Connection = "connected" | "reconnecting";

export default function App() {
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get("code") ?? "";

  const [view, setView] = useState<GameView>(initialCode ? "player-join" : "home");
  const [notice, setNotice] = useState("");
  const [joinCode, setJoinCode] = useState(initialCode);

  // Host state
  const [roomCode, setRoomCode] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [savedQuizToLoad, setSavedQuizToLoad] = useState<SavedQuiz | null>(null);
  const [showProblems, setShowProblems] = useState(false);

  // Shared game state
  const [question, setQuestion] = useState<QuestionStartPayload | null>(null);
  const [results, setResults] = useState<QuestionResultsPayload | null>(null);
  const [finalStandings, setFinalStandings] = useState<PlayerStanding[]>([]);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [playerCount, setPlayerCount] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [paused, setPaused] = useState<PauseReason | null>(null);
  const [hostAway, setHostAway] = useState(false);

  // Player state
  const [nickname, setNickname] = useState("");
  const [answerLocked, setAnswerLocked] = useState(false);

  // Connection state
  const [connection, setConnection] = useState<Connection>("connected");
  const [restoring, setRestoring] = useState(() => {
    const s = getSession();
    return !!s && (!initialCode || s.roomCode === initialCode.toUpperCase());
  });

  const resetToHome = useCallback((message = "") => {
    clearSession();
    setPaused(null);
    setHostAway(false);
    setQuestion(null);
    setResults(null);
    setPlayers([]);
    setRoomCode("");
    setNotice(message);
    setView("home");
  }, []);

  // ── Session restore: on first connect and after every reconnect ──────────
  const viewRef = useRef(view);
  viewRef.current = view;

  const restoreSession = useCallback(() => {
    const session = getSession();
    if (!session || (initialCode && session.roomCode !== initialCode.toUpperCase() && viewRef.current === "player-join")) {
      setRestoring(false);
      return;
    }
    const fail = () => {
      setRestoring(false);
      const inGame = viewRef.current !== "home" && viewRef.current !== "player-join";
      resetToHome(inGame ? "The game is no longer available." : "");
      if (!inGame && initialCode) setView("player-join");
    };

    if (session.role === "player") {
      socket.emit(
        "reconnect-to-room",
        { code: session.roomCode, playerToken: session.playerToken },
        (res: { ok: boolean; reason?: string; roomCode: string; nickname: string; state: string }) => {
          if (!res.ok && res.reason === "not-in-room") {
            // The room still exists, we were just dropped from it: offer to join again.
            clearSession();
            setRestoring(false);
            setJoinCode(res.roomCode);
            setNotice(
              res.state === "lobby"
                ? "You were away too long and left the waiting room. Join again below."
                : "You were removed from this game.",
            );
            setView(res.state === "lobby" ? "player-join" : "home");
            return;
          }
          if (!res.ok) return fail();
          setRestoring(false);
          setRoomCode(res.roomCode);
          setNickname(res.nickname);
          resendPendingAnswer();
          // Question / results / podium views are set by the events the server replays.
          if (res.state === "lobby") setView("player-lobby");
        },
      );
    } else {
      socket.emit(
        "reconnect-host",
        { code: session.roomCode, hostToken: session.hostToken },
        (res: {
          ok: boolean;
          roomCode: string;
          qrCodeDataUrl: string;
          quiz: Quiz;
          state: string;
          players: LobbyPlayer[];
          playerCount: number;
          answeredCount: number;
        }) => {
          if (!res.ok) return fail();
          setRestoring(false);
          setRoomCode(res.roomCode);
          setQrCode(res.qrCodeDataUrl);
          setQuiz(res.quiz);
          setPlayers(res.players);
          setPlayerCount(res.playerCount);
          setAnsweredCount(res.answeredCount);
          setView(res.state === "lobby" ? "host-lobby" : res.state === "final-results" ? "player-final" : "host-game");
        },
      );
    }
  }, [initialCode, resetToHome]);

  // Don't block the UI forever if the server is unreachable; restore still runs on connect.
  useEffect(() => {
    if (!restoring) return;
    const t = setTimeout(() => setRestoring(false), 8000);
    return () => clearTimeout(t);
  }, [restoring]);

  useEffect(() => {
    const onConnect = () => {
      setConnection("connected");
      restoreSession();
    };
    const onDisconnect = (reason: string) => {
      // A server-side kick or our own disconnect() won't reconnect on its own.
      if (reason === "io server disconnect") socket.connect();
      setConnection("reconnecting");
    };
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    if (socket.connected) restoreSession();
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [restoreSession]);

  // ── Game events (registered once; setters use functional updates) ────────
  useEffect(() => {
    const isHostView = (v: GameView) => v.startsWith("host");
    const handlers: Record<string, (...args: any[]) => void> = {
      "game-starting": () =>
        setView((prev) => (prev === "host-lobby" ? "host-game" : prev === "player-lobby" ? "player-answering" : prev)),
      "question-start": (payload: QuestionStartPayload) => {
        setQuestion(payload);
        setResults(null);
        setAnswerLocked(false);
        setAnsweredCount(0);
        setView((prev) => (isHostView(prev) ? "host-game" : "player-answering"));
      },
      "answer-locked": () => setAnswerLocked(true),
      "player-answered": (d: { answeredCount: number }) => setAnsweredCount(d.answeredCount),
      "question-results": (payload: QuestionResultsPayload) => {
        setResults(payload);
        setView((prev) => (isHostView(prev) ? "host-game" : "player-results"));
      },
      "game-end": (payload: { players: PlayerStanding[] }) => {
        setFinalStandings(payload.players);
        setPaused(null);
        setShowConfetti(true);
        setView("player-final");
        setTimeout(() => setShowConfetti(false), 6000);
        clearSession();
      },
      "game-paused": (d: { reason: PauseReason }) => setPaused(d.reason),
      "game-resumed": (d: { serverTime: number }) => {
        setPaused(null);
        resendPendingAnswer();
        setQuestion((q) => (q ? { ...q, serverTime: d.serverTime } : q));
      },
      "host-away": () => setHostAway(true),
      "host-reconnected": (d: { paused: boolean }) => {
        setHostAway(false);
        if (d.paused) setPaused("host");
      },
      "host-disconnected": () => resetToHome("The host ended the game."),
      kicked: () => resetToHome("You were removed from the game."),
      "player-joined": (d: { id: string; nickname: string; playerCount: number }) => {
        setPlayers((prev) => (prev.some((p) => p.id === d.id) ? prev : [...prev, { id: d.id, nickname: d.nickname, connected: true }]));
        setPlayerCount(d.playerCount);
      },
      "player-left": (d: { id: string; playerCount: number }) => {
        setPlayers((prev) => prev.filter((p) => p.id !== d.id));
        setPlayerCount(d.playerCount);
      },
      "player-disconnected": (d: { id: string; playerCount: number }) => {
        setPlayers((prev) => prev.map((p) => (p.id === d.id ? { ...p, connected: false } : p)));
        setPlayerCount(d.playerCount);
      },
      "player-reconnected": (d: { id: string; oldId: string; nickname: string; playerCount: number }) => {
        setPlayers((prev) =>
          prev.some((p) => p.id === d.oldId)
            ? prev.map((p) => (p.id === d.oldId ? { ...p, id: d.id, connected: true } : p))
            : [...prev, { id: d.id, nickname: d.nickname, connected: true }],
        );
        setPlayerCount(d.playerCount);
      },
    };
    for (const [event, fn] of Object.entries(handlers)) socket.on(event, fn);
    return () => {
      for (const [event, fn] of Object.entries(handlers)) socket.off(event, fn);
    };
  }, [resetToHome]);

  // ── Host callbacks ───────────────────────────────────────────────────────
  const handleCreateRoom = useCallback((q: Quiz, room: CreatedRoom) => {
    setQuiz(q);
    setRoomCode(room.code);
    setQrCode(room.qrCodeDataUrl);
    setPlayers([]);
    setView("host-lobby");
    saveSession({ role: "host", roomCode: room.code, hostToken: room.hostToken });
  }, []);

  const openEditor = useCallback((q: SavedQuiz | null, withProblems = false) => {
    setSavedQuizToLoad(q);
    setShowProblems(withProblems);
    setView("host-setup");
  }, []);

  const handleStartGame = useCallback(() => {
    socket.emit("start-game", { code: roomCode }, (res: { ok: boolean; error?: string }) => {
      if (!res.ok) setNotice(res.error ?? "Could not start game");
    });
  }, [roomCode]);

  const handleNextQuestion = useCallback(() => socket.emit("next-question", { code: roomCode }), [roomCode]);
  const handlePause = useCallback(() => socket.emit("pause-game", { code: roomCode }), [roomCode]);
  const handleResume = useCallback(() => socket.emit("resume-game", { code: roomCode }), [roomCode]);

  const leaveRoom = useCallback(() => {
    socket.emit("leave-room");
    resetToHome();
  }, [resetToHome]);

  // ── Player callbacks ─────────────────────────────────────────────────────
  const handleJoined = useCallback((code: string, nick: string, playerToken: string) => {
    setNotice("");
    setRoomCode(code);
    setNickname(nick);
    setView("player-lobby");
    saveSession({ role: "player", roomCode: code, nickname: nick, playerToken });
  }, []);

  // ── Overlays ─────────────────────────────────────────────────────────────
  const isHost = view.startsWith("host");
  const inRoom = view !== "home" && view !== "player-join" && view !== "host-setup" && view !== "host-library";

  const overlays = (
    <>
      {connection === "reconnecting" && inRoom && (
        <div className="conn-banner" role="status">
          <Icon name="wifiOff" /> Connection lost, reconnecting…
        </div>
      )}
      {restoring && (
        <div className="overlay" role="status">
          <p className="muted animate-pulse">Rejoining your game…</p>
        </div>
      )}
      {!restoring && paused && view !== "player-final" && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="pause-title">
          <div className="card stack text-center w-narrow" style={{ alignItems: "center" }}>
            <Icon name="pause" className="icon-lg" />
            <h2 id="pause-title">Game paused</h2>
            <p className="muted">
              {isHost
                ? "The timer is stopped. Players keep their place."
                : paused === "host-disconnected"
                  ? "The host lost their connection. The game resumes when they come back."
                  : "The host paused the game."}
            </p>
            {isHost && (
              <div className="row" style={{ gap: "var(--s-3)" }}>
                <button className="btn btn-secondary" onClick={leaveRoom}>
                  End game
                </button>
                <button className="btn btn-primary" onClick={handleResume}>
                  <Icon name="play" /> Resume
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {!paused && hostAway && !isHost && inRoom && view !== "player-final" && (
        <div className="conn-banner" role="status">
          <Icon name="wifiOff" /> The host is reconnecting…
        </div>
      )}
    </>
  );

  const noticeBar = notice && (
    <div className="notice-bar" role="status">
      <span>{notice}</span>
      <button className="btn btn-secondary btn-sm btn-icon" aria-label="Dismiss" onClick={() => setNotice("")}>
        <Icon name="x" />
      </button>
    </div>
  );

  const page = (() => {
    switch (view) {
      case "home":
        return (
          <>
            {noticeBar}
            <HomePage
              onHost={() => openEditor(null)}
              onJoin={() => setView("player-join")}
              onLibrary={() => setView("host-library")}
            />
          </>
        );
      case "host-library":
        return (
          <QuizLibrary
            onBack={() => setView("home")}
            onNew={() => openEditor(null)}
            onEdit={(q) => openEditor(q)}
            onFix={(q) => openEditor(q, true)}
            onCreated={handleCreateRoom}
          />
        );
      case "host-setup":
        return (
          <HostSetup
            key={savedQuizToLoad?.id ?? "new"}
            onCreated={handleCreateRoom}
            onBack={() => setView("host-library")}
            initialQuiz={savedQuizToLoad ?? undefined}
            showProblemsInitially={showProblems}
          />
        );
      case "host-lobby":
        return (
          <HostLobby roomCode={roomCode} qrCode={qrCode} players={players} onStart={handleStartGame} onBack={leaveRoom} />
        );
      case "host-game":
        return (
          <HostGame
            roomCode={roomCode}
            question={question}
            results={results}
            players={players}
            answeredCount={answeredCount}
            totalPlayers={playerCount || players.length}
            onNext={handleNextQuestion}
            onPause={handlePause}
            totalQuestions={quiz?.questions.length ?? 0}
          />
        );
      case "player-join":
        return (
          <>
            {noticeBar}
            <PlayerJoin key={joinCode} initialCode={joinCode} onJoined={handleJoined} onBack={() => setView("home")} />
          </>
        );
      case "player-lobby":
        return <PlayerLobby nickname={nickname} roomCode={roomCode} onLeave={leaveRoom} />;
      case "player-answering":
      case "player-results":
        return (
          <PlayerAnswering
            question={question}
            results={view === "player-results" ? results : null}
            nickname={nickname}
            alreadyAnswered={answerLocked}
          />
        );
      case "player-final":
        return (
          <>
            {showConfetti && <Confetti />}
            <FinalPodium players={finalStandings} myNickname={nickname} onPlayAgain={leaveRoom} />
          </>
        );
      default:
        return null;
    }
  })();

  return (
    <>
      {overlays}
      {page}
    </>
  );
}
