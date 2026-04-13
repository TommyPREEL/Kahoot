import { useState } from 'react';
import { socket } from '../../socket';

interface Props {
  initialCode: string;
  onJoined: (code: string, nickname: string) => void;
  onBack: () => void;
}

export default function PlayerJoin({ initialCode, onJoined, onBack }: Props) {
  const [code, setCode]         = useState(initialCode.toUpperCase());
  const [nickname, setNickname] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleJoin = () => {
    const trimCode = code.trim().toUpperCase();
    const trimNick = nickname.trim();
    if (!trimCode) { setError('Enter a room code'); return; }
    if (!trimNick) { setError('Enter a nickname'); return; }

    setError('');
    setLoading(true);

    socket.emit(
      'join-room',
      { code: trimCode, nickname: trimNick },
      (res: { ok: boolean; error?: string; roomCode?: string; nickname?: string }) => {
        setLoading(false);
        if (!res.ok) {
          setError(res.error ?? 'Could not join room');
          return;
        }
        onJoined(res.roomCode ?? trimCode, res.nickname ?? trimNick);
      }
    );
  };

  return (
    <div className="page center" style={{ flexDirection: 'column', gap: '1.5rem' }}>
      <div className="animate-fadeInDown" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎯</div>
        <h1>Join a Game</h1>
        <p style={{ opacity: 0.7, fontWeight: 600, marginTop: '0.25rem' }}>Enter the room code to play</p>
      </div>

      <div
        className="card animate-fadeInUp"
        style={{ width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <div>
          <label style={{ fontSize: '0.85rem', fontWeight: 800, opacity: 0.7, display: 'block', marginBottom: '0.4rem' }}>
            Room Code
          </label>
          <input
            className="input"
            placeholder="e.g. AZ5R2T"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            style={{ fontSize: '1.5rem', fontWeight: 900, textAlign: 'center', letterSpacing: '0.15em' }}
            maxLength={8}
            autoFocus
          />
        </div>

        <div>
          <label style={{ fontSize: '0.85rem', fontWeight: 800, opacity: 0.7, display: 'block', marginBottom: '0.4rem' }}>
            Nickname
          </label>
          <input
            className="input"
            placeholder="Your name…"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            maxLength={24}
            style={{ fontSize: '1.1rem', fontWeight: 700 }}
          />
        </div>

        {error && (
          <div
            className="animate-shake"
            style={{ background: 'rgba(226,27,60,0.3)', border: '1px solid #e21b3c', borderRadius: '8px', padding: '0.5rem 0.75rem', fontWeight: 700, fontSize: '0.9rem' }}
          >
            ⚠ {error}
          </div>
        )}

        <button
          className="btn btn-primary"
          onClick={handleJoin}
          disabled={loading}
          style={{ borderRadius: '50px', fontSize: '1.1rem', padding: '0.85rem' }}
        >
          {loading ? '⏳ Joining…' : '🎮 Join Game'}
        </button>

        <button className="btn btn-secondary btn-sm" onClick={onBack}>
          ← Back
        </button>
      </div>
    </div>
  );
}
