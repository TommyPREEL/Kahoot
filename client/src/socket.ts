import { io, Socket } from 'socket.io-client';

// No URL = same origin: Vite (dev) and nginx (prod) both proxy /socket.io to the server,
// so phones on the LAN reach it through whatever address they opened the page with.
const SERVER_URL = import.meta.env.VITE_SERVER_URL || undefined;

// Keep retrying: phones drop the socket whenever the screen locks, and the
// session token lets us reclaim our place once we're back.
export const socket: Socket = io(SERVER_URL, {
  autoConnect: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});

export type CreatedRoom = { code: string; qrCodeDataUrl: string; hostToken: string };

/** Asks the server to open a room for this quiz. Rejects with the server's message. */
export function createRoom(quiz: unknown): Promise<CreatedRoom> {
  return new Promise((resolve, reject) => {
    socket.timeout(10000).emit(
      'create-room',
      { quiz },
      (err: Error | null, res: { ok: boolean; error?: string } & Partial<CreatedRoom>) => {
        if (err) return reject(new Error('The server did not answer. Check your connection.'));
        if (!res.ok || !res.code || !res.hostToken) return reject(new Error(res.error ?? 'Could not create the room.'));
        resolve({ code: res.code, qrCodeDataUrl: res.qrCodeDataUrl ?? '', hostToken: res.hostToken });
      },
    );
  });
}

// ── Answers survive a dropped connection ─────────────────────────────────
// The answer stays pending until the server confirms it ('ok') or says the
// question is over ('closed'). 'retry' (paused, or not back in the room yet)
// and timeouts are retried; after a reconnect App calls resendPendingAnswer().
type Pending = { questionIndex: number; answer: string | string[] | number };
let pending: Pending | null = null;
let retryTimer: ReturnType<typeof setTimeout> | undefined;

export function submitAnswer(questionIndex: number, answer: Pending['answer']): void {
  pending = { questionIndex, answer };
  sendPending();
}

export function resendPendingAnswer(): void {
  sendPending();
}

function sendPending(): void {
  clearTimeout(retryTimer);
  const p = pending;
  if (!p || !socket.connected) return; // resent by App once the session is restored
  socket.timeout(4000).emit('submit-answer', p, (err: Error | null, res?: { status: 'ok' | 'retry' | 'closed' }) => {
    if (pending !== p) return;
    if (!err && (res?.status === 'ok' || res?.status === 'closed')) {
      pending = null;
      return;
    }
    retryTimer = setTimeout(sendPending, 2000);
  });
}
