export type QuestionType = 'quiz' | 'true-false' | 'multi-select' | 'slider';

export interface AnswerOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  timeLimit: number; // seconds
  maxPoints: number;
  image?: string;
  // quiz / true-false / multi-select
  answers?: AnswerOption[];
  // slider
  sliderMin?: number;
  sliderMax?: number;
  sliderCorrect?: number;
  sliderTolerance?: number;
}

export interface Quiz {
  id: string;
  title: string;
  questions: Question[];
}

export interface PlayerAnswer {
  questionIndex: number;
  answer: string | string[] | number;
  timeTaken: number; // ms from question start
  points: number;
  correct: boolean;
}

export interface Player {
  id: string; // socket id
  nickname: string;
  score: number;
  streak: number;
  lastAnswer?: PlayerAnswer;
  answers: PlayerAnswer[];
  connected: boolean;
}

export type RoomState =
  | 'lobby'
  | 'starting'
  | 'question-active'
  | 'question-results'
  | 'final-results';

export interface Room {
  code: string;
  hostId: string;
  quiz: Quiz;
  players: Map<string, Player>;
  state: RoomState;
  currentQuestionIndex: number;
  questionStartTime: number;
  questionTimer: ReturnType<typeof setTimeout> | null;
  answeredCount: number;
  qrCodeDataUrl: string;
}

// Events sent from server to client
export interface QuestionStartPayload {
  questionIndex: number;
  question: Omit<Question, 'answers'> & {
    answers?: Omit<AnswerOption, 'isCorrect'>[];
  };
  totalQuestions: number;
  serverTime: number;
}

export interface QuestionResultsPayload {
  questionIndex: number;
  correctAnswer: string | string[] | number | boolean;
  answerBreakdown: { answerId: string; count: number; text: string }[];
  players: PlayerStanding[];
  yourAnswer?: PlayerAnswer;
}

export interface PlayerStanding {
  nickname: string;
  score: number;
  rank: number;
  lastPoints: number;
  streak: number;
}

export interface GameEndPayload {
  players: PlayerStanding[];
}
