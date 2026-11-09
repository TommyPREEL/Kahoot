import { PlayerStanding } from '../../types';
import Icon from './Icon';

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
    <div className="page text-center" style={{ maxWidth: '700px', margin: '0 auto', gap: 'var(--s-5)' }}>
      <div className="animate-fadeInDown">
        <h1 className="text-gold">Final results</h1>
        <p className="muted">
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
                        const isMe = p.nickname === myNickname;
            return (
              <div key={p.nickname} className="podium-column">
                <div
                  className="podium-nickname"
                  style={{
                    color: isMe ? 'var(--accent)' : 'var(--paper)',
                    fontWeight: isMe ? 900 : 700,
                    fontSize: isMe ? 'clamp(0.75rem, 2.5vw, 1rem)' : 'clamp(0.65rem, 2vw, 0.85rem)',
                    maxWidth: 'clamp(60px, 18vw, 110px)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.nickname}
                </div>
                <div className="podium-score" style={{ fontSize: 'clamp(0.65rem, 2vw, 0.8rem)' }}>
                  {p.score.toLocaleString()} pts
                </div>
                <div
                  className={`podium-block podium-${rank}`}
                  style={{
                    width: 'clamp(60px, 18vw, 110px)',
                    fontSize: 'clamp(1.2rem, 3vw, 1.8rem)',
                    animation: `riseUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) ${rank * 0.15}s both`,
                    outline: isMe ? '3px solid var(--accent)' : 'none',
                  }}
                >
                  {rank}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rest of leaderboard */}
      {rest.length > 0 && (
        <div className="animate-fadeInUp delay-3 stack-sm" style={{ width: '100%' }}>
          {rest.map((p, i) => {
            const isMe = p.nickname === myNickname;
            return (
              <div key={p.nickname} className={`rank-row${isMe ? ' is-me' : ''}`}>
                <span className="rank-num">{i + 4}</span>
                <span className="rank-name">{p.nickname}</span>
                <span className="rank-score">{p.score.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* My final rank if not in top */}
      {myNickname && !top3.find(p => p.nickname === myNickname) && !rest.find(p => p.nickname === myNickname) && (
        <div className="card card-accent animate-fadeInUp">
          <p className="text-gold" style={{ fontWeight: 800 }}>No points for you this game.</p>
        </div>
      )}

      {/* Play again */}
      <button
        className="btn btn-primary btn-lg w-action"
        onClick={onPlayAgain}
      >
        <Icon name="play" /> Play again
      </button>
    </div>
  );
}
