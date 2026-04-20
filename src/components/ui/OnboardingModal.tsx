import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export function OnboardingModal(): JSX.Element | null {
  const hasCompletedOnboarding = useAppStore((s) => s.hasCompletedOnboarding);
  const hasHydrated = useAppStore((s) => s._hasHydrated);
  const patch = useAppStore((s) => s.patch);
  const save = useAppStore((s) => s.save);
  const xp = useAppStore((s) => s.xp);
  const decks = useAppStore((s) => s.decks);
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  
  // User Profile State
  const [goal, setGoal] = useState<string>('');
  const [habit, setHabit] = useState<string>('');
  const [struggle, setStruggle] = useState<string>('');
  const [commitment, setCommitment] = useState<string>('');

  // Analysis State
  const [_, setAnalyzing] = useState(false);
  const [analysisText, setAnalysisText] = useState('Analitzant el teu perfil...');

  // Wait for IndexedDB hydration before deciding whether to show the modal.
  if (!hasHydrated) return null;
  if (hasCompletedOnboarding || xp > 0 || decks.length > 0) return null;

  const handleFinish = () => {
    patch({ hasCompletedOnboarding: true });
    save();
    navigate('/');
  };

  const runAnalysis = () => {
    setAnalyzing(true);
    setStep(5);
    
    setTimeout(() => setAnalysisText('Calculant la teva corba d\'oblit actual...'), 800);
    setTimeout(() => setAnalysisText('Aplicant models de repetició espaiada...'), 1800);
    setTimeout(() => setAnalysisText('Generant projecció de resultats...'), 2800);
    setTimeout(() => {
      setAnalyzing(false);
      setStep(6);
    }, 3800);
  };

  const OptionButton = ({ 
    active, onClick, icon, text, subtext 
  }: { 
    active: boolean, onClick: () => void, icon: string, text: string, subtext?: string 
  }) => (
    <motion.button 
      className={`opt-btn ${active ? 'active' : ''}`} 
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <span className="icon">{icon}</span>
      <div className="content">
        <span className="title">{text}</span>
        {subtext && <span className="subtext">{subtext}</span>}
      </div>
    </motion.button>
  );

  // Dynamic calculations based on user answers
  const getImprovementStats = () => {
    let retentionGain = 80;
    let timeSaved = 30;
    let currentRetention = 20;

    if (habit === 'read') {
      currentRetention = 15;
      retentionGain = 120; // Massive gain from passive to active recall
    } else if (habit === 'manual') {
      currentRetention = 30;
      timeSaved = 65; // Massive time saved from manual writing
    } else if (habit === 'digital') {
      currentRetention = 50;
      retentionGain = 40; // Already using good tools, but AI makes it better
      timeSaved = 50; // Time saved creating cards
    }

    if (struggle === 'memory') retentionGain += 15;
    if (struggle === 'time') timeSaved += 15;

    return { retentionGain, timeSaved, currentRetention };
  };

  const stats = getImprovementStats();

  const steps = [
    {
      id: 1,
      content: (
        <div className="onboarding-step">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="step-icon">🎯</motion.div>
          <h2>Quin és el teu objectiu?</h2>
          <p>T'ajudarem a arribar-hi molt més ràpid.</p>
          <div className="options">
            <OptionButton active={goal === 'exams'} onClick={() => { setGoal('exams'); setStep(2); }} icon="📚" text="Aprovar exàmens amb nota" subtext="Universitat, batxillerat, oposicions..." />
            <OptionButton active={goal === 'languages'} onClick={() => { setGoal('languages'); setStep(2); }} icon="🗣️" text="Dominar un idioma" subtext="Vocabulari, gramàtica i fluïdesa" />
            <OptionButton active={goal === 'certs'} onClick={() => { setGoal('certs'); setStep(2); }} icon="💼" text="Certificacions professionals" subtext="IT, medicina, finances..." />
            <OptionButton active={goal === 'other'} onClick={() => { setGoal('other'); setStep(2); }} icon="🧠" text="Aprendre per plaer" subtext="Cultura general i curiositat" />
          </div>
        </div>
      )
    },
    {
      id: 2,
      content: (
        <div className="onboarding-step">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="step-icon">📝</motion.div>
          <h2>Quin és el teu mètode actual?</h2>
          <p>Sigues sincer, com estudies normalment?</p>
          <div className="options">
            <OptionButton active={habit === 'read'} onClick={() => { setHabit('read'); setStep(3); }} icon="📖" text="Llegeixo i subratllo els apunts" subtext="Lectura passiva tradicional" />
            <OptionButton active={habit === 'manual'} onClick={() => { setHabit('manual'); setStep(3); }} icon="✍️" text="Faig resums i esquemes a mà" subtext="Escrius per intentar memoritzar" />
            <OptionButton active={habit === 'digital'} onClick={() => { setHabit('digital'); setStep(3); }} icon="📱" text="Utilitzo eines digitals" subtext="Anki, Quizlet, Notion..." />
          </div>
        </div>
      )
    },
    {
      id: 3,
      content: (
        <div className="onboarding-step">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="step-icon">🚧</motion.div>
          <h2>Quin és el teu obstacle més gran?</h2>
          <p>Identifiquem on perds el teu potencial.</p>
          <div className="options">
            <OptionButton active={struggle === 'memory'} onClick={() => { setStruggle('memory'); setStep(4); }} icon="🧠" text="M'oblido del que estudio" subtext="Davant l'examen, la ment es queda en blanc" />
            <OptionButton active={struggle === 'time'} onClick={() => { setStruggle('time'); setStep(4); }} icon="⏳" text="Em falta temps" subtext="El temari és inabastable per al temps que tinc" />
            <OptionButton active={struggle === 'focus'} onClick={() => { setStruggle('focus'); setStep(4); }} icon="🎯" text="Em costa concentrar-me" subtext="Em distrec fàcilment i perdo el ritme" />
          </div>
        </div>
      )
    },
    {
      id: 4,
      content: (
        <div className="onboarding-step">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="step-icon">⏱️</motion.div>
          <h2>Quant de temps pots dedicar-hi al dia?</h2>
          <p>EstudIA s'adapta a la teva disponibilitat.</p>
          <div className="options">
            <OptionButton active={commitment === '15'} onClick={() => { setCommitment('15'); runAnalysis(); }} icon="🐢" text="Només 15 minuts" subtext="Ideal per a l'hàbit diari" />
            <OptionButton active={commitment === '30'} onClick={() => { setCommitment('30'); runAnalysis(); }} icon="🔥" text="30 minuts" subtext="Punt perfecte de constància" />
            <OptionButton active={commitment === '60'} onClick={() => { setCommitment('60'); runAnalysis(); }} icon="🚀" text="1+ hora" subtext="Preparació intensiva" />
          </div>
        </div>
      )
    },
    {
      id: 5,
      content: (
        <div className="onboarding-step analysis-step">
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="step-icon"
            style={{ fontSize: 60, marginBottom: 30, display: 'inline-block' }}
          >
            ⚙️
          </motion.div>
          <h2>Construint el teu perfil</h2>
          <motion.p 
            key={analysisText}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="analysis-text"
          >
            {analysisText}
          </motion.p>
          
          <div className="progress-track">
            <motion.div 
              className="progress-fill"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 3.8, ease: "easeInOut" }}
            />
          </div>
        </div>
      )
    },
    {
      id: 6,
      content: (
        <div className="onboarding-step result-step">
          <motion.div initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} className="step-icon">✨</motion.div>
          <h2>Resultats del teu perfil</h2>
          
          <p style={{ marginBottom: 20 }}>
            {habit === 'read' && "La lectura passiva està limitant el teu potencial. "}
            {habit === 'manual' && "Fer resums a mà et fa perdre hores d'estudi valuoses. "}
            {struggle === 'memory' && "L'oblit és natural, però la tecnologia ho pot solucionar. "}
            {struggle === 'time' && "Hem dissenyat un sistema per multiplicar la teva eficiència. "}
            Amb EstudIA, la teva transformació serà brutal:
          </p>

          <div className="stats-grid">
            <motion.div 
              className="stat-card"
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
            >
              <div className="stat-val ok">+{stats.retentionGain}%</div>
              <div className="stat-label">Retenció d'Informació</div>
            </motion.div>
            <motion.div 
              className="stat-card"
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
            >
              <div className="stat-val p">-{stats.timeSaved}%</div>
              <div className="stat-label">Temps d'Estudi Invertit</div>
            </motion.div>
          </div>

          <motion.div 
            className="chart-container"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          >
            <svg viewBox="0 0 400 150" style={{ width: '100%', height: '100%' }}>
              <line x1="0" y1="130" x2="400" y2="130" stroke="var(--bl)" strokeWidth="2" />
              <line x1="20" y1="0" x2="20" y2="150" stroke="var(--bl)" strokeWidth="2" />
              
              {/* Old Method Curve */}
              <motion.path 
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, delay: 1 }}
                d={`M 20 20 Q 80 130 380 ${130 - (stats.currentRetention)}`} 
                fill="none" stroke="var(--err)" strokeWidth="3" strokeDasharray="5,5" 
              />
              
              {/* EstudIA Curve */}
              <motion.path 
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, delay: 1.5 }}
                d="M 20 20 Q 60 90 100 110 L 100 20 Q 140 50 200 70 L 200 20 Q 260 30 380 40" 
                fill="none" stroke="var(--ok)" strokeWidth="4" 
              />
              
              <text x="360" y="30" fill="var(--ok)" fontSize="12" fontWeight="bold">EstudIA</text>
              <text x="360" y="110" fill="var(--err)" fontSize="12">El teu mètode</text>
            </svg>
          </motion.div>

          <motion.button 
            className="bp finish-btn" 
            onClick={handleFinish}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.2 }}
          >
            Desbloquejar el meu potencial 🚀
          </motion.button>
        </div>
      )
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="onboarding-overlay"
    >
      <div className="onboarding-modal c glow">
        {/* Progress Bar (Hide during analysis and result) */}
        {step < 5 && (
          <div className="progress-bar">
            {[1, 2, 3, 4].map(i => (
              <motion.div 
                key={i} 
                className="progress-segment"
                animate={{ 
                  backgroundColor: step >= i ? 'var(--a)' : 'var(--bl)',
                  flex: step === i ? 2 : 1
                }} 
              />
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {steps.find(s => s.id === step)?.content}
          </motion.div>
        </AnimatePresence>

        {step > 1 && step < 5 && (
          <button className="back-btn" onClick={() => setStep(step - 1)}>
            ← Enrere
          </button>
        )}
      </div>

      <style>{`
        .onboarding-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(10px);
          z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .onboarding-modal {
          max-width: 600px; width: 100%; text-align: center; padding: 45px 35px;
          background: var(--bg); border: 1px solid var(--bd); border-radius: 28px;
          box-shadow: 0 24px 50px rgba(0,0,0,0.5); position: relative; overflow: hidden;
        }
        .progress-bar { display: flex; gap: 8px; margin-bottom: 35px; }
        .progress-segment { height: 6px; border-radius: 3px; transition: 0.3s ease; }
        
        .onboarding-step h2 { font-size: 28px; font-weight: 800; margin-bottom: 12px; color: var(--t); letter-spacing: -0.5px; }
        .onboarding-step p { font-size: 16px; color: var(--ts); margin-bottom: 35px; line-height: 1.5; }
        .step-icon { font-size: 52px; margin-bottom: 16px; display: inline-block; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.2)); }
        
        .options { display: flex; flex-direction: column; gap: 14px; }
        .opt-btn {
          display: flex; align-items: center; gap: 18px; padding: 18px 24px;
          background: var(--bg); border: 2px solid var(--bl); border-radius: 20px;
          text-align: left; cursor: pointer; transition: all 0.2s ease;
        }
        .opt-btn:hover { border-color: var(--a); background: var(--al); }
        .opt-btn.active {
          border-color: var(--a);
          background: linear-gradient(145deg, var(--al) 0%, transparent 100%);
          box-shadow: 0 8px 24px var(--al);
        }
        .opt-btn .icon { font-size: 28px; }
        .opt-btn .content { display: flex; flex-direction: column; gap: 4px; }
        .opt-btn .title { font-size: 17px; font-weight: 600; color: var(--t); }
        .opt-btn .subtext { font-size: 14px; color: var(--ts); }
        
        /* Analysis Step */
        .analysis-text { font-size: 18px; font-weight: 500; color: var(--a); margin-bottom: 40px; }
        .progress-track { width: 100%; height: 8px; background: var(--bl); border-radius: 4px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, var(--p), var(--a)); border-radius: 4px; box-shadow: 0 0 10px var(--a); }

        /* Result Step */
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
        .stat-card {
          background: var(--al); padding: 24px 16px; border-radius: 20px;
          border: 1px solid rgba(99, 102, 241, 0.2);
        }
        .stat-val { font-size: 36px; font-weight: 900; margin-bottom: 8px; }
        .stat-val.ok { color: var(--ok); text-shadow: 0 0 20px rgba(34, 197, 94, 0.3); }
        .stat-val.p { color: var(--p); text-shadow: 0 0 20px rgba(139, 92, 246, 0.3); }
        .stat-label { font-size: 14px; color: var(--t); font-weight: 500; }

        .chart-container {
          background: var(--bg); padding: 20px; border-radius: 20px; border: 1px solid var(--bd);
          height: 180px; width: 100%; overflow: hidden; margin-top: 10px;
        }
        
        .finish-btn {
          margin-top: 30px; width: 100%; padding: 20px; font-size: 18px; font-weight: 800;
          border-radius: 20px; background: linear-gradient(135deg, var(--a), var(--p));
          box-shadow: 0 10px 30px var(--al); text-transform: uppercase; letter-spacing: 0.5px;
        }
        .back-btn {
          margin-top: 28px; background: transparent; color: var(--ts); border: none; font-size: 15px;
          cursor: pointer; padding: 10px 20px; border-radius: 10px; font-weight: 500;
        }
        .back-btn:hover { background: var(--bl); color: var(--t); }
      `}</style>
    </motion.div>
  );
}
