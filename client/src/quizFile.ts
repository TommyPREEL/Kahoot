import { AnswerOptionFull, Question, QuestionType, Quiz, SavedQuestion, SavedQuiz } from './types';

const FORMAT = 'blitzquiz';
const VERSION = 1;
const TYPES: readonly QuestionType[] = ['quiz', 'true-false', 'multi-select', 'slider'];

// getRandomValues (unlike randomUUID) also works on plain-HTTP LAN addresses.
export const newId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(6)), b => b.toString(16).padStart(2, '0')).join('');

/** Downloads one or several quizzes as a single JSON file. */
export function exportQuizzes(quizzes: SavedQuiz[]): void {
  const payload = {
    format: FORMAT,
    version: VERSION,
    quizzes: quizzes.map(({ title, questions }) => ({ title, questions })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = quizzes.length === 1 ? `${slug(quizzes[0].title)}.blitzquiz.json` : 'blitzquiz-library.json';
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Parses an exported file. Accepts the export format, a bare quiz or a list of quizzes.
 * Every question is rebuilt with fresh ids so an import never overwrites an existing quiz.
 */
export async function importQuizzes(file: File): Promise<SavedQuiz[]> {
  if (file.size > 2_000_000) throw new Error('File is too large');
  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error('This file is not valid JSON');
  }
  const list = isObj(data) && Array.isArray(data.quizzes) ? data.quizzes : Array.isArray(data) ? data : [data];
  const quizzes = list.map((q, i) => toSavedQuiz(q, i));
  if (quizzes.length === 0) throw new Error('No quiz found in this file');
  return quizzes;
}

function toSavedQuiz(raw: unknown, index: number): SavedQuiz {
  const where = `Quiz ${index + 1}`;
  if (!isObj(raw) || !Array.isArray(raw.questions) || raw.questions.length === 0) {
    throw new Error(`${where}: no questions found`);
  }
  return {
    id: newId(),
    title: str(raw.title, 120) || 'Imported quiz',
    savedAt: new Date().toISOString(),
    questions: raw.questions.map((q, j) => toQuestion(q, `${where}, question ${j + 1}`)),
  };
}

function toQuestion(raw: unknown, where: string): SavedQuestion {
  if (!isObj(raw) || !TYPES.includes(raw.type as QuestionType)) throw new Error(`${where}: unknown type`);
  const type = raw.type as QuestionType;
  const text = str(raw.text, 500);
  if (!text.trim()) throw new Error(`${where}: missing text`);

  // Exports store builder answers in `_answers`; hand-written files may use `answers`.
  const source = Array.isArray(raw._answers) ? raw._answers : Array.isArray(raw.answers) ? raw.answers : [];
  const answers: AnswerOptionFull[] = source
    .filter(isObj)
    .slice(0, 6)
    .map(a => ({ id: newId(), text: str(a.text, 200), isCorrect: a.isCorrect === true }));
  if ((type === 'quiz' || type === 'multi-select') && answers.length < 2) {
    throw new Error(`${where}: needs at least 2 answers`);
  }
  const trueAnswer = source.filter(isObj).find(a => a.id === 'true');
  const correctBool =
    typeof raw._correctBool === 'boolean' ? raw._correctBool : trueAnswer ? trueAnswer.isCorrect === true : true;

  const sliderMin = num(raw.sliderMin, 0);
  const sliderMax = num(raw.sliderMax, 100);
  return {
    id: newId(),
    type,
    text,
    timeLimit: clamp(num(raw.timeLimit, 20), 5, 240),
    maxPoints: clamp(num(raw.maxPoints, 1000), 0, 2000),
    _answers: answers.length >= 2 ? answers : defaultAnswers(),
    _correctBool: correctBool,
    sliderMin,
    sliderMax: sliderMax > sliderMin ? sliderMax : sliderMin + 100,
    sliderCorrect: num(raw.sliderCorrect, sliderMin),
    sliderTolerance: Math.max(0, num(raw.sliderTolerance, 0)),
  };
}

function defaultAnswers(): AnswerOptionFull[] {
  return [0, 1, 2, 3].map(i => ({ id: newId(), text: '', isCorrect: i === 0 }));
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(Math.round(v), lo), hi);
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'quiz';

/** Builder format → the payload the server expects (correct flags included, server strips them for players). */
export function toServerQuiz(saved: Pick<SavedQuiz, 'title' | 'questions'>): Quiz {
  return {
    title: saved.title,
    questions: saved.questions.map(q => {
      const base: Question = { id: q.id, type: q.type, text: q.text, timeLimit: q.timeLimit, maxPoints: q.maxPoints };
      if (q.type === 'quiz' || q.type === 'multi-select') {
        base.answers = q._answers.map(({ id, text, isCorrect }) => ({ id, text, isCorrect }));
      } else if (q.type === 'true-false') {
        base.answers = [
          { id: 'true', text: 'True', isCorrect: q._correctBool },
          { id: 'false', text: 'False', isCorrect: !q._correctBool },
        ];
      } else {
        base.sliderMin = q.sliderMin;
        base.sliderMax = q.sliderMax;
        base.sliderCorrect = q.sliderCorrect;
        base.sliderTolerance = q.sliderTolerance;
      }
      return base;
    }),
  };
}

/** What still blocks hosting this question, in plain words. Empty = ready. */
export function questionProblems(q: SavedQuestion): string[] {
  const out: string[] = [];
  if (!q.text.trim()) out.push('Write the question.');
  if (q.type === 'quiz' || q.type === 'multi-select') {
    if (q._answers.some(a => !a.text.trim())) out.push('Fill in every answer, or remove the empty ones.');
    const correct = q._answers.filter(a => a.isCorrect).length;
    if (correct === 0) out.push('Mark the correct answer.');
    if (q.type === 'quiz' && correct > 1) out.push('Only one answer can be correct for this type.');
  }
  if (q.type === 'slider') {
    const min = q.sliderMin ?? 0, max = q.sliderMax ?? 100, c = q.sliderCorrect ?? min;
    if (min >= max) out.push('The minimum must be lower than the maximum.');
    else if (c < min || c > max) out.push('The correct number must be between the minimum and the maximum.');
  }
  return out;
}

export function quizIsReady(saved: Pick<SavedQuiz, 'title' | 'questions'>): boolean {
  return !!saved.title.trim() && saved.questions.length > 0 && saved.questions.every(q => questionProblems(q).length === 0);
}

export function blankQuestion(): SavedQuestion {
  return {
    id: newId(),
    type: 'quiz',
    text: '',
    timeLimit: 20,
    maxPoints: 1000,
    _correctBool: true,
    _answers: defaultAnswers(),
    sliderMin: 0,
    sliderMax: 100,
    sliderCorrect: 50,
    sliderTolerance: 5,
  };
}
