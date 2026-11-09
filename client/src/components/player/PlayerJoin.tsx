import { useState } from 'react';
import { socket } from '../../socket';
import Icon from '../shared/Icon';

interface Props {
  initialCode: string;
  onJoined: (code: string, nickname: string, playerToken: string) => void;
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
      (res: { ok: boolean; error?: string; roomCode?: string; nickname?: string; playerToken?: string }) => {
        setLoading(false);
        if (!res.ok || !res.playerToken) {
          setError(res.error ?? 'Could not join room');
          return;
        }
        onJoined(res.roomCode ?? trimCode, res.nickname ?? trimNick, res.playerToken);
      }
    );
  };

  return (
    <div className="page center page-col">
      <div className="animate-fadeInDown">
        <h1>Join a game</h1>
        <p className="muted">The code is on the host screen.</p>
      </div>

      <div
        className="card stack w-narrow animate-fadeInUp"
      >
        <div>
          <label className="field-label" htmlFor="room-code">
            Room code
          </label>
          <input
            id="room-code" className="input input-code"
            placeholder="AZ5R2T"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            maxLength={8}
            autoFocus
          />
        </div>

        <div>
          <label className="field-label" htmlFor="nickname">
            Nickname
          </label>
          <input
            id="nickname"
            className="input"
            placeholder="Your name…"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            maxLength={24}
          />
        </div>

        {error && (
          <div className="alert-error animate-shake" role="alert">
            <Icon name="alert" /> {error}
          </div>
        )}

        <button
          className="btn btn-primary"
          onClick={handleJoin}
          disabled={loading}
        >
          {loading ? 'Joining…' : 'Join game'}
        </button>

        <button className="btn btn-secondary btn-sm" onClick={onBack}>
          <Icon name="back" /> Back
        </button>
      </div>
    </div>
  );
}
