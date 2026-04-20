import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { uid, today } from '@/lib/date';
import { generateExam, correctExam } from '@/lib/examAI';
import type { QuizType, QuizQuestion, Quiz } from '@/types';
import { motion } from 'framer-motion';

export function ExamSimulator(): JSX.Element {
  const patch = useAppStore((s) => s.patch);
  const save = useAppStore((s) => s.save);
  const quizzes = useAppStore((s) => s.quizzes) || [];
  const addXP = useAppStore((s) => s.addXP);

  // Flow states: 'setup' | 'loading' | 'taking' | 'results'
  const [view, setView] = useState<'setup' | 'loading' | 'taking' | 'results'>('setup');
  
  // Setup State
  const [topic, setTopic] = useState('');
  const [type, setType] = useState<QuizType>('test');
  const [count, setCount] = useState<number>(5);

  // Active Exam State
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);

  // Results State
  const [score, setScore] = useState(0);

  const startGeneration = async () => {
    if (!topic.trim()) return;
    setView('loading');
    try {
      // In a real scenario language would come from i18n
      const qs = await generateExam(topic, type, count, 'ca');
      setQuestions(qs);
      setAnswers({});
      setCurrentIdx(0);
      setView('taking');
    } catch (e) {
      console.error(e);
      alert('Error generant examen. Revisa la consola.');
      setView('setup');
    }
  };

  const handleAnswer = (val: string) => {
    const q = questions[currentIdx];
    setAnswers({ ...answers, [q.id]: val });
  };

  const submitExam = async () => {
    setView('loading');
    let finalScore = 0;
    let finalQuestions = [...questions];

    if (type === 'test' || type === 'tf') {
      // Instant correction
      let correctCount = 0;
      finalQuestions = questions.map((q) => {
        const isCorrect = answers[q.id] === q.correctAnswer;
        if (isCorrect) correctCount++;
        return { ...q, userAnswer: answers[q.id], isCorrect };
      });
      finalScore = Math.round((correctCount / questions.length) * 100);
      setQuestions(finalQuestions);
    } else {
      // AI correction for open ended
      try {
        const answeredQs = questions.map(q => ({ ...q, userAnswer: answers[q.id] || '' }));
        const corrections = await correctExam(answeredQs, 'ca');
        
        let correctCount = 0;
        finalQuestions = questions.map(q => {
          const cor = corrections.find(c => c.id === q.id);
          const isCorrect = cor ? cor.isCorrect : false;
          if (isCorrect) correctCount++;
          return { ...q, userAnswer: answers[q.id], isCorrect, feedback: cor?.feedback };
        });
        finalScore = Math.round((correctCount / questions.length) * 100);
        setQuestions(finalQuestions);
      } catch (e) {
        console.error(e);
        alert('Error corregint examen.');
        setView('taking');
        return;
      }
    }

    setScore(finalScore);
    addXP(Math.round(finalScore / 2)); // Give up to 50 XP
    
    // Save to history
    const quiz: Quiz = {
      id: uid(),
      topic,
      type,
      date: today(),
      score: finalScore,
      questions: finalQuestions
    };
    patch({ quizzes: [quiz, ...quizzes] });
    save();

    setView('results');
  };

  if (view === 'loading') {
    return (
      <div className="c glow" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }} style={{ fontSize: 50, marginBottom: 20 }}>⚙️</motion.div>
        <h3 style={{ fontSize: 20 }}>La IA està treballant...</h3>
        <p style={{ color: 'var(--ts)' }}>Això pot trigar uns segons.</p>
      </div>
    );
  }

  if (view === 'taking') {
    const q = questions[currentIdx];
    const isLast = currentIdx === questions.length - 1;

    return (
      <div className="c glow" style={{ padding: 30 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, color: 'var(--ts)', fontSize: 14 }}>
          <span>Pregunta {currentIdx + 1} de {questions.length}</span>
          <span>Tipus: {type.toUpperCase()}</span>
        </div>

        <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24, lineHeight: 1.4 }}>{q?.q}</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 30 }}>
          {type === 'test' && q?.options?.map(opt => (
            <button 
              key={opt}
              onClick={() => handleAnswer(opt)}
              style={{
                padding: 16, textAlign: 'left', borderRadius: 12, border: '2px solid',
                borderColor: answers[q.id] === opt ? 'var(--a)' : 'var(--bd)',
                background: answers[q.id] === opt ? 'var(--al)' : 'var(--bg)',
                cursor: 'pointer', transition: '0.2s', fontSize: 16
              }}
            >
              {opt}
            </button>
          ))}

          {type === 'tf' && ['Cert', 'Fals'].map(opt => (
            <button 
              key={opt}
              onClick={() => handleAnswer(opt)}
              style={{
                padding: 16, textAlign: 'center', borderRadius: 12, border: '2px solid',
                borderColor: answers[q.id] === opt ? 'var(--a)' : 'var(--bd)',
                background: answers[q.id] === opt ? 'var(--al)' : 'var(--bg)',
                cursor: 'pointer', transition: '0.2s', fontSize: 16, fontWeight: 600
              }}
            >
              {opt}
            </button>
          ))}

          {type === 'open' && (
            <textarea
              className="inp"
              style={{ minHeight: 120, resize: 'vertical', fontSize: 16, padding: 16 }}
              placeholder="Escriu la teva resposta aquí..."
              value={answers[q.id] || ''}
              onChange={(e) => handleAnswer(e.target.value)}
            />
          )}

          {type === 'practical' && (
            <>
              <div style={{ background: 'var(--al)', padding: 14, borderRadius: 12, marginBottom: 12, fontSize: 13, color: 'var(--a)' }}>
                💡 Escriu el procediment pas a pas i el resultat final.
              </div>
              <textarea
                className="inp"
                style={{ minHeight: 180, resize: 'vertical', fontSize: 16, padding: 16, fontFamily: 'monospace' }}
                placeholder="Pas 1: ...&#10;Pas 2: ...&#10;Resultat: ..."
                value={answers[q.id] || ''}
                onChange={(e) => handleAnswer(e.target.value)}
              />
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="bp" style={{ background: 'var(--bd)', color: 'var(--t)' }} onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))} disabled={currentIdx === 0}>
            Anterior
          </button>
          {!isLast ? (
            <button className="bp" style={{ flex: 1 }} onClick={() => setCurrentIdx(currentIdx + 1)}>
              Següent
            </button>
          ) : (
            <button className="bp" style={{ flex: 1, background: 'var(--ok)', color: 'white' }} onClick={submitExam}>
              Finalitzar Examen
            </button>
          )}
        </div>
      </div>
    );
  }

  if (view === 'results') {
    return (
      <div className="c glow" style={{ padding: 30 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 60, marginBottom: 10 }}>{score >= 50 ? '🎉' : '📚'}</div>
          <h2 style={{ fontSize: 32, fontWeight: 800 }}>Nota Final: {score}/100</h2>
          <p style={{ color: 'var(--ts)', fontSize: 16 }}>Has obtingut {Math.round(score/2)} XP per aquesta simulació!</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {questions.map((q, i) => (
            <div key={q.id} style={{ padding: 20, borderRadius: 16, background: 'var(--bg)', border: `2px solid ${q.isCorrect ? 'var(--ok)' : 'var(--err)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontWeight: 700, fontSize: 16 }}>Pregunta {i+1}</span>
                <span style={{ color: q.isCorrect ? 'var(--ok)' : 'var(--err)', fontWeight: 800 }}>
                  {q.isCorrect ? 'Correcte' : 'Incorrecte'}
                </span>
              </div>
              <p style={{ fontSize: 16, marginBottom: 12 }}>{q.q}</p>
              
              <div style={{ background: 'var(--al)', padding: 12, borderRadius: 8, marginBottom: 8 }}>
                <span style={{ color: 'var(--ts)', fontSize: 12, display: 'block', marginBottom: 4 }}>La teva resposta:</span>
                {q.userAnswer || <em>Sense respondre</em>}
              </div>

              {!q.isCorrect && (
                <div style={{ background: 'var(--errl)', color: 'var(--err)', padding: 12, borderRadius: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Resposta correcta ideal:</span>
                  {q.correctAnswer}
                </div>
              )}

              {q.feedback && (
                <div style={{ padding: 12, borderTop: '1px solid var(--bd)', marginTop: 8, fontSize: 14 }}>
                  <strong>Comentari del professor:</strong> {q.feedback}
                </div>
              )}
            </div>
          ))}
        </div>

        <button className="bp" style={{ width: '100%', marginTop: 30 }} onClick={() => setView('setup')}>
          Fer un altre examen
        </button>
      </div>
    );
  }

  return (
    <div className="c">
      <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Simulador d'Exàmens IA</h3>
      <p style={{ color: 'var(--ts)', marginBottom: 24, fontSize: 14 }}>Enganxa els teus apunts o escriu un tema per generar un examen a mida instantani.</p>

      <div className="g1" style={{ gap: 16 }}>
        <div>
          <label className="lbl">Tema o Apunts</label>
          <textarea 
            className="inp" 
            style={{ height: 100, resize: 'vertical' }} 
            placeholder="Ex: La Revolució Francesa, o enganxa aquí el teu temari..."
            value={topic}
            onChange={e => setTopic(e.target.value)}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label className="lbl">Tipus d'Examen</label>
            <select className="inp" value={type} onChange={e => setType(e.target.value as QuizType)}>
              <option value="test">Test (Opcions Múltiples)</option>
              <option value="tf">Cert o Fals</option>
              <option value="open">Preguntes Obertes</option>
              <option value="practical">Pràctic (Problemes)</option>
            </select>
          </div>
          <div>
            <label className="lbl">Nº Preguntes</label>
            <select className="inp" value={count} onChange={e => setCount(Number(e.target.value))}>
              <option value="5">5 preguntes</option>
              <option value="10">10 preguntes</option>
              <option value="15">15 preguntes</option>
            </select>
          </div>
        </div>

        <button className="bp" style={{ marginTop: 8 }} onClick={startGeneration} disabled={!topic.trim()}>
          Generar Examen ✨
        </button>
      </div>
    </div>
  );
}
