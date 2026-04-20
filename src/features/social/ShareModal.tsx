import { useState } from 'react';
import type { Friend } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { showToast } from '@/components/ui/Toast';

export function ShareModal({ friend, onClose }: { friend: Friend, onClose: () => void }): JSX.Element {
  const { decks, quizzes } = useAppStore();
  
  const [tab, setTab] = useState<'deck' | 'quiz' | 'notes'>('deck');
  const [selectedId, setSelectedId] = useState<string>('');
  const [notesText, setNotesText] = useState('');

  const handleShare = () => {
    let resourceName = '';

    if (tab === 'deck') {
      const d = decks.find(x => x.id === selectedId);
      if (!d) return alert('Selecciona una baralla primer');
      resourceName = d.name;
    } else if (tab === 'quiz') {
      const q = quizzes.find(x => x.id === selectedId);
      if (!q) return alert('Selecciona un examen primer');
      resourceName = `Examen: ${q.topic}`;
    } else {
      if (!notesText.trim()) return alert('Escriu algun apunt primer');
      resourceName = 'Apunts lliures';
    }

    // In a real app, this would send a payload to the backend.
    // For now, we simulate a successful send.
    showToast({
      title: '📤 Recurs enviat',
      desc: `S'ha enviat "${resourceName}" a ${friend.name} correctament.`,
    });

    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="c glass" style={{ width: '90%', maxWidth: 500, padding: 24, position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, fontSize: 20 }}>×</button>
        
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
          Compartir amb {friend.avatar} {friend.name}
        </h2>
        <p style={{ color: 'var(--ts)', fontSize: 13, marginBottom: 20 }}>
          Envia material d'estudi perquè el pugui importar directament a la seva aplicació.
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button className={`bs ${tab === 'deck' ? 'on' : ''}`} onClick={() => setTab('deck')} style={{ flex: 1 }}>📇 Flashcards</button>
          <button className={`bs ${tab === 'quiz' ? 'on' : ''}`} onClick={() => setTab('quiz')} style={{ flex: 1 }}>📝 Exàmens</button>
          <button className={`bs ${tab === 'notes' ? 'on' : ''}`} onClick={() => setTab('notes')} style={{ flex: 1 }}>✍️ Apunts</button>
        </div>

        <div style={{ marginBottom: 24 }}>
          {tab === 'deck' && (
            <select className="inp" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
              <option value="">-- Selecciona una baralla --</option>
              {decks.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.cards.length} cartes)</option>
              ))}
            </select>
          )}

          {tab === 'quiz' && (
            <select className="inp" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
              <option value="">-- Selecciona un examen --</option>
              {quizzes.map(q => (
                <option key={q.id} value={q.id}>{q.topic} - Nota: {q.score}%</option>
              ))}
            </select>
          )}

          {tab === 'notes' && (
            <textarea 
              className="inp" 
              placeholder="Enganxa aquí els teus apunts ràpids per compartir..." 
              style={{ minHeight: 120 }}
              value={notesText}
              onChange={e => setNotesText(e.target.value)}
            />
          )}
        </div>

        <button className="bp" style={{ width: '100%' }} onClick={handleShare}>
          Enviar a {friend.name}
        </button>
      </div>
    </div>
  );
}
