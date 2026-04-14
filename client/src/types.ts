export type QuestionType = 'quiz' | 'true-false' | 'multi-select' | 'slider';

export interface AnswerOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  timeLimit: number;
  maxPoints: number;
  image?: string;
  answers?: AnswerOptionFull[];
  sliderMin?: number;
  sliderMax?: number;
  sliderCorrect?: number;
  sliderTolerance?: number;
  // Only for builder (includes isCorrect)
  _answers?: AnswerOptionFull[];
  _correctBool?: boolean;
}

export interface AnswerOptionFull extends AnswerOption {
  isCorrect: boolean;
}

export interface Quiz {
  id?: string;
  title: string;
  questions: Question[];
}

export type SavedQuestion = Question & { _answers: AnswerOptionFull[]; _correctBool: boolean };

export interface SavedQuiz {
  id: string;
  title: string;
  questions: SavedQuestion[];
  savedAt: string;
}

export interface PlayerAnswer {
  questionIndex: number;
  answer: string | string[] | number;
  timeTaken: number;
  points: number;
  correct: boolean;
}

export interface PlayerStanding {
  nickname: string;
  score: number;
  rank: number;
  lastPoints: number;
  streak: number;
}

export interface QuestionStartPayload {
  questionIndex: number;
  question: Question;
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

export interface GameEndPayload {
  players: PlayerStanding[];
}

export type GameView =
  | 'home'
  | 'host-library'
  | 'host-setup'
  | 'host-lobby'
  | 'host-game'
  | 'host-results'
  | 'host-final'
  | 'player-join'
  | 'player-lobby'
  | 'player-answering'
  | 'player-results'
  | 'player-final';
