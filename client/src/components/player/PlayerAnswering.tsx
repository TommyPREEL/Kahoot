import QuestionRecap from "../shared/QuestionRecap";
import { useState, useEffect, useRef } from "react";
import { submitAnswer as sendAnswer } from "../../socket";
import { QuestionStartPayload, QuestionResultsPayload } from "../../types";
import TimerBar from "../shared/TimerBar";
import Countdown from "../shared/Countdown";
import Icon from "../shared/Icon";

interface Props {
  question: QuestionStartPayload | null;
  results: QuestionResultsPayload | null;
  nickname: string;
  alreadyAnswered?: boolean;
}


export default function PlayerAnswering({
  question,
  results,
  nickname,
  alreadyAnswered = false,
}: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sliderValue, setSliderValue] = useState<number>(0);
  const [showCountdown, setShowCountdown] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  const prevQIdx = useRef<number | null>(null);

  // Reset on new question
  useEffect(() => {
    if (!question) return;
    if (prevQIdx.current !== question.questionIndex) {
      prevQIdx.current = question.questionIndex;
      setSubmitted(false);
      setSelectedIds([]);
      setSliderValue(
        Math.round(
          ((question.question.sliderMin ?? 0) +
            (question.question.sliderMax ?? 100)) /
            2,
        ),
      );
      setShowCountdown(true);
      setTimerKey((k) => k + 1);
      const t = setTimeout(() => setShowCountdown(false), 3200);
      return () => clearTimeout(t);
    }
  }, [question]);

  // Reconnected after answering: the server already has our answer.
  useEffect(() => {
    if (alreadyAnswered) setSubmitted(true);
  }, [alreadyAnswered]);

  const submitAnswer = (answer: string | string[] | number) => {
    if (submitted) return;
    setSubmitted(true);
    if (question) sendAnswer(question.questionIndex, answer);
  };

  const handleSingleChoice = (id: string) => {
    submitAnswer(id);
  };

  const handleMultiToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleMultiSubmit = () => {
    if (selectedIds.length === 0) return;
    submitAnswer(selectedIds);
  };

  const handleSliderSubmit = () => {
    submitAnswer(sliderValue);
  };

  // ── Results view ──────────────────────────────────────────────────────────
  if (results) {
    const { yourAnswer, correctAnswer, players, sliderMeta } =
      results;
    const correct = yourAnswer?.correct ?? false;
    const points = yourAnswer?.points ?? 0;
    const myRank = players.find((p) => p.nickname === nickname);
    const sliderRange = sliderMeta ? sliderMeta.max - sliderMeta.min : 1;

    return (
      <div className="page center page-col">
        {/* Result card */}
        <div
          className={`card w-narrow result-card ${correct ? "is-ok animate-bounceIn" : "is-bad animate-shake"}`}
          role="status"
        >
          <div className="result-mark" aria-hidden="true">
            <Icon name={correct ? "check" : "x"} />
          </div>
          <h2>{correct ? "Correct" : "Incorrect"}</h2>
          {correct && (
            <div style={{ marginTop: "var(--s-2)" }}>
              <div className="points">+{points}</div>
              <p className="muted" style={{ fontSize: "0.9rem" }}>points</p>
            </div>
          )}
          {yourAnswer?.timeTaken && (
            <p className="muted" style={{ fontSize: "0.85rem", marginTop: "var(--s-2)" }}>
              Answered in {(yourAnswer.timeTaken / 1000).toFixed(1)}s
            </p>
          )}
        </div>

        {/* Streak */}
        {myRank && myRank.streak > 1 && (
          <div className="chip chip-streak animate-bounceIn delay-2">
            <Icon name="flame" /> {myRank.streak}x streak bonus
          </div>
        )}

        <div className="w-narrow animate-fadeInUp delay-1">
          <QuestionRecap results={results} yourAnswer={yourAnswer ?? null} />
        </div>

        {/* Slider: where the answer and the accepted range sit */}
        {typeof correctAnswer === "number" && sliderMeta && (
          <div className="w-narrow stack-sm">
            {sliderMeta && (
              <div style={{ padding: "var(--s-2) 0" }}>
                <div className="range-track">
                  <div
                    className="range-band"
                    style={{
                      left: `${((sliderMeta.correct - sliderMeta.tolerance - sliderMeta.min) / sliderRange) * 100}%`,
                      width: `${((sliderMeta.tolerance * 2) / sliderRange) * 100}%`,
                    }}
                  />
                  <div
                    className="range-marker"
                    style={{
                      left: `${((sliderMeta.correct - sliderMeta.min) / sliderRange) * 100}%`,
                      background: "var(--ok)",
                    }}
                  />
                  {yourAnswer?.answer !== undefined && (
                    <div
                      className="range-marker"
                      style={{
                        left: `${((Number(yourAnswer.answer) - sliderMeta.min) / sliderRange) * 100}%`,
                        background: yourAnswer.correct ? "var(--ok)" : "var(--bad)",
                        zIndex: 2,
                      }}
                    />
                  )}
                </div>
                <div className="row-between muted" style={{ fontSize: "0.8rem" }}>
                  <span>{sliderMeta.min}</span>
                  <span>{sliderMeta.max}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Leaderboard */}
        <div className="card w-narrow animate-fadeInUp delay-2">
          <p className="field-label">Scoreboard</p>
          {players.map((p) => (
            <div
              key={p.nickname}
              className={`score-row${p.nickname === nickname ? " is-me" : ""}`}
            >
              <span className="score-rank">{p.rank}</span>
              <span className="rank-name">
                {p.nickname}
                {p.nickname === nickname ? " (you)" : ""}
              </span>
              <span className="rank-score">{p.score.toLocaleString()}</span>
              {p.lastPoints > 0 && <span className="rank-gain">+{p.lastPoints}</span>}
            </div>
          ))}
        </div>

        <p className="muted animate-fadeInUp delay-4" style={{ fontSize: "0.85rem" }}>
          Waiting for next question…
        </p>
      </div>
    );
  }

  // ── Answering view ────────────────────────────────────────────────────────
  if (!question) {
    return (
      <div className="page center page-col">
        <h2>Get ready</h2>
        <p className="muted animate-pulse">Question incoming…</p>
      </div>
    );
  }

  const q = question.question;

  return (
    <div className="host-screen">
      {showCountdown && <Countdown from={3} />}

      {/* Question text */}
      <div className="animate-fadeInDown player-question">
        <div className="muted" style={{ fontSize: "0.8rem", marginBottom: "var(--s-2)" }}>
          Q{question.questionIndex + 1} / {question.totalQuestions} ·{" "}
          {q.timeLimit}s · {q.maxPoints} pts
        </div>
        <h2 style={{ fontSize: "clamp(1.1rem, 3.5vw, 1.6rem)" }}>{q.text}</h2>
      </div>

      {/* Timer */}
      <div style={{ padding: "var(--s-2) var(--s-4)" }}>
        <TimerBar
          key={timerKey}
          seconds={q.timeLimit}
          serverStartTime={question.serverTime}
        />
      </div>

      {/* Submitted state */}
      {submitted && (
        <div className="page center page-col animate-bounceIn" style={{ flex: 1 }}>
          <Icon name="hourglass" className="icon-lg animate-pulse" />
          <h2>Answer submitted</h2>
          <p className="muted">Waiting for everyone…</p>
        </div>
      )}

      {/* Quiz / Multi-select buttons */}
      {!submitted && (q.type === "quiz" || q.type === "multi-select") && (
        <div className="col" style={{ flex: 1, padding: "var(--s-2)" }}>
          <div className="player-answer-grid">
            {(q.answers ?? []).map((ans, i) => {
              const selected = selectedIds.includes(ans.id);
              return (
                <button
                  key={ans.id}
                  className={`answer-btn ans-${i % 4} animate-bounceIn${selected && q.type === "multi-select" ? " is-selected" : ""}`}
                  style={{
                    animationDelay: `${i * 0.08 + 0.5}s`,
                    opacity: showCountdown ? 0 : 1,
                  }}
                  aria-pressed={q.type === "multi-select" ? selected : undefined}
                  onClick={() =>
                    q.type === "multi-select"
                      ? handleMultiToggle(ans.id)
                      : handleSingleChoice(ans.id)
                  }
                >
                  <span className={`shape-icon shape-${i % 4}`} aria-hidden="true" />
                  {ans.text}
                </button>
              );
            })}
          </div>

          {q.type === "multi-select" && (
            <button
              className="btn btn-success"
              onClick={handleMultiSubmit}
              disabled={selectedIds.length === 0}
              style={{ margin: "var(--s-2)" }}
            >
              <Icon name="check" /> Submit ({selectedIds.length} selected)
            </button>
          )}
        </div>
      )}

      {/* True/False */}
      {!submitted && q.type === "true-false" && (
        <div className="player-answer-grid" style={{ flex: 1, padding: "var(--s-2)" }}>
          {[
            { id: "true", label: "True", cls: "ans-3", icon: "check" as const },
            { id: "false", label: "False", cls: "ans-0", icon: "x" as const },
          ].map((opt, i) => (
            <button
              key={opt.id}
              className={`answer-btn answer-tf ${opt.cls} animate-bounceIn`}
              style={{
                animationDelay: `${i * 0.1 + 0.5}s`,
                opacity: showCountdown ? 0 : 1,
              }}
              onClick={() => handleSingleChoice(opt.id)}
            >
              <Icon name={opt.icon} /> {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Slider */}
      {!submitted && q.type === "slider" && (
        <div className="animate-fadeInUp slider-panel">
          <div className="slider-value">{sliderValue}</div>

          <input
            type="range"
            className="slider-input"
            aria-label="Your answer"
            min={q.sliderMin ?? 0}
            max={q.sliderMax ?? 100}
            value={sliderValue}
            onChange={(e) => setSliderValue(Number(e.target.value))}
          />

          <div className="row-between muted slider-input" style={{ fontSize: "0.9rem", height: "auto" }}>
            <span>{q.sliderMin ?? 0}</span>
            <span>{q.sliderMax ?? 100}</span>
          </div>

          <button className="btn btn-primary btn-lg w-action" onClick={handleSliderSubmit}>
            <Icon name="check" /> Lock in {sliderValue}
          </button>
        </div>
      )}
    </div>
  );
}
