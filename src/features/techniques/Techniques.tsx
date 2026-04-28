import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TECHNIQUES } from '@/lib/techniques';

export function Techniques(): JSX.Element {
  const { t } = useTranslation();
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const toggle = (name: string): void => setOpen((prev) => ({ ...prev, [name]: !prev[name] }));

  return (
    <div className="sec">
      <div className="sec-hdr">
        <h2>{t('headers.techniques.title')}</h2>
        <p>{t('headers.techniques.desc')}</p>
      </div>

      <div className="c c-danger">
        <div className="info-row">
          <span className="info-icon">⛔</span>
          <div>
            <h4 className="danger-title">NO funcionen: Rellegir, Subratllar, Resums passius</h4>
            <p className="info-body">
              Impacte NUL demostrat. El cervell confon familiaritat visual amb aprenentatge.
            </p>
          </div>
        </div>
      </div>

      {TECHNIQUES.map((tech) => {
        const isOpen = open[tech.nm] ?? false;
        return (
          <div key={tech.nm} className="c glow tech-card" onClick={() => toggle(tech.nm)}>
            <div className="tech-card-row">
              <div className="tech-icon" style={{ background: tech.bg }}>
                {tech.ico}
              </div>
              <div className="flex-1">
                <div className="tech-card-name">
                  {tech.nm}
                  <span className={`badge ${tech.rat === 'Alta' ? 'badge-ok' : 'badge-w'}`}>
                    {tech.rat}
                  </span>
                </div>
                <div className="tech-card-sum">{tech.sum}</div>
              </div>
              <span className={`tech-chevron${isOpen ? ' open' : ''}`}>›</span>
            </div>
            {isOpen && (
              <div className="tech-content" onClick={(e) => e.stopPropagation()}>
                <div className="tech-steps">
                  {tech.steps.map((s, i) => (
                    <div key={s} className="tech-step">
                      <div
                        className="tech-step-num"
                        style={{ background: tech.bg, color: tech.col }}
                      >
                        {i + 1}
                      </div>
                      <span className="tech-step-text">{s}</span>
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
