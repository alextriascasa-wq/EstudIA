import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Leaderboard } from './Leaderboard';
import { FriendCard } from './FriendCard';
import { ShareModal } from './ShareModal';
import { MOCK_FRIENDS } from '@/lib/mockFriends';
import type { Friend, SharedResource } from '@/types';
import { showToast } from '@/components/ui/Toast';

export function Social(): JSX.Element {
  const { friends, sharedResources, friendCode } = useAppStore();
  const patch = useAppStore(s => s.patch);

  const [activeTab, setActiveTab] = useState<'ranking' | 'friends' | 'inbox'>('ranking');
  const [sortRankingBy, setSortRankingBy] = useState<'xp' | 'streak' | 'weeklyMinutes'>('xp');
  const [friendToShare, setFriendToShare] = useState<Friend | null>(null);

  // Initialize mock friends if empty
  useEffect(() => {
    if (friends.length === 0) {
      patch({ friends: MOCK_FRIENDS });
    }
  }, [friends.length, patch]);

  const activeFriends = friends.length > 0 ? friends : MOCK_FRIENDS;

  const handleAcceptResource = (res: SharedResource) => {
    // In a real app we'd merge it into decks or quizzes
    showToast({ title: '✅ Recurs importat', desc: `S'ha desat "${res.name}" a la teva biblioteca.` });
    const updated = sharedResources.filter(r => r.id !== res.id);
    patch({ sharedResources: updated });
  };

  const handleRejectResource = (res: SharedResource) => {
    const updated = sharedResources.filter(r => r.id !== res.id);
    patch({ sharedResources: updated });
  };

  return (
    <div className="sec">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 900 }}>Ecosistema Social</h2>
          <p style={{ color: 'var(--ts)', marginTop: 4 }}>
            Estudia amb amics, competeix per veure qui puja més nivell i comparteix coneixement.
          </p>
        </div>
        <div className="c" style={{ padding: '8px 16px', background: 'var(--al)', border: '1px solid var(--a)' }}>
          <div style={{ fontSize: 11, color: 'var(--ts)', fontWeight: 600, textTransform: 'uppercase' }}>El teu codi d'amic</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--a)' }}>{friendCode}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button 
          className={`bs ${activeTab === 'ranking' ? 'on' : ''}`} 
          onClick={() => setActiveTab('ranking')}
        >
          🏆 Rànquing
        </button>
        <button 
          className={`bs ${activeTab === 'friends' ? 'on' : ''}`} 
          onClick={() => setActiveTab('friends')}
        >
          👥 Els meus Amics ({activeFriends.length})
        </button>
        <button 
          className={`bs ${activeTab === 'inbox' ? 'on' : ''}`} 
          onClick={() => setActiveTab('inbox')}
        >
          📥 Safata d'entrada 
          {sharedResources.length > 0 && (
            <span style={{ background: 'var(--err)', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, marginLeft: 8 }}>
              {sharedResources.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'ranking' && (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: 'var(--ts)', alignSelf: 'center' }}>Ordenar per:</span>
            <select className="inp" style={{ width: 200 }} value={sortRankingBy} onChange={(e) => setSortRankingBy(e.target.value as any)}>
              <option value="xp">Total XP</option>
              <option value="streak">Racha 🔥</option>
              <option value="weeklyMinutes">Temps aquesta setmana</option>
            </select>
          </div>
          <Leaderboard sortedFriends={activeFriends} sortBy={sortRankingBy} />
        </div>
      )}

      {activeTab === 'friends' && (
        <div className="g4">
          <div className="c card-hover glass" style={{ border: '1px dashed var(--a)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: 200 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>➕</div>
            <h4 style={{ fontWeight: 800, marginBottom: 8 }}>Afegir Amic</h4>
            <p style={{ fontSize: 12, color: 'var(--ts)', marginBottom: 16 }}>Afegeix algú pel seu codi d'amic</p>
            <input type="text" className="inp" placeholder="Ex: SF-A1B2C" style={{ width: '80%', marginBottom: 12 }} />
            <button className="bp" style={{ width: '80%' }}>Afegir</button>
          </div>

          {activeFriends.map(f => (
            <FriendCard key={f.id} friend={f} onShare={setFriendToShare} />
          ))}
        </div>
      )}

      {activeTab === 'inbox' && (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          {sharedResources.length === 0 ? (
            <div className="c empty">
              <span style={{ fontSize: 40 }}>📥</span>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginTop: 16 }}>No tens recursos nous</h3>
              <p>Quan els teus amics et comparteixin baralles o apunts, apareixeran aquí.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {sharedResources.map(res => (
                <div key={res.id} className="c glass" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ fontSize: 32 }}>
                    {res.type === 'deck' ? '📇' : res.type === 'quiz' ? '📝' : '✍️'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontWeight: 800 }}>{res.name}</h4>
                    <p style={{ fontSize: 13, color: 'var(--ts)' }}>
                      Enviat per <strong>{res.fromName}</strong> · {res.date}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="bs" onClick={() => handleRejectResource(res)}>Rebutjar</button>
                    <button className="bp" onClick={() => handleAcceptResource(res)}>Acceptar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {friendToShare && (
        <ShareModal friend={friendToShare} onClose={() => setFriendToShare(null)} />
      )}
    </div>
  );
}
