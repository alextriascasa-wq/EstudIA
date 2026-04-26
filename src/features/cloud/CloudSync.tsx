import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';

export function CloudSync(): JSX.Element {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState('');

  const fullState = useAppStore();
  const patch = useAppStore((s) => s.patch);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignUp = async () => {
    setLoading(true);
    setStatusMsg('');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setStatusMsg(t('cloud.errorGeneric', { msg: error.message }));
    else setStatusMsg(t('cloud.signupOk'));
    setLoading(false);
  };

  const handleLogin = async () => {
    setLoading(true);
    setStatusMsg('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setStatusMsg(t('cloud.errorGeneric', { msg: error.message }));
    else setStatusMsg(t('cloud.loginOk'));
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const pushToCloud = async () => {
    if (!session) return;
    setLoading(true);
    setStatusMsg(t('cloud.pushing'));

    // We omit methods and non-serializable fields from Zustand
    const stateToSave: Record<string, unknown> = { ...fullState };
    delete stateToSave.setState;
    delete stateToSave.patch;
    delete stateToSave.save;
    delete stateToSave.addXP;
    delete stateToSave.checkAchievements;
    delete stateToSave.rolloverIfNeeded;
    delete stateToSave._toastQueue;
    delete stateToSave._hasHydrated;

    const { error } = await supabase
      .from('profiles')
      .update({ app_state: stateToSave, updated_at: new Date().toISOString() })
      .eq('id', session.user.id);

    if (error) setStatusMsg(t('cloud.pushErr', { msg: error.message }));
    else setStatusMsg(t('cloud.pushOk'));
    setLoading(false);
  };

  const pullFromCloud = async () => {
    if (!session) return;
    setLoading(true);
    setStatusMsg(t('cloud.pulling'));

    const { data, error } = await supabase
      .from('profiles')
      .select('app_state')
      .eq('id', session.user.id)
      .single();

    if (error) {
      setStatusMsg(t('cloud.pullErr', { msg: error.message }));
    } else if (data && data.app_state) {
      // Patch local state with cloud state
      const stateFromCloud = data.app_state;
      if (Object.keys(stateFromCloud).length > 0) {
        patch(stateFromCloud);
        setStatusMsg(t('cloud.pullOk'));
      } else {
        setStatusMsg(t('cloud.pullEmpty'));
      }
    }
    setLoading(false);
  };

  return (
    <div className="sec">
      <div className="sec-hdr">
        <h2>{t('cloud.title')}</h2>
        <p>{t('cloud.desc')}</p>
      </div>

      <div className="c glass" style={{ maxWidth: 500, margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>{t('cloud.loading')}</div>
        ) : !session ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ fontSize: 20, fontWeight: 800 }}>{t('cloud.loginTitle')}</h3>
            <p style={{ fontSize: 13, color: 'var(--ts)' }}>{t('cloud.loginDesc')}</p>

            <div>
              <label className="lbl">{t('cloud.emailLabel')}</label>
              <input
                className="inp"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="lbl">{t('cloud.passwordLabel')}</label>
              <input
                className="inp"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <button className="bp" style={{ flex: 1 }} onClick={handleLogin}>
                {t('cloud.login')}
              </button>
              <button className="bs" style={{ flex: 1 }} onClick={handleSignUp}>
                {t('cloud.signup')}
              </button>
            </div>

            {statusMsg && (
              <div style={{ marginTop: 16, fontSize: 13, color: 'var(--a)' }}>{statusMsg}</div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 48 }}>☁️</div>
            <div>
              <h3 style={{ fontSize: 20, fontWeight: 800 }}>{t('cloud.connected')}</h3>
              <p style={{ fontSize: 13, color: 'var(--ts)' }}>{session.user.email}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <button
                className="bp"
                style={{ background: 'var(--w)', color: '#000' }}
                onClick={pushToCloud}
              >
                {t('cloud.push')}
              </button>
              <button className="bp" onClick={pullFromCloud}>
                {t('cloud.pull')}
              </button>
            </div>

            {statusMsg && (
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ok)' }}>{statusMsg}</div>
            )}

            <button
              className="bs"
              style={{ marginTop: 24, alignSelf: 'center', fontSize: 12, border: 'none' }}
              onClick={handleLogout}
            >
              {t('cloud.logout')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
