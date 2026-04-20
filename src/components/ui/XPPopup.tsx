import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface Pop {
  id: number;
  text: string;
  x: number;
  y: number;
}

let seq = 0;
const listeners = new Set<(p: Pop) => void>();

export function showXPPopup(amount: number): void {
  const p: Pop = {
    id: ++seq,
    text: `+${amount} XP`,
    x: Math.random() * 60 + 20,
    y: Math.random() * 30 + 10,
  };
  listeners.forEach((l) => l(p));
}

export function XPPopupHost(): JSX.Element | null {
  const [pops, setPops] = useState<Pop[]>([]);

  useEffect(() => {
    const handler = (p: Pop): void => {
      setPops((prev) => [...prev, p]);
      window.setTimeout(() => {
        setPops((prev) => prev.filter((x) => x.id !== p.id));
      }, 1200);
    };
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  const root = document.getElementById('xp-root');
  if (!root) return null;
  return createPortal(
    <>
      {pops.map((p) => (
        <div key={p.id} className="xp-pop" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
          {p.text}
        </div>
      ))}
    </>,
    root,
  );
}
