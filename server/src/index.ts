import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { randomUUID } from 'crypto';
import {
  createRoom,
  getRoom,
  deleteRoom,
  addPlayer,
  getRoomByHostId,
  getRoomByPlayerId,
  connectedCount,
  findPlayerByToken,
  getPlayerStandings,
} from './RoomManager';
import {
  startGame,
  handleAnswer,
  nextQuestion,
  pauseGame,
  resumeGame,
  checkAllAnswered,
  questionStartPayload,
  questionResultsPayload,
} from './GameEngine';
import { validateQuiz } from './validateQuiz';
import { Player, Room } from './types';
import { Socket } from 'socket.io';

/** How long a room survives without its host before being closed. */
const HOST_GRACE_MS = 5 * 60 * 1000;

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3650;

// REST: health check
app.get('/health', (_req, res) => res.json({ ok: true }));

io.on('connection', (socket) => {
  console.log(`[+] Connected: ${socket.id}`);

  // ── Host creates a room ──────────────────────────────────────────────────
  socket.on('create-room', async (data: { quiz: unknown }, callback: Function) => {
    try {
      const parsed = validateQuiz(data?.quiz);
      if (!parsed.ok) return callback({ ok: false, error: parsed.error });
      const quiz = { ...parsed.quiz, id: uuidv4() };

      // Placeholder QR — filled in after we know the code
      const room = createRoom(socket.id, quiz, '');
      room.hostId = socket.id;

      const clientOrigin = socket.handshake.headers.origin
        || socket.handshake.headers.referer?.replace(/\/$/, '')
        || 'http://localhost:3600';
      const joinUrl = `${clientOrigin}/?code=${room.code}`;
      const qrCodeDataUrl = await QRCode.toDataURL(joinUrl, {
        width: 300,
        margin: 2,
        color: { dark: '#111111', light: '#ffffff' },
      });
      room.qrCodeDataUrl = qrCodeDataUrl;

      socket.join(room.code);

      callback({ ok: true, code: room.code, qrCodeDataUrl, hostToken: room.hostToken });
      console.log(`[Room] Created ${room.code} by ${socket.id}`);
    } catch (err) {
      callback({ ok: false, error: String(err) });
    }
  });

  // ── Player joins a room ──────────────────────────────────────────────────
  socket.on('join-room', (data: { code: string; nickname: string }, callback: Function) => {
    if (typeof data?.code !== 'string' || typeof data?.nickname !== 'string') {
      return callback({ ok: false, error: 'Invalid request' });
    }
    const room = getRoom(data.code.toUpperCase().trim());

    if (!room) {
      return callback({ ok: false, error: 'Room not found' });
    }
    if (room.state !== 'lobby') {
      return callback({ ok: false, error: 'Game already started' });
    }

    const trimmedNick = data.nickname.trim().slice(0, 24);
    if (!trimmedNick) {
      return callback({ ok: false, error: 'Nickname required' });
    }

    // Prevent duplicate nicknames
    for (const p of room.players.values()) {
      if (p.nickname.toLowerCase() === trimmedNick.toLowerCase()) {
        return callback({ ok: false, error: 'Nickname already taken' });
      }
    }

    const player: Player = {
      id: socket.id,
      nickname: trimmedNick,
      score: 0,
      streak: 0,
      answers: [],
      connected: true,
      token: randomUUID(),
    };

    addPlayer(room, player);
    socket.join(room.code);

    callback({ ok: true, roomCode: room.code, nickname: trimmedNick, playerToken: player.token });

    // Notify host
    io.to(room.hostId).emit('player-joined', {
      id: socket.id,
      nickname: trimmedNick,
      playerCount: room.players.size,
    });

    console.log(`[Room] ${trimmedNick} joined ${room.code}`);
  });

  // ── Player reconnects (token-based, survives page reloads) ───────────────
  socket.on('reconnect-to-room', (data: { code: string; playerToken: string }, callback: Function) => {
    if (typeof data?.code !== 'string' || typeof data?.playerToken !== 'string') {
      return callback({ ok: false, error: 'Invalid request' });
    }
    const room = getRoom(data.code.toUpperCase().trim());
    if (!room) return callback({ ok: false, reason: 'room-closed' });
    const player = findPlayerByToken(room, data.playerToken);
    // Removed from the lobby after a long absence (or kicked): the room still exists.
    if (!player) return callback({ ok: false, reason: 'not-in-room', roomCode: room.code, state: room.state });

    const oldId = player.id;
    if (oldId !== socket.id) {
      room.players.delete(oldId);
      player.id = socket.id;
      room.players.set(socket.id, player);
    }
    player.connected = true;
    socket.join(room.code);

    callback({
      ok: true,
      roomCode: room.code,
      nickname: player.nickname,
      state: room.state,
      score: player.score,
    });

    io.to(room.hostId).emit('player-reconnected', {
      id: socket.id,
      oldId,
      nickname: player.nickname,
      playerCount: connectedCount(room),
    });

    sendCurrentState(socket, room, player);
    console.log(`[Room] ${player.nickname} reconnected to ${room.code}`);
  });

  // ── Host reconnects to its room ──────────────────────────────────────────
  socket.on('reconnect-host', (data: { code: string; hostToken: string }, callback: Function) => {
    if (typeof data?.code !== 'string' || typeof data?.hostToken !== 'string') {
      return callback({ ok: false, error: 'Invalid request' });
    }
    const room = getRoom(data.code.toUpperCase().trim());
    if (!room || room.hostToken !== data.hostToken) {
      return callback({ ok: false, error: 'Session expired' });
    }

    room.hostId = socket.id;
    room.hostConnected = true;
    if (room.hostGraceTimer) {
      clearTimeout(room.hostGraceTimer);
      room.hostGraceTimer = null;
    }
    socket.join(room.code);
    // The game stays paused until the host explicitly resumes it.
    socket.to(room.code).emit('host-reconnected', { paused: room.paused });

    callback({
      ok: true,
      roomCode: room.code,
      qrCodeDataUrl: room.qrCodeDataUrl,
      quiz: room.quiz,
      state: room.state,
      players: Array.from(room.players.values()).map(p => ({
        id: p.id,
        nickname: p.nickname,
        connected: p.connected,
      })),
      playerCount: connectedCount(room),
      answeredCount: room.answeredCount,
    });

    sendCurrentState(socket, room);
    console.log(`[Room] Host reconnected to ${room.code}`);
  });

  // ── Host pauses / resumes ────────────────────────────────────────────────
  socket.on('pause-game', (data: { code: string }) => {
    const room = getRoom(data?.code);
    if (!room || room.hostId !== socket.id) return;
    if (room.state === 'lobby' || room.state === 'final-results') return;
    pauseGame(io, room, 'host');
  });

  socket.on('resume-game', (data: { code: string }) => {
    const room = getRoom(data?.code);
    if (!room || room.hostId !== socket.id) return;
    resumeGame(io, room);
    checkAllAnswered(io, room);
  });

  // ── Voluntary leave (player quits, or host closes the room) ──────────────
  socket.on('leave-room', () => {
    const hosted = getRoomByHostId(socket.id);
    if (hosted) {
      // After the podium, players keep their screen; otherwise tell them the game is over.
      if (hosted.state !== 'final-results') socket.to(hosted.code).emit('host-disconnected');
      deleteRoom(hosted.code);
      console.log(`[Room] Closed ${hosted.code} by host`);
      return;
    }
    const room = getRoomByPlayerId(socket.id);
    const player = room?.players.get(socket.id);
    if (!room || !player) return;
    room.players.delete(socket.id);
    socket.leave(room.code);
    io.to(room.hostId).emit('player-left', {
      id: socket.id,
      nickname: player.nickname,
      playerCount: connectedCount(room),
    });
    checkAllAnswered(io, room);
  });

  // ── Host starts game ─────────────────────────────────────────────────────
  socket.on('start-game', (data: { code: string }, callback: Function) => {
    const room = getRoom(data?.code);
    if (!room || room.hostId !== socket.id) {
      return callback?.({ ok: false, error: 'Unauthorized' });
    }
    if (room.state !== 'lobby') {
      return callback?.({ ok: false, error: 'Game already started' });
    }
    if (connectedCount(room) === 0) {
      return callback?.({ ok: false, error: 'No players in room' });
    }

    startGame(io, room);
    callback?.({ ok: true });
    console.log(`[Game] Started ${room.code}`);
  });

  // ── Player submits answer ────────────────────────────────────────────────
  socket.on('submit-answer', (data: { questionIndex: number; answer: unknown }, callback?: Function) => {
    const reply = typeof callback === 'function' ? callback : () => {};
    const answer = data?.answer;
    const validAnswer =
      typeof answer === 'number' ? Number.isFinite(answer)
      : typeof answer === 'string' ? answer.length <= 64
      : Array.isArray(answer) && answer.length <= 6 && answer.every(a => typeof a === 'string' && a.length <= 64);
    if (!validAnswer || !Number.isInteger(data?.questionIndex)) return reply({ status: 'closed' });

    const room = getRoomByPlayerId(socket.id);
    const player = room?.players.get(socket.id);
    // Not (yet) back in the room after a reconnect: the client resends once restored.
    if (!room || !player) return reply({ status: 'retry' });

    reply({ status: handleAnswer(io, room, player, data.questionIndex, answer as string | string[] | number) });
  });

  // ── Host advances to next question ───────────────────────────────────────
  socket.on('next-question', (data: { code: string }) => {
    const room = getRoom(data?.code);
    if (!room || room.hostId !== socket.id) return;
    if (room.state !== 'question-results' || room.paused) return;

    nextQuestion(io, room);
  });

  // ── Host kicks a player ──────────────────────────────────────────────────
  socket.on('kick-player', (data: { code: string; playerId: string }) => {
    const room = getRoom(data?.code);
    if (!room || room.hostId !== socket.id) return;

    const player = room.players.get(data.playerId);
    if (!player) return;

    room.players.delete(data.playerId);
    io.to(data.playerId).emit('kicked');
    io.to(room.hostId).emit('player-left', {
      id: data.playerId,
      nickname: player.nickname,
      playerCount: connectedCount(room),
    });
    checkAllAnswered(io, room);
  });

  // ── Disconnect ───────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[-] Disconnected: ${socket.id}`);

    // Was this the host? Keep the room alive and pause it for a grace period.
    const hostedRoom = getRoomByHostId(socket.id);
    if (hostedRoom) {
      hostedRoom.hostConnected = false;
      if (hostedRoom.state !== 'lobby' && hostedRoom.state !== 'final-results') {
        pauseGame(io, hostedRoom, 'host-disconnected');
      } else {
        io.to(hostedRoom.code).emit('host-away');
      }
      const code = hostedRoom.code;
      hostedRoom.hostGraceTimer = setTimeout(() => {
        io.to(code).emit('host-disconnected');
        deleteRoom(code);
        console.log(`[Room] Deleted ${code} (host did not return)`);
      }, HOST_GRACE_MS);
      console.log(`[Room] Host left ${code}, waiting for reconnection`);
      return;
    }

    // Was this a player?
    const playerRoom = getRoomByPlayerId(socket.id);
    const player = playerRoom?.players.get(socket.id);
    if (!playerRoom || !player) return;

    player.connected = false;
    io.to(playerRoom.hostId).emit('player-disconnected', {
      id: socket.id,
      nickname: player.nickname,
      playerCount: connectedCount(playerRoom),
    });
    console.log(`[Room] ${player.nickname} disconnected from ${playerRoom.code}`);

    // Don't keep everyone waiting on a player who is gone.
    checkAllAnswered(io, playerRoom);

    // Free the nickname if they don't come back while still in the lobby.
    if (playerRoom.state === 'lobby') {
      setTimeout(() => {
        const room = getRoom(playerRoom.code);
        if (room && !player.connected && room.players.get(player.id) === player) {
          room.players.delete(player.id);
          io.to(room.hostId).emit('player-left', {
            id: player.id,
            nickname: player.nickname,
            playerCount: connectedCount(room),
          });
        }
      }, 60000);
    }
  });
});

/** Replays the current game phase to a socket that just (re)joined. */
function sendCurrentState(socket: Socket, room: Room, player?: Player): void {
  if (room.state === 'question-active' || room.state === 'starting') {
    socket.emit('question-start', questionStartPayload(room));
    if (player?.answers.some(a => a.questionIndex === room.currentQuestionIndex)) {
      socket.emit('answer-locked');
    }
  } else if (room.state === 'question-results') {
    socket.emit('question-results', {
      ...questionResultsPayload(room),
      yourAnswer: player?.answers.find(a => a.questionIndex === room.currentQuestionIndex),
    });
  } else if (room.state === 'final-results') {
    socket.emit('game-end', { players: getPlayerStandings(room) });
  }
  if (room.paused) {
    socket.emit('game-paused', { reason: room.hostConnected ? 'host' : 'host-disconnected' });
  } else if (!room.hostConnected) {
    socket.emit('host-away');
  }
}

httpServer.listen(PORT, () => {
  console.log(`BlitzQuiz server running on http://localhost:${PORT}`);
});
