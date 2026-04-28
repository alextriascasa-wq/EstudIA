import type { JSX } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { StudyProfile } from '@/types';
import { computeImprovement } from '@/lib/improvement';
import { buildPlan } from '@/lib/plan';

export function Results({
  draft,
  onFinish,
}: {
  draft: StudyProfile;
  onFinish: () => void;
}): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const breakdown = computeImprovement(draft);
  const plan = buildPlan(draft);
  const top = plan.modules.slice(0, 3);

  return (
    <div className="ob-step ob-results">
      <h2>{t('onboarding.results.title')}</h2>
      <p>{t('onboarding.results.desc')}</p>

      <motion.div
        className="c zeig ob-result-stat"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="ob-stat-big">+{breakdown.delta}%</div>
        <div className="lbl">{t('onboarding.results.deltaLabel')}</div>
      </motion.div>

      <div className="c ob-breakdown">
        <div className="lbl">{t('onboarding.results.breakdown')}</div>
        <ul>
          <li>
            <span>{t('improvement.factors.baseline')}</span>
            <strong>{breakdown.baseline}%</strong>
          </li>
          {breakdown.factors.map((f) => (
            <li key={f.key}>
              <span>{t(f.labelKey)}</span>
              <strong className="ok">+{f.delta}%</strong>
            </li>
          ))}
          <li className="ob-breakdown-total">
            <span>{t('onboarding.results.projected')}</span>
            <strong>{breakdown.projected}%</strong>
          </li>
        </ul>
      </div>

      <div className="g3 ob-modules">
        {top.map((m) => (
          <button
            key={m.module}
            className="mc"
            onClick={() => {
              onFinish();
              navigate(`/${m.module}`);
            }}
          >
            <strong>{t(`nav.${m.module}`)}</strong>
            <span>{t(m.reasonKey)}</span>
          </button>
        ))}
      </div>

      <div className="ob-actions">
        <button
          className="bp"
          onClick={() => {
            onFinish();
            navigate('/plan');
          }}
        >
          {t('onboarding.results.viewPlan')}
        </button>
        <button className="bs" onClick={onFinish}>
          {t('onboarding.results.startNow')}
        </button>
      </div>
    </div>
  );
}
