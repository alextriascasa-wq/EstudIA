import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export type ToastKind = 'info' | 'level' | 'achievement';
export interface ToastData {
  id: number;
  title: string;
  desc?: string;
  kind: ToastKind;
}

const ICONS: Record<ToastKind, string> = {
  info: 'ℹ️',
  level: '🎉',
  achievement: '🏅',
};

let seq = 0;
const listeners = new Set<(t: ToastData) => void>();

/** Fire-and-forget from anywhere (stores, libs). */
export function showToast(input: { title: string; desc?: string; kind?: ToastKind }): void {
  const t: ToastData = {
    id: ++seq,
    title: input.title,
    desc: input.desc,
    kind: input.kind ?? 'info',
  };
  listeners.forEach((l) => l(t));
}

function Toast({ data, onDone }: { data: ToastData; onDone: (id: number) => void }): JSX.Element {
  const [out, setOut] = useState(false);
  useEffect(() => {
    const leave = window.setTimeout(() => setOut(true), 3200);
    const kill = window.setTimeout(() => onDone(data.id), 3500);
    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(kill);
    };
  }, [data.id, onDone]);

  return (
    <div className={`toast${out ? ' out' : ''}`}>
      <div className="t-ico">{ICONS[data.kind]}</div>
      <div className="t-body">
        <div className="t-title">{data.title}</div>
        {data.desc ? <div className="t-desc">{data.desc}</div> : null}
      </div>
    </div>
  );
}

export function ToastHost(): JSX.Element | null {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    const handler = (t: ToastData): void => {
      setToasts((prev) => [...prev, t]);
    };
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  const drop = (id: number): void => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const root = document.getElementById('toast-root');
  if (!root) return null;
  return createPortal(
    <>
      {toasts.map((t) => (
        <Toast key={t.id} data={t} onDone={drop} />
      ))}
    </>,
    root,
  );
}
