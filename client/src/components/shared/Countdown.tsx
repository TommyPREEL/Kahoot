import { useEffect, useState } from 'react';

interface Props {
  from: number; // e.g. 3
}

export default function Countdown({ from }: Props) {
  const [count, setCount] = useState(from);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setCount(from);
    setVisible(true);

    const interval = setInterval(() => {
      setCount(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimeout(() => setVisible(false), 800);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [from]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(46,14,110,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        key={count}
        style={{
          fontSize: 'clamp(6rem, 20vw, 14rem)',
          fontWeight: 900,
          color: '#ffd700',
          lineHeight: 1,
          animation: 'countdownPop 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) both',
          textShadow: '0 0 60px rgba(255,215,0,0.5)',
          userSelect: 'none',
        }}
      >
        {count === 0 ? 'GO!' : count}
      </div>
    </div>
  );
}
