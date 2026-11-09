import { Server, Socket } from 'socket.io';
import {
  Room,
  Player,
  PlayerAnswer,
  QuestionStartPayload,
  QuestionResultsPayload,
} from './types';
import { getPlayerStandings, connectedCount } from './RoomManager';

const COUNTDOWN_SECONDS = 3;

function calcPoints(timeTaken: number, timeLimit: number, maxPoints: number): number {
  // BlitzQuiz formula: full points if answered instantly, 50% at deadline
  const ratio = Math.min(timeTaken / (timeLimit * 1000), 1);
  return Math.round(maxPoints * (1 - ratio * 0.5));
}

function isAnswerCorrect(
  room: Room,
  answer: string | string[] | number
): boolean {
  const question = room.quiz.questions[room.currentQuestionIndex];

  if (question.type === 'quiz' || question.type === 'true-false') {
    const correct = question.answers?.find(a => a.isCorrect);
    if (!correct) return false;
    return answer === correct.id;
  }

  if (question.type === 'multi-select') {
    const correctIds = (question.answers ?? [])
      .filter(a => a.isCorrect)
      .map(a => a.id)
      .sort();
    const givenIds = Array.isArray(answer)
      ? [...answer].sort()
      : [String(answer)];
    return JSON.stringify(correctIds) === JSON.stringify(givenIds);
  }

  if (question.type === 'slider') {
    const num = Number(answer);
    const correct = question.sliderCorrect ?? 0;
    const tolerance = question.sliderTolerance ?? 0;
    return Math.abs(num - correct) <= tolerance;
  }

  return false;
}

export function startGame(io: Server, room: Room): void {
  room.state = 'starting';

  io.to(room.code).emit('game-starting', { countdown: COUNTDOWN_SECONDS });

  // startQuestion manages its own countdown offset; no duplicate delay here
  startQuestion(io, room);
}

export function startQuestion(io: Server, room: Room): void {
  const question = room.quiz.questions[room.currentQuestionIndex];
  if (!question) return;

  room.state = 'question-active';
  room.answeredCount = 0;
  // Set start time in the future so the client-side countdown doesn't eat into
  // answering time. Both the timer bar and scoring use this reference.
  room.questionStartTime = Date.now() + COUNTDOWN_SECONDS * 1000;

  // Send question without correct answer info
  io.to(room.code).emit('question-start', questionStartPayload(room));

  armQuestionTimer(io, room);
}

/** Schedules the end of the current question based on questionStartTime. */
function armQuestionTimer(io: Server, room: Room): void {
  const question = room.quiz.questions[room.currentQuestionIndex];
  if (room.questionTimer) clearTimeout(room.questionTimer);
  const endsAt = room.questionStartTime + question.timeLimit * 1000;
  room.questionTimer = setTimeout(() => endQuestion(io, room), Math.max(0, endsAt - Date.now()));
}

/** Freezes the game: the question timer stops and answers are rejected. */
export function pauseGame(io: Server, room: Room, reason: 'host' | 'host-disconnected'): void {
  if (room.paused) return;
  room.paused = true;
  room.pausedAt = Date.now();
  if (room.questionTimer) {
    clearTimeout(room.questionTimer);
    room.questionTimer = null;
  }
  io.to(room.code).emit('game-paused', { reason });
}

/** Unfreezes the game, shifting the question start so no answering time is lost. */
export function resumeGame(io: Server, room: Room): void {
  if (!room.paused) return;
  room.paused = false;
  if (room.state === 'question-active' || room.state === 'starting') {
    room.questionStartTime += Date.now() - room.pausedAt;
    armQuestionTimer(io, room);
  }
  io.to(room.code).emit('game-resumed', { serverTime: room.questionStartTime });
}

/** Ends the question early once every connected player has answered. */
export function checkAllAnswered(io: Server, room: Room): void {
  if (room.state !== 'question-active' || room.paused) return;
  const pending = Array.from(room.players.values()).some(
    p => p.connected && !p.answers.some(a => a.questionIndex === room.currentQuestionIndex),
  );
  if (!pending) endQuestion(io, room);
}

export function questionStartPayload(room: Room): QuestionStartPayload {
  const question = room.quiz.questions[room.currentQuestionIndex];
  return {
    questionIndex: room.currentQuestionIndex,
    totalQuestions: room.quiz.questions.length,
    serverTime: room.questionStartTime,
    question: {
      ...question,
      answers: question.answers?.map(({ id, text }) => ({ id, text })),
    },
  };
}

