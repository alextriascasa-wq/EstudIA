import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';

function friendlyError(msg: string): string {
  if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('network')) {
    return "No s'ha pogut connectar al servidor. Comprova la teva connexió a internet.";
  }
  return `Error: ${msg}`;
}

export function CloudSync(): JSX.Element {
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
    }).catch(() => {
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
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setStatusMsg(friendlyError(error.message));
      else setStatusMsg("T'has registrat correctament. Revisa el teu correu per confirmar (si cal).");
    } catch (e: unknown) {
      setStatusMsg(friendlyError(e instanceof Error ? e.message : 'Error desconegut'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setStatusMsg('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setStatusMsg(friendlyError(error.message));
      else setStatusMsg('Sessió iniciada amb èxit.');
    } catch (e: unknown) {
      setStatusMsg(friendlyError(e instanceof Error ? e.message : 'Error desconegut'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // signOut failing is non-critical; clear local session anyway
      setSession(null);
    }
  };

  const pushToCloud = async () => {
    if (!session) return;
    setLoading(true);
    setStatusMsg('Pujant dades al núvol...');

    // We omit methods and non-serializable fields from Zustand
    const stateToSave = { ...fullState };
    // @ts-ignore
    delete stateToSave.setState; delete stateToSave.patch; delete stateToSave.save; delete stateToSave.addXP; delete stateToSave.checkAchievements; delete stateToSave.rolloverIfNeeded; delete stateToSave._toastQueue; delete stateToSave._hasHydrated;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ app_state: stateToSave, updated_at: new Date().toISOString() })
        .eq('id', session.user.id);

      if (error) setStatusMsg(friendlyError(error.message));
      else setStatusMsg('✅ Dades guardades al núvol amb èxit!');
    } catch (e: unknown) {
      setStatusMsg(friendlyError(e instanceof Error ? e.message : 'Error desconegut'));
    } finally {
      setLoading(false);
    }
  };

  const pullFromCloud = async () => {
    if (!session) return;
    setLoading(true);
    setStatusMsg('Descarregant dades...');

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('app_state')
        .eq('id', session.user.id)
        .single();

      if (error) {
        setStatusMsg(friendlyError(error.message));
      } else if (data && data.app_state) {
        const stateFromCloud = data.app_state;
        if (Object.keys(stateFromCloud).length > 0) {
          patch(stateFromCloud);
          setStatusMsg('✅ Dades sincronitzades correctament! Has recuperat el teu progrés.');
        } else {
          setStatusMsg('El núvol està buit. Puja les dades primer.');
        }
      }
    } catch (e: unknown) {
      setStatusMsg(friendlyError(e instanceof Error ? e.message : 'Error desconegut'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sec">
      <div className="sec-hdr">
        <h2>Sincronització al Núvol</h2>
        <p>Guarda el teu progrés de forma segura per no perdre'l mai i accedeix des de qualsevol dispositiu.</p>
      </div>

      <div className="c glass" style={{ maxWidth: 500, margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>Carregant...</div>
        ) : !session ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ fontSize: 20, fontWeight: 800 }}>Inicia Sessió</h3>
            <p style={{ fontSize: 13, color: 'var(--ts)' }}>
              Aquesta funcionalitat usa Supabase per mantenir les teves targetes i nivell XP assegurats.
            </p>

            <div>
              <label className="lbl">Correu Electrònic</label>
              <input className="inp" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>

            <div>
              <label className="lbl">Contrasenya</label>
              <input className="inp" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <button className="bp" style={{ flex: 1 }} onClick={handleLogin}>Entrar</button>
              <button className="bs" style={{ flex: 1 }} onClick={handleSignUp}>Registrar-se</button>
            </div>

            {statusMsg && <div style={{ marginTop: 16, fontSize: 13, color: 'var(--a)' }}>{statusMsg}</div>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 48 }}>☁️</div>
            <div>
              <h3 style={{ fontSize: 20, fontWeight: 800 }}>Connectat al Núvol</h3>
              <p style={{ fontSize: 13, color: 'var(--ts)' }}>{session.user.email}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <button className="bp" style={{ background: 'var(--w)', color: '#000' }} onClick={pushToCloud}>
                ⬆️ Pujar Estat Local
              </button>
              <button className="bp" onClick={pullFromCloud}>
                ⬇️ Baixar del Núvol
              </button>
            </div>

            {statusMsg && <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ok)' }}>{statusMsg}</div>}

            <button className="bs" style={{ marginTop: 24, alignSelf: 'center', fontSize: 12, border: 'none' }} onClick={handleLogout}>
              Tancar Sessió
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
