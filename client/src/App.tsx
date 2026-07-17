import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { socket, saveSession, getSession, clearSession } from "./socket";
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

export default function App() {
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get("code") ?? "";

  const [view, setView] = useState<GameView>(
    initialCode ? "player-join" : "home",
  );

  // Host state
  const [roomCode, setRoomCode] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [players, setPlayers] = useState<{ id: string; nickname: string }[]>(
    [],
  );
  const [savedQuizToLoad, setSavedQuizToLoad] = useState<SavedQuiz | null>(
    null,
  );

  // Shared game state
  const [question, setQuestion] = useState<QuestionStartPayload | null>(null);
  const [results, setResults] = useState<QuestionResultsPayload | null>(null);
  const [finalStandings, setFinalStandings] = useState<PlayerStanding[]>([]);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [playerCount, setPlayerCount] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // Player state
  const [nickname, setNickname] = useState("");
  const [myResults, setMyResults] = useState<QuestionResultsPayload | null>(
    null,
  );

  // Reconnection state
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "reconnecting"
  >("connected");

  // ── Check for existing session on mount ───────────────────────────────────
  useEffect(() => {
    const session = getSession();
    if (session && session.isPlayer && !initialCode) {
      console.log("Found existing session, attempting to restore:", session);
      setIsReconnecting(true);

      // Wait for socket to connect, then try to reconnect
      if (socket.connected) {
        socket.emit(
          "reconnect-to-room",
          { code: session.roomCode, nickname: session.nickname },
          (res: any) => {
            if (res.ok) {
              console.log("Session restored successfully!", res);
              setRoomCode(res.roomCode);
              setNickname(res.nickname);
              setIsReconnecting(false);

              // Restore appropriate view
              if (res.state === "lobby") {
                setView("player-lobby");
              } else if (
                res.state === "starting" ||
                res.state === "question-active"
              ) {
                setView("player-answering");
              } else if (res.state === "question-results") {
                setView("player-results");
              } else if (res.state === "final-results") {
                setView("player-final");
              }
            } else {
              console.log("Session restore failed:", res.error);
              clearSession();
              setIsReconnecting(false);
            }
          },
        );
      }
    }
  }, [initialCode]);

  // ── Connection status monitoring ──────────────────────────────────────────
  useEffect(() => {
    const handleConnect = () => {
      console.log("Socket connected");
      setConnectionStatus("connected");
      setReconnectAttempt(0);

      // Try to restore session if we have one
      const session = getSession();
      if (session && session.isPlayer && isReconnecting) {
        console.log("Attempting to reconnect to session:", session);
        socket.emit(
          "reconnect-to-room",
          { code: session.roomCode, nickname: session.nickname },
          (res: any) => {
            if (res.ok) {
              console.log("Successfully reconnected!", res);
              setRoomCode(res.roomCode);
              setNickname(res.nickname);
              setIsReconnecting(false);

              // Restore appropriate view based on game state
              if (res.state === "lobby") {
                setView("player-lobby");
              } else if (
                res.state === "starting" ||
                res.state === "question-active"
              ) {
                setView("player-answering");
              } else if (res.state === "question-results") {
                setView("player-results");
              } else if (res.state === "final-results") {
                setView("player-final");
              }
            } else {
              console.log("Reconnection failed:", res.error);
              clearSession();
              setIsReconnecting(false);
              setView("home");
            }
          },
        );
      }
    };

    const handleDisconnect = () => {
      console.log("Socket disconnected");
      setConnectionStatus("disconnected");

      // Only show reconnecting if we have an active session
      const session = getSession();
      if (
        session &&
        session.isPlayer &&
        view !== "home" &&
        view !== "player-join"
      ) {
        setIsReconnecting(true);
      }
    };

    const handleReconnectAttempt = (attemptNumber: number) => {
      console.log("Reconnect attempt:", attemptNumber);
      setConnectionStatus("reconnecting");
      setReconnectAttempt(attemptNumber);
    };

    const handleReconnectError = (error: Error) => {
      console.log("Reconnection error:", error);
    };

    const handleReconnectFailed = () => {
      console.log("Reconnection failed");
      setConnectionStatus("disconnected");
      setIsReconnecting(false);
      clearSession();
      alert("Could not reconnect to the game. Returning to home.");
      window.location.href = "/";
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("reconnect_attempt", handleReconnectAttempt);
    socket.on("reconnect_error", handleReconnectError);
    socket.on("reconnect_failed", handleReconnectFailed);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("reconnect_attempt", handleReconnectAttempt);
      socket.off("reconnect_error", handleReconnectError);
      socket.off("reconnect_failed", handleReconnectFailed);
    };
  }, [view, isReconnecting]);

  // ── Socket event setup ───────────────────────────────────────────────────
  useEffect(() => {
    socket.on("game-starting", () => {
      if (view === "host-lobby") setView("host-game");
      if (view === "player-lobby") setView("player-answering");
    });

    socket.on("question-start", (payload: QuestionStartPayload) => {
      setQuestion(payload);
      setResults(null);
      setAnsweredCount(0);
      setView((prev) =>
        prev.startsWith("host") ? "host-game" : "player-answering",
      );
    });

    socket.on(
      "player-answered",
      (data: {
        answeredCount: number;
        totalPlayers: number;
        nickname: string;
      }) => {
        setAnsweredCount(data.answeredCount);
      },
    );

    socket.on("question-results", (payload: QuestionResultsPayload) => {
      setResults(payload);
      setMyResults(payload);
      setView((prev) =>
        prev.startsWith("host") ? "host-game" : "player-results",
      );
    });

    socket.on("game-end", (payload: { players: PlayerStanding[] }) => {
      setFinalStandings(payload.players);
      setShowConfetti(true);
      setView("player-final");
      setTimeout(() => setShowConfetti(false), 6000);

      // Clear session when game ends
      clearSession();
    });

    socket.on("host-disconnected", () => {
      clearSession();
      alert("The host disconnected. Returning to home.");
      window.location.href = "/";
    });

    socket.on("kicked", () => {
      clearSession();
      alert("You were kicked from the game.");
      window.location.href = "/";
    });

    socket.on(
      "player-joined",
      (data: { id: string; nickname: string; playerCount: number }) => {
        setPlayers((prev) => {
          if (prev.find((p) => p.id === data.id)) return prev;
          return [...prev, { id: data.id, nickname: data.nickname }];
        });
        setPlayerCount(data.playerCount);
      },
    );

    socket.on("player-left", (data: { id: string; playerCount: number }) => {
      setPlayers((prev) => prev.filter((p) => p.id !== data.id));
      setPlayerCount(data.playerCount);
    });

    socket.on(
      "player-disconnected",
      (data: { id: string; nickname: string; playerCount: number }) => {
        console.log(`Player ${data.nickname} disconnected`);
        setPlayerCount(data.playerCount);
        // Optionally update UI to show player as disconnected
      },
    );

    socket.on(
      "player-reconnected",
      (data: { id: string; nickname: string; playerCount: number }) => {
        console.log(`Player ${data.nickname} reconnected`);
        setPlayers((prev) => {
          const existing = prev.find((p) => p.nickname === data.nickname);
          if (existing) {
            // Update the socket ID
            return prev.map((p) =>
              p.nickname === data.nickname ? { ...p, id: data.id } : p,
            );
          }
          return [...prev, { id: data.id, nickname: data.nickname }];
        });
        setPlayerCount(data.playerCount);
      },
    );

    return () => {
      socket.off("game-starting");
      socket.off("question-start");
      socket.off("player-answered");
      socket.off("question-results");
      socket.off("game-end");
      socket.off("host-disconnected");
      socket.off("kicked");
      socket.off("player-joined");
      socket.off("player-left");
      socket.off("player-disconnected");
      socket.off("player-reconnected");
    };
  }, [view]);

  // ── Host callbacks ───────────────────────────────────────────────────────
  const handleCreateRoom = useCallback((q: Quiz, code: string, qr: string) => {
    setQuiz(q);
    setRoomCode(code);
    setQrCode(qr);
    setPlayers([]);
    setView("host-lobby");
  }, []);

  const handleStartGame = useCallback(() => {
    socket.emit(
      "start-game",
      { code: roomCode },
      (res: { ok: boolean; error?: string }) => {
        if (!res.ok) alert(res.error ?? "Could not start game");
      },
    );
  }, [roomCode]);

  const handleNextQuestion = useCallback(() => {
    socket.emit("next-question", { code: roomCode });
  }, [roomCode]);

  // ── Player callbacks ─────────────────────────────────────────────────────
  const handleJoined = useCallback((code: string, nick: string) => {
    setRoomCode(code);
    setNickname(nick);
    setView("player-lobby");

    // Save session for reconnection
    saveSession({
      roomCode: code,
      nickname: nick,
      isPlayer: true,
    });
  }, []);

  // ── View switcher ─────────────────────────────────────────────────────────

  // Connection status indicator (subtle banner)
  const connectionIndicator = connectionStatus !== "connected" &&
    !isReconnecting && (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          backgroundColor:
            connectionStatus === "reconnecting" ? "#f59e0b" : "#ef4444",
          color: "white",
          padding: "0.5rem",
          textAlign: "center",
          fontSize: "0.875rem",
          fontWeight: 700,
          zIndex: 8888,
          animation: "pulse 2s ease-in-out infinite",
        }}
      >
        {connectionStatus === "reconnecting"
          ? "🔄 Reconnecting..."
          : "⚠️ Connection lost - Attempting to reconnect..."}
      </div>
    );

  // Reconnection overlay
  const reconnectionOverlay = isReconnecting && (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      <div style={{ fontSize: "4rem" }}>🔄</div>
      <div style={{ textAlign: "center" }}>
        <h2 style={{ marginBottom: "0.5rem" }}>Reconnecting...</h2>
        <p style={{ opacity: 0.7, fontSize: "1rem" }}>
          {connectionStatus === "reconnecting"
            ? `Attempt ${reconnectAttempt}`
            : "Connection lost"}
        </p>
        <p style={{ opacity: 0.6, fontSize: "0.9rem", marginTop: "1rem" }}>
          Please wait while we restore your session
        </p>
      </div>
    </div>
  );

  if (view === "home") {
    return (
      <>
        {connectionIndicator}
        {reconnectionOverlay}
        <HomePage
          onHost={() => setView("host-setup")}
          onJoin={() => setView("player-join")}
          onLibrary={() => setView("host-library")}
        />
      </>
    );
  }

  if (view === "host-library") {
    return (
      <>
        {connectionIndicator}
        {reconnectionOverlay}
        <QuizLibrary
          onBack={() => setView("home")}
          onNew={() => {
            setSavedQuizToLoad(null);
            setView("host-setup");
          }}
          onLoad={(quiz) => {
            setSavedQuizToLoad(quiz);
            setView("host-setup");
          }}
        />
      </>
    );
  }

  if (view === "host-setup") {
    return (
      <>
        {connectionIndicator}
        {reconnectionOverlay}
        <HostSetup
          onCreated={handleCreateRoom}
          onBack={() => setView("home")}
          initialQuiz={savedQuizToLoad ?? undefined}
        />
      </>
    );
  }

  if (view === "host-lobby") {
    return (
      <>
        {connectionIndicator}
        {reconnectionOverlay}
        <HostLobby
          roomCode={roomCode}
          qrCode={qrCode}
          players={players}
          onStart={handleStartGame}
          onBack={() => setView("home")}
        />
      </>
    );
  }

  if (view === "host-game") {
    return (
      <>
        {connectionIndicator}
        {reconnectionOverlay}
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
      </>
    );
  }

  if (view === "player-join") {
    return (
      <>
        {connectionIndicator}
        {reconnectionOverlay}
        <PlayerJoin
          initialCode={initialCode}
          onJoined={handleJoined}
          onBack={() => setView("home")}
        />
      </>
    );
  }

  if (view === "player-lobby") {
    return (
      <>
        {connectionIndicator}
        {reconnectionOverlay}
        <PlayerLobby nickname={nickname} roomCode={roomCode} />
      </>
    );
  }

  if (view === "player-answering" || view === "player-results") {
    return (
      <>
        {connectionIndicator}
        {reconnectionOverlay}
        <PlayerAnswering
          question={question}
          results={view === "player-results" ? myResults : null}
          nickname={nickname}
        />
      </>
    );
  }

  if (view === "player-final") {
    return (
      <>
        {showConfetti && <Confetti />}
        {connectionIndicator}
        {reconnectionOverlay}
        <FinalPodium
          players={finalStandings}
          myNickname={nickname}
          onPlayAgain={() => {
            clearSession();
            window.location.href = "/";
          }}
        />
      </>
    );
  }

  return null;
}
