import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { useFriends } from './hooks/useFriends';
import { FriendsList } from './FriendsList';
import { ActivityFeed } from './ActivityFeed';
import { ChallengeList } from './ChallengeList';
import { CreateChallenge } from './CreateChallenge';
import { Leaderboard } from './Leaderboard';
import { ShareModal } from './ShareModal';
import type { Friend } from '@/types';
import { MOCK_FRIENDS } from '@/lib/mockFriends';

type SocialTab = 'friends' | 'feed' | 'challenges' | 'leaderboard';

const TABS: { id: SocialTab; icon: string; labelKey: string }[] = [
  { id: 'friends',     icon: '👥', labelKey: 'social.friends' },
  { id: 'feed',        icon: '📡', labelKey: 'social.feed.title' },
  { id: 'challenges',  icon: '⚔️', labelKey: 'social.challenges' },
  { id: 'leaderboard', icon: '🏆', labelKey: 'social.leaderboard' },
];

export function Social(): JSX.Element {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SocialTab>('friends');
  const [showCreate, setShowCreate] = useState(false);
  const [sortBy, setSortBy] = useState<'xp' | 'streak' | 'weeklyMinutes'>('xp');
  const [shareTarget, setShareTarget] = useState<Friend | null>(null);

  const user = useAppStore((s) => s.authState.user);
  const storeFriends = useAppStore((s) => s.friends);
  const leaderboardFriends = storeFriends.length > 0 ? storeFriends : MOCK_FRIENDS;

  // accepted Friendship[] needed for ActivityFeed + CreateChallenge
  const { accepted } = useFriends();

  return (
    <div className="sec">
      <div className="sec-hdr">
        <h2>{t('social.title')}</h2>
        <p>{t('social.subtitle')}</p>
      </div>

      {/* Sub-navigation */}
      <div className="social-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`social-tab-btn${activeTab === tab.id ? ' on' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.icon}</span>
            <span>{t(tab.labelKey)}</span>
          </button>
        ))}
      </div>

      {/* Friends */}
      {activeTab === 'friends' && (
        user
          ? <FriendsList />
          : <div className="c empty"><p style={{ color: 'var(--ts)' }}>{t('social.loginRequired')}</p></div>
      )}

      {/* Activity feed */}
      {activeTab === 'feed' && (
        user
          ? <ActivityFeed accepted={accepted} />
          : <div className="c empty"><p style={{ color: 'var(--ts)' }}>{t('social.loginRequired')}</p></div>
      )}

      {/* Challenges */}
      {activeTab === 'challenges' && (
        user ? (
          <>
            {accepted.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button className="bp" onClick={() => setShowCreate(true)}>
                  ⚔️ {t('social.createChallenge')}
                </button>
              </div>
            )}
            <ChallengeList />
          </>
        ) : (
          <div className="c empty"><p style={{ color: 'var(--ts)' }}>{t('social.loginRequired')}</p></div>
        )
      )}

      {/* Leaderboard */}
      {activeTab === 'leaderboard' && (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: 'var(--ts)' }}>{t('social.sortBy')}:</span>
            <select
              className="inp"
              style={{ width: 200 }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            >
              <option value="xp">Total XP</option>
              <option value="streak">🔥 {t('social.streak')}</option>
              <option value="weeklyMinutes">{t('social.weeklyMinutes')}</option>
            </select>
          </div>
          <Leaderboard sortedFriends={leaderboardFriends} sortBy={sortBy} />
        </div>
      )}

      {/* Create challenge modal */}
      {showCreate && accepted.length > 0 && (
        <CreateChallenge friends={accepted} onClose={() => setShowCreate(false)} />
      )}

      {/* Legacy share modal */}
      {shareTarget && (
        <ShareModal friend={shareTarget} onClose={() => setShareTarget(null)} />
      )}
    </div>
  );
}
