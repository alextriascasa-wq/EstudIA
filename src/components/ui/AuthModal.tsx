import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, LogIn, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { signInWithMagicLink, signInWithPassword } from '@/lib/supabase';
import { showToast } from '@/components/ui/Toast';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Mode = 'magic' | 'password';

export function AuthModal({ open, onClose }: Props): JSX.Element {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>('magic');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const onMagic = async (): Promise<void> => {
    if (!email) return;
    setBusy(true);
    const { error } = await signInWithMagicLink(email);
    setBusy(false);
    if (error) {
      showToast({ title: '❌ Error', desc: error.message });
      return;
    }
    setSent(true);
    showToast({ title: '✉️', desc: t('auth.magicLinkSent', { email }) });
  };

  const onPassword = async (): Promise<void> => {
    if (!email || !password) return;
    setBusy(true);
    const { error } = await signInWithPassword(email, password);
    setBusy(false);
    if (error) {
      showToast({ title: '❌ Error', desc: error.message });
      return;
    }
    onClose();
  };

  const submit = (): void => {
    if (mode === 'magic') void onMagic();
    else void onPassword();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="auth-modal c"
            initial={{ scale: 0.96, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="bi auth-close" onClick={onClose} aria-label="Close">
              <X size={18} strokeWidth={1.75} />
            </button>

            <div className="auth-hdr">
              <div className="auth-icon">
                <LogIn size={26} strokeWidth={1.75} />
              </div>
              <h2 className="h2-card">{t('auth.signIn')}</h2>
              <p className="body-s muted">{t('auth.signInDesc')}</p>
            </div>

            <div className="auth-tabs">
              <button
                className={`auth-tab${mode === 'magic' ? ' on' : ''}`}
                onClick={() => {
                  setMode('magic');
                  setSent(false);
                }}
              >
                <Send size={14} /> {t('auth.magicLink')}
              </button>
              <button
                className={`auth-tab${mode === 'password' ? ' on' : ''}`}
                onClick={() => {
                  setMode('password');
                  setSent(false);
                }}
              >
                <Lock size={14} /> {t('auth.password')}
              </button>
            </div>

            {sent && mode === 'magic' ? (
              <div className="auth-sent">
                <p>{t('auth.magicLinkSent', { email })}</p>
              </div>
            ) : (
              <div className="auth-form">
                <label className="lbl">{t('auth.email')}</label>
                <div className="auth-input-wrap">
                  <Mail size={16} strokeWidth={1.75} />
                  <input
                    className="inp"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                {mode === 'password' && (
                  <>
                    <label className="lbl">{t('auth.password')}</label>
                    <div className="auth-input-wrap">
                      <Lock size={16} strokeWidth={1.75} />
                      <input
                        className="inp"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="current-password"
                      />
                    </div>
                  </>
                )}

                <button
                  className="bp"
                  onClick={submit}
                  disabled={busy || !email || (mode === 'password' && !password)}
                  style={{ width: '100%', marginTop: 8 }}
                >
                  {busy ? '...' : mode === 'magic' ? t('auth.sendLink') : t('auth.signIn')}
                </button>

                <p className="body-s muted auth-foot">{t('auth.noAccount')}</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
