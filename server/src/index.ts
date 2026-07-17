import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import {
  createRoom,
  getRoom,
  deleteRoom,
  addPlayer,
  getRoomByHostId,
  getRoomByPlayerId,
} from './RoomManager';
import {
  startGame,
  handleAnswer,
  nextQuestion,
} from './GameEngine';
import { Player, Quiz } from './types';

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
  socket.on('create-room', async (data: { quiz: Quiz }, callback: Function) => {
    try {
      const quiz: Quiz = { ...data.quiz, id: uuidv4() };

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
        color: { dark: '#46178f', light: '#ffffff' },
      });
      room.qrCodeDataUrl = qrCodeDataUrl;

      socket.join(room.code);

      callback({ ok: true, code: room.code, qrCodeDataUrl });
      console.log(`[Room] Created ${room.code} by ${socket.id}`);
    } catch (err) {
      callback({ ok: false, error: String(err) });
    }
  });

  // ── Player joins a room ──────────────────────────────────────────────────
  socket.on('join-room', (data: { code: string; nickname: string }, callback: Function) => {
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
    };

    addPlayer(room, player);
    socket.join(room.code);

    callback({ ok: true, roomCode: room.code, nickname: trimmedNick });

    // Notify host
    io.to(room.hostId).emit('player-joined', {
      id: socket.id,
      nickname: trimmedNick,
      playerCount: room.players.size,
    });

    console.log(`[Room] ${trimmedNick} joined ${room.code}`);
  });

  // ── Player reconnects to a room ──────────────────────────────────────────
  socket.on('reconnect-to-room', (data: { code: string; nickname: string }, callback: Function) => {
    const room = getRoom(data.code.toUpperCase().trim());

    if (!room) {
      return callback({ ok: false, error: 'Room not found' });
    }

    const trimmedNick = data.nickname.trim();
    if (!trimmedNick) {
      return callback({ ok: false, error: 'Nickname required' });
    }

    // Find existing player by nickname
    let existingPlayer: Player | null = null;
    let oldSocketId: string | null = null;

    for (const [id, p] of room.players.entries()) {
      if (p.nickname.toLowerCase() === trimmedNick.toLowerCase()) {
        existingPlayer = p;
        oldSocketId = id;
        break;
      }
    }

    if (!existingPlayer) {
      return callback({ ok: false, error: 'Player not found in this room' });
    }

    // Update socket ID and reconnect status
    if (oldSocketId && oldSocketId !== socket.id) {
      room.players.delete(oldSocketId);
    }

    existingPlayer.id = socket.id;
    existingPlayer.connected = true;
    room.players.set(socket.id, existingPlayer);
    socket.join(room.code);

    // Send current game state to reconnecting player
    const gameState = {
      roomCode: room.code,
      nickname: trimmedNick,
      state: room.state,
      currentQuestionIndex: room.currentQuestionIndex,
      totalQuestions: room.quiz.questions.length,
      score: existingPlayer.score,
      streak: existingPlayer.streak,
    };

    callback({ ok: true, ...gameState });

    // Notify host of reconnection
    io.to(room.hostId).emit('player-reconnected', {
      id: socket.id,
      nickname: trimmedNick,
      playerCount: Array.from(room.players.values()).filter(p => p.connected).length,
    });

    // If game is active, send current question or results
    if (room.state === 'question-active') {
      const question = room.quiz.questions[room.currentQuestionIndex];
      const payload = {
        questionIndex: room.currentQuestionIndex,
        totalQuestions: room.quiz.questions.length,
        serverTime: room.questionStartTime,
        question: {
          ...question,
          answers: question.answers?.map(({ id, text }) => ({ id, text })),
        },
      };
      socket.emit('question-start', payload);
    } else if (room.state === 'question-results') {
      const question = room.quiz.questions[room.currentQuestionIndex];
      const standings = Array.from(room.players.values())
        .filter(p => p.connected || p.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((p, i) => ({
          nickname: p.nickname,
          score: p.score,
          rank: i + 1,
          lastPoints: p.lastAnswer?.points ?? 0,
          streak: p.streak,
        }));

      const answerBreakdown = (question.answers ?? []).map(a => ({
        answerId: a.id,
        text: a.text,
        count: Array.from(room.players.values()).filter(p => {
          const pa = p.answers.find(ans => ans.questionIndex === room.currentQuestionIndex);
          if (!pa) return false;
          if (Array.isArray(pa.answer)) return pa.answer.includes(a.id);
          return pa.answer === a.id;
        }).length,
      }));

      let correctAnswer: string | string[] | number | boolean;
      if (question.type === 'quiz' || question.type === 'true-false') {
        correctAnswer = question.answers?.find(a => a.isCorrect)?.id ?? '';
      } else if (question.type === 'multi-select') {
        correctAnswer = question.answers?.filter(a => a.isCorrect).map(a => a.id) ?? [];
      } else {
        correctAnswer = question.sliderCorrect ?? 0;
      }

      const resultsPayload = {
        questionIndex: room.currentQuestionIndex,
        correctAnswer,
        answerBreakdown,
        players: standings,
        yourAnswer: existingPlayer.answers.find(a => a.questionIndex === room.currentQuestionIndex),
        ...(question.type === 'slider' ? {
          sliderMeta: {
            min: question.sliderMin ?? 0,
            max: question.sliderMax ?? 100,
            correct: question.sliderCorrect ?? 0,
            tolerance: question.sliderTolerance ?? 0,
          },
        } : {}),
      };

      socket.emit('question-results', resultsPayload);
    } else if (room.state === 'final-results') {
      const standings = Array.from(room.players.values())
        .filter(p => p.connected || p.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((p, i) => ({
          nickname: p.nickname,
          score: p.score,
          rank: i + 1,
          lastPoints: p.lastAnswer?.points ?? 0,
          streak: p.streak,
        }));
      socket.emit('game-end', { players: standings });
    }

    console.log(`[Room] ${trimmedNick} reconnected to ${room.code}`);
  });

  // ── Host starts game ─────────────────────────────────────────────────────
  socket.on('start-game', (data: { code: string }, callback: Function) => {
    const room = getRoom(data.code);
    if (!room || room.hostId !== socket.id) {
      return callback?.({ ok: false, error: 'Unauthorized' });
    }
    if (room.players.size === 0) {
      return callback?.({ ok: false, error: 'No players in room' });
    }

    startGame(io, room);
    callback?.({ ok: true });
    console.log(`[Game] Started ${room.code}`);
  });

  // ── Player submits answer ────────────────────────────────────────────────
  socket.on('submit-answer', (data: { answer: string | string[] | number }) => {
    const room = getRoomByPlayerId(socket.id);
    if (!room) return;

    const player = room.players.get(socket.id);
    if (!player) return;

    handleAnswer(io, room, player, data.answer);
  });

  // ── Host advances to next question ───────────────────────────────────────
  socket.on('next-question', (data: { code: string }) => {
    const room = getRoom(data.code);
    if (!room || room.hostId !== socket.id) return;
    if (room.state !== 'question-results') return;

    nextQuestion(io, room);
  });

  // ── Host kicks a player ──────────────────────────────────────────────────
  socket.on('kick-player', (data: { code: string; playerId: string }) => {
    const room = getRoom(data.code);
    if (!room || room.hostId !== socket.id) return;

    const player = room.players.get(data.playerId);
    if (!player) return;

    room.players.delete(data.playerId);
    io.to(data.playerId).emit('kicked');
    io.to(room.hostId).emit('player-left', {
      id: data.playerId,
      nickname: player.nickname,
      playerCount: room.players.size,
    });
  });

  // ── Disconnect ───────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[-] Disconnected: ${socket.id}`);

    // Was this the host?
    const hostedRoom = getRoomByHostId(socket.id);
    if (hostedRoom) {
      io.to(hostedRoom.code).emit('host-disconnected');
      deleteRoom(hostedRoom.code);
      console.log(`[Room] Deleted ${hostedRoom.code} (host left)`);
      return;
    }

    // Was this a player?
    const playerRoom = getRoomByPlayerId(socket.id);
    if (playerRoom) {
      const player = playerRoom.players.get(socket.id);
      if (player) {
        player.connected = false;
        io.to(playerRoom.hostId).emit('player-disconnected', {
          id: socket.id,
          nickname: player.nickname,
          playerCount: Array.from(playerRoom.players.values()).filter(p => p.connected).length,
        });
        console.log(`[Room] ${player.nickname} disconnected from ${playerRoom.code}`);
        
        // Clean up disconnected players in lobby after 60 seconds
        if (playerRoom.state === 'lobby') {
          setTimeout(() => {
            const room = getRoom(playerRoom.code);
            if (room && !player.connected) {
              room.players.delete(socket.id);
              io.to(room.hostId).emit('player-left', {
                id: socket.id,
                nickname: player.nickname,
                playerCount: room.players.size,
              });
            }
          }, 60000);
        }
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`BlitzQuiz server running on http://localhost:${PORT}`);
});
