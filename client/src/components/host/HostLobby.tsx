interface Props {
  roomCode: string;
  qrCode: string;
  players: { id: string; nickname: string }[];
  onStart: () => void;
  onBack: () => void;
}

const AVATARS = ['🐶','🐱','🐸','🦊','🐻','🐼','🐨','🐯','🦁','🦊','🐙','🦋','🐳','🦄','🦉','🐢'];

export default function HostLobby({ roomCode, qrCode, players, onStart, onBack }: Props) {
  return (
    <div className="page" style={{ maxWidth: '900px', margin: '0 auto', gap: '1.5rem', paddingTop: '2rem' }}>
      {/* Header */}
      <div className="animate-fadeInDown" style={{ textAlign: 'center', width: '100%' }}>
        <h1 style={{ marginBottom: '0.25rem' }}>Waiting Room 🎉</h1>
        <p style={{ opacity: 0.7, fontWeight: 600 }}>Share the code or QR to let players join</p>
      </div>

      <div className="lobby-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', width: '100%' }}>
        {/* Room code + QR */}
        <div className="card animate-fadeInDown delay-1" style={{ textAlign: 'center' }}>
          <p style={{ opacity: 0.7, fontWeight: 700, marginBottom: '0.5rem' }}>Room Code</p>
          <div
            style={{
              fontSize: 'clamp(2rem, 6vw, 3rem)',
              fontWeight: 900,
              letterSpacing: '0.2em',
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '12px',
              padding: '0.5rem 1rem',
              display: 'inline-block',
              marginBottom: '1rem',
              animation: 'glow 2s ease-in-out infinite',
              wordBreak: 'break-all',
            }}
          >
            {roomCode}
          </div>
          <br />
          {qrCode && (
            <div>
              <p style={{ opacity: 0.7, fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.85rem' }}>Scan to join</p>
              <img
                src={qrCode}
                alt="Join QR Code"
                style={{
                  width: 'min(180px, 40vw)',
                  height: 'min(180px, 40vw)',
                  borderRadius: '12px',
                  border: '4px solid rgba(255,255,255,0.3)',
                }}
              />
            </div>
          )}
          <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', opacity: 0.6, fontWeight: 600, wordBreak: 'break-all' }}>
            kahoot.local/join?code={roomCode}
          </p>
        </div>

        {/* Player list */}
        <div className="card animate-fadeInDown delay-2" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Players</h3>
            <span
              style={{
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '50px',
                padding: '0.2rem 0.75rem',
                fontWeight: 800,
                fontSize: '0.9rem',
              }}
            >
              {players.length}
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignContent: 'flex-start' }}>
            {players.length === 0 ? (
              <p style={{ opacity: 0.5, fontWeight: 600, fontSize: '0.9rem' }}>
                Waiting for players to join…
              </p>
            ) : (
              players.map((p, i) => (
                <div
                  key={p.id}
                  className="animate-bounceIn"
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    borderRadius: '50px',
                    padding: '0.3rem 0.75rem',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    animationDelay: `${(i % 5) * 0.05}s`,
                  }}
                >
                  <span>{AVATARS[i % AVATARS.length]}</span>
                  {p.nickname}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="animate-fadeInUp" style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '500px', flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" onClick={onBack} style={{ flex: '1 1 100px' }}>
          ← Cancel
        </button>
        <button
          className="btn btn-primary btn-lg"
          onClick={onStart}
          disabled={players.length === 0}
          style={{ flex: '2 1 200px', borderRadius: '50px' }}
        >
          {players.length === 0 ? '⏳ Waiting…' : `🚀 Start (${players.length} player${players.length > 1 ? 's' : ''})`}
        </button>
      </div>

      <style>{`
        @media (max-width: 600px) {
          .lobby-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
