import { useEffect, useRef, useState } from 'react';
import { createRoom, CreatedRoom } from '../../socket';
import { Quiz, SavedQuestion, SavedQuiz } from '../../types';
import QuestionEditor from './QuestionEditor';
import { saveQuiz } from './QuizLibrary';
import { blankQuestion, exportQuizzes, newId, questionProblems, quizIsReady, toServerQuiz } from '../../quizFile';
import Icon from '../shared/Icon';

interface Props {
  onCreated: (quiz: Quiz, room: CreatedRoom) => void;
  onBack: () => void;
  initialQuiz?: SavedQuiz;
  /** Opened from "Host" in the library on a quiz that isn't ready: show what's missing right away. */
  showProblemsInitially?: boolean;
}

export default function HostSetup({ onCreated, onBack, initialQuiz, showProblemsInitially = false }: Props) {
  const [quizId] = useState(() => initialQuiz?.id ?? newId());
  const [title, setTitle] = useState(initialQuiz?.title ?? '');
  const [questions, setQuestions] = useState<SavedQuestion[]>(() => initialQuiz?.questions ?? [blankQuestion()]);
  const [showProblems, setShowProblems] = useState(showProblemsInitially);
  const [saved, setSaved] = useState(!!initialQuiz);
  const [hosting, setHosting] = useState(false);
  const [error, setError] = useState('');

  // ── Autosave: every edit lands in the library, there is no Save button to forget ──
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    setSaved(false);
    if (!title.trim() && questions.every(q => !q.text.trim())) return; // don't store an untouched blank quiz
    const t = setTimeout(() => {
      saveQuiz({ id: quizId, title: title.trim() || 'Untitled quiz', questions, savedAt: new Date().toISOString() });
      setSaved(true);
    }, 500);
    return () => clearTimeout(t);
  }, [title, questions, quizId]);

  const updateAt = (i: number, q: SavedQuestion) => setQuestions(prev => prev.map((x, j) => (j === i ? q : x)));

  const addQuestion = () => {
    const q = blankQuestion();
    setQuestions(prev => [...prev, q]);
    requestAnimationFrame(() => document.getElementById(`text-${q.id}`)?.focus());
  };

  const duplicateAt = (i: number) =>
    setQuestions(prev => {
      const src = prev[i];
      const copy = { ...src, id: newId(), _answers: src._answers.map(a => ({ ...a, id: newId() })) };
      return [...prev.slice(0, i + 1), copy, ...prev.slice(i + 1)];
    });

  // ── Reordering: drag the handle (mouse or touch), or use arrow keys on it ──
  const listRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ from: number; to: number } | null>(null);

  const move = (from: number, to: number) =>
    setQuestions(prev => {
      const next = [...prev];
      next.splice(to, 0, ...next.splice(from, 1));
      return next;
    });

  const dropIndexAt = (y: number, from: number) =>
    Array.from(listRef.current?.querySelectorAll<HTMLElement>('[data-qcard]') ?? [])
      .filter(el => Number(el.dataset.qcard) !== from)
      .filter(el => {
        const r = el.getBoundingClientRect();
        return r.top + r.height / 2 < y;
      }).length;

  const handleFor = (i: number) => (
    <button
      className="drag-handle"
      aria-label={`Move question ${i + 1}. Use the up and down arrow keys.`}
      title="Drag to reorder"
      onPointerDown={e => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        setDrag({ from: i, to: i });
        // Cards collapse while dragging; keep the grabbed one under the finger.
        const el = e.currentTarget;
        requestAnimationFrame(() => el.scrollIntoView({ block: 'center' }));
      }}
      onPointerMove={e => {
        if (!drag) return;
        const to = dropIndexAt(e.clientY, drag.from);
        if (to !== drag.to) setDrag({ ...drag, to });
      }}
      onPointerUp={() => {
        if (drag && drag.from !== drag.to) move(drag.from, drag.to);
        setDrag(null);
      }}
      onPointerCancel={() => setDrag(null)}
      onKeyDown={e => {
        const to = e.key === 'ArrowUp' ? i - 1 : e.key === 'ArrowDown' ? i + 1 : -1;
        if (to < 0 || to >= questions.length) return;
        e.preventDefault();
        move(i, to);
        requestAnimationFrame(() =>
          listRef.current?.querySelector<HTMLElement>(`[data-qcard="${to}"] .drag-handle`)?.focus(),
        );
      }}
    >
      <Icon name="grip" />
    </button>
  );

  // While dragging, show the cards in their would-be order.
  const shown = questions.map((q, i) => ({ q, i }));
  if (drag) shown.splice(drag.to, 0, ...shown.splice(drag.from, 1));

  // ── Host ──
  const draft = { title, questions };
  const ready = quizIsReady(draft);
  const problemCount = questions.filter(q => questionProblems(q).length > 0).length;

  const handleHost = async () => {
    setError('');
    if (!ready) {
      setShowProblems(true);
      const firstBad = questions.find(q => questionProblems(q).length > 0);
      if (!title.trim()) document.getElementById('quiz-title')?.focus();
      else if (firstBad) document.getElementById(`text-${firstBad.id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    setHosting(true);
    try {
      const serverQuiz = toServerQuiz(draft);
      onCreated(serverQuiz, await createRoom(serverQuiz));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the room.');
      setHosting(false);
    }
  };

  return (
    <div className="editor-page">
      <header className="editor-bar">
        <button className="btn btn-ghost btn-sm" onClick={onBack}>
          <Icon name="back" /> My quizzes
        </button>
        <span className="editor-status muted" role="status">
          {saved ? <><Icon name="check" /> Saved</> : title || questions.some(q => q.text) ? 'Saving…' : ''}
        </span>
        <div className="row" style={{ gap: 'var(--s-2)' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => exportQuizzes([{ id: quizId, title: title || 'Untitled quiz', questions, savedAt: new Date().toISOString() }])}
          >
            <Icon name="download" /> <span className="hide-sm">Export</span>
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleHost} disabled={hosting}>
            <Icon name="play" /> {hosting ? 'Opening…' : 'Host game'}
          </button>
        </div>
      </header>

      <main className="editor-main">
        <div className="qfield">
          <label className="field-label" htmlFor="quiz-title">Quiz title</label>
          <input
            id="quiz-title"
            className="input editor-title"
            placeholder="e.g. General knowledge"
            value={title}
            maxLength={120}
            onChange={e => setTitle(e.target.value)}
            aria-invalid={showProblems && !title.trim()}
          />
          {showProblems && !title.trim() && <p className="field-error">Give your quiz a title.</p>}
        </div>

        {(error || (showProblems && problemCount > 0)) && (
          <p className="alert-error" role="alert">
            <Icon name="alert" />
            {error || `${problemCount} question${problemCount > 1 ? 's' : ''} still need${problemCount > 1 ? '' : 's'} work before you can host.`}
          </p>
        )}

        <div ref={listRef} className="qcard-list">
          {shown.map(({ q, i }) => (
            <div key={q.id} data-qcard={i} className={drag?.from === i ? 'is-dragging' : undefined}>
              <QuestionEditor
                question={q}
                index={i}
                onChange={next => updateAt(i, next)}
                onDuplicate={() => duplicateAt(i)}
                onDelete={questions.length > 1 ? () => {
                  if (q.text.trim() && !window.confirm(`Delete question ${i + 1}?`)) return;
                  setQuestions(prev => prev.filter((_, j) => j !== i));
                } : null}
                handle={handleFor(i)}
                problems={showProblems ? questionProblems(q) : []}
                compact={!!drag}
              />
            </div>
          ))}
        </div>

        <button className="btn btn-secondary btn-block add-question" onClick={addQuestion}>
          + Add a question
        </button>
      </main>
    </div>
  );
}
