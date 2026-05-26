import { useState, useEffect, useRef } from "react";
import { socket } from "../../socket";
import { QuestionStartPayload, QuestionResultsPayload } from "../../types";
import TimerBar from "../shared/TimerBar";
import Countdown from "../shared/Countdown";

interface Props {
  question: QuestionStartPayload | null;
  results: QuestionResultsPayload | null;
  nickname: string;
}

const COLORS = ["#e21b3c", "#1368ce", "#d89e00", "#26890c"];
const SHAPES = ["▲", "◆", "●", "■"];
const TF_COLORS = { true: "#26890c", false: "#e21b3c" };

export default function PlayerAnswering({
  question,
  results,
  nickname,
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

  const submitAnswer = (answer: string | string[] | number) => {
    if (submitted) return;
    setSubmitted(true);
    socket.emit("submit-answer", { answer });
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
    const { yourAnswer, correctAnswer, answerBreakdown, players, sliderMeta } =
      results;
    const correct = yourAnswer?.correct ?? false;
    const points = yourAnswer?.points ?? 0;
    const myRank = players.find((p) => p.nickname === nickname);

    return (
      <div
        className="page center"
        style={{ flexDirection: "column", gap: "1.5rem", textAlign: "center" }}
      >
        {/* Result card */}
        <div
          className={`card animate-bounceIn ${correct ? "" : "animate-shake"}`}
          style={{
            background: correct ? "rgba(38,137,12,0.3)" : "rgba(226,27,60,0.3)",
            border: `3px solid ${correct ? "#26890c" : "#e21b3c"}`,
            maxWidth: "380px",
            width: "100%",
          }}
        >
          <div style={{ fontSize: "4rem", marginBottom: "0.25rem" }}>
            {correct ? "✅" : "❌"}
          </div>
          <h2>{correct ? "Correct!" : "Incorrect"}</h2>
          {correct && (
            <div style={{ marginTop: "0.5rem" }}>
              <div
                style={{
                  fontSize: "2.5rem",
                  fontWeight: 900,
                  color: "#ffd700",
                }}
              >
                +{points}
              </div>
              <p style={{ opacity: 0.8, fontWeight: 700, fontSize: "0.9rem" }}>
                points
              </p>
            </div>
          )}
          {yourAnswer?.timeTaken && (
            <p
              style={{
                opacity: 0.6,
                fontWeight: 600,
                fontSize: "0.85rem",
                marginTop: "0.5rem",
              }}
            >
              Answered in {(yourAnswer.timeTaken / 1000).toFixed(1)}s
            </p>
          )}
        </div>

        {/* Streak */}
        {myRank && myRank.streak > 1 && (
          <div
            className="animate-bounceIn delay-2"
            style={{
              background: "rgba(255,215,0,0.2)",
              border: "2px solid #ffd700",
              borderRadius: "50px",
              padding: "0.4rem 1.25rem",
              fontWeight: 800,
              color: "#ffd700",
            }}
          >
            🔥 {myRank.streak}× streak bonus!
          </div>
        )}

        {/* Leaderboard */}
        <div
          className="card animate-fadeInUp delay-2"
          style={{ maxWidth: "380px", width: "100%" }}
        >
          <p
            style={{
              opacity: 0.7,
              fontWeight: 700,
              fontSize: "0.85rem",
              marginBottom: "0.6rem",
            }}
          >
            Scoreboard
          </p>
          {players.map((p, i) => (
            <div
              key={p.nickname}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                padding: "0.45rem 0.5rem",
                borderRadius: "8px",
                background:
                  p.nickname === nickname
                    ? "rgba(255,215,0,0.12)"
                    : "transparent",
                marginBottom: "2px",
              }}
            >
              <span
                style={{
                  fontWeight: 900,
                  opacity: 0.5,
                  minWidth: "22px",
                  fontSize: "0.85rem",
                }}
              >
                #{p.rank}
              </span>
              <span
                style={{
                  flex: 1,
                  fontWeight: 700,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: "0.9rem",
                  color: p.nickname === nickname ? "#ffd700" : "#fff",
                }}
              >
                {p.nickname}
                {p.nickname === nickname ? " ★" : ""}
              </span>
              <span
                style={{
                  fontWeight: 900,
                  fontSize: "0.9rem",
                  color: "#ffd700",
                }}
              >
                {p.score.toLocaleString()}
              </span>
              {p.lastPoints > 0 && (
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    color: "#26890c",
                    minWidth: "36px",
                    textAlign: "right",
                  }}
                >
                  +{p.lastPoints}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Correct answer — quiz / true-false / multi-select */}
        {answerBreakdown.length > 0 && (
          <div
            className="animate-fadeInUp delay-3"
            style={{ maxWidth: "380px", width: "100%" }}
          >
            <p
              style={{
                opacity: 0.6,
                fontWeight: 700,
                fontSize: "0.85rem",
                marginBottom: "0.5rem",
              }}
            >
              Correct answer
            </p>
            {answerBreakdown
              .filter((a) => {
                if (Array.isArray(correctAnswer))
                  return correctAnswer.includes(a.answerId);
                return a.answerId === correctAnswer;
              })
              .map((a) => (
                <div
                  key={a.answerId}
                  style={{
                    background: "#26890c",
                    borderRadius: "10px",
                    padding: "0.75rem 1rem",
                    fontWeight: 800,
                    marginBottom: "0.4rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  ✓ {a.text}
                </div>
              ))}
          </div>
        )}

        {/* Correct answer — slider */}
        {typeof correctAnswer === "number" && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
          >
            {yourAnswer?.answer !== undefined && (
              <div
                style={{
                  background: yourAnswer.correct
                    ? "rgba(38,137,12,0.25)"
                    : "rgba(226,27,60,0.25)",
                  borderRadius: "10px",
                  padding: "0.75rem 1rem",
                  fontWeight: 800,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>Your answer</span>
                <span style={{ fontSize: "1.2rem", color: "#ffd700" }}>
                  {String(yourAnswer.answer)}
                </span>
              </div>
            )}
            <div
              style={{
                background: "#26890c",
                borderRadius: "10px",
                padding: "0.75rem 1rem",
                fontWeight: 800,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>
                ✓ Correct{sliderMeta ? ` (±${sliderMeta.tolerance})` : ""}
              </span>
              <span style={{ fontSize: "1.2rem" }}>{correctAnswer}</span>
            </div>
            {sliderMeta && (
              <div style={{ padding: "0.5rem 0" }}>
                <div
                  style={{
                    position: "relative",
                    height: "8px",
                    background: "rgba(255,255,255,0.15)",
                    borderRadius: "4px",
                    margin: "0.5rem 0",
                  }}
                >
                  {/* tolerance band */}
                  <div
                    style={{
                      position: "absolute",
                      left: `${((sliderMeta.correct - sliderMeta.tolerance - sliderMeta.min) / (sliderMeta.max - sliderMeta.min)) * 100}%`,
                      width: `${((sliderMeta.tolerance * 2) / (sliderMeta.max - sliderMeta.min)) * 100}%`,
                      top: 0,
                      bottom: 0,
                      background: "rgba(38,137,12,0.5)",
                      borderRadius: "4px",
                    }}
                  />
                  {/* correct marker */}
                  <div
                    style={{
                      position: "absolute",
                      left: `${((sliderMeta.correct - sliderMeta.min) / (sliderMeta.max - sliderMeta.min)) * 100}%`,
                      transform: "translateX(-50%)",
                      width: "14px",
                      height: "14px",
                      background: "#26890c",
                      borderRadius: "50%",
                      top: "-3px",
                      border: "2px solid #fff",
                    }}
                  />
                  {/* player marker */}
                  {yourAnswer?.answer !== undefined && (
                    <div
                      style={{
                        position: "absolute",
                        left: `${((Number(yourAnswer.answer) - sliderMeta.min) / (sliderMeta.max - sliderMeta.min)) * 100}%`,
                        transform: "translateX(-50%)",
                        width: "14px",
                        height: "14px",
                        background: yourAnswer.correct ? "#26890c" : "#e21b3c",
                        borderRadius: "50%",
                        top: "-3px",
                        border: "2px solid #fff",
                        zIndex: 2,
                      }}
                    />
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    opacity: 0.5,
                    fontSize: "0.8rem",
                    fontWeight: 700,
                  }}
                >
                  <span>{sliderMeta.min}</span>
                  <span>{sliderMeta.max}</span>
                </div>
              </div>
            )}
          </div>
        )}

        <p
          className="animate-fadeInUp delay-4"
          style={{ opacity: 0.5, fontWeight: 700, fontSize: "0.85rem" }}
        >
          ⏳ Waiting for next question…
        </p>
      </div>
    );
  }

  // ── Answering view ────────────────────────────────────────────────────────
  if (!question) {
    return (
      <div
        className="page center"
        style={{ flexDirection: "column", gap: "1rem", textAlign: "center" }}
      >
        <div style={{ fontSize: "3rem", animation: "spin 1s linear infinite" }}>
          ⚡
        </div>
        <h2>Get Ready!</h2>
        <p style={{ opacity: 0.7, fontWeight: 600 }}>Question incoming…</p>
      </div>
    );
  }

  const q = question.question;

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      {showCountdown && <Countdown from={3} />}

      {/* Question text */}
      <div
        className="animate-fadeInDown"
        style={{
          background: "rgba(0,0,0,0.3)",
          padding: "1.25rem 1.5rem",
          textAlign: "center",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div
          style={{
            opacity: 0.6,
            fontWeight: 700,
            fontSize: "0.8rem",
            marginBottom: "0.5rem",
          }}
        >
          Q{question.questionIndex + 1} / {question.totalQuestions} ·{" "}
          {q.timeLimit}s · {q.maxPoints} pts
        </div>
        <h2 style={{ fontSize: "clamp(1.1rem, 3.5vw, 1.6rem)" }}>{q.text}</h2>
      </div>

      {/* Timer */}
      <div style={{ padding: "0.5rem 1rem" }}>
        <TimerBar
          key={timerKey}
          seconds={q.timeLimit}
          serverStartTime={question.serverTime}
        />
      </div>

      {/* Submitted state */}
      {submitted && (
        <div
          className="page center animate-bounceIn"
          style={{
            flex: 1,
            flexDirection: "column",
            gap: "1rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "5rem",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          >
            ⏳
          </div>
          <h2>Answer submitted!</h2>
          <p style={{ opacity: 0.7, fontWeight: 600 }}>Waiting for everyone…</p>
        </div>
      )}

      {/* Quiz / Multi-select buttons */}
      {!submitted && (q.type === "quiz" || q.type === "multi-select") && (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "0",
            padding: "0.5rem",
          }}
        >
          <div
            className="player-answer-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.5rem",
              flex: 1,
            }}
          >
            {(q.answers ?? []).map((ans, i) => {
              const selected = selectedIds.includes(ans.id);
              return (
                <button
                  key={ans.id}
                  className={`answer-btn ans-${i % 4} animate-bounceIn`}
                  style={{
                    animationDelay: `${i * 0.08 + 0.5}s`,
                    opacity: showCountdown ? 0 : 1,
                    outline:
                      selected && q.type === "multi-select"
                        ? "4px solid #ffd700"
                        : "none",
                    outlineOffset: "-2px",
                    transition: "opacity 0.3s, outline 0.1s",
                    minHeight: "70px",
                    fontSize: "clamp(0.85rem, 2.5vw, 1.05rem)",
                  }}
                  onClick={() =>
                    q.type === "multi-select"
                      ? handleMultiToggle(ans.id)
                      : handleSingleChoice(ans.id)
                  }
                >
                  <span className={`shape-icon shape-${i % 4}`} />
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
              style={{
                margin: "0.5rem",
                borderRadius: "50px",
                fontSize: "1.1rem",
              }}
            >
              ✓ Submit ({selectedIds.length} selected)
            </button>
          )}
        </div>
      )}

      {/* True/False */}
      {!submitted && q.type === "true-false" && (
        <div
          className="player-tf-grid"
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.5rem",
            padding: "0.5rem",
          }}
        >
          {[
            { id: "true", label: "✅ True", color: TF_COLORS.true },
            { id: "false", label: "❌ False", color: TF_COLORS.false },
          ].map((opt, i) => (
            <button
              key={opt.id}
              className="answer-btn animate-bounceIn"
              style={{
                background: opt.color,
                animationDelay: `${i * 0.1 + 0.5}s`,
                opacity: showCountdown ? 0 : 1,
                justifyContent: "center",
                fontSize: "clamp(1.1rem, 3.5vw, 1.4rem)",
                fontWeight: 900,
                minHeight: "100px",
                transition: "opacity 0.3s",
              }}
              onClick={() => handleSingleChoice(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Slider */}
      {!submitted && q.type === "slider" && (
        <div
          className="animate-fadeInUp"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1.5rem",
            padding: "1rem",
          }}
        >
          <div
            style={{
              fontSize: "clamp(2.5rem, 8vw, 3.5rem)",
              fontWeight: 900,
              color: "#ffd700",
              animation: "pulse 1s ease-in-out infinite",
              minWidth: "100px",
              textAlign: "center",
            }}
          >
            {sliderValue}
          </div>

          <input
            type="range"
            min={q.sliderMin ?? 0}
            max={q.sliderMax ?? 100}
            value={sliderValue}
            onChange={(e) => setSliderValue(Number(e.target.value))}
            style={{
              width: "100%",
              maxWidth: "500px",
              accentColor: "#ffd700",
              height: "8px",
              cursor: "pointer",
            }}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
              maxWidth: "500px",
              opacity: 0.6,
              fontWeight: 700,
              fontSize: "0.9rem",
            }}
          >
            <span>{q.sliderMin ?? 0}</span>
            <span>{q.sliderMax ?? 100}</span>
          </div>

          <button
            className="btn btn-primary btn-lg"
            onClick={handleSliderSubmit}
            style={{
              borderRadius: "50px",
              minWidth: "180px",
              width: "100%",
              maxWidth: "280px",
            }}
          >
            ✓ Lock in {sliderValue}
          </button>
        </div>
      )}

      <style>{`
        @media (max-width: 360px) {
          .player-answer-grid { grid-template-columns: 1fr !important; }
          .player-tf-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