/**
 * ok: recorded (or already recorded) · retry: send it again later (paused, countdown not over)
 * · closed: this question is over, drop the answer.
 */
export type AnswerStatus = 'ok' | 'retry' | 'closed';

export function handleAnswer(
  io: Server,
  room: Room,
  player: Player,
  questionIndex: number,
  answer: string | string[] | number
): AnswerStatus {
  // Already recorded (a resend after a reconnect): confirm it, even if the question has ended since.
  if (player.answers.some(a => a.questionIndex === questionIndex)) return 'ok';
  const qIdx = room.currentQuestionIndex;
  if (questionIndex !== qIdx || room.state !== 'question-active') return 'closed';
  if (room.paused || Date.now() < room.questionStartTime) return 'retry';

  const question = room.quiz.questions[qIdx];
  const timeTaken = Math.max(0, Date.now() - room.questionStartTime);
  const correct = isAnswerCorrect(room, answer);
  const points = correct ? calcPoints(timeTaken, question.timeLimit, question.maxPoints) : 0;

  if (correct) {
    player.streak += 1;
    // streak bonus (capped at 500)
    const streakBonus = Math.min((player.streak - 1) * 50, 500);
    player.score += points + streakBonus;
  } else {
    player.streak = 0;
  }

  const playerAnswer: PlayerAnswer = {
    questionIndex: qIdx,
    answer,
    timeTaken,
    points: correct ? points : 0,
    correct,
  };
  player.lastAnswer = playerAnswer;
  player.answers.push(playerAnswer);

  room.answeredCount += 1;

  // Notify host that someone answered (without revealing who picked what)
  io.to(room.hostId).emit('player-answered', {
    answeredCount: room.answeredCount,
    totalPlayers: connectedCount(room),
    nickname: player.nickname,
  });

  checkAllAnswered(io, room);
  return 'ok';
}

export function endQuestion(io: Server, room: Room): void {
  if (room.state === 'question-results') return; // guard against double-call

  room.state = 'question-results';

  if (room.questionTimer) {
    clearTimeout(room.questionTimer);
    room.questionTimer = null;
  }

  const resultsPayload = questionResultsPayload(room);

  // Send personalized result to each player
  for (const player of room.players.values()) {
    const personalizedPayload = {
      ...resultsPayload,
      yourAnswer: player.answers.find(a => a.questionIndex === room.currentQuestionIndex),
    };
    io.to(player.id).emit('question-results', personalizedPayload);
  }

  // Send to host (no personalization needed)
  io.to(room.hostId).emit('question-results', resultsPayload);
}

export function questionResultsPayload(room: Room): QuestionResultsPayload {
  const question = room.quiz.questions[room.currentQuestionIndex];
  const standings = getPlayerStandings(room);

  // Build answer breakdown
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

  // Determine correct answer value to reveal
  let correctAnswer: string | string[] | number | boolean;
  if (question.type === 'quiz' || question.type === 'true-false') {
    correctAnswer = question.answers?.find(a => a.isCorrect)?.id ?? '';
  } else if (question.type === 'multi-select') {
    correctAnswer = question.answers?.filter(a => a.isCorrect).map(a => a.id) ?? [];
  } else {
    correctAnswer = question.sliderCorrect ?? 0;
  }

  return {
    questionIndex: room.currentQuestionIndex,
    questionText: question.text,
    correctAnswer,
    answerBreakdown,
    players: standings,
    ...(question.type === 'slider' ? {
      sliderMeta: {
        min: question.sliderMin ?? 0,
        max: question.sliderMax ?? 100,
        correct: question.sliderCorrect ?? 0,
        tolerance: question.sliderTolerance ?? 0,
      },
    } : {}),
  };
}

export function nextQuestion(io: Server, room: Room): void {
  room.currentQuestionIndex += 1;

  if (room.currentQuestionIndex >= room.quiz.questions.length) {
    endGame(io, room);
  } else {
    startQuestion(io, room);
  }
}

export function endGame(io: Server, room: Room): void {
  room.state = 'final-results';
  const standings = getPlayerStandings(room);
  io.to(room.code).emit('game-end', { players: standings });
}
