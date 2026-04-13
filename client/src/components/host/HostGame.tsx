import { useEffect, useState } from 'react';
import { QuestionStartPayload, QuestionResultsPayload } from '../../types';
import TimerBar from '../shared/TimerBar';
import MiniPodium from '../shared/MiniPodium';
import Countdown from '../shared/Countdown';

interface Props {
  roomCode: string;
  question: QuestionStartPayload | null;
  results: QuestionResultsPayload | null;
  players: { id: string; nickname: string }[];
  answeredCount: number;
  totalPlayers: number;
  totalQuestions: number;
  onNext: () => void;
}

const COLORS = ['#e21b3c','#1368ce','#d89e00','#26890c'];
const SHAPES = ['▲','◆','●','■'];

export default function HostGame({
  roomCode, question, results, players, answeredCount, totalPlayers,
  totalQuestions, onNext,
}: Props) {
  const [showCountdown, setShowCountdown] = useState(false);
  const [timerKey, setTimerKey] = useState(0);

  useEffect(() => {
    if (question) {
      setShowCountdown(true);
      setTimerKey(k => k + 1);
      const t = setTimeout(() => setShowCountdown(false), 3200);
      return () => clearTimeout(t);
    }
  }, [question?.questionIndex]);

  const isLast = question && (question.questionIndex + 1 >= totalQuestions);

  // Always emit next-question; server decides to end game or load next question.
  // The game-end socket event (in App.tsx) handles the final podium for all.
  const handleNext = () => onNext();

  if (!question) {
    return (
      <div className="page center" style={{ flexDirection: 'column', gap: '1rem' }}>
        <div style={{ fontSize: '3rem', animation: 'spin 1s linear infinite' }}>⏳</div>
        <p style={{ fontWeight: 700, opacity: 0.7 }}>Waiting for the first question…</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {showCountdown && <Countdown from={3} />}

      {/* Top bar */}
      <div
        className="host-topbar"
        style={{
          background: 'rgba(0,0,0,0.3)',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          flexWrap: 'wrap',
          gap: '0.25rem',
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 'clamp(0.7rem, 2vw, 0.9rem)', opacity: 0.7 }}>
          Room: <span style={{ color: '#ffd700' }}>{roomCode}</span>
        </div>
        <div style={{ fontWeight: 800, fontSize: 'clamp(0.8rem, 2.5vw, 1rem)', textAlign: 'center' }}>
          Q{question.questionIndex + 1} / {question.totalQuestions}
        </div>
        <div style={{ fontWeight: 800, fontSize: 'clamp(0.7rem, 2vw, 0.9rem)', opacity: 0.7 }}>
          {answeredCount} / {totalPlayers} answered
        </div>
      </div>

      {/* Question + timer */}
      {!results && (
        <>
          <div
            className="animate-fadeInDown"
            style={{ padding: '1.5rem 1rem 0.75rem', textAlign: 'center' }}
          >
            <h2 style={{ fontSize: 'clamp(1.2rem, 4vw, 2.4rem)', maxWidth: '800px', margin: '0 auto' }}>
              {question.question.text}
            </h2>
          </div>

          <div style={{ padding: '0 1rem 0.75rem' }}>
            <TimerBar
              key={timerKey}
              seconds={question.question.timeLimit}
              serverStartTime={question.serverTime}
            />
          </div>

          {/* Answer grid (host view, no interaction) */}
          {question.question.answers && (
            <div
              className="host-answer-grid"
              style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                padding: '0 1rem 1rem',
              }}
            >
              {question.question.answers.map((ans, i) => (
                <div
                  key={ans.id}
                  className="animate-bounceIn"
                  style={{
                    animationDelay: `${i * 0.1 + 0.5}s`,
                    background: COLORS[i % 4],
                    borderRadius: '12px',
                    padding: '1.25rem',
                    fontWeight: 800,
                    fontSize: '1.1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    opacity: showCountdown ? 0 : 1,
                    transition: 'opacity 0.3s',
                  }}
                >
                  <span style={{ fontSize: '1.5rem' }}>{SHAPES[i % 4]}</span>
                  {ans.text}
                </div>
              ))}
            </div>
          )}

          {question.question.type === 'slider' && (
            <div style={{ padding: '1rem 1.5rem 2rem', textAlign: 'center' }}>
              <p style={{ opacity: 0.7, fontWeight: 700, marginBottom: '1rem' }}>
                Players are choosing a value between {question.question.sliderMin} and {question.question.sliderMax}
              </p>
              <input
                type="range"
                min={question.question.sliderMin}
                max={question.question.sliderMax}
                defaultValue={((question.question.sliderMin ?? 0) + (question.question.sliderMax ?? 100)) / 2}
                style={{ width: '100%', accentColor: '#ffd700' }}
                readOnly
              />
            </div>
          )}

          {question.question.type === 'true-false' && (
            <div className="host-tf-grid" style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem 1rem 2rem' }}>
              {[
                { label: '✅ True', color: '#26890c' },
                { label: '❌ False', color: '#e21b3c' },
              ].map(opt => (
                <div
                  key={opt.label}
                  style={{
                    background: opt.color,
                    borderRadius: '12px',
                    padding: '1.5rem 1rem',
                    fontWeight: 900,
                    fontSize: 'clamp(1rem, 3vw, 1.4rem)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {opt.label}
                </div>
              ))}
            </div>
          )}

          {/* Answered progress */}
          <div style={{ padding: '0 1rem 1.5rem', textAlign: 'center' }}>
            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              {Array.from({ length: totalPlayers }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: i < answeredCount ? '#ffd700' : 'rgba(255,255,255,0.2)',
                    transition: 'background 0.3s',
                  }}
                />
              ))}
            </div>
            <p style={{ opacity: 0.6, fontWeight: 700, fontSize: '0.85rem' }}>
              {answeredCount}/{totalPlayers} answered
            </p>
          </div>
        </>
      )}

      {/* Results view */}
      {results && (
        <div className="animate-fadeInUp" style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflow: 'auto' }}>
          <h2 style={{ textAlign: 'center' }}>Results 📊</h2>

          {/* Answer breakdown */}
          {results.answerBreakdown.length > 0 && (
            <div className="host-results-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {results.answerBreakdown.map((ans, i) => {
                const isCorrect = Array.isArray(results.correctAnswer)
                  ? results.correctAnswer.includes(ans.answerId)
                  : results.correctAnswer === ans.answerId;
                const maxCount = Math.max(...results.answerBreakdown.map(a => a.count), 1);
                return (
                  <div
                    key={ans.answerId}
                    style={{
                      background: COLORS[i % 4],
                      borderRadius: '12px',
                      padding: '1rem',
                      border: isCorrect ? '3px solid #ffd700' : '3px solid transparent',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Fill bar */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        width: `${(ans.count / maxCount) * 100}%`,
                        height: '4px',
                        background: 'rgba(255,255,255,0.6)',
                        transition: 'width 1s ease',
                      }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {SHAPES[i % 4]} {ans.text}
                      </span>
                      {isCorrect && <span style={{ fontSize: '1.2rem' }}>✓</span>}
                    </div>
                    <div style={{ fontWeight: 900, fontSize: '1.4rem', marginTop: '0.25rem' }}>
                      {ans.count}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Mini podium */}
          <div style={{ flex: 1 }}>
            <h3 style={{ textAlign: 'center', marginBottom: '1rem', opacity: 0.8 }}>Top Players</h3>
            <MiniPodium players={results.players.slice(0, 5)} />
          </div>

          {/* Next button */}
          <div style={{ textAlign: 'center', padding: '0 0 1rem' }}>
            <button
              className="btn btn-primary btn-lg animate-pulse"
              onClick={handleNext}
              style={{ borderRadius: '50px', minWidth: '180px', width: '100%', maxWidth: '280px' }}
            >
              {isLast ? '🏆 Show Final Podium' : '▶ Next Question'}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 500px) {
          .host-answer-grid { grid-template-columns: 1fr !important; }
          .host-results-grid { grid-template-columns: 1fr !important; }
          .host-tf-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
