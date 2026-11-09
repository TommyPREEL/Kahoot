import { ReactNode } from 'react';
import Icon from '../shared/Icon';
import { QuestionType, SavedQuestion } from '../../types';
import { newId } from '../../quizFile';

interface Props {
  question: SavedQuestion;
  index: number;
  onChange: (q: SavedQuestion) => void;
  onDelete: (() => void) | null;
  onDuplicate: () => void;
  /** Drag handle rendered in the card header. */
  handle: ReactNode;
  /** Shown only after the host tried to start the game. */
  problems: string[];
  /** Collapsed to its header while the list is being reordered. */
  compact: boolean;
}

const SHAPES = ['▲', '◆', '●', '■', '★', '⬟'];

const TYPES: { value: QuestionType; label: string; hint: string; example: string }[] = [
  { value: 'quiz', label: 'Single answer', hint: 'Players pick one answer.', example: 'e.g. What is the capital of Japan?' },
  { value: 'multi-select', label: 'Multiple answers', hint: 'Players tick every correct answer.', example: 'e.g. Which of these are planets?' },
  { value: 'true-false', label: 'True or false', hint: 'Two buttons: True and False.', example: 'e.g. The Sun is a star.' },
  { value: 'slider', label: 'Number', hint: 'Players slide to a number.', example: 'e.g. In what year did the first World Cup take place?' },
];

const TIME_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120];
const POINTS_OPTIONS = [0, 500, 1000, 2000];

