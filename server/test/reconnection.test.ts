import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import { io as connect, Socket } from 'socket.io-client';

const PORT = 3999;
const URL = `http://localhost:${PORT}`;
let server: ChildProcess;
const sockets: Socket[] = [];

const quiz = {
  title: 'Test',
  questions: [
    { id: 'q1', type: 'quiz', text: 'Q1', timeLimit: 20, maxPoints: 1000,
      answers: [{ id: 'a', text: 'A', isCorrect: true }, { id: 'b', text: 'B', isCorrect: false }] },
    { id: 'q2', type: 'true-false', text: 'Q2', timeLimit: 20, maxPoints: 1000,
      answers: [{ id: 'true', text: 'True', isCorrect: true }, { id: 'false', text: 'False', isCorrect: false }] },
  ],
};

function client(): Promise<Socket> {
  const s = connect(URL, { forceNew: true, reconnection: false });
  sockets.push(s);
  return new Promise((resolve, reject) => {
    s.once('connect', () => resolve(s));
    s.once('connect_error', reject);
  });
}

function call<T = any>(s: Socket, event: string, data?: unknown): Promise<T> {
  return new Promise(resolve => s.emit(event, data, resolve));
}

function next<T = any>(s: Socket, event: string, ms = 2000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), ms);
    s.once(event, (d: T) => { clearTimeout(t); resolve(d); });
  });
}

before(async () => {
  server = spawn(process.execPath, ['-r', 'ts-node/register/transpile-only', path.join(__dirname, '../src/index.ts')], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore',
  });
  for (let i = 0; i < 50; i++) {
    try { await fetch(`${URL}/health`); return; } catch { await new Promise(r => setTimeout(r, 100)); }
  }
  throw new Error('server did not start');
});

after(() => {
  sockets.forEach(s => s.disconnect());
  server.kill();
});

test('rejects an invalid quiz', async () => {
  const host = await client();
  const res = await call(host, 'create-room', { quiz: { title: 'x', questions: [] } });
  assert.equal(res.ok, false);
});

test('player cannot be reclaimed by nickname, only by token', async () => {
  const host = await client();
  const room = await call(host, 'create-room', { quiz });
  const p1 = await client();
  const joined = await call(p1, 'join-room', { code: room.code, nickname: 'Ana' });
  assert.ok(joined.playerToken);

  const thief = await client();
  const bad = await call(thief, 'reconnect-to-room', { code: room.code, playerToken: 'nope' });
  assert.equal(bad.ok, false);

  p1.disconnect();
  const p1b = await client();
  const ok = await call(p1b, 'reconnect-to-room', { code: room.code, playerToken: joined.playerToken });
  assert.equal(ok.ok, true);
  assert.equal(ok.nickname, 'Ana');
});

test('host disconnect pauses the game and the host can resume it', async () => {
  const host = await client();
  const room = await call(host, 'create-room', { quiz });
  const p = await client();
  await call(p, 'join-room', { code: room.code, nickname: 'Bob' });
  const started = next(p, 'question-start');
  await call(host, 'start-game', { code: room.code });
  const q = await started;

  const paused = next(p, 'game-paused');
  host.disconnect();
  assert.equal((await paused).reason, 'host-disconnected');

  // Answers are rejected while paused (no results arrive).
  const host2 = await client();
  const back = await call(host2, 'reconnect-host', { code: room.code, hostToken: room.hostToken });
  assert.equal(back.ok, true);
  assert.equal(back.state, 'question-active');

  const resumed = next(p, 'game-resumed');
  host2.emit('resume-game', { code: room.code });
  const r = await resumed;
  assert.ok(r.serverTime > q.serverTime, 'question start is shifted by the pause');
});

test('wrong host token cannot take over a room', async () => {
  const host = await client();
  const room = await call(host, 'create-room', { quiz });
  host.disconnect();
  const intruder = await client();
  const res = await call(intruder, 'reconnect-host', { code: room.code, hostToken: 'guess' });
  assert.equal(res.ok, false);
});

test('an answer is confirmed, a resent answer is confirmed once, a paused answer is retried', async () => {
  const host = await client();
  const room = await call(host, 'create-room', { quiz });
  const p = await client();
  await call(p, 'join-room', { code: room.code, nickname: 'Cleo' });
  const started = next(p, 'question-start');
  await call(host, 'start-game', { code: room.code });
  const q = await started;
  await new Promise(r => setTimeout(r, Math.max(0, q.serverTime - Date.now()) + 50)); // countdown

  host.emit('pause-game', { code: room.code });
  await next(p, 'game-paused');
  assert.equal((await call(p, 'submit-answer', { questionIndex: 0, answer: 'a' })).status, 'retry');

  const resumed = next(p, 'game-resumed');
  host.emit('resume-game', { code: room.code });
  await resumed;
  assert.equal((await call(p, 'submit-answer', { questionIndex: 0, answer: 'a' })).status, 'ok');
  assert.equal((await call(p, 'submit-answer', { questionIndex: 0, answer: 'b' })).status, 'ok', 'resend is idempotent');
  assert.equal((await call(p, 'submit-answer', { questionIndex: 1, answer: 'a' })).status, 'closed');
});

test('a player removed from the room is told the room still exists', async () => {
  const host = await client();
  const room = await call(host, 'create-room', { quiz });
  const p = await client();
  const joined = await call(p, 'join-room', { code: room.code, nickname: 'Dan' });
  host.emit('kick-player', { code: room.code, playerId: p.id });
  await next(p, 'kicked');
  const p2 = await client();
  const res = await call(p2, 'reconnect-to-room', { code: room.code, playerToken: joined.playerToken });
  assert.equal(res.reason, 'not-in-room');
  assert.equal(res.state, 'lobby');
});

test('malformed events do not crash the server', async () => {
  const s = await client();
  for (const ev of ['next-question', 'kick-player', 'submit-answer', 'start-game', 'pause-game', 'resume-game']) s.emit(ev);
  s.emit('submit-answer', null);
  await new Promise(r => setTimeout(r, 300));
  const res = await fetch(`${URL}/health`);
  assert.equal(res.status, 200);
});
