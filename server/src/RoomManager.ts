import { randomInt, randomUUID } from 'crypto';
import { Room, Quiz, Player } from './types';

const rooms = new Map<string, Room>();

function generateCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusing chars
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[randomInt(chars.length)];
  }
  return code;
}

export function createRoom(hostId: string, quiz: Quiz, qrCodeDataUrl: string): Room {
  let code: string;
  do {
    code = generateCode();
  } while (rooms.has(code));

  const room: Room = {
    code,
    hostId,
    quiz,
    players: new Map(),
    state: 'lobby',
    currentQuestionIndex: 0,
    questionStartTime: 0,
    questionTimer: null,
    answeredCount: 0,
    qrCodeDataUrl,
    hostToken: randomUUID(),
    hostConnected: true,
    paused: false,
    pausedAt: 0,
    hostGraceTimer: null,
  };

  rooms.set(code, room);
  return room;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code);
}

export function deleteRoom(code: string): void {
  const room = rooms.get(code);
  if (room?.questionTimer) clearTimeout(room.questionTimer);
  if (room?.hostGraceTimer) clearTimeout(room.hostGraceTimer);
  rooms.delete(code);
}

export function addPlayer(room: Room, player: Player): void {
  room.players.set(player.id, player);
}

export function connectedCount(room: Room): number {
  let n = 0;
  for (const p of room.players.values()) if (p.connected) n++;
  return n;
}

export function findPlayerByToken(room: Room, token: string): Player | undefined {
  for (const p of room.players.values()) if (p.token === token) return p;
  return undefined;
}

export function removePlayer(room: Room, playerId: string): void {
  room.players.delete(playerId);
}

export function getPlayerStandings(room: Room) {
  return Array.from(room.players.values())
    .filter(p => p.connected || p.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({
      nickname: p.nickname,
      score: p.score,
      rank: i + 1,
      lastPoints: p.lastAnswer?.points ?? 0,
      streak: p.streak,
    }));
}

export function getRoomByHostId(hostId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.hostId === hostId) return room;
  }
  return undefined;
}

export function getRoomByPlayerId(playerId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.players.has(playerId)) return room;
  }
  return undefined;
}
