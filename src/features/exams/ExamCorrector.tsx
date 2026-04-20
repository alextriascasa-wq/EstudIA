import { useState, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { motion } from 'framer-motion';

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787';

interface CorrectionResult {
  question: string;
  userAnswer: string;
  isCorrect: boolean;
  feedback: string;
  idealAnswer: string;
}

export function ExamCorrector(): JSX.Element {
  const addXP = useAppStore((s) => s.addXP);

  const [examText, setExamText] = useState('');
  const [view, setView] = useState<'input' | 'loading' | 'results'>('input');
  const [results, setResults] = useState<CorrectionResult[]>([]);
  const [score, setScore] = useState(0);

  // File upload state
  const [uploadedFile, setUploadedFile] = useState<{ name: string; base64: string; mimeType: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert('Format no suportat. Utilitza JPG, PNG, WebP o PDF.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Fitxer massa gran. Màxim 10 MB.');
      return;
    }

    const base64 = await fileToBase64(file);
    setUploadedFile({ name: file.name, base64, mimeType: file.type });
    setExamText(''); // Clear text if file is uploaded
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:...;base64, prefix
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleCorrect = async () => {
    if (!examText.trim() && !uploadedFile) return;
    setView('loading');

    try {
      const body: Record<string, unknown> = { language: 'ca' };
      
      if (uploadedFile) {
        body.fileData = uploadedFile.base64;
        body.mimeType = uploadedFile.mimeType;
      } else {
        body.examText = examText;
      }

      const res = await fetch(`${WORKER_URL}/exam-correct-upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`Error: ${res.status}`);
      const data = await res.json() as CorrectionResult[];
      
      setResults(data);
      const correct = data.filter(r => r.isCorrect).length;
      const finalScore = Math.round((correct / Math.max(data.length, 1)) * 100);
      setScore(finalScore);
      addXP(Math.round(finalScore / 4));
      setView('results');
    } catch (e) {
      console.error(e);
      alert('Error corregint l\'examen. Assegura\'t que el worker estigui actiu.');
      setView('input');
    }
  };

  if (view === 'loading') {
    return (
      <div className="c glow" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }} style={{ fontSize: 50, marginBottom: 20 }}>📝</motion.div>
        <h3 style={{ fontSize: 20 }}>La IA està corregint el teu examen...</h3>
        <p style={{ color: 'var(--ts)' }}>
          {uploadedFile ? `Analitzant ${uploadedFile.name}...` : 'Analitzant cada resposta i generant feedback personalitzat.'}
        </p>
      </div>
    );
  }

  if (view === 'results') {
    const correct = results.filter(r => r.isCorrect).length;

    return (
      <div className="c glow" style={{ padding: 30 }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{ fontSize: 60, marginBottom: 10 }}>{score >= 50 ? '🎉' : '📚'}</div>
          <h2 style={{ fontSize: 32, fontWeight: 800 }}>Nota: {score}/100</h2>
          <p style={{ color: 'var(--ts)', fontSize: 16 }}>
            {correct} de {results.length} correctes · +{Math.round(score / 4)} XP
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {results.map((r, i) => (
            <div key={i} style={{ 
              padding: 20, borderRadius: 16, background: 'var(--bg)', 
              border: `2px solid ${r.isCorrect ? 'var(--ok)' : 'var(--err)'}` 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>Pregunta {i + 1}</span>
                <span style={{ 
                  color: r.isCorrect ? 'var(--ok)' : 'var(--err)', 
                  fontWeight: 800, fontSize: 14 
                }}>
                  {r.isCorrect ? '✓ Correcte' : '✗ Incorrecte'}
                </span>
              </div>

              <p style={{ fontWeight: 600, marginBottom: 10, lineHeight: 1.4 }}>{r.question}</p>

              <div style={{ background: 'var(--al)', padding: 12, borderRadius: 10, marginBottom: 8, fontSize: 14 }}>
                <span style={{ color: 'var(--ts)', fontSize: 12, display: 'block', marginBottom: 4 }}>La teva resposta:</span>
                {r.userAnswer || <em>Sense resposta</em>}
              </div>

              {!r.isCorrect && r.idealAnswer && (
                <div style={{ background: 'var(--okl)', padding: 12, borderRadius: 10, marginBottom: 8, fontSize: 14 }}>
                  <span style={{ color: 'var(--ok)', fontSize: 12, display: 'block', marginBottom: 4 }}>Resposta ideal:</span>
                  {r.idealAnswer}
                </div>
              )}

              {r.feedback && (
                <div style={{ padding: 12, borderTop: '1px solid var(--bd)', marginTop: 8, fontSize: 14, lineHeight: 1.5 }}>
                  <strong>Comentari:</strong> {r.feedback}
                </div>
              )}
            </div>
          ))}
        </div>

        <button className="bp" style={{ width: '100%', marginTop: 24 }} onClick={() => { setView('input'); setExamText(''); setUploadedFile(null); }}>
          Corregir un altre examen
        </button>
      </div>
    );
  }

  return (
    <div className="c">
      <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Corrector d'Exàmens IA</h3>
      <p style={{ color: 'var(--ts)', marginBottom: 20, fontSize: 14, lineHeight: 1.5 }}>
        Puja una foto o PDF del teu examen, o enganxa el text manualment. La IA el corregirà amb feedback detallat.
      </p>

      {/* File Upload Area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? 'var(--a)' : uploadedFile ? 'var(--ok)' : 'var(--bd)'}`,
          borderRadius: 16,
          padding: uploadedFile ? '20px' : '36px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          marginBottom: 20,
          background: dragOver ? 'var(--al)' : uploadedFile ? 'var(--okl)' : 'transparent',
          transition: '0.2s',
        }}
      >
        {uploadedFile ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>
              {uploadedFile.mimeType === 'application/pdf' ? '📄' : '🖼️'}
            </span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ok)' }}>{uploadedFile.name}</div>
              <div style={{ fontSize: 12, color: 'var(--ts)' }}>Fitxer carregat correctament</div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setUploadedFile(null); }}
              style={{ 
                marginLeft: 'auto', background: 'var(--errl)', color: 'var(--err)', 
                border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13 
              }}
            >
              Eliminar
            </button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📸</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
              Arrossega una foto o PDF aquí
            </div>
            <div style={{ color: 'var(--ts)', fontSize: 13 }}>
              o clica per seleccionar un fitxer (JPG, PNG, WebP, PDF · Màx. 10 MB)
            </div>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
          style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); }}
        />
      </div>

      {/* Divider */}
      {!uploadedFile && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--bd)' }} />
            <span style={{ color: 'var(--ts)', fontSize: 13, fontWeight: 600 }}>o escriu-ho manualment</span>
            <div style={{ flex: 1, height: 1, background: 'var(--bd)' }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="lbl">Examen a corregir</label>
            <textarea
              className="inp"
              style={{ minHeight: 180, resize: 'vertical', fontSize: 15, lineHeight: 1.6, padding: 16 }}
              placeholder={`1. Pregunta: Quina és la capital de França?\nResposta: París\n\n2. Pregunta: Calcula la derivada de f(x) = 3x² + 2x\nResposta: f'(x) = 6x + 2`}
              value={examText}
              onChange={e => setExamText(e.target.value)}
            />
          </div>
        </>
      )}

      <button className="bp" style={{ width: '100%' }} onClick={handleCorrect} disabled={!examText.trim() && !uploadedFile}>
        Corregir Examen
      </button>
    </div>
  );
}
