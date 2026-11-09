import QuestionRecap from '../shared/QuestionRecap';
import { useEffect, useState } from 'react';
import { QuestionStartPayload, QuestionResultsPayload } from '../../types';
import TimerBar from '../shared/TimerBar';
import MiniPodium from '../shared/MiniPodium';
import Countdown from '../shared/Countdown';
import Icon from '../shared/Icon';

interface Props {
  roomCode: string;
  question: QuestionStartPayload | null;
  results: QuestionResultsPayload | null;
  players: { id: string; nickname: string; connected?: boolean }[];
  answeredCount: number;
  totalPlayers: number;
  totalQuestions: number;
  onNext: () => void;
  onPause: () => void;
}


export default function HostGame({
  roomCode, question, results, players, answeredCount, totalPlayers,
  totalQuestions, onNext, onPause,
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
  const offline = players.filter(p => p.connected === false);

  if (!question) {
    return (
      <div className="page center page-col">
        <p className="muted animate-pulse">Waiting for the first question…</p>
      </div>
    );
  }

  return (
    <div className="host-screen">
      {showCountdown && <Countdown from={3} />}

      <div className="host-topbar">
        <div className="muted">
          Room <span className="text-accent">{roomCode}</span>
        </div>
        <div style={{ fontWeight: 800 }}>
          Q{question.questionIndex + 1} / {question.totalQuestions}
        </div>
        <div className="row" style={{ gap: 'var(--s-3)' }}>
          {offline.length > 0 && (
            <span className="offline-pill" title={offline.map(p => p.nickname).join(', ')}>
              <Icon name="wifiOff" />
              {offline.length <= 2
                ? `${offline.map(p => p.nickname).join(', ')} offline`
                : `${offline.length} players offline`}
            </span>
          )}
          <span className="muted">{answeredCount} / {totalPlayers} answered</span>
          <button className="btn btn-secondary btn-sm" onClick={onPause}>
            <Icon name="pause" /> Pause
          </button>
        </div>
      </div>

      {!results && (
        <>
          <div className="animate-fadeInDown host-question">
            <h2>{question.question.text}</h2>
          </div>

          <div className="host-pad">
            <TimerBar
              key={timerKey}
              seconds={question.question.timeLimit}
              serverStartTime={question.serverTime}
            />
          </div>

          {question.question.answers && (
            <div className="host-grid host-answer-grid">
              {question.question.answers.map((ans, i) => (
                <div
                  key={ans.id}
                  className={`host-answer ans-${i % 4} animate-bounceIn`}
                  style={{ animationDelay: `${i * 0.1 + 0.5}s`, opacity: showCountdown ? 0 : 1 }}
                >
                  <span className={`shape-icon shape-${i % 4}`} aria-hidden="true" />
                  {ans.text}
                </div>
              ))}
            </div>
          )}

          {question.question.type === 'slider' && (
            <div className="host-pad text-center" style={{ paddingTop: 'var(--s-4)', paddingBottom: 'var(--s-6)' }}>
              <p className="muted" style={{ marginBottom: 'var(--s-4)' }}>
                Players are choosing a value between {question.question.sliderMin} and {question.question.sliderMax}
              </p>
              <input
                type="range"
                min={question.question.sliderMin}
                max={question.question.sliderMax}
                defaultValue={((question.question.sliderMin ?? 0) + (question.question.sliderMax ?? 100)) / 2}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
                readOnly
              />
            </div>
          )}

          {question.question.type === 'true-false' && (
            <div className="host-grid host-tf-grid">
              {[
                { label: 'True', cls: 'ans-3', icon: 'check' as const },
                { label: 'False', cls: 'ans-0', icon: 'x' as const },
              ].map(opt => (
                <div key={opt.label} className={`host-answer host-tf ${opt.cls}`}>
                  <Icon name={opt.icon} /> {opt.label}
                </div>
              ))}
            </div>
          )}

          <div className="host-pad text-center" style={{ paddingBottom: 'var(--s-5)' }}>
            <div className="answered-dots">
              {Array.from({ length: totalPlayers }).map((_, i) => (
                <div key={i} className={`answered-dot${i < answeredCount ? ' is-on' : ''}`} />
              ))}
            </div>
            <p className="muted" style={{ fontSize: '0.85rem' }}>
              {answeredCount}/{totalPlayers} answered
            </p>
          </div>
        </>
      )}

      {results && (
        <div className="animate-fadeInUp host-results stack" style={{ gap: 'var(--s-5)' }}>
          <QuestionRecap results={results} large />

          {results.answerBreakdown.length > 0 && (
            <div className="host-grid host-results-grid" style={{ padding: 0 }}>
              {results.answerBreakdown.map((ans, i) => {
                const isCorrect = Array.isArray(results.correctAnswer)
                  ? results.correctAnswer.includes(ans.answerId)
                  : results.correctAnswer === ans.answerId;
                const maxCount = Math.max(...results.answerBreakdown.map(a => a.count), 1);
                return (
                  <div
                    key={ans.answerId}
                    className={`result-tile ans-${i % 4}${isCorrect ? ' is-correct' : ''}`}
                  >
                    <div
                      className="result-bar"
                      style={{ width: `${(ans.count / maxCount) * 100}%` }}
                    />
                    <div className="row-between">
                      <span className="row" style={{ fontWeight: 800 }}>
                        <span className={`shape-icon shape-${i % 4}`} aria-hidden="true" /> {ans.text}
                      </span>
                      {isCorrect && <Icon name="check" />}
                    </div>
                    <div className="result-count">{ans.count}</div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ flex: 1 }}>
            <h3 className="text-center muted" style={{ marginBottom: 'var(--s-4)' }}>Top players</h3>
            <MiniPodium players={results.players.slice(0, 5)} />
          </div>

          <div className="text-center" style={{ paddingBottom: 'var(--s-4)' }}>
            <button className="btn btn-primary btn-lg w-action" onClick={handleNext}>
              {isLast ? 'Show final podium' : 'Next question'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
