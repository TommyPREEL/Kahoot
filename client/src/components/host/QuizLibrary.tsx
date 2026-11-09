import { useRef, useState } from "react";
import { SavedQuiz } from "../../types";
import Icon from "../shared/Icon";
import { exportQuizzes, importQuizzes, quizIsReady, toServerQuiz } from "../../quizFile";
import { createRoom, CreatedRoom } from "../../socket";
import { Quiz } from "../../types";

export const QUIZ_STORAGE_KEY = "blitzquiz-saved-quizzes";

export function getSavedQuizzes(): SavedQuiz[] {
  try {
    return JSON.parse(localStorage.getItem(QUIZ_STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

/** Inserts or replaces a quiz in the library, newest first. */
export function saveQuiz(entry: SavedQuiz): void {
  const saved = getSavedQuizzes().filter((q) => q.id !== entry.id);
  try {
    localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify([entry, ...saved]));
  } catch {
    /* storage full or blocked: the quiz still exists in memory and can be exported */
  }
}

interface Props {
  onNew: () => void;
  onEdit: (quiz: SavedQuiz) => void;
  /** Open the editor with what's missing highlighted. */
  onFix: (quiz: SavedQuiz) => void;
  onCreated: (quiz: Quiz, room: CreatedRoom) => void;
  onBack: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  quiz: "Single answer",
  "multi-select": "Multiple answers",
  "true-false": "True or false",
  slider: "Number",
};

export default function QuizLibrary({ onNew, onEdit, onFix, onCreated, onBack }: Props) {
  const [hostingId, setHostingId] = useState<string | null>(null);
  const [hostError, setHostError] = useState("");

  const handleHost = async (quiz: SavedQuiz) => {
    if (!quizIsReady(quiz)) return onFix(quiz);
    setHostError("");
    setHostingId(quiz.id);
    try {
      const serverQuiz = toServerQuiz(quiz);
      onCreated(serverQuiz, await createRoom(serverQuiz));
    } catch (e) {
      setHostError(e instanceof Error ? e.message : "Could not create the room.");
      setHostingId(null);
    }
  };

  const [quizzes, setQuizzes] = useState<SavedQuiz[]>(getSavedQuizzes);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    const updated = quizzes.filter((q) => q.id !== id);
    localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(updated));
    setQuizzes(updated);
    setConfirmDelete(null);
  };

  const fileRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handleImport = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const imported = (await Promise.all(Array.from(files).map(importQuizzes))).flat();
      const updated = [...imported, ...quizzes];
      localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(updated));
      setQuizzes(updated);
      setImportMsg({ ok: true, text: `${imported.length} quiz${imported.length > 1 ? "zes" : ""} imported` });
    } catch (e) {
      setImportMsg({ ok: false, text: e instanceof Error ? e.message : "Import failed" });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="lib-page">
      <div className="lib-inner">
        <div className="row wrap" style={{ gap: 'var(--s-4)', marginBottom: 'var(--s-6)' }}>
          <button className="btn btn-secondary btn-sm" onClick={onBack}>
            <Icon name="back" /> Back
          </button>
          <h1 className="grow" style={{ fontSize: "clamp(1.4rem, 4vw, 2rem)" }}>
            My quizzes
          </h1>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            multiple
            hidden
            onChange={(e) => handleImport(e.target.files)}
          />
          <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" /> Import
          </button>
          {quizzes.length > 1 && (
            <button className="btn btn-secondary" onClick={() => exportQuizzes(quizzes)}>
              <Icon name="download" /> Export all
            </button>
          )}
          <button className="btn btn-primary" onClick={onNew}>
            + New quiz
          </button>
        </div>

        {hostError && (
          <p className="alert-error" role="alert" style={{ marginBottom: "var(--s-4)" }}>
            <Icon name="alert" /> {hostError}
          </p>
        )}

        {importMsg && (
          <p className={importMsg.ok ? "badge" : "alert-error"} role="status" style={{ marginBottom: "var(--s-4)" }}>
            <Icon name={importMsg.ok ? "check" : "alert"} /> {importMsg.text}
          </p>
        )}

        {quizzes.length === 0 ? (
          <div className="card stack text-center" style={{ alignItems: "center", padding: "var(--s-7) var(--s-5)" }}>
            <h3>No saved quizzes yet</h3>
            <p className="muted">Build a quiz and save it to reuse it later.</p>
            <button className="btn btn-primary" onClick={onNew}>
              Create your first quiz
            </button>
          </div>
        ) : (
          <div className="lib-grid">
            {quizzes.map((quiz) => (
              <article key={quiz.id} className="card lib-card">
                <div className="lib-card-head">
                  <div className="grow" style={{ minWidth: 0 }}>
                    <h3 className="ellipsis">{quiz.title}</h3>
                    <p className="muted lib-meta">
                      {quiz.questions.length} question{quiz.questions.length !== 1 ? "s" : ""}
                      {" · "}
                      {new Date(quiz.savedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <button className="btn-ghost-icon" title="Export" aria-label={`Export ${quiz.title}`} onClick={() => exportQuizzes([quiz])}>
                    <Icon name="download" />
                  </button>
                  <button className="btn-ghost-icon" title="Delete" aria-label={`Delete ${quiz.title}`} onClick={() => setConfirmDelete(quiz.id)}>
                    <Icon name="trash" />
                  </button>
                </div>

                <div className="row wrap" style={{ gap: "var(--s-1)" }}>
                  {Array.from(new Set(quiz.questions.map((q) => q.type))).map((type) => (
                    <span key={type} className="chip">{TYPE_LABELS[type]}</span>
                  ))}
                </div>

                {confirmDelete === quiz.id ? (
                  <div className="lib-actions lib-confirm" role="alert">
                    <span>Delete this quiz?</span>
                    <button className="btn btn-secondary btn-sm" onClick={() => setConfirmDelete(null)}>Cancel</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(quiz.id)}>Delete</button>
                  </div>
                ) : (
                  <div className="lib-actions">
                    <button className="btn btn-secondary" onClick={() => onEdit(quiz)}>
                      <Icon name="edit" /> Edit
                    </button>
                    <button className="btn btn-primary" onClick={() => handleHost(quiz)} disabled={hostingId !== null}>
                      <Icon name="play" /> {hostingId === quiz.id ? "Opening…" : "Host"}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
