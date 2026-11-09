import { useMemo } from "react";
import Icon from "./shared/Icon";
import { getSavedQuizzes } from "./host/QuizLibrary";

interface Props {
  onHost: () => void;
  onJoin: () => void;
  onLibrary: () => void;
}

export default function HomePage({ onHost, onJoin, onLibrary }: Props) {
  const savedCount = useMemo(() => getSavedQuizzes().length, []);
  return (
    <div className="page center page-col">
      <div className="animate-fadeInDown">
        <svg className="brand-bolt" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M13 2L4 14h6l-1 8 9-12h-6z" />
        </svg>
        <h1 className="brand">
          Blitz<b>Quiz</b>
        </h1>
        <p className="muted" style={{ marginTop: "var(--s-1)" }}>
          Live quizzes for a room full of phones.
        </p>
      </div>

      <div className="animate-fadeInUp stack w-action">
        <button className="btn btn-primary btn-lg" onClick={onHost}>
          <Icon name="play" /> Host a game
        </button>
        <button className="btn btn-secondary btn-lg" onClick={onJoin}>
          Join with a code
        </button>

        <div className="divider-or">OR</div>

        <button className="btn btn-secondary" onClick={onLibrary}>
          <Icon name="book" /> My quizzes
          {savedCount > 0 && <span className="badge">{savedCount}</span>}
        </button>
      </div>

      <div aria-hidden="true">
        {["▲", "◆", "●", "■"].map((shape, i) => (
          <span
            key={i}
            className="deco-shape"
            style={{
              left: `${[8, 84, 12, 80][i]}%`,
              top: `${[14, 22, 72, 68][i]}%`,
              color: `var(--ans-${i})`,
              zIndex: -1,
            }}
          >
            {shape}
          </span>
        ))}
      </div>
    </div>
  );
}
