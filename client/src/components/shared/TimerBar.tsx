import { useEffect, useState } from 'react';

interface Props {
  seconds: number;
  serverStartTime: number; // epoch ms when question started
}

export default function TimerBar({ seconds, serverStartTime }: Props) {
  const [pct, setPct] = useState(100);

  useEffect(() => {
    const update = () => {
      const elapsed = Date.now() - serverStartTime;
      const remaining = Math.max(0, 1 - elapsed / (seconds * 1000));
      setPct(remaining * 100);
    };

    update();
    const id = setInterval(update, 100);
    return () => clearInterval(id);
  }, [seconds, serverStartTime]);

  const color =
    pct > 60 ? '#26890c' :
    pct > 30 ? '#d89e00' :
    '#e21b3c';

  return (
    <div className="timer-bar-wrap">
      <div
        className="timer-bar"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}
