import { useState } from 'react';
import { socket } from '../../socket';
import { Quiz, Question, AnswerOptionFull, QuestionType } from '../../types';
import QuestionEditor from './QuestionEditor';

interface Props {
  onCreated: (quiz: Quiz, code: string, qr: string) => void;
  onBack: () => void;
}

const COLORS = ['#e21b3c','#1368ce','#d89e00','#26890c'];
const SHAPES = ['▲','◆','●','■'];

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

function defaultQuestion(): Question & { _answers: AnswerOptionFull[]; _correctBool: boolean } {
  return {
    id: makeId(),
    type: 'quiz',
    text: '',
    timeLimit: 20,
    maxPoints: 1000,
    _correctBool: true,
    _answers: [
      { id: makeId(), text: '', isCorrect: true },
      { id: makeId(), text: '', isCorrect: false },
      { id: makeId(), text: '', isCorrect: false },
      { id: makeId(), text: '', isCorrect: false },
    ],
    sliderMin: 0,
    sliderMax: 100,
    sliderCorrect: 50,
    sliderTolerance: 5,
  };
}

export default function HostSetup({ onCreated, onBack }: Props) {
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<ReturnType<typeof defaultQuestion>[]>([defaultQuestion()]);
  const [editingIdx, setEditingIdx] = useState<number | null>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const addQuestion = () => {
    const q = defaultQuestion();
    setQuestions(prev => [...prev, q]);
    setEditingIdx(questions.length);
    setSidebarOpen(false);
  };

  const updateQuestion = (idx: number, updated: ReturnType<typeof defaultQuestion>) => {
    setQuestions(prev => prev.map((q, i) => (i === idx ? updated : q)));
  };

  const deleteQuestion = (idx: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== idx));
    setEditingIdx(null);
  };

  const duplicateQuestion = (idx: number) => {
    const dup = { ...questions[idx], id: makeId() };
    const next = [...questions];
    next.splice(idx + 1, 0, dup);
    setQuestions(next);
  };

  const buildServerQuiz = (): Quiz => ({
    title,
    questions: questions.map(q => {
      const base: Question = {
        id: q.id,
        type: q.type,
        text: q.text,
        timeLimit: q.timeLimit,
        maxPoints: q.maxPoints,
      };

      if (q.type === 'quiz' || q.type === 'multi-select') {
        base.answers = q._answers.map(a => ({ id: a.id, text: a.text, isCorrect: a.isCorrect }));
      } else if (q.type === 'true-false') {
        base.answers = [
          { id: 'true',  text: 'True',  isCorrect: q._correctBool },
          { id: 'false', text: 'False', isCorrect: !q._correctBool },
        ];
      } else if (q.type === 'slider') {
        base.sliderMin = q.sliderMin;
        base.sliderMax = q.sliderMax;
        base.sliderCorrect = q.sliderCorrect;
        base.sliderTolerance = q.sliderTolerance;
      }

      return base;
    }),
  });

  const validate = (): string => {
    if (!title.trim()) return 'Quiz title is required';
    if (questions.length === 0) return 'Add at least one question';
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) return `Question ${i + 1} has no text`;
      if (q.type === 'quiz' || q.type === 'multi-select') {
        if (q._answers.some(a => !a.text.trim())) return `Question ${i + 1}: all answers must have text`;
        if (!q._answers.some(a => a.isCorrect)) return `Question ${i + 1}: mark at least one correct answer`;
        if (q.type === 'quiz' && q._answers.filter(a => a.isCorrect).length > 1)
          return `Question ${i + 1}: quiz type allows only one correct answer`;
      }
    }
    return '';
  };

  const handleCreate = () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);

    const serverQuiz = buildServerQuiz();

    socket.emit('create-room', { quiz: serverQuiz }, (res: { ok: boolean; code?: string; qrCodeDataUrl?: string; error?: string }) => {
      setLoading(false);
      if (!res.ok || !res.code) {
        setError(res.error ?? 'Failed to create room');
        return;
      }
      onCreated(serverQuiz, res.code, res.qrCodeDataUrl ?? '');
    });
  };

  const selectQuestion = (idx: number) => {
    setEditingIdx(idx);
    setSidebarOpen(false);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--purple-dark)' }}>
      {/* Mobile top bar */}
      <div
        style={{
          display: 'none',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(12px)',
          padding: '0.5rem 0.75rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
        className="mobile-topbar"
      >
        <button className="btn btn-secondary btn-sm" onClick={onBack}>←</button>
        <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>
          {title || 'New Quiz'} · Q{(editingIdx ?? 0) + 1}/{questions.length}
        </span>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          ☰
        </button>
      </div>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            display: 'none',
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 199,
          }}
          className="mobile-overlay"
        />
      )}

      {/* Sidebar: question list */}
      <aside
        className="setup-sidebar"
        style={{
          width: '240px',
          flexShrink: 0,
          background: 'rgba(0,0,0,0.3)',
          borderRight: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          transition: 'transform 0.3s ease',
        }}
      >

        {/* Quiz title */}
        <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <button className="btn btn-secondary btn-sm" onClick={onBack} style={{ marginBottom: '0.75rem', width: '100%' }}>← Back</button>
          <input
            className="input"
            placeholder="Quiz title…"
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={{ fontSize: '0.9rem' }}
          />
        </div>

        {/* Question list */}
        <div style={{ flex: 1, padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => selectQuestion(i)}
              style={{
                background: editingIdx === i ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)',
                border: editingIdx === i ? '2px solid rgba(255,255,255,0.6)' : '2px solid transparent',
                borderRadius: '8px',
                padding: '0.6rem 0.75rem',
                color: '#fff',
                fontFamily: 'var(--font)',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'background 0.15s',
              }}
            >
              <span style={{ opacity: 0.6, fontWeight: 800, minWidth: '18px' }}>{i + 1}</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {q.text || 'Untitled question'}
              </span>
              <span style={{ opacity: 0.5, fontSize: '0.75rem' }}>
                {q.type === 'quiz' ? '🔵' : q.type === 'true-false' ? '✅' : q.type === 'multi-select' ? '☑️' : '🎚️'}
              </span>
            </button>
          ))}

          <button
            className="btn btn-secondary btn-sm"
            onClick={addQuestion}
            style={{ marginTop: '0.5rem', width: '100%' }}
          >
            + Add question
          </button>
        </div>

        {/* Create button */}
        <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {error && (
            <p style={{ color: '#ff8888', fontSize: '0.8rem', marginBottom: '0.5rem', fontWeight: 700 }}>
              ⚠ {error}
            </p>
          )}
          <button
            className="btn btn-primary"
            style={{ width: '100%', borderRadius: '50px' }}
            onClick={handleCreate}
            disabled={loading}
          >
            {loading ? '⏳ Creating…' : '🚀 Create Room'}
          </button>
        </div>
      </aside>

      {/* Main editor area */}
      <main className="setup-main" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {editingIdx !== null && questions[editingIdx] ? (
          <QuestionEditor
            question={questions[editingIdx]}
            index={editingIdx}
            total={questions.length}
            onChange={q => updateQuestion(editingIdx, q)}
            onDelete={() => deleteQuestion(editingIdx)}
            onDuplicate={() => duplicateQuestion(editingIdx)}
            COLORS={COLORS}
            SHAPES={SHAPES}
          />
        ) : (
          <div className="center" style={{ flex: 1, flexDirection: 'column', gap: '1rem', opacity: 0.5 }}>
            <div style={{ fontSize: '4rem' }}>📝</div>
            <p style={{ fontWeight: 700 }}>Select a question to edit</p>
          </div>
        )}
      </main>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .mobile-topbar { display: flex !important; }
          .mobile-overlay { display: block !important; }
          .setup-sidebar {
            position: fixed !important;
            top: 0;
            left: 0;
            bottom: 0;
            z-index: 200;
            width: 280px !important;
            background: var(--purple-dark) !important;
            transform: ${sidebarOpen ? 'translateX(0)' : 'translateX(-100%)'};
          }
          .setup-main {
            padding-top: 52px;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
