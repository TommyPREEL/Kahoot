interface Props {
  nickname: string;
  roomCode: string;
}

const EMOJIS = ['🎮','🕹️','🎯','🏆','⚡','🌟','🔥','💫','🎉','🎊'];

export default function PlayerLobby({ nickname, roomCode }: Props) {
  const emoji = EMOJIS[nickname.charCodeAt(0) % EMOJIS.length];

  return (
    <div className="page center" style={{ flexDirection: 'column', gap: '1.5rem', textAlign: 'center' }}>
      {/* Avatar */}
      <div
        className="animate-bounceIn"
        style={{
          width: 'min(120px, 25vw)',
          height: 'min(120px, 25vw)',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '3.5rem',
          border: '4px solid rgba(255,255,255,0.3)',
          animation: 'glow 2s ease-in-out infinite',
        }}
      >
        {emoji}
      </div>

      <div className="animate-fadeInUp">
        <h1 style={{ marginBottom: '0.25rem' }}>{nickname}</h1>
        <p style={{ opacity: 0.7, fontWeight: 700 }}>
          Room <span style={{ color: '#ffd700', fontWeight: 900 }}>{roomCode}</span>
        </p>
      </div>

      <div
        className="card animate-fadeInUp delay-1"
        style={{ maxWidth: '360px', width: '100%', textAlign: 'center' }}
      >
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem', animation: 'pulse 1.5s ease-in-out infinite' }}>⏳</div>
        <h3>You're in!</h3>
        <p style={{ opacity: 0.7, fontWeight: 600, marginTop: '0.3rem', fontSize: '0.95rem' }}>
          Waiting for the host to start the game…
        </p>
      </div>

      {/* Floating decorations */}
      {['▲','◆','●','■'].map((shape, i) => (
        <div
          key={i}
          style={{
            position: 'fixed',
            fontSize: '2rem',
            opacity: 0.07,
            color: ['#e21b3c','#1368ce','#d89e00','#26890c'][i],
            animation: `pulse ${2 + i * 0.5}s ease-in-out infinite`,
            animationDelay: `${i * 0.3}s`,
            left: `${[10, 80, 15, 75][i]}%`,
            top: `${[20, 15, 70, 65][i]}%`,
            pointerEvents: 'none',
          }}
        >
          {shape}
        </div>
      ))}
    </div>
  );
}
