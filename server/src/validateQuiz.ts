import { Quiz, Question, QuestionType } from './types';

const TYPES: readonly QuestionType[] = ['quiz', 'true-false', 'multi-select', 'slider'];
const MAX_QUESTIONS = 200;
const MAX_TEXT = 500;

type Result = { ok: true; quiz: Omit<Quiz, 'id'> } | { ok: false; error: string };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const str = (v: unknown, max = MAX_TEXT) => (typeof v === 'string' ? v.slice(0, max) : '');
const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

/**
 * The quiz comes from the client (and possibly from an imported file),
 * so it is rebuilt field by field instead of being trusted as-is.
 */
export function validateQuiz(input: unknown): Result {
  if (!isObj(input) || !Array.isArray(input.questions)) return { ok: false, error: 'Invalid quiz' };
  if (input.questions.length === 0) return { ok: false, error: 'Quiz has no questions' };
  if (input.questions.length > MAX_QUESTIONS) return { ok: false, error: 'Too many questions' };

  const questions: Question[] = [];
  for (const [i, raw] of input.questions.entries()) {
    if (!isObj(raw) || !TYPES.includes(raw.type as QuestionType)) {
      return { ok: false, error: `Question ${i + 1} is invalid` };
    }
    const type = raw.type as QuestionType;
    const q: Question = {
      id: str(raw.id, 64) || `q${i}`,
      type,
      text: str(raw.text),
      timeLimit: Math.min(Math.max(Math.round(num(raw.timeLimit, 20)), 5), 240),
      maxPoints: Math.min(Math.max(Math.round(num(raw.maxPoints, 1000)), 0), 2000),
    };
    if (!q.text.trim()) return { ok: false, error: `Question ${i + 1} has no text` };
    if (typeof raw.image === 'string' && /^https?:\/\//.test(raw.image)) q.image = str(raw.image, 2000);

    if (type === 'slider') {
      q.sliderMin = num(raw.sliderMin, 0);
      q.sliderMax = num(raw.sliderMax, 100);
      q.sliderCorrect = num(raw.sliderCorrect, q.sliderMin);
      q.sliderTolerance = Math.max(0, num(raw.sliderTolerance, 0));
      if (q.sliderMin >= q.sliderMax) return { ok: false, error: `Question ${i + 1}: invalid range` };
    } else {
      if (!Array.isArray(raw.answers)) return { ok: false, error: `Question ${i + 1} has no answers` };
      q.answers = raw.answers.filter(isObj).slice(0, 6).map((a, j) => ({
        id: str(a.id, 64) || `a${j}`,
        text: str(a.text, 200),
        isCorrect: a.isCorrect === true,
      }));
      if (q.answers.length < 2 || !q.answers.some(a => a.isCorrect)) {
        return { ok: false, error: `Question ${i + 1} needs at least 2 answers and a correct one` };
      }
    }
    questions.push(q);
  }
  return { ok: true, quiz: { title: str(input.title, 120) || 'Quiz', questions } };
}