export default function QuestionEditor({ question: q, index, onChange, onDelete, onDuplicate, handle, problems, compact }: Props) {
  const update = (partial: Partial<SavedQuestion>) => onChange({ ...q, ...partial });

  const setAnswer = (id: string, partial: { text?: string; isCorrect?: boolean }) =>
    update({
      _answers: q._answers.map(a => {
        if (a.id === id) return { ...a, ...partial };
        // Single answer: marking one correct un-marks the others.
        return q.type === 'quiz' && partial.isCorrect ? { ...a, isCorrect: false } : a;
      }),
    });

  const setType = (type: QuestionType) => {
    let answers = q._answers;
    if (type === 'quiz') {
      const first = answers.findIndex(a => a.isCorrect);
      answers = answers.map((a, i) => ({ ...a, isCorrect: i === first }));
    }
    update({ type, _answers: answers });
  };

  const typeInfo = TYPES.find(t => t.value === q.type)!;
  const titleId = `q-${q.id}-title`;

  return (
    <section className={`qcard${problems.length ? ' has-problems' : ''}${compact ? ' is-compact' : ''}`} aria-labelledby={titleId}>
      <header className="qcard-head">
        {handle}
        <h2 id={titleId} className="qcard-title">
          Question {index + 1}
          {compact && <span className="qcard-peek"> · {q.text || 'No text yet'}</span>}
        </h2>
        {!compact && (
          <div className="row" style={{ gap: 'var(--s-1)' }}>
            <button className="btn btn-ghost btn-sm" onClick={onDuplicate}>
              <Icon name="copy" /> Duplicate
            </button>
            {onDelete && (
              <button className="btn btn-ghost btn-sm btn-ghost-bad" onClick={onDelete}>
                <Icon name="trash" /> Delete
              </button>
            )}
          </div>
        )}
      </header>

      {!compact && (
        <div className="qcard-body">
          <fieldset className="qfield">
            <legend className="field-label">Question type</legend>
            <div className="type-picker">
              {TYPES.map(t => (
                <label key={t.value} className={`type-option${q.type === t.value ? ' is-active' : ''}`}>
                  <input
                    type="radio"
                    name={`type-${q.id}`}
                    checked={q.type === t.value}
                    onChange={() => setType(t.value)}
                  />
                  {t.label}
                </label>
              ))}
            </div>
            <p className="hint">{typeInfo.hint}</p>
          </fieldset>

          <div className="qfield">
            <label className="field-label" htmlFor={`text-${q.id}`}>Question</label>
            <textarea
              id={`text-${q.id}`}
              className="input qcard-text"
              placeholder={typeInfo.example}
              value={q.text}
              rows={2}
              maxLength={500}
              onChange={e => update({ text: e.target.value })}
            />
          </div>

          {(q.type === 'quiz' || q.type === 'multi-select') && (
            <div className="qfield">
              <p className="field-label">
                Answers <span className="hint-inline">· {q.type === 'quiz' ? 'mark the correct one' : 'mark every correct one'}</span>
              </p>
              <ul className="answer-list">
                {q._answers.map((a, i) => (
                  <li key={a.id} className={`answer-row${a.isCorrect ? ' is-correct' : ''}`} style={{ ['--tile' as string]: `var(--ans-${i % 4})` }}>
                    <span className="answer-shape" aria-hidden="true">{SHAPES[i]}</span>
                    <input
                      className="input answer-input"
                      aria-label={`Answer ${i + 1}`}
                      placeholder={`Answer ${i + 1}`}
                      value={a.text}
                      maxLength={200}
                      onChange={e => setAnswer(a.id, { text: e.target.value })}
                    />
                    <button
                      className="correct-toggle"
                      aria-pressed={a.isCorrect}
                      onClick={() => setAnswer(a.id, { isCorrect: !a.isCorrect })}
                    >
                      <Icon name={a.isCorrect ? 'check' : 'circle'} />
                      Correct
                    </button>
                    <button
                      className="btn-ghost-icon"
                      aria-label={`Remove answer ${i + 1}`}
                      title="Remove answer"
                      disabled={q._answers.length <= 2}
                      onClick={() => update({ _answers: q._answers.filter(x => x.id !== a.id) })}
                    >
                      <Icon name="trash" />
                    </button>
                  </li>
                ))}
              </ul>
              {q._answers.length < 6 && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => update({ _answers: [...q._answers, { id: newId(), text: '', isCorrect: false }] })}
                >
                  + Add an answer
                </button>
              )}
            </div>
          )}

          {q.type === 'true-false' && (
            <div className="qfield">
              <p className="field-label">The correct answer is</p>
              <div className="row" style={{ gap: 'var(--s-3)' }}>
                {[true, false].map(val => (
                  <button
                    key={String(val)}
                    className={`tf-btn ${val ? 'ans-3' : 'ans-0'}${q._correctBool === val ? ' is-active' : ''}`}
                    aria-pressed={q._correctBool === val}
                    onClick={() => update({ _correctBool: val })}
                  >
                    {val ? 'True' : 'False'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {q.type === 'slider' && (
            <div className="qfield">
              <div className="slider-fields">
                {([
                  ['sliderCorrect', 'Correct number'],
                  ['sliderTolerance', 'Accepted gap (±)'],
                  ['sliderMin', 'Slider starts at'],
                  ['sliderMax', 'Slider ends at'],
                ] as const).map(([key, label]) => (
                  <label key={key} className="stack-xs">
                    <span className="field-label">{label}</span>
                    <input
                      type="number"
                      className="input"
                      value={q[key] ?? 0}
                      onChange={e => update({ [key]: e.target.value === '' ? 0 : Number(e.target.value) })}
                    />
                  </label>
                ))}
              </div>
              <p className="hint">
                Answers from {(q.sliderCorrect ?? 0) - (q.sliderTolerance ?? 0)} to {(q.sliderCorrect ?? 0) + (q.sliderTolerance ?? 0)} count as correct.
              </p>
            </div>
          )}

          <div className="qcard-settings">
            <label className="row" style={{ gap: 'var(--s-2)' }}>
              <Icon name="clock" />
              <span>Time to answer</span>
              <select className="select-sm" value={q.timeLimit} onChange={e => update({ timeLimit: Number(e.target.value) })}>
                {TIME_OPTIONS.map(t => <option key={t} value={t}>{t} s</option>)}
              </select>
            </label>
            <label className="row" style={{ gap: 'var(--s-2)' }}>
              <Icon name="star" />
              <span>Points</span>
              <select className="select-sm" value={q.maxPoints} onChange={e => update({ maxPoints: Number(e.target.value) })}>
                {POINTS_OPTIONS.map(p => <option key={p} value={p}>{p === 0 ? 'No points' : p}</option>)}
              </select>
            </label>
          </div>

          {problems.length > 0 && (
            <ul className="qcard-problems" role="alert">
              {problems.map(p => <li key={p}><Icon name="alert" /> {p}</li>)}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
