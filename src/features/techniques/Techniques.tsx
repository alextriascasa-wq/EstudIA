import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TECHNIQUES } from '@/lib/techniques';

export function Techniques(): JSX.Element {
  const { t } = useTranslation();
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const toggle = (name: string): void =>
    setOpen((prev) => ({ ...prev, [name]: !prev[name] }));

  return (
    <div className="sec">
      <div className="sec-hdr">
        <h2>{t('headers.techniques.title')}</h2>
        <p>{t('headers.techniques.desc')}</p>
      </div>

      <div
        className="c"
        style={{ background: 'var(--errl)', borderColor: 'rgba(239,68,68,.15)' }}
      >
        <div style={{ display: 'flex', gap: 12 }}>
          <span style={{ fontSize: 18 }}>⛔</span>
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--err)' }}>
              NO funcionen: Rellegir, Subratllar, Resums passius
            </h4>
            <p style={{ fontSize: 12, lineHeight: 1.6 }}>
              Impacte NUL demostrat. El cervell confon familiaritat visual amb
              aprenentatge.
            </p>
          </div>
        </div>
      </div>

      {TECHNIQUES.map((t) => {
        const isOpen = open[t.nm] ?? false;
        return (
          <div
            key={t.nm}
            className="c glow"
            style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}
            onClick={() => toggle(t.nm)}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '18px 20px',
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 'var(--radius-sm)',
                  background: t.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 21,
                }}
              >
                {t.ico}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {t.nm}
                  <span
                    className="badge"
                    style={{
                      background: t.rat === 'Alta' ? 'var(--okl)' : 'var(--wl)',
                      color: t.rat === 'Alta' ? 'var(--ok)' : 'var(--w)',
                    }}
                  >
                    {t.rat}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ts)', marginTop: 2 }}>
                  {t.sum}
                </div>
              </div>
              <span
                style={{
                  color: 'var(--tm)',
                  transition: 'var(--transition)',
                  transform: isOpen ? 'rotate(90deg)' : 'none',
                  display: 'inline-block',
                }}
              >
                ›
              </span>
            </div>
            {isOpen && (
              <div
                style={{
                  padding: '0 20px 18px',
                  borderTop: '1px solid var(--bl)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ paddingTop: 14 }}>
                  {t.steps.map((s, i) => (
                    <div
                      key={s}
                      style={{ display: 'flex', gap: 10, marginBottom: 7 }}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 7,
                          background: t.bg,
                          color: t.col,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {i + 1}
                      </div>
                      <span
                        style={{ fontSize: 12, lineHeight: 1.5, paddingTop: 3 }}
                      >
                        {s}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
