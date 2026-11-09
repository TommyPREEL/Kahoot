import Icon from '../shared/Icon';

interface Props {
  nickname: string;
  roomCode: string;
  onLeave: () => void;
}

export default function PlayerLobby({ nickname, roomCode, onLeave }: Props) {
  // Initial letter avatar: no emoji, works for any nickname.
  const initial = (nickname.trim().charAt(0) || '?').toUpperCase();

  return (
    <div className="page center page-col">
      <div className="avatar animate-bounceIn" aria-hidden="true">{initial}</div>

      <div className="animate-fadeInUp">
        <h1 style={{ marginBottom: 'var(--s-1)' }}>{nickname}</h1>
        <p className="muted">
          Room <span className="text-accent" style={{ fontWeight: 800 }}>{roomCode}</span>
        </p>
      </div>

      <div className="card w-narrow text-center animate-fadeInUp delay-1">
        <h3>You're in</h3>
        <p className="muted" style={{ marginTop: 'var(--s-2)' }}>
          Waiting for the host to start the game…
        </p>
      </div>

      <button className="btn btn-secondary btn-sm" onClick={onLeave}>
        <Icon name="back" /> Leave room
      </button>

      {['▲','◆','●','■'].map((shape, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="deco-shape"
          style={{
            color: `var(--ans-${i})`,
            left: `${[10, 80, 15, 75][i]}%`,
            top: `${[20, 15, 70, 65][i]}%`,
          }}
        >
          {shape}
        </div>
      ))}
    </div>
  );
}
