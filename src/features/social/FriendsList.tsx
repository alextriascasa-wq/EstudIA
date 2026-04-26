import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFriends } from './hooks/useFriends';
import { FriendCard } from './FriendCard';
import type { UserProfile } from '@/types';

export function FriendsList(): JSX.Element {
  const { t } = useTranslation();
  const {
    accepted, pending,
    loading, error,
    searchResults, searching,
    search, sendRequest, acceptRequest, declineRequest, unfriend,
  } = useFriends();

  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void search(query);
  };

  return (
    <div className="friends-list">
      {/* Add friend search */}
      <div className="c" style={{ marginBottom: 24 }}>
        <h4 className="lbl" style={{ marginBottom: 12 }}>{t('social.addFriend')}</h4>
        <form className="friends-search-row" onSubmit={handleSearch}>
          <input
            type="email"
            className="inp"
            placeholder={t('social.searchByEmail')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="bp" disabled={searching || !query.trim()}>
            {searching ? '…' : t('social.search')}
          </button>
        </form>

        {searchResults.length > 0 && (
          <div className="friends-search-results">
            {searchResults.map((p: UserProfile) => (
              <div key={p.id} className="friends-search-result">
                <div className="friend-avatar-sm">{(p.username[0] ?? '?').toUpperCase()}</div>
                <span style={{ flex: 1, fontWeight: 600 }}>{p.username}</span>
                <button
                  className="bp"
                  style={{ fontSize: 13, padding: '6px 14px' }}
                  onClick={() => void sendRequest(p.id)}
                >
                  {t('social.addFriend')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending incoming requests */}
      {pending.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h4 className="lbl" style={{ marginBottom: 12 }}>
            {t('social.pendingRequests')} ({pending.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending.map((f) => (
              <div key={f.id} className="c" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="friend-avatar-sm">
                  {(f.friend?.username?.[0] ?? '?').toUpperCase()}
                </div>
                <span style={{ flex: 1, fontWeight: 600 }}>
                  {f.friend?.username ?? f.userId}
                </span>
                <button className="bs" style={{ fontSize: 13 }} onClick={() => void declineRequest(f.id)}>
                  {t('social.decline')}
                </button>
                <button className="bp" style={{ fontSize: 13 }} onClick={() => void acceptRequest(f.id)}>
                  {t('social.accept')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading / error */}
      {loading && <div className="c empty"><p style={{ color: 'var(--ts)' }}>…</p></div>}
      {!loading && error && <div className="c empty"><p style={{ color: 'var(--err)' }}>{error}</p></div>}

      {/* Empty state */}
      {!loading && !error && accepted.length === 0 && (
        <div className="c empty">
          <span style={{ fontSize: 40 }}>👥</span>
          <h3>{t('social.noFriends')}</h3>
          <p style={{ color: 'var(--ts)', marginTop: 4 }}>{t('social.noFriendsHint')}</p>
        </div>
      )}

      {/* Friends grid */}
      {accepted.length > 0 && (
        <div className="g3">
          {accepted.map((f) => (
            <FriendCard key={f.id} friendship={f} onUnfriend={() => void unfriend(f.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
