import Icon from "../shared/Icon";

interface Props {
  roomCode: string;
  qrCode: string;
  players: { id: string; nickname: string; connected?: boolean }[];
  onStart: () => void;
  onBack: () => void;
}

export default function HostLobby({
  roomCode,
  qrCode,
  players,
  onStart,
  onBack,
}: Props) {
  return (
    <div className="page page-wide stack" style={{ gap: "var(--s-5)" }}>
      <div className="animate-fadeInDown text-center" style={{ width: "100%" }}>
        <h1>Waiting room</h1>
        <p className="muted">Players join with the code or the QR.</p>
      </div>

      <div className="lobby-grid">
        <div className="card text-center animate-fadeInDown delay-1">
          <p className="field-label">Room code</p>
          <div className="room-code">{roomCode}</div>
          {qrCode && (
            <div>
              <p className="field-label">Scan to join</p>
              <img className="qr" src={qrCode} alt="Join QR code" />
            </div>
          )}
          <p className="muted" style={{ marginTop: "var(--s-3)", fontSize: "0.8rem", wordBreak: "break-all" }}>
            {window.location.host}/?code={roomCode}
          </p>
        </div>

        <div className="card col animate-fadeInDown delay-2">
          <div className="row-between" style={{ marginBottom: "var(--s-4)" }}>
            <h3>Players</h3>
            <span className="badge">{players.length}</span>
          </div>

          <div className="player-list">
            {players.length === 0 ? (
              <p className="muted" style={{ fontSize: "0.9rem" }}>
                Waiting for players to join…
              </p>
            ) : (
              players.map((p, i) => (
                <div
                  key={p.id}
                  className={`player-chip animate-bounceIn${p.connected === false ? " is-offline" : ""}`}
                  style={{ animationDelay: `${(i % 5) * 0.05}s` }}
                  title={p.connected === false ? "Disconnected. Removed after 1 minute unless they come back." : undefined}
                >
                  <span className="player-dot" style={{ background: `var(--ans-${i % 4})` }} aria-hidden="true" />
                  {p.nickname}
                  {p.connected === false && <span className="offline-tag">offline</span>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="animate-fadeInUp controls">
        <button className="btn btn-secondary" onClick={onBack} style={{ flex: "1 1 100px" }}>
          <Icon name="back" /> Cancel
        </button>
        <button
          className="btn btn-primary btn-lg"
          onClick={onStart}
          disabled={players.length === 0}
          style={{ flex: "2 1 200px" }}
        >
          {players.length === 0
            ? "Waiting for players…"
            : `Start with ${players.length} player${players.length > 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}
