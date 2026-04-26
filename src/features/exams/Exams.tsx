import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { daysUntil, fmtDate, today, uid } from '@/lib/date';
import { genStudyTasks } from '@/lib/exams';
import type { ExamDifficulty } from '@/types';
import { ExamSimulator } from './ExamSimulator';
import { ExamCorrector } from './ExamCorrector';
import { ZeroSession } from './ZeroSession';

export function Exams(): JSX.Element {
  const { t } = useTranslation();
  const exams = useAppStore((s) => s.exams);
  const doneTasks = useAppStore((s) => s.doneTasks);
  const patch = useAppStore((s) => s.patch);
  const save = useAppStore((s) => s.save);
  const addXP = useAppStore((s) => s.addXP);

  const [showForm, setShowForm] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [diff, setDiff] = useState<ExamDifficulty>('mitjà');
  const [activeTab, setActiveTab] = useState<'calendar' | 'simulator' | 'corrector' | 'zero'>(
    'calendar',
  );

  const tasks = useMemo(() => genStudyTasks(exams), [exams]);

  const add = (): void => {
    if (!name.trim() || !date) return;
    const nextExams = [
      ...exams,
      {
        id: uid(),
        name: name.trim(),
        subject: subject.trim(),
        date,
        difficulty: diff,
      },
    ].sort((a, b) => a.date.localeCompare(b.date));
    patch({ exams: nextExams });
    save();
    setName('');
    setSubject('');
    setDate('');
    setDiff('mitjà');
    setShowForm(false);
  };

  const remove = (id: string): void => {
    patch({ exams: exams.filter((e) => e.id !== id) });
    save();
  };

  const toggleTask = (id: string): void => {
    const idx = doneTasks.indexOf(id);
    const next = idx >= 0 ? doneTasks.filter((x) => x !== id) : [...doneTasks, id];
    patch({ doneTasks: next });
    save();
    if (idx < 0) addXP(8);
  };

  const td = today();

  return (
    <div className="sec">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="sec-hdr">
          <h2>{t('headers.exams.title')}</h2>
          <p>{t('headers.exams.desc')}</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['calendar', 'simulator', 'corrector', 'zero'] as const).map((tab) => (
          <button
            key={tab}
            className="bp"
            style={{
              flex: 1,
              fontSize: 13,
              background: activeTab === tab ? 'var(--a)' : 'var(--bg)',
              color: activeTab === tab ? '#fff' : 'var(--t)',
              border: '2px solid var(--a)',
            }}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'calendar'
              ? t('exams.tabs.calendar')
              : tab === 'simulator'
                ? t('exams.tabs.simulator')
                : tab === 'corrector'
                  ? t('exams.tabs.corrector')
                  : `🧭 ${t('nav.zero')}`}
          </button>
        ))}
      </div>

      {activeTab === 'simulator' && <ExamSimulator />}
      {activeTab === 'corrector' && <ExamCorrector />}
      {activeTab === 'zero' && <ZeroSession />}

      {activeTab === 'calendar' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="bp" onClick={() => setShowForm((v) => !v)}>
              {t('exams.newExam')}
            </button>
          </div>
          {showForm && (
            <div className="c" style={{ border: '2px solid var(--al)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
                {t('exams.addTitle')}
              </h3>
              <div className="g2" style={{ marginBottom: 10 }}>
                <div>
                  <label className="lbl">{t('exams.name')}</label>
                  <input
                    className="inp"
                    placeholder={t('exams.namePh')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="lbl">{t('exams.subject')}</label>
                  <input
                    className="inp"
                    placeholder={t('exams.subjectPh')}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div>
                  <label className="lbl">{t('exams.date')}</label>
                  <input
                    type="date"
                    className="inp"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="lbl">{t('exams.difficulty')}</label>
                  <select
                    className="inp"
                    value={diff}
                    onChange={(e) => setDiff(e.target.value as ExamDifficulty)}
                  >
                    <option value="fàcil">{t('exams.diffEasy')}</option>
                    <option value="mitjà">{t('exams.diffMed')}</option>
                    <option value="difícil">{t('exams.diffHard')}</option>
                  </select>
                </div>
              </div>
              <button className="bp" onClick={add}>
                {t('exams.submit')}
              </button>
            </div>
          )}
          {exams.length > 0 && (
            <div className="c">
              {exams.map((e) => {
                const d = daysUntil(e.date);
                const past = d < 0;
                const uc = d <= 2 ? 'var(--err)' : d <= 7 ? 'var(--w)' : 'var(--ok)';
                const bg = d <= 2 ? 'var(--errl)' : d <= 7 ? 'var(--wl)' : 'var(--okl)';
                return (
                  <div
                    key={e.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg)',
                      marginBottom: 6,
                      opacity: past ? 0.5 : 1,
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 'var(--radius-sm)',
                        background: bg,
                        color: uc,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: 16,
                      }}
                    >
                      {past ? '✓' : d}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{e.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--ts)' }}>
                        {e.subject} · {fmtDate(e.date)}
                      </div>
                    </div>
                    <button className="bi" onClick={() => remove(e.id)}>
                      🗑
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {tasks.length > 0 && (
            <div className="c">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 14,
                }}
              >
                <h3 style={{ fontSize: 15, fontWeight: 800 }}>{t('exams.plan')}</h3>
                <span style={{ fontSize: 11, color: 'var(--tm)' }}>
                  {t('exams.sessions', { n: tasks.length })}
                </span>
              </div>
              <div
                style={{
                  maxHeight: 350,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 5,
                }}
              >
                {tasks.slice(0, 40).map((task) => {
                  const isToday = task.date === td;
                  const done = doneTasks.includes(task.id);
                  return (
                    <div
                      key={task.id}
                      className={`ti ${done ? 'done' : ''}`}
                      style={
                        isToday
                          ? {
                              background: 'var(--al)',
                              borderColor: 'rgba(99,102,241,.15)',
                            }
                          : undefined
                      }
                      onClick={() => toggleTask(task.id)}
                    >
                      <span style={{ fontSize: 14 }}>{done ? '✅' : '⭕'}</span>
                      <div className="info">
                        <span className="nm">{task.examName}</span>{' '}
                        <span className="ds">— {task.session}</span>
                      </div>
                      <span
                        className="tg"
                        style={isToday ? { color: 'var(--a)', fontWeight: 700 } : undefined}
                      >
                        {isToday ? t('common.today') : fmtDate(task.date)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
