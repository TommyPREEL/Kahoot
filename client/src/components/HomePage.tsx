import { useMemo } from 'react';
import { getSavedQuizzes } from './host/QuizLibrary';

interface Props {
  onHost: () => void;
  onJoin: () => void;
  onLibrary: () => void;
}

export default function HomePage({ onHost, onJoin, onLibrary }: Props) {
  const savedCount = useMemo(() => getSavedQuizzes().length, []);
  return (
    <div className="page center" style={{ flexDirection: 'column', gap: '2rem', textAlign: 'center' }}>
      {/* Logo */}
      <div className="animate-fadeInDown">
        <div style={{ fontSize: '4rem', marginBottom: '0.25rem' }}>🎮</div>
        <h1 style={{ letterSpacing: '-1px', color: '#fff' }}>
          Kah<span style={{ color: '#ffd700' }}>OOT</span>!
        </h1>
        <p style={{ fontSize: '1.1rem', opacity: 0.75, marginTop: '0.25rem', fontWeight: 600 }}>
          Play live quizzes with friends
        </p>
      </div>

      {/* Action buttons */}
      <div
        className="animate-fadeInUp"
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '340px' }}
      >
        <button
          className="btn btn-primary btn-lg animate-pulse"
          onClick={onHost}
          style={{ borderRadius: '50px', fontSize: '1.2rem', padding: '1.1rem 2rem' }}
        >
          🏆 Host a Game
        </button>
        <button
          className="btn btn-secondary btn-lg"
          onClick={onJoin}
          style={{ borderRadius: '50px', fontSize: '1.2rem', padding: '1.1rem 2rem' }}
        >
          🎯 Join a Game
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: 0.4 }}>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid rgba(255,255,255,0.4)' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em' }}>OR</span>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid rgba(255,255,255,0.4)' }} />
        </div>

        <button
          className="btn btn-secondary btn-lg"
          onClick={onLibrary}
          style={{ borderRadius: '50px', fontSize: '1.2rem', padding: '1.1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          📚 My Quizzes
          {savedCount > 0 && (
            <span style={{
              background: '#ffd700',
              color: '#2d0a6e',
              borderRadius: '50px',
              padding: '0.1rem 0.55rem',
              fontSize: '0.8rem',
              fontWeight: 800,
            }}>
              {savedCount}
            </span>
          )}
        </button>
      </div>

      {/* Feature pills */}
      <div
        className="animate-fadeInUp delay-2"
        style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginTop: '1rem' }}
      >
        {['⚡ Speed scoring', '🏅 Live podium', '📱 QR join', '🎨 Animations', '🔢 Multiple types'].map(f => (
          <span
            key={f}
            style={{
              background: 'rgba(255,255,255,0.12)',
              borderRadius: '50px',
              padding: '0.3rem 0.9rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            {f}
          </span>
        ))}
      </div>

      {/* Floating shapes */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: -1 }}>
        {['▲', '◆', '●', '■', '▲', '◆', '●', '■'].map((shape, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              fontSize: `${1.5 + (i % 3)}rem`,
              opacity: 0.06,
              left: `${(i * 13 + 5) % 95}%`,
              top: `${(i * 19 + 10) % 85}%`,
              animation: `pulse ${3 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.4}s`,
              color: ['#e21b3c','#1368ce','#d89e00','#26890c'][i % 4],
            }}
          >
            {shape}
          </span>
        ))}
      </div>
    </div>
  );
}
