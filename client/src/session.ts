// Reconnection session, kept in localStorage so it survives a page reload.
const KEY = 'blitzquiz_session';
const MAX_AGE_MS = 2 * 60 * 60 * 1000;

export type Session =
  | { role: 'player'; roomCode: string; nickname: string; playerToken: string; savedAt: number }
  | { role: 'host'; roomCode: string; hostToken: string; savedAt: number };

type NewSession =
  | Omit<Extract<Session, { role: 'player' }>, 'savedAt'>
  | Omit<Extract<Session, { role: 'host' }>, 'savedAt'>;

export function saveSession(data: NewSession): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch {
    // Private mode / storage full: reconnection after reload just won't be available.
  }
}

export function getSession(): Session | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Session | null;
    if (!s || (s.role !== 'player' && s.role !== 'host') || Date.now() - s.savedAt > MAX_AGE_MS) {
      clearSession();
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
