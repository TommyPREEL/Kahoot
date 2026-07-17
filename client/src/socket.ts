import { io, Socket } from 'socket.io-client';

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3650';

export const socket: Socket = io(SERVER_URL, {
  autoConnect: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});

// Session management helpers
export const SESSION_STORAGE_KEY = 'blitzquiz_session';

export interface SessionData {
  roomCode: string;
  nickname: string;
  isPlayer: boolean;
  timestamp: number;
}

export function saveSession(data: Omit<SessionData, 'timestamp'>): void {
  const session: SessionData = {
    ...data,
    timestamp: Date.now(),
  };
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function getSession(): SessionData | null {
  const stored = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!stored) return null;
  
  try {
    const session: SessionData = JSON.parse(stored);
    // Session expires after 2 hours
    if (Date.now() - session.timestamp > 2 * 60 * 60 * 1000) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}
