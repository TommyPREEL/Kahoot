import { PlayerStanding } from '../../types';

interface Props {
  players: PlayerStanding[];
}

export default function MiniPodium({ players }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {players.map((p, i) => (
        <div
          key={p.nickname}
          className="animate-slideLeft"
          style={{
            animationDelay: `${i * 0.08}s`,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: i === 0
              ? 'linear-gradient(90deg, rgba(255,215,0,0.25), transparent)'
              : i === 1
              ? 'linear-gradient(90deg, rgba(192,192,192,0.2), transparent)'
              : 'rgba(255,255,255,0.07)',
            borderRadius: '10px',
            padding: '0.6rem 1rem',
            borderLeft: `4px solid ${i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'transparent'}`,
          }}
        >
          <span style={{ fontWeight: 900, fontSize: '1.1rem', minWidth: '28px', textAlign: 'center' }}>
            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
          </span>
          <span style={{ flex: 1, fontWeight: 800, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nickname}</span>
          {p.lastPoints > 0 && (
            <span style={{ color: '#26890c', fontWeight: 800, fontSize: '0.85rem' }}>
              +{p.lastPoints}
            </span>
          )}
          <span style={{ fontWeight: 900, color: '#ffd700', minWidth: '50px', textAlign: 'right', fontSize: '0.85rem' }}>
            {p.score.toLocaleString()}
          </span>
          {p.streak > 1 && (
            <span style={{ fontSize: '0.8rem', color: '#ff9900' }}>🔥{p.streak}</span>
          )}
        </div>
      ))}
    </div>
  );
}
