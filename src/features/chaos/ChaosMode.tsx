import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { uid } from '@/lib/date';
import type { ChaosProblem, ExamDifficulty } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

export function ChaosMode(): JSX.Element {
  const { t } = useTranslation();
  const chaosProblems = useAppStore((s) => s.chaosProblems) || [];
  const patch = useAppStore((s) => s.patch);
  const save = useAppStore((s) => s.save);
  const addXP = useAppStore((s) => s.addXP);
  const { incrementDailyLog } = useAppStore.getState();

  const [active, setActive] = useState(false);
  const [curProb, setCurProb] = useState<ChaosProblem | null>(null);
  const [showSol, setShowSol] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form State
  const [topic, setTopic] = useState('');
  const [text, setText] = useState('');
  const [sol, setSol] = useState('');
  const [diff, setDiff] = useState<ExamDifficulty>('mitjà');

  const start = () => {
    if (chaosProblems.length < 3) {
      alert(t('chaos.minProblems'));
      return;
    }
    setActive(true);
    nextProblem(null);
  };

  const nextProblem = (prev: ChaosProblem | null) => {
    let pool = [...chaosProblems];
    if (prev) pool = pool.filter((p) => p.topic !== prev.topic);
    if (pool.length === 0) pool = [...chaosProblems];
    
    const picked = pool[Math.floor(Math.random() * pool.length)];
    setCurProb(picked!);
    setShowSol(false);
  };

  const grade = (ok: boolean) => {
    incrementDailyLog({ cards: 1, correct: ok ? 1 : 0 });
    if (ok) {
      addXP(10);
    }
    nextProblem(curProb);
  };

  const addProblem = () => {
    if (!topic.trim() || !text.trim() || !sol.trim()) return;
    const next = [
      ...chaosProblems,
      { id: uid(), topic, text, solution: sol, difficulty: diff }
    ];
    patch({ chaosProblems: next });
    save();
    setTopic('');
    setText('');
    setSol('');
    setShowForm(false);
  };

  if (active && curProb) {
    return (
      <div style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 900 }}>⚡ Mode Caos</h2>
          <button className="bs" onClick={() => setActive(false)}>Sortir</button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div 
            key={curProb.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="c glow"
            style={{ padding: 30, minHeight: 200, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
          >
            <div style={{ fontSize: 12, color: 'var(--a)', fontWeight: 700, marginBottom: 10, textTransform: 'uppercase' }}>
              {curProb.topic} · {curProb.difficulty}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.4 }}>
              {curProb.text}
            </div>

            {showSol && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginTop: 30, padding: 20, background: 'var(--al)', borderRadius: 12, border: '1px solid var(--a)' }}
              >
                <div style={{ fontSize: 12, color: 'var(--a)', marginBottom: 5, fontWeight: 700 }}>SOLUCIÓ:</div>
                <div style={{ fontSize: 16 }}>{curProb.solution}</div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {!showSol ? (
          <button className="bp" style={{ width: '100%', padding: 20, fontSize: 18, marginTop: 20 }} onClick={() => setShowSol(true)}>
            Veure Solució
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 15, marginTop: 20 }}>
            <button className="bdanger" style={{ flex: 1, padding: 20 }} onClick={() => grade(false)}>❌ Incorrecte</button>
            <button className="bp" style={{ flex: 1, padding: 20, background: 'var(--ok)' }} onClick={() => grade(true)}>✅ Correcte (+10 XP)</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button className="bp" style={{ flex: 2 }} onClick={start}>Començar Repte ⚡</button>
        <button className="bp" style={{ flex: 1, background: 'var(--bg)', color: 'var(--t)', border: '2px solid var(--bd)' }} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel·lar' : 'Afegir Problema +'}
        </button>
      </div>

      {showForm && (
        <div className="c" style={{ border: '2px solid var(--al)', marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Nou Problema de Caos</h3>
          <div className="g1" style={{ gap: 12 }}>
            <div>
              <label className="lbl">Tema</label>
              <input className="inp" placeholder="Ex: Història, Mates..." value={topic} onChange={e => setTopic(e.target.value)} />
            </div>
            <div>
              <label className="lbl">Pregunta / Problema</label>
              <textarea className="inp" style={{ height: 80 }} placeholder="Escriu l'enunciat..." value={text} onChange={e => setText(e.target.value)} />
            </div>
            <div>
              <label className="lbl">Solució</label>
              <input className="inp" placeholder="La resposta correcta..." value={sol} onChange={e => setSol(e.target.value)} />
            </div>
            <div>
              <label className="lbl">Dificultat</label>
              <select className="inp" value={diff} onChange={e => setDiff(e.target.value as ExamDifficulty)}>
                <option value="fàcil">Fàcil</option>
                <option value="mitjà">Mitjà</option>
                <option value="difícil">Difícil</option>
              </select>
            </div>
            <button className="bp" onClick={addProblem}>Guardar Problema</button>
          </div>
        </div>
      )}

      <div className="c">
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 15, color: 'var(--ts)' }}>
          Els teus problemes ({chaosProblems.length})
        </h3>
        {chaosProblems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--tm)', fontSize: 13 }}>
            No tens problemes guardats. Afegeix-ne almenys 3 per començar.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {chaosProblems.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg)', borderRadius: 8, fontSize: 13 }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 700, color: 'var(--a)', marginRight: 8 }}>{p.topic}</span>
                  <span style={{ color: 'var(--t)' }}>{p.text.substring(0, 50)}{p.text.length > 50 ? '...' : ''}</span>
                </div>
                <button className="bi" onClick={() => {
                  patch({ chaosProblems: chaosProblems.filter(x => x.id !== p.id) });
                  save();
                }}>🗑</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
