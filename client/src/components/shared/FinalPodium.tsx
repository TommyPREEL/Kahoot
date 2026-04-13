import { PlayerStanding } from '../../types';

interface Props {
  players: PlayerStanding[];
  myNickname: string;
  onPlayAgain: () => void;
}

const PODIUM_ORDER = [1, 0, 2]; // silver, gold, bronze visually

export default function FinalPodium({ players, myNickname, onPlayAgain }: Props) {
  const top3 = players.slice(0, 3);
  const rest  = players.slice(3);

  return (
    <div className="page" style={{ maxWidth: '700px', margin: '0 auto', gap: '1.5rem', paddingTop: '1.5rem', textAlign: 'center' }}>
      <div className="animate-fadeInDown">
        <h1 style={{ color: '#ffd700', textShadow: '0 0 30px rgba(255,215,0,0.4)' }}>🏆 Final Results!</h1>
        <p style={{ opacity: 0.7, fontWeight: 700 }}>
          {players.length} player{players.length !== 1 ? 's' : ''} competed
        </p>
      </div>

      {/* Podium */}
      {top3.length > 0 && (
        <div className="podium-wrap animate-fadeInUp delay-1">
          {PODIUM_ORDER.map(orderIdx => {
            const p = top3[orderIdx];
            if (!p) return <div key={orderIdx} style={{ width: 'clamp(60px, 18vw, 110px)' }} />;
            const rank = orderIdx + 1;
            const heights = [180, 130, 90];
            const podiumColors = [
              'linear-gradient(180deg, #ffd700, #b8860b)',
              'linear-gradient(180deg, #c0c0c0, #808080)',
              'linear-gradient(180deg, #cd7f32, #8b4513)',
            ];
            const isMe = p.nickname === myNickname;
            return (
              <div key={p.nickname} className="podium-column">
                <div
                  style={{
                    fontSize: 'clamp(1.3rem, 4vw, 2rem)',
                    animation: 'bounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both',
                    animationDelay: `${rank * 0.2}s`,
                  }}
                >
                  {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                </div>
                <div
                  className="podium-nickname"
                  style={{
                    color: isMe ? '#ffd700' : '#fff',
                    fontWeight: isMe ? 900 : 700,
                    fontSize: isMe ? 'clamp(0.75rem, 2.5vw, 1rem)' : 'clamp(0.65rem, 2vw, 0.85rem)',
                    maxWidth: 'clamp(60px, 18vw, 110px)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isMe ? '⭐ ' : ''}{p.nickname}
                </div>
                <div className="podium-score" style={{ fontSize: 'clamp(0.65rem, 2vw, 0.8rem)' }}>
                  {p.score.toLocaleString()} pts
                </div>
                <div
                  style={{
                    width: 'clamp(60px, 18vw, 110px)',
                    height: `${heights[orderIdx]}px`,
                    background: podiumColors[orderIdx],
                    borderRadius: '8px 8px 0 0',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    paddingTop: '0.5rem',
                    fontSize: 'clamp(1.2rem, 3vw, 1.8rem)',
                    animation: `riseUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) ${rank * 0.15}s both`,
                    boxShadow: isMe ? '0 0 30px rgba(255,215,0,0.5)' : 'none',
                  }}
                >
                  {rank === 1 ? '👑' : rank === 2 ? '⭐' : '🌟'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rest of leaderboard */}
      {rest.length > 0 && (
        <div className="animate-fadeInUp delay-3" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {rest.map((p, i) => {
            const isMe = p.nickname === myNickname;
            return (
              <div
                key={p.nickname}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  background: isMe ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.07)',
                  border: isMe ? '2px solid rgba(255,215,0,0.5)' : '2px solid transparent',
                  borderRadius: '10px',
                  padding: '0.6rem 1rem',
                }}
              >
                <span style={{ fontWeight: 900, minWidth: '28px' }}>#{i + 4}</span>
                <span style={{ flex: 1, fontWeight: 800, textAlign: 'left', color: isMe ? '#ffd700' : '#fff' }}>
                  {isMe ? '⭐ ' : ''}{p.nickname}
                </span>
                <span style={{ fontWeight: 900, color: '#ffd700' }}>{p.score.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* My final rank if not in top */}
      {myNickname && !top3.find(p => p.nickname === myNickname) && !rest.find(p => p.nickname === myNickname) && (
        <div className="card animate-fadeInUp" style={{ background: 'rgba(255,215,0,0.1)', border: '2px solid rgba(255,215,0,0.3)' }}>
          <p style={{ color: '#ffd700', fontWeight: 800 }}>You didn't score this time — better luck next game!</p>
        </div>
      )}

      {/* Play again */}
      <button
        className="btn btn-primary btn-lg animate-pulse"
        onClick={onPlayAgain}
        style={{ borderRadius: '50px', minWidth: '180px', width: '100%', maxWidth: '280px' }}
      >
        🎮 Play Again
      </button>
    </div>
  );
}
