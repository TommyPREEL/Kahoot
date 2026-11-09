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
    <div className="overlay">
      <div key={count} className="countdown-num">
        {count === 0 ? 'GO!' : count}
      </div>
    </div>
  );
}
