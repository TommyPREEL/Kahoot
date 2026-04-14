import { useState } from 'react';
import { SavedQuiz } from '../../types';

export const QUIZ_STORAGE_KEY = 'kahoot-saved-quizzes';

export function getSavedQuizzes(): SavedQuiz[] {
  try {
    return JSON.parse(localStorage.getItem(QUIZ_STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

interface Props {
  onNew: () => void;
  onLoad: (quiz: SavedQuiz) => void;
  onBack: () => void;
}

export default function QuizLibrary({ onNew, onLoad, onBack }: Props) {
  const [quizzes, setQuizzes] = useState<SavedQuiz[]>(getSavedQuizzes);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    const updated = quizzes.filter(q => q.id !== id);
    localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(updated));
    setQuizzes(updated);
    setConfirmDelete(null);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--purple-dark)', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '2rem',
          flexWrap: 'wrap',
        }}>
          <button className="btn btn-secondary btn-sm" onClick={onBack}>← Back</button>
          <h1 style={{ flex: 1, margin: 0, fontSize: 'clamp(1.2rem, 4vw, 1.8rem)', color: '#fff' }}>
            📚 My Quizzes
          </h1>
          <button className="btn btn-primary" onClick={onNew}>+ New Quiz</button>
        </div>

        {/* Empty state */}
        {quizzes.length === 0 ? (
          <div
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              padding: '4rem 2rem',
              textAlign: 'center',
              opacity: 0.7,
            }}
          >
            <div style={{ fontSize: '4rem' }}>📝</div>
            <p style={{ fontWeight: 700, fontSize: '1.2rem', margin: 0 }}>No saved quizzes yet</p>
            <p style={{ opacity: 0.7, margin: 0 }}>Build a quiz and save it to reuse it later</p>
            <button className="btn btn-primary" onClick={onNew} style={{ marginTop: '0.5rem' }}>
              Create your first quiz
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '1rem',
          }}>
            {quizzes.map(quiz => (
              <div
                key={quiz.id}
                className="card"
                style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
              >
                {/* Quiz info */}
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '1.05rem',
                    color: '#fff',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {quiz.title}
                  </h3>
                  <p style={{ margin: '0.3rem 0 0', opacity: 0.55, fontSize: '0.82rem' }}>
                    {quiz.questions.length} question{quiz.questions.length !== 1 ? 's' : ''}
                    {' · '}
                    {new Date(quiz.savedAt).toLocaleDateString(undefined, {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                </div>

                {/* Question type pills */}
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                  {Array.from(new Set(quiz.questions.map(q => q.type))).map(type => (
                    <span key={type} style={{
                      background: 'rgba(255,255,255,0.1)',
                      borderRadius: '50px',
                      padding: '0.15rem 0.55rem',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: 'rgba(255,255,255,0.7)',
                    }}>
                      {type === 'quiz' ? '🔵 Quiz' : type === 'true-false' ? '✅ True/False' : type === 'multi-select' ? '☑️ Multi' : '🎚️ Slider'}
                    </span>
                  ))}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', alignItems: 'stretch' }}>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1, fontSize: '0.9rem' }}
                    onClick={() => onLoad(quiz)}
                  >
                    ✏️ Edit & Host
                  </button>

                  {confirmDelete === quiz.id ? (
                    <>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
                        onClick={() => setConfirmDelete(null)}
                      >
                        Cancel
                      </button>
                      <button
                        style={{ background: '#e21b3c', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.5rem 0.75rem', fontFamily: 'var(--font)', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                        onClick={() => handleDelete(quiz.id)}
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.5rem 0.75rem', fontSize: '1rem', lineHeight: 1 }}
                      title="Delete quiz"
                      onClick={() => setConfirmDelete(quiz.id)}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
