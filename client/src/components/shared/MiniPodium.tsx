import { PlayerStanding } from '../../types';
import Icon from './Icon';

interface Props {
  players: PlayerStanding[];
}

export default function MiniPodium({ players }: Props) {
  return (
    <div className="stack-sm">
      {players.map((p, i) => (
        <div
          key={p.nickname}
          className={`rank-row animate-slideLeft${i < 3 ? ` rank-${i + 1}` : ''}`}
          style={{ animationDelay: `${i * 0.08}s` }}
        >
          <span className="rank-num">{i + 1}</span>
          <span className="rank-name">{p.nickname}</span>
          {p.lastPoints > 0 && <span className="rank-gain">+{p.lastPoints}</span>}
          <span className="rank-score" style={{ minWidth: '3.5rem' }}>{p.score.toLocaleString()}</span>
          {p.streak > 1 && (
            <span className="rank-streak"><Icon name="flame" />{p.streak}</span>
          )}
        </div>
      ))}
    </div>
  );
}
