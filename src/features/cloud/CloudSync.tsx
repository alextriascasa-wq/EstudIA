import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { signInWithMagicLink, signInWithPassword, signOut } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';

type AuthTab = 'magic' | 'password';

function SyncStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const map: Record<string, { cls: string; label: string }> = {
    idle: { cls: 'badge-ok', label: t('cloud.statusIdle') },
    syncing: { cls: 'badge-warn', label: t('cloud.syncing') },
    error: { cls: 'badge-err', label: t('cloud.syncError') },
    offline: { cls: 'badge-muted', label: t('cloud.offline') },
  };
  const { cls, label } = map[status] ?? map.idle;
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function CloudSync(): JSX.Element {
  const { t } = useTranslation();
  const authState = useAppStore((s) => s.authState);

  const [tab, setTab] = useState<AuthTab>('magic');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const handleMagicLink = async () => {
    if (!email) return;
    setLoading(true);
    setMsg(null);
    const { error } = await signInWithMagicLink(email);
    setMsg(
      error
        ? { text: t('cloud.errorGeneric', { msg: error.message }), ok: false }
        : { text: t('cloud.magicLinkSent'), ok: true },
    );
    setLoading(false);
  };

  const handlePassword = async () => {
    if (!email || !password) return;
    setLoading(true);
    setMsg(null);
    const { error } = await signInWithPassword(email, password);
    if (error) setMsg({ text: t('cloud.errorGeneric', { msg: error.message }), ok: false });
    setLoading(false);
  };

  const handleLogout = async () => {
    setLoading(true);
    await signOut();
    setLoading(false);
  };

  const fmtTime = (iso: string | null) => {
    if (!iso) return t('cloud.never');
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="sec">
      <div className="sec-hdr">
        <h2>{t('cloud.title')}</h2>
        <p>{t('cloud.desc')}</p>
      </div>

      <div className="c cloud-card">
        {!authState.user ? (
          <div className="cloud-login">
            <div className="cloud-login-header">
              <h3 className="t-h2">{t('cloud.loginTitle')}</h3>
              <p className="t-body" style={{ color: 'var(--ts)' }}>
                {t('cloud.loginDesc')}
              </p>
            </div>

            <div className="cloud-auth-tabs">
              <button
                className={`tab-btn${tab === 'magic' ? ' on' : ''}`}
                onClick={() => setTab('magic')}
              >
                {t('cloud.authMagic')}
              </button>
              <button
                className={`tab-btn${tab === 'password' ? ' on' : ''}`}
                onClick={() => setTab('password')}
              >
                {t('cloud.authPassword')}
              </button>
            </div>

            <div className="cloud-form">
              <label className="lbl">{t('cloud.emailLabel')}</label>
              <input
                className="inp"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' && (tab === 'magic' ? handleMagicLink() : handlePassword())
                }
              />

              {tab === 'password' && (
                <>
                  <label className="lbl">{t('cloud.passwordLabel')}</label>
                  <input
                    className="inp"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePassword()}
                  />
                </>
              )}

              <button
                className="bp"
                onClick={tab === 'magic' ? handleMagicLink : handlePassword}
                disabled={loading || !email}
              >
                {loading
                  ? t('cloud.loading')
                  : tab === 'magic'
                    ? t('cloud.sendMagicLink')
                    : t('cloud.login')}
              </button>
            </div>

            {msg && <div className={msg.ok ? 'cloud-msg-ok' : 'cloud-msg-err'}>{msg.text}</div>}
          </div>
        ) : (
          <div className="cloud-connected">
            <div className="cloud-connected-header">
              <div className="cloud-avatar">{authState.user.email?.[0]?.toUpperCase() ?? '?'}</div>
              <div>
                <h3 className="t-h3">{t('cloud.connected')}</h3>
                <p className="t-sm" style={{ color: 'var(--ts)' }}>
                  {authState.user.email}
                </p>
              </div>
            </div>

            <div className="cloud-sync-info">
              <div className="cloud-sync-row">
                <span className="t-label">{t('cloud.syncStatusLabel')}</span>
                <SyncStatusBadge status={authState.syncStatus} />
              </div>
              <div className="cloud-sync-row">
                <span className="t-label">{t('cloud.lastSyncLabel')}</span>
                <span className="t-sm t-mono" style={{ color: 'var(--ts)' }}>
                  {fmtTime(authState.lastSyncedAt)}
                </span>
              </div>
              <p className="t-xs" style={{ color: 'var(--tm)', marginTop: 8 }}>
                {t('cloud.syncAuto')}
              </p>
            </div>

            <button className="bs cloud-logout" onClick={handleLogout} disabled={loading}>
              {t('cloud.logout')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
