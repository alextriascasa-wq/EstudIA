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

    // Omit methods and non-serializable fields from Zustand
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

      <div className="c glass cloud-card">
        {loading ? (
          <div className="cloud-loading">{t('cloud.loading')}</div>
        ) : !session ? (
          <div className="cloud-login">
            <h3 className="cloud-login-title">{t('cloud.loginTitle')}</h3>
            <p className="cloud-login-desc">{t('cloud.loginDesc')}</p>

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

            <div className="cloud-login-btns">
              <button className="bp flex-1" onClick={handleLogin}>
                {t('cloud.login')}
              </button>
              <button className="bs flex-1" onClick={handleSignUp}>
                {t('cloud.signup')}
              </button>
            </div>

            {statusMsg && <div className="cloud-status-msg">{statusMsg}</div>}
          </div>
        ) : (
          <div className="cloud-connected">
            <div className="cloud-connected-icon">☁️</div>
            <div>
              <h3 className="cloud-connected-title">{t('cloud.connected')}</h3>
              <p className="cloud-connected-email">{session.user.email}</p>
            </div>

            <div className="cloud-sync-grid">
              <button className="bp bp-warn" onClick={pushToCloud}>
                {t('cloud.push')}
              </button>
              <button className="bp" onClick={pullFromCloud}>
                {t('cloud.pull')}
              </button>
            </div>

            {statusMsg && <div className="cloud-status-ok">{statusMsg}</div>}

            <button className="bs cloud-logout" onClick={handleLogout}>
              {t('cloud.logout')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
