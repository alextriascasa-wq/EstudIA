import { useState, type JSX } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStudyProfile, usePlan, useImprovement } from '@/hooks/usePlan';
import { useAppStore } from '@/store/useAppStore';
import { generatePlanNarrative } from '@/lib/planAI';
import { showToast } from '@/components/ui/Toast';

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
        <div className="ob-stat-big">+{improvement.delta}%</div>
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
              <h3>{t(key)}</h3>
              <div className="g3">
                {mods.map((m) => (
                  <Link key={m.module} to={`/${m.module}`} className="mc">
                    <strong>{t(`nav.${m.module}`)}</strong>
                    <span>{t(m.reasonKey)}</span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="c plan-daily">
        <h3>{t('plan.dailyTemplate')}</h3>
        <div className="g3">
          {plan.dailyTemplate.map((b) => (
            <div key={b.order} className="mc">
              <strong>{t(`nav.${b.module}`)}</strong>
              <span>{b.minutes} min</span>
            </div>
          ))}
        </div>
      </div>

      <div className="c plan-milestones">
        <h3>{t('plan.milestones.title')}</h3>
        <ul>
          {plan.milestones.map((m) => (
            <li key={m.whenISO}>
              <strong>{m.whenISO}</strong> · {t(m.goalKey)} · {m.target}
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
