import { Server, Socket } from 'socket.io';
import {
  Room,
  Player,
  PlayerAnswer,
  QuestionStartPayload,
  QuestionResultsPayload,
} from './types';
import { getPlayerStandings } from './RoomManager';

const COUNTDOWN_SECONDS = 3;

function calcPoints(timeTaken: number, timeLimit: number, maxPoints: number): number {
  // Kahoot formula: full points if answered instantly, 50% at deadline
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

  setTimeout(() => {
    startQuestion(io, room);
  }, COUNTDOWN_SECONDS * 1000);
}

export function startQuestion(io: Server, room: Room): void {
  const question = room.quiz.questions[room.currentQuestionIndex];
  if (!question) return;

  room.state = 'question-active';
  room.answeredCount = 0;
  room.questionStartTime = Date.now();

  // Send question without correct answer info
  const payload: QuestionStartPayload = {
    questionIndex: room.currentQuestionIndex,
    totalQuestions: room.quiz.questions.length,
    serverTime: room.questionStartTime,
    question: {
      ...question,
      answers: question.answers?.map(({ id, text }) => ({ id, text })),
    },
  };

  io.to(room.code).emit('question-start', payload);

  // Server-side timer
  room.questionTimer = setTimeout(() => {
    endQuestion(io, room);
  }, question.timeLimit * 1000);
}

export function handleAnswer(
  io: Server,
  room: Room,
  player: Player,
  answer: string | string[] | number
): void {
  if (room.state !== 'question-active') return;

  const qIdx = room.currentQuestionIndex;
  // Prevent double-answering
  if (player.answers.some(a => a.questionIndex === qIdx)) return;

  const question = room.quiz.questions[qIdx];
  const timeTaken = Date.now() - room.questionStartTime;
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
    totalPlayers: room.players.size,
    nickname: player.nickname,
  });

  // Check if all players answered
  const activePlayers = Array.from(room.players.values()).filter(p => p.connected);
  if (room.answeredCount >= activePlayers.length) {
    if (room.questionTimer) {
      clearTimeout(room.questionTimer);
      room.questionTimer = null;
    }
    endQuestion(io, room);
  }
}

export function endQuestion(io: Server, room: Room): void {
  if (room.state === 'question-results') return; // guard against double-call

  room.state = 'question-results';

  if (room.questionTimer) {
    clearTimeout(room.questionTimer);
    room.questionTimer = null;
  }

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

  const resultsPayload: QuestionResultsPayload = {
    questionIndex: room.currentQuestionIndex,
    correctAnswer,
    answerBreakdown,
    players: standings,
  };

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
