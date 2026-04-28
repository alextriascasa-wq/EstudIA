import { useState, type JSX } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStudyProfile, usePlan, useImprovement } from '@/hooks/usePlan';
import { useAppStore } from '@/store/useAppStore';
import { generatePlanNarrative } from '@/lib/planAI';
import { showToast } from '@/components/ui/Toast';
import type { RecommendedModule } from '@/types';

const MODULE_ICONS: Record<RecommendedModule, string> = {
  cards: '🧠',
  feynman: '💬',
  timer: '⏱️',
  exams: '📝',
  languages: '🌍',
  sounds: '🎵',
  recovery: '💚',
};

const MODULE_COLORS: Record<RecommendedModule, string> = {
  cards: 'amber',
  feynman: 'coral',
  timer: 'cyan',
  exams: 'emerald',
  languages: 'emerald',
  sounds: 'violet',
  recovery: 'rose',
};

const PRIORITY_COLORS: Record<'essential' | 'recommended' | 'optional', string> = {
  essential: 'amber',
  recommended: 'coral',
  optional: 'muted',
};

export function Plan(): JSX.Element {
  const { t, i18n } = useTranslation();
  const profile = useStudyProfile();
  const plan = usePlan();
  const improvement = useImprovement();
  const planNarrative = useAppStore((s) => s.planNarrative);
  const setPlanNarrative = useAppStore((s) => s.setPlanNarrative);
  const [loadingAi, setLoadingAi] = useState(false);

  if (!profile || !plan || !improvement) {
    return <Navigate to="/perfil" replace />;
  }

  const onGenerate = async (): Promise<void> => {
    setLoadingAi(true);
    try {
      const text = await generatePlanNarrative(profile, plan, i18n.language);
      setPlanNarrative(text);
    } catch (err) {
      showToast({
        title: '⚠️',
        desc: String(err instanceof Error ? err.message : err),
      });
    } finally {
      setLoadingAi(false);
    }
  };

  const groups: Array<{ pri: 'essential' | 'recommended' | 'optional'; key: string }> = [
    { pri: 'essential', key: 'plan.modulesEssential' },
    { pri: 'recommended', key: 'plan.modulesRecommended' },
    { pri: 'optional', key: 'plan.modulesOptional' },
  ];

  return (
    <section className="sec">
      <header className="sec-hdr">
        <h2>{t('plan.title')}</h2>
        <p>{t('plan.weeklyMinutes', { min: plan.weeklyMinutes })}</p>
      </header>

      <div className="c zeig plan-improvement">
        <div className="plan-imp-stat">+{improvement.delta}%</div>
        <div className="lbl">{t('onboarding.results.deltaLabel')}</div>
        <ul className="ob-breakdown-list">
          <li>
            <span>{t('improvement.factors.baseline')}</span>
            <strong>{improvement.baseline}%</strong>
          </li>
          {improvement.factors.map((f) => (
            <li key={f.key}>
              <span>{t(f.labelKey)}</span>
              <strong className="ok">+{f.delta}%</strong>
            </li>
          ))}
        </ul>
      </div>

      <div className="c plan-modules">
        {groups.map(({ pri, key }) => {
          const mods = plan.modules.filter((m) => m.priority === pri);
          if (mods.length === 0) return null;
          return (
            <div key={pri} className="plan-module-group">
              <h3 className={`plan-pri plan-pri-${PRIORITY_COLORS[pri]}`}>{t(key)}</h3>
              <div className="plan-mc-grid">
                {mods.map((m) => (
                  <Link
                    key={m.module}
                    to={`/${m.module}`}
                    className={`plan-mc plan-c-${MODULE_COLORS[m.module]}`}
                  >
                    <span className="plan-mc-icon">{MODULE_ICONS[m.module]}</span>
                    <div className="plan-mc-body">
                      <strong className="plan-mc-title">{t(`nav.${m.module}`)}</strong>
                      <span className="plan-mc-desc">{t(m.reasonKey)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="c plan-daily">
        <h3>{t('plan.dailyTemplate')}</h3>
        <div className="plan-daily-grid">
          {plan.dailyTemplate.map((b) => (
            <div key={b.order} className={`plan-mc plan-c-${MODULE_COLORS[b.module]}`}>
              <span className="plan-mc-icon">{MODULE_ICONS[b.module]}</span>
              <div className="plan-mc-body">
                <strong className="plan-mc-title">{t(`nav.${b.module}`)}</strong>
                <span className="plan-mc-desc plan-mc-min">{b.minutes} min</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="c plan-milestones">
        <h3>{t('plan.milestones.title')}</h3>
        <ul className="plan-milestones-list">
          {plan.milestones.map((m) => (
            <li key={m.whenISO}>
              <span className="plan-ms-date">{m.whenISO}</span>
              <span className="plan-ms-goal">{t(m.goalKey)}</span>
              <span className="plan-ms-target">{m.target}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="c plan-narrative">
        <h3>{t('plan.narrative.title')}</h3>
        {planNarrative ? (
          <p className="plan-narrative-text">{planNarrative}</p>
        ) : (
          <button className="bp" onClick={onGenerate} disabled={loadingAi}>
            {loadingAi ? '...' : t('plan.narrative.generate')}
          </button>
        )}
        {planNarrative && (
          <button className="bs" onClick={onGenerate} disabled={loadingAi}>
            {t('plan.narrative.regenerate')}
          </button>
        )}
      </div>

      <div className="ob-actions">
        <Link to="/perfil" className="bs">
          {t('plan.edit')}
        </Link>
      </div>
    </section>
  );
}
