import { useEffect, useState, type JSX } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export function Processing({ onDone }: { onDone: () => void }): JSX.Element {
  const { t } = useTranslation();
  const [phaseIdx, setPhaseIdx] = useState(0);
  const phases = [
    t('onboarding.processing.p1'),
    t('onboarding.processing.p2'),
    t('onboarding.processing.p3'),
  ];

  useEffect(() => {
    const t1 = setTimeout(() => setPhaseIdx(1), 800);
    const t2 = setTimeout(() => setPhaseIdx(2), 1800);
    const t3 = setTimeout(onDone, 3800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onDone]);

  return (
    <div className="ob-step ob-processing">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
        className="ob-spinner"
      >
        ⚙️
      </motion.div>
      <h2>{t('onboarding.processing.title')}</h2>
      <motion.p key={phaseIdx} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {phases[phaseIdx]}
      </motion.p>
      <div className="pb pb-lg">
        <motion.div
          className="fill"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 3.8, ease: 'easeInOut' }}
        />
      </div>
    </div>
  );
}
