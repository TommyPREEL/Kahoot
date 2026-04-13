import { AnswerOptionFull, Question, QuestionType } from '../../types';

type EditableQuestion = Question & { _answers: AnswerOptionFull[]; _correctBool: boolean };

interface Props {
  question: EditableQuestion;
  index: number;
  total: number;
  onChange: (q: EditableQuestion) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  COLORS: string[];
  SHAPES: string[];
}

function makeId() { return Math.random().toString(36).slice(2, 9); }

const TYPE_OPTIONS: { value: QuestionType; label: string; icon: string }[] = [
  { value: 'quiz',         label: 'Quiz',        icon: '🔵' },
  { value: 'true-false',   label: 'True/False',  icon: '✅' },
  { value: 'multi-select', label: 'Multi-select',icon: '☑️' },
  { value: 'slider',       label: 'Slider',      icon: '🎚️' },
];

const TIME_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120];
const POINTS_OPTIONS = [500, 1000, 2000];

export default function QuestionEditor({ question, index, total, onChange, onDelete, onDuplicate, COLORS, SHAPES }: Props) {
  const update = (partial: Partial<EditableQuestion>) => onChange({ ...question, ...partial });

  const setAnswerText = (aid: string, text: string) =>
    update({ _answers: question._answers.map(a => a.id === aid ? { ...a, text } : a) });

  const setAnswerCorrect = (aid: string, correct: boolean) => {
    if (question.type === 'quiz') {
      // single select
      update({ _answers: question._answers.map(a => ({ ...a, isCorrect: a.id === aid ? correct : false })) });
    } else {
      update({ _answers: question._answers.map(a => a.id === aid ? { ...a, isCorrect: correct } : a) });
    }
  };

  const addAnswer = () => {
    if (question._answers.length >= 6) return;
    update({ _answers: [...question._answers, { id: makeId(), text: '', isCorrect: false }] });
  };

  const removeAnswer = (aid: string) => {
    if (question._answers.length <= 2) return;
    update({ _answers: question._answers.filter(a => a.id !== aid) });
  };

  const handleTypeChange = (type: QuestionType) => {
    let answers = question._answers;
    if (type === 'true-false') {
      answers = [
        { id: 'true',  text: 'True',  isCorrect: true },
        { id: 'false', text: 'False', isCorrect: false },
      ];
    } else if (question.type === 'true-false') {
      answers = [
        { id: makeId(), text: '', isCorrect: true },
        { id: makeId(), text: '', isCorrect: false },
        { id: makeId(), text: '', isCorrect: false },
        { id: makeId(), text: '', isCorrect: false },
      ];
    }
    update({ type, _answers: answers });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.75rem 1.25rem',
          background: 'rgba(0,0,0,0.25)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontWeight: 800, opacity: 0.6, fontSize: '0.9rem' }}>
          Q{index + 1} / {total}
        </span>

        {/* Type selector */}
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {TYPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleTypeChange(opt.value)}
              style={{
                background: question.type === opt.value ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.07)',
                border: question.type === opt.value ? '2px solid rgba(255,255,255,0.6)' : '2px solid transparent',
                borderRadius: '8px',
                padding: '0.3rem 0.65rem',
                color: '#fff',
                fontFamily: 'var(--font)',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>

        {/* Time limit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.8rem', opacity: 0.7, fontWeight: 700 }}>⏱</span>
          <select
            value={question.timeLimit}
            onChange={e => update({ timeLimit: Number(e.target.value) })}
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '8px', color: '#fff', padding: '0.3rem 0.5rem', fontFamily: 'var(--font)', fontWeight: 700, fontSize: '0.85rem' }}
          >
            {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}s</option>)}
          </select>
        </div>

        {/* Points */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.8rem', opacity: 0.7, fontWeight: 700 }}>🏆</span>
          <select
            value={question.maxPoints}
            onChange={e => update({ maxPoints: Number(e.target.value) })}
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '8px', color: '#fff', padding: '0.3rem 0.5rem', fontFamily: 'var(--font)', fontWeight: 700, fontSize: '0.85rem' }}
          >
            {POINTS_OPTIONS.map(p => <option key={p} value={p}>{p} pts</option>)}
          </select>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={onDuplicate}>📋 Copy</button>
          <button className="btn btn-danger btn-sm" onClick={onDelete}>🗑 Delete</button>
        </div>
      </div>

      {/* Editor body */}
      <div style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '900px', margin: '0 auto', width: '100%', overflowY: 'auto' }}>
        {/* Question text */}
        <textarea
          className="input"
          placeholder="Type your question here…"
          value={question.text}
          onChange={e => update({ text: e.target.value })}
          rows={3}
          style={{ resize: 'vertical', fontSize: '1.1rem', fontWeight: 700 }}
        />

        {/* Answers based on type */}
        {(question.type === 'quiz' || question.type === 'multi-select') && (
          <div>
            <p style={{ fontWeight: 800, marginBottom: '0.75rem', opacity: 0.7, fontSize: '0.9rem' }}>
              {question.type === 'multi-select' ? 'Answers (select all that are correct)' : 'Answers (select the correct one)'}
            </p>
            <div className="editor-answer-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {question._answers.map((a, i) => (
                <div
                  key={a.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: a.isCorrect ? `${COLORS[i % 4]}33` : 'rgba(255,255,255,0.07)',
                    border: a.isCorrect ? `2px solid ${COLORS[i % 4]}` : '2px solid rgba(255,255,255,0.15)',
                    borderRadius: '10px',
                    padding: '0.5rem 0.75rem',
                    transition: 'background 0.2s, border 0.2s',
                  }}
                >
                  <span style={{ color: COLORS[i % 4], fontSize: '1.2rem', flexShrink: 0 }}>{SHAPES[i % 4]}</span>
                  <input
                    className="input"
                    style={{ border: 'none', background: 'transparent', fontSize: '0.95rem', padding: '0.25rem 0.5rem', flex: 1 }}
                    placeholder={`Answer ${i + 1}`}
                    value={a.text}
                    onChange={e => setAnswerText(a.id, e.target.value)}
                  />
                  <button
                    onClick={() => setAnswerCorrect(a.id, !a.isCorrect)}
                    title={a.isCorrect ? 'Mark wrong' : 'Mark correct'}
                    style={{
                      background: a.isCorrect ? COLORS[i % 4] : 'rgba(255,255,255,0.15)',
                      border: 'none',
                      borderRadius: '6px',
                      width: '32px',
                      height: '32px',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {a.isCorrect ? '✓' : '○'}
                  </button>
                  {question._answers.length > 2 && (
                    <button
                      onClick={() => removeAnswer(a.id)}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1rem', padding: '0 0.2rem' }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            {question._answers.length < 6 && (
              <button className="btn btn-secondary btn-sm" onClick={addAnswer} style={{ marginTop: '0.75rem' }}>
                + Add answer
              </button>
            )}
          </div>
        )}

        {question.type === 'true-false' && (
          <div>
            <p style={{ fontWeight: 800, marginBottom: '0.75rem', opacity: 0.7, fontSize: '0.9rem' }}>Correct answer</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {[true, false].map(val => (
                <button
                  key={String(val)}
                  onClick={() => update({ _correctBool: val })}
                  style={{
                    flex: 1,
                    padding: '1.2rem',
                    border: `3px solid ${question._correctBool === val ? (val ? '#26890c' : '#e21b3c') : 'rgba(255,255,255,0.2)'}`,
                    borderRadius: '12px',
                    background: question._correctBool === val ? (val ? '#26890c33' : '#e21b3c33') : 'rgba(255,255,255,0.07)',
                    color: '#fff',
                    fontFamily: 'var(--font)',
                    fontWeight: 800,
                    fontSize: '1.2rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s',
                  }}
                >
                  {val ? '✅ True' : '❌ False'}
                </button>
              ))}
            </div>
          </div>
        )}

        {question.type === 'slider' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontWeight: 800, opacity: 0.7, fontSize: '0.9rem' }}>Slider settings</p>
            <div className="editor-slider-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {[
                { label: 'Min value', key: 'sliderMin' as const },
                { label: 'Max value', key: 'sliderMax' as const },
                { label: 'Correct answer', key: 'sliderCorrect' as const },
                { label: 'Tolerance (±)', key: 'sliderTolerance' as const },
              ].map(({ label, key }) => (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, opacity: 0.7 }}>{label}</label>
                  <input
                    type="number"
                    className="input"
                    value={question[key] ?? 0}
                    onChange={e => update({ [key]: Number(e.target.value) })}
                    style={{ fontSize: '0.95rem' }}
                  />
                </div>
              ))}
            </div>
            {/* Preview slider */}
            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.07)', borderRadius: '10px' }}>
              <label style={{ fontSize: '0.85rem', opacity: 0.7, fontWeight: 700 }}>Preview</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.9rem', opacity: 0.6 }}>{question.sliderMin ?? 0}</span>
                <input
                  type="range"
                  min={question.sliderMin ?? 0}
                  max={question.sliderMax ?? 100}
                  value={question.sliderCorrect ?? 50}
                  readOnly
                  style={{ flex: 1, accentColor: '#ffd700' }}
                />
                <span style={{ fontSize: '0.9rem', opacity: 0.6 }}>{question.sliderMax ?? 100}</span>
              </div>
              <p style={{ textAlign: 'center', fontWeight: 800, marginTop: '0.25rem' }}>
                Correct: {question.sliderCorrect ?? 50} ± {question.sliderTolerance ?? 5}
              </p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 600px) {
          .editor-answer-grid { grid-template-columns: 1fr !important; }
          .editor-slider-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
