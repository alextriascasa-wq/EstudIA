import { useState, useEffect, useRef, useCallback } from "react";
import {
  Timer, BookOpen, Calendar, BarChart3, Brain, Target,
  Plus, Trash2, ChevronRight, Play, Pause, RotateCcw,
  Clock, Zap, Coffee, Moon, Sun, CheckCircle2, Circle,
  AlertCircle, Lightbulb, Layers, RefreshCw, Eye, EyeOff,
  TrendingUp, Award, Flame, ArrowRight, X, Edit3, Check
} from "lucide-react";

// ─── HELPERS ───
const formatTime = (s) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

const formatDate = (d) => {
  const date = new Date(d);
  const days = ["Dg", "Dl", "Dt", "Dc", "Dj", "Dv", "Ds"];
  const months = ["gen", "feb", "mar", "abr", "mai", "jun", "jul", "ago", "set", "oct", "nov", "des"];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
};

const daysUntil = (d) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - now) / 86400000);
};

const todayStr = () => new Date().toISOString().split("T")[0];

// ─── COLOR PALETTE ───
const colors = {
  bg: "#FAFAFA",
  surface: "#FFFFFF",
  surfaceHover: "#F5F5F5",
  border: "#E5E5E5",
  borderLight: "#F0F0F0",
  text: "#171717",
  textSecondary: "#737373",
  textMuted: "#A3A3A3",
  accent: "#2563EB",
  accentLight: "#DBEAFE",
  accentDark: "#1D4ED8",
  success: "#059669",
  successLight: "#D1FAE5",
  warning: "#D97706",
  warningLight: "#FEF3C7",
  danger: "#DC2626",
  dangerLight: "#FEE2E2",
  purple: "#7C3AED",
  purpleLight: "#EDE9FE",
};

// ─── STUDY TECHNIQUES DATA ───
const techniques = [
  {
    id: "active-recall",
    name: "Recuperació Activa",
    icon: Brain,
    color: colors.accent,
    bg: colors.accentLight,
    rating: "Alta",
    summary: "Extrau informació de la memòria sense ajuda externa. Cada recuperació exitosa reconsolida les sinapsis i fa el record més resistent.",
    steps: [
      "Llegeix o estudia el material durant 15-20 minuts",
      "Tanca els apunts completament",
      "Escriu TOT el que recordis en un full en blanc",
      "Compara amb els apunts originals i marca errors",
      "Repeteix fins aconseguir 3 recuperacions correctes consecutives",
      "Programa la pròxima sessió de recuperació (2 dies, 1 setmana, 1 mes)"
    ],
    science: "Cada acte de recuperació modifica físicament l'estructura del record. No és un simple test: és un procés que reconsolida les sinapsis i fa la informació més accessible. Preguntes obertes > opcions múltiples."
  },
  {
    id: "spaced-repetition",
    name: "Repetició Espaïada",
    icon: RefreshCw,
    color: colors.purple,
    bg: colors.purpleLight,
    rating: "Alta",
    summary: "Programa sessions de repàs en intervals creixents per combatre la Corba de l'Oblit d'Ebbinghaus.",
    steps: [
      "Dia 0: Estudia el material i fes recuperació activa (3 encerts)",
      "Dia 2: Primera sessió de repàs amb recuperació",
      "Dia 7: Segona sessió de repàs",
      "Dia 21: Tercera sessió de repàs",
      "Dia 45+: Repàs de manteniment",
      "Usa apps com Anki o RemNote per automatitzar intervals"
    ],
    science: "Donar temps al cervell garanteix que cada recuperació succeeixi just quan el record està a punt de desaparèixer. Estudiar 1h durant 5 dies DUPLICA la retenció vs. 5h en un sol dia (cramming)."
  },
  {
    id: "feynman",
    name: "Tècnica Feynman",
    icon: Lightbulb,
    color: colors.warning,
    bg: colors.warningLight,
    rating: "Alta",
    summary: "Explica el concepte com si fos per un nen de 5 anys. Si no pots simplificar-ho, no ho entens realment.",
    steps: [
      "Escriu el nom del concepte a dalt d'un full",
      "Explica'l amb paraules simples, sense jerga tècnica",
      "Quan et bloquegis, identifica el buit de coneixement exacte",
      "Torna als apunts i omple específicament aquest buit",
      "Simplifica encara més: usa analogies i exemples quotidians",
      "Repeteix fins que l'explicació sigui clara i fluida"
    ],
    science: "Duplica el rendiment en proves pre/post. +21% en habilitats metacognitives, +18% en autoeficàcia, +34% en rendiment analític. Destrueix la il·lusió de competència."
  },
  {
    id: "interleaving",
    name: "Pràctica Intercalada",
    icon: Layers,
    color: colors.success,
    bg: colors.successLight,
    rating: "Moderada-Alta",
    summary: "Barreja tipus de problemes en lloc de practicar per blocs. Entrena el cervell a discriminar QUAN usar cada estratègia.",
    steps: [
      "Selecciona 3-4 tipus de problemes o temes relacionats",
      "Barreja'ls en ordre aleatori (A-B-C-B-A-C)",
      "NO miris apunts durant la pràctica (res d'externalitzar!)",
      "Quan fallis, identifica per què has confós el tipus de problema",
      "Augmenta la dificultat barrejant temes més similars",
      "Ideal per mates, física, química — qualsevol matèria amb problemes"
    ],
    science: "Entrena la 'discriminació inductiva': aprens no només a executar fórmules, sinó a reconèixer QUAN i PER QUÈ usar-les. Rendiment inicial pitjor, però a llarg termini pulveritza la pràctica per blocs."
  },
  {
    id: "elaborative",
    name: "Interrogació Elaborativa",
    icon: Eye,
    color: "#E11D48",
    bg: "#FFE4E6",
    rating: "Moderada",
    summary: "Pregunta't constantment '¿Per què és cert això?' mentre llegeixes. Ancora la info nova a xarxes sinàptiques existents.",
    steps: [
      "Llegeix una afirmació o concepte del text",
      "Atura't i pregunta: '¿Per què és cert això?'",
      "Genera una explicació causal amb les teves paraules",
      "Pregunta: '¿En què es diferencia de X?' (concepte similar)",
      "Connecta amb coneixements previs: analogies, exemples reals",
      "Combina amb Codificació Dual: transforma text en diagrama visual"
    ],
    science: "Obliga la neocorteza a connectar info nova amb xarxes preexistents, creant redundància neuronal. Especialment potent per Història, Biologia, Filosofia i Ciències Socials."
  },
  {
    id: "nsdr",
    name: "NSDR (Descans Profund)",
    icon: Moon,
    color: "#6366F1",
    bg: "#E0E7FF",
    rating: "Recuperació",
    summary: "Protocol de 10-20 min que restaura dopamina (+65%), renta cortisol i reinicia l'atenció executiva entre sessions d'estudi.",
    steps: [
      "Estira't en un lloc còmode, tanca els ulls",
      "Fes 3-5 respiracions profundes diafragmàtiques lentes",
      "Escaneja el cos de cap a peus, relaxant cada zona",
      "Mantén la consciència sense dormir-te (10-20 min)",
      "Nota les ones theta que restauren la teva atenció",
      "Obrir els ulls lentament i reprèn l'estudi amb energia renovada"
    ],
    science: "Indueix ones cerebrals theta sense creuar el llindar del son. Millora velocitat de reacció, redueix tensió sistèmica, incrementa dopamina endògena un 65%. Superior a la migdiada per evitar la inèrcia del son."
  }
];

// ─── TIMER MODES ───
const timerModes = [
  { id: "pomodoro", name: "Pomodoro", work: 25 * 60, rest: 5 * 60, longRest: 15 * 60, icon: Timer, desc: "25 min focus / 5 min pausa", ideal: "Tasques mecàniques, flashcards, organització" },
  { id: "deep90", name: "Deep Work 90", work: 90 * 60, rest: 27 * 60, icon: Zap, desc: "90 min focus / 27 min pausa", ideal: "Mates, física, programació, anàlisi profund" },
  { id: "deep120", name: "Deep Work 120", work: 120 * 60, rest: 36 * 60, icon: Flame, desc: "120 min focus / 36 min pausa", ideal: "Sessions d'immersió total, projectes complexos" },
];

// ─── MAIN APP ───
export default function StudyApp() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [timerMode, setTimerMode] = useState(timerModes[0]);
  const [timeLeft, setTimeLeft] = useState(timerModes[0].work);
  const [isRunning, setIsRunning] = useState(false);
  const [isResting, setIsResting] = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [totalStudyMin, setTotalStudyMin] = useState(0);
  const [todaySessions, setTodaySessions] = useState(0);
  const [streak, setStreak] = useState(1);
  const [weeklyData, setWeeklyData] = useState([
    { day: "Dl", min: 0 }, { day: "Dt", min: 0 }, { day: "Dc", min: 0 },
    { day: "Dj", min: 0 }, { day: "Dv", min: 0 }, { day: "Ds", min: 0 }, { day: "Dg", min: 0 }
  ]);

  // Exams
  const [exams, setExams] = useState([]);
  const [showAddExam, setShowAddExam] = useState(false);
  const [newExam, setNewExam] = useState({ name: "", subject: "", date: "", difficulty: "mitjà" });

  // Techniques
  const [expandedTechnique, setExpandedTechnique] = useState(null);

  // Study tasks
  const [studyTasks, setStudyTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState(new Set());

  const intervalRef = useRef(null);

  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((t) => t - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      if (!isResting) {
        const workMin = Math.round(timerMode.work / 60);
        setTotalStudyMin((t) => t + workMin);
        setTodaySessions((s) => s + 1);
        setPomodoroCount((c) => c + 1);
        setWeeklyData((prev) => {
          const dayIdx = new Date().getDay();
          const mappedIdx = dayIdx === 0 ? 6 : dayIdx - 1;
          const updated = [...prev];
          updated[mappedIdx] = { ...updated[mappedIdx], min: updated[mappedIdx].min + workMin };
          return updated;
        });
        setIsResting(true);
        const restTime = timerMode.id === "pomodoro" && pomodoroCount > 0 && (pomodoroCount + 1) % 4 === 0
          ? timerMode.longRest
          : timerMode.rest;
        setTimeLeft(restTime);
      } else {
        setIsResting(false);
        setTimeLeft(timerMode.work);
      }
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, timeLeft, isResting, timerMode, pomodoroCount]);

  const toggleTimer = () => setIsRunning(!isRunning);
  const resetTimer = () => {
    setIsRunning(false);
    setIsResting(false);
    setTimeLeft(timerMode.work);
  };
  const changeMode = (mode) => {
    setTimerMode(mode);
    setTimeLeft(mode.work);
    setIsRunning(false);
    setIsResting(false);
  };

  // Generate study plan from exams
  const generateStudyPlan = useCallback((examList) => {
    const tasks = [];
    const today = todayStr();
    examList.forEach((exam) => {
      const days = daysUntil(exam.date);
      if (days < 0) return;
      const intervals = exam.difficulty === "difícil" ? [0, 1, 2, 4, 7, 14] :
        exam.difficulty === "mitjà" ? [0, 1, 3, 7, 14] : [0, 2, 5, 12];
      intervals.forEach((interval) => {
        const studyDate = new Date(exam.date);
        studyDate.setDate(studyDate.getDate() - interval);
        const studyStr = studyDate.toISOString().split("T")[0];
        if (studyStr >= today) {
          const session = interval === 0 ? "Repàs final" :
            interval <= 2 ? "Recuperació activa intensiva" :
            interval <= 7 ? "Pràctica intercalada + Feynman" : "Primera passada + Elaboració";
          tasks.push({
            id: `${exam.id}-${interval}`,
            examId: exam.id,
            examName: exam.name,
            subject: exam.subject,
            date: studyStr,
            session,
            daysBeforeExam: interval,
          });
        }
      });
    });
    tasks.sort((a, b) => a.date.localeCompare(b.date));
    setStudyTasks(tasks);
  }, []);

  const addExam = () => {
    if (!newExam.name || !newExam.date) return;
    const exam = { ...newExam, id: Date.now() };
    const updated = [...exams, exam].sort((a, b) => a.date.localeCompare(b.date));
    setExams(updated);
    generateStudyPlan(updated);
    setNewExam({ name: "", subject: "", date: "", difficulty: "mitjà" });
    setShowAddExam(false);
  };

  const removeExam = (id) => {
    const updated = exams.filter((e) => e.id !== id);
    setExams(updated);
    generateStudyPlan(updated);
    setCompletedTasks((prev) => {
      const next = new Set(prev);
      [...next].filter((t) => t.startsWith(`${id}-`)).forEach((t) => next.delete(t));
      return next;
    });
  };

  const toggleTask = (taskId) => {
    setCompletedTasks((prev) => {
      const next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      return next;
    });
  };

  const todayTasks = studyTasks.filter((t) => t.date === todayStr());
  const upcomingExams = exams.filter((e) => daysUntil(e.date) >= 0).slice(0, 5);
  const progress = timerMode.work > 0 ? ((timerMode.work - timeLeft) / timerMode.work) * 100 : 0;
  const timerProgress = isResting
    ? ((timerMode.rest - timeLeft) / timerMode.rest) * 100
    : progress;

  // ─── STYLES ───
  const tabStyle = (id) => ({
    display: "flex", alignItems: "center", gap: 8, padding: "10px 16px",
    borderRadius: 10, cursor: "pointer", transition: "all 0.2s",
    background: activeTab === id ? colors.accent : "transparent",
    color: activeTab === id ? "#fff" : colors.textSecondary,
    fontWeight: activeTab === id ? 600 : 400, fontSize: 14, border: "none",
    width: "100%",
  });

  const cardStyle = {
    background: colors.surface, borderRadius: 14, border: `1px solid ${colors.border}`,
    padding: 24, transition: "all 0.2s",
  };

  const btnPrimary = {
    background: colors.accent, color: "#fff", border: "none", borderRadius: 10,
    padding: "10px 20px", cursor: "pointer", fontWeight: 600, fontSize: 14,
    display: "flex", alignItems: "center", gap: 8, transition: "all 0.15s",
  };

  const btnSecondary = {
    background: "transparent", color: colors.textSecondary, border: `1px solid ${colors.border}`,
    borderRadius: 10, padding: "10px 20px", cursor: "pointer", fontWeight: 500, fontSize: 14,
    display: "flex", alignItems: "center", gap: 8,
  };

  const inputStyle = {
    width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${colors.border}`,
    fontSize: 14, color: colors.text, background: colors.bg, outline: "none",
    boxSizing: "border-box",
  };

  const selectStyle = { ...inputStyle, appearance: "none", cursor: "pointer" };

  // ─── RENDER SECTIONS ───

  const renderDashboard = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {[
          { label: "Avui", value: `${todaySessions} sessions`, icon: Target, color: colors.accent, bg: colors.accentLight },
          { label: "Total estudiat", value: `${Math.floor(totalStudyMin / 60)}h ${totalStudyMin % 60}m`, icon: Clock, color: colors.purple, bg: colors.purpleLight },
          { label: "Ratxa", value: `${streak} ${streak === 1 ? "dia" : "dies"}`, icon: Flame, color: colors.warning, bg: colors.warningLight },
          { label: "Exàmens pendents", value: upcomingExams.length, icon: Calendar, color: colors.danger, bg: colors.dangerLight },
        ].map((stat, i) => (
          <div key={i} style={{ ...cardStyle, padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: colors.textSecondary, fontWeight: 500 }}>{stat.label}</span>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: stat.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <stat.icon size={17} color={stat.color} />
              </div>
            </div>
            <span style={{ fontSize: 22, fontWeight: 700, color: colors.text }}>{stat.value}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Today's Tasks */}
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: colors.text, margin: 0 }}>Pla d'estudi d'avui</h3>
            <span style={{ fontSize: 12, color: colors.textMuted, background: colors.bg, padding: "4px 10px", borderRadius: 6 }}>
              {completedTasks.size > 0 ? `${todayTasks.filter(t => completedTasks.has(t.id)).length}/${todayTasks.length}` : `${todayTasks.length} tasques`}
            </span>
          </div>
          {todayTasks.length === 0 ? (
            <div style={{ textAlign: "center", padding: 30, color: colors.textMuted }}>
              <Calendar size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: 14 }}>Cap tasca per avui. Afegeix exàmens per generar el pla!</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {todayTasks.map((task) => (
                <div key={task.id} onClick={() => toggleTask(task.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                    borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
                    background: completedTasks.has(task.id) ? colors.successLight : colors.bg,
                    border: `1px solid ${completedTasks.has(task.id) ? colors.success + "40" : "transparent"}`,
                    opacity: completedTasks.has(task.id) ? 0.7 : 1,
                  }}>
                  {completedTasks.has(task.id)
                    ? <CheckCircle2 size={18} color={colors.success} />
                    : <Circle size={18} color={colors.textMuted} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: colors.text, textDecoration: completedTasks.has(task.id) ? "line-through" : "none" }}>
                      {task.examName}
                    </div>
                    <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{task.session}</div>
                  </div>
                  <span style={{ fontSize: 11, color: colors.textMuted, whiteSpace: "nowrap" }}>
                    {task.daysBeforeExam === 0 ? "Avui!" : `${task.daysBeforeExam}d abans`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Exams */}
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: colors.text, margin: 0 }}>Pròxims exàmens</h3>
            <button onClick={() => { setActiveTab("exams"); setShowAddExam(true); }} style={{ ...btnSecondary, padding: "6px 12px", fontSize: 12 }}>
              <Plus size={14} /> Afegir
            </button>
          </div>
          {upcomingExams.length === 0 ? (
            <div style={{ textAlign: "center", padding: 30, color: colors.textMuted }}>
              <BookOpen size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: 14 }}>Cap examen programat encara</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {upcomingExams.map((exam) => {
                const days = daysUntil(exam.date);
                const urgentColor = days <= 2 ? colors.danger : days <= 7 ? colors.warning : colors.success;
                return (
                  <div key={exam.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, background: colors.bg }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: urgentColor, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{exam.name}</div>
                      <div style={{ fontSize: 12, color: colors.textSecondary }}>{exam.subject} · {formatDate(exam.date)}</div>
                    </div>
                    <span style={{
                      fontSize: 12, fontWeight: 700, color: urgentColor,
                      background: urgentColor + "15", padding: "4px 10px", borderRadius: 6,
                    }}>
                      {days === 0 ? "AVUI" : days === 1 ? "DEMÀ" : `${days} dies`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Weekly chart (simple bars) */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: colors.text, margin: "0 0 16px 0" }}>Activitat setmanal</h3>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 140, padding: "0 10px" }}>
          {weeklyData.map((d, i) => {
            const maxMin = Math.max(...weeklyData.map((w) => w.min), 30);
            const h = d.min > 0 ? Math.max((d.min / maxMin) * 110, 6) : 4;
            const dayIdx = new Date().getDay();
            const todayIdx = dayIdx === 0 ? 6 : dayIdx - 1;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: "100%", maxWidth: 42, height: h, borderRadius: 6,
                  background: i === todayIdx ? colors.accent : d.min > 0 ? colors.accentLight : colors.borderLight,
                  transition: "height 0.4s ease",
                }} />
                <span style={{ fontSize: 11, color: i === todayIdx ? colors.accent : colors.textMuted, fontWeight: i === todayIdx ? 700 : 400 }}>
                  {d.day}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Science Tip */}
      <div style={{ ...cardStyle, background: `linear-gradient(135deg, ${colors.accentLight}, ${colors.purpleLight})`, border: "none" }}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: "rgba(255,255,255,0.8)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Brain size={22} color={colors.accent} />
          </div>
          <div>
            <h4 style={{ margin: "0 0 6px 0", fontSize: 15, fontWeight: 700, color: colors.text }}>Consell científic del dia</h4>
            <p style={{ margin: 0, fontSize: 13, color: colors.textSecondary, lineHeight: 1.6 }}>
              El "pseudo-treball" (estudiar hores amb distraccions) no codifica res a la memòria a llarg termini.
              Millor 90 minuts de Deep Work sense mòbil que 4 hores amb interrupcions. Cada interrupció necessita 25 minuts per recuperar la concentració total.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTimer = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Mode Selector */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {timerModes.map((mode) => (
          <button key={mode.id} onClick={() => changeMode(mode)}
            style={{
              ...cardStyle, cursor: "pointer", padding: 18, border: `2px solid ${timerMode.id === mode.id ? colors.accent : colors.border}`,
              background: timerMode.id === mode.id ? colors.accentLight : colors.surface,
              textAlign: "left", transition: "all 0.2s",
            }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <mode.icon size={18} color={timerMode.id === mode.id ? colors.accent : colors.textMuted} />
              <span style={{ fontSize: 15, fontWeight: 700, color: timerMode.id === mode.id ? colors.accent : colors.text }}>{mode.name}</span>
            </div>
            <p style={{ margin: "0 0 4px 0", fontSize: 12, color: colors.textSecondary }}>{mode.desc}</p>
            <p style={{ margin: 0, fontSize: 11, color: colors.textMuted, fontStyle: "italic" }}>Ideal: {mode.ideal}</p>
          </button>
        ))}
      </div>

      {/* Timer Display */}
      <div style={{ ...cardStyle, textAlign: "center", padding: "50px 24px" }}>
        <div style={{ marginBottom: 8 }}>
          <span style={{
            fontSize: 13, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase",
            color: isResting ? colors.success : colors.accent,
            background: isResting ? colors.successLight : colors.accentLight,
            padding: "5px 16px", borderRadius: 20,
          }}>
            {isResting ? "Descans" : "Focus"}
          </span>
        </div>

        {/* Circular progress */}
        <div style={{ position: "relative", width: 240, height: 240, margin: "30px auto" }}>
          <svg width="240" height="240" viewBox="0 0 240 240" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="120" cy="120" r="105" fill="none" stroke={colors.borderLight} strokeWidth="8" />
            <circle cx="120" cy="120" r="105" fill="none"
              stroke={isResting ? colors.success : colors.accent}
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 105}`}
              strokeDashoffset={`${2 * Math.PI * 105 * (1 - timerProgress / 100)}`}
              style={{ transition: "stroke-dashoffset 0.5s ease" }}
            />
          </svg>
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
            <div style={{ fontSize: 52, fontWeight: 800, color: colors.text, fontVariantNumeric: "tabular-nums", letterSpacing: -2 }}>
              {formatTime(timeLeft)}
            </div>
            <div style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
              {isResting ? "Relaxa't, respira" : `Sessió ${todaySessions + 1}`}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
          <button onClick={resetTimer} style={{ ...btnSecondary, borderRadius: "50%", width: 50, height: 50, padding: 0, justifyContent: "center" }}>
            <RotateCcw size={18} />
          </button>
          <button onClick={toggleTimer}
            style={{
              ...btnPrimary, borderRadius: 16, width: 70, height: 70, padding: 0, justifyContent: "center",
              background: isRunning ? colors.danger : colors.accent,
              fontSize: 0, boxShadow: `0 4px 20px ${isRunning ? colors.danger : colors.accent}40`,
            }}>
            {isRunning ? <Pause size={28} /> : <Play size={28} style={{ marginLeft: 3 }} />}
          </button>
          <div style={{ width: 50 }} />
        </div>

        {/* Session info */}
        <div style={{ display: "flex", justifyContent: "center", gap: 30, marginTop: 30 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: colors.text }}>{todaySessions}</div>
            <div style={{ fontSize: 12, color: colors.textMuted }}>sessions avui</div>
          </div>
          <div style={{ width: 1, background: colors.border }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: colors.text }}>{totalStudyMin}m</div>
            <div style={{ fontSize: 12, color: colors.textMuted }}>total estudiat</div>
          </div>
          <div style={{ width: 1, background: colors.border }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: colors.text }}>{pomodoroCount}</div>
            <div style={{ fontSize: 12, color: colors.textMuted }}>pomodoros</div>
          </div>
        </div>
      </div>

      {/* Tips based on mode */}
      <div style={{ ...cardStyle, background: colors.bg, border: `1px solid ${colors.borderLight}` }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <AlertCircle size={18} color={colors.accent} style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <h4 style={{ margin: "0 0 6px 0", fontSize: 14, fontWeight: 700, color: colors.text }}>
              {isResting ? "Durant el descans" : "Durant el focus"}
            </h4>
            <p style={{ margin: 0, fontSize: 13, color: colors.textSecondary, lineHeight: 1.6 }}>
              {isResting
                ? "NO miris el mòbil ni xarxes socials — inunden el cervell de dopamina artificial i no descansa. Camina, mira per la finestra, fes estiraments o respiració diafragmàtica. Considera fer un NSDR de 10 min si la sessió ha estat intensa."
                : "Mòbil en mode avió i fora de la vista. Cada interrupció necessita 25 min per recuperar el Deep Work. El teu cervell està construint mielina: cada minut de focus reforça físicament els circuits neuronals."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderExams = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: colors.text }}>Exàmens i Pla d'Estudi</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: colors.textSecondary }}>
            Afegeix exàmens i es genera automàticament un pla basat en repetició espaïada
          </p>
        </div>
        <button onClick={() => setShowAddExam(!showAddExam)} style={btnPrimary}>
          {showAddExam ? <X size={16} /> : <Plus size={16} />}
          {showAddExam ? "Cancel·lar" : "Nou examen"}
        </button>
      </div>

      {/* Add Exam Form */}
      {showAddExam && (
        <div style={{ ...cardStyle, border: `2px solid ${colors.accent}40` }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 15, fontWeight: 700 }}>Afegir examen</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, display: "block", marginBottom: 6 }}>Nom de l'examen</label>
              <input style={inputStyle} placeholder="ex: Examen de Mates T5" value={newExam.name} onChange={(e) => setNewExam({ ...newExam, name: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, display: "block", marginBottom: 6 }}>Assignatura</label>
              <input style={inputStyle} placeholder="ex: Matemàtiques" value={newExam.subject} onChange={(e) => setNewExam({ ...newExam, subject: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, display: "block", marginBottom: 6 }}>Data</label>
              <input type="date" style={inputStyle} value={newExam.date} onChange={(e) => setNewExam({ ...newExam, date: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, display: "block", marginBottom: 6 }}>Dificultat</label>
              <select style={selectStyle} value={newExam.difficulty} onChange={(e) => setNewExam({ ...newExam, difficulty: e.target.value })}>
                <option value="fàcil">Fàcil</option>
                <option value="mitjà">Mitjà</option>
                <option value="difícil">Difícil</option>
              </select>
            </div>
          </div>
          <button onClick={addExam} style={{ ...btnPrimary, marginTop: 16 }}>
            <Check size={16} /> Afegir i generar pla
          </button>
        </div>
      )}

      {/* Exam List */}
      {exams.length > 0 && (
        <div style={cardStyle}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 15, fontWeight: 700 }}>Exàmens programats</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {exams.map((exam) => {
              const days = daysUntil(exam.date);
              const isPast = days < 0;
              return (
                <div key={exam.id} style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                  borderRadius: 10, background: isPast ? colors.surfaceHover : colors.bg,
                  opacity: isPast ? 0.5 : 1,
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                    background: days <= 2 ? colors.dangerLight : days <= 7 ? colors.warningLight : colors.successLight,
                    color: days <= 2 ? colors.danger : days <= 7 ? colors.warning : colors.success,
                    fontWeight: 800, fontSize: 16,
                  }}>
                    {isPast ? "✓" : days}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>{exam.name}</div>
                    <div style={{ fontSize: 12, color: colors.textSecondary }}>
                      {exam.subject} · {formatDate(exam.date)} · {exam.difficulty}
                    </div>
                  </div>
                  <button onClick={() => removeExam(exam.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: colors.textMuted, padding: 8 }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Generated Study Plan */}
      {studyTasks.length > 0 && (
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Pla d'estudi generat (Repetició Espaïada)</h3>
            <span style={{ fontSize: 12, color: colors.textMuted }}>{studyTasks.length} sessions planificades</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 400, overflowY: "auto" }}>
            {studyTasks.slice(0, 30).map((task) => {
              const isToday = task.date === todayStr();
              return (
                <div key={task.id} onClick={() => toggleTask(task.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                    borderRadius: 8, cursor: "pointer",
                    background: isToday ? colors.accentLight : completedTasks.has(task.id) ? colors.successLight : colors.bg,
                    border: isToday ? `1px solid ${colors.accent}30` : "1px solid transparent",
                    opacity: completedTasks.has(task.id) ? 0.6 : 1,
                  }}>
                  {completedTasks.has(task.id)
                    ? <CheckCircle2 size={16} color={colors.success} />
                    : <Circle size={16} color={colors.textMuted} />}
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>{task.examName}</span>
                    <span style={{ fontSize: 12, color: colors.textSecondary }}> — {task.session}</span>
                  </div>
                  <span style={{ fontSize: 11, color: isToday ? colors.accent : colors.textMuted, fontWeight: isToday ? 700 : 400 }}>
                    {isToday ? "AVUI" : formatDate(task.date)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {exams.length === 0 && !showAddExam && (
        <div style={{ ...cardStyle, textAlign: "center", padding: 50 }}>
          <Calendar size={48} color={colors.textMuted} style={{ marginBottom: 16, opacity: 0.3 }} />
          <h3 style={{ margin: "0 0 8px 0", fontSize: 17, color: colors.text }}>Cap examen programat</h3>
          <p style={{ margin: "0 0 20px 0", fontSize: 14, color: colors.textSecondary }}>
            Afegeix els teus exàmens i l'app crearà un pla d'estudi automàtic basat en repetició espaïada i el model RAD
          </p>
          <button onClick={() => setShowAddExam(true)} style={btnPrimary}>
            <Plus size={16} /> Afegir primer examen
          </button>
        </div>
      )}
    </div>
  );

  const renderTechniques = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: colors.text }}>Tècniques d'Estudi</h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: colors.textSecondary }}>
          Basades en evidència científica i metaanàlisis (Dunlosky et al., 2013)
        </p>
      </div>

      {/* Danger zone */}
      <div style={{ ...cardStyle, background: colors.dangerLight, border: `1px solid ${colors.danger}25` }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <AlertCircle size={20} color={colors.danger} style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <h4 style={{ margin: "0 0 6px 0", fontSize: 14, fontWeight: 700, color: colors.danger }}>Tècniques que NO funcionen (il·lusió de competència)</h4>
            <p style={{ margin: 0, fontSize: 13, color: colors.text, lineHeight: 1.6 }}>
              Rellegir apunts, subratllar amb retoladors i fer resums passius tenen impacte NUL demostrat.
              Quan rellegeixes, el cervell confon la familiaritat visual amb aprenentatge real, però la informació
              només està a la memòria a curt termini. Si no pots explicar-ho sense mirar els apunts, no ho saps.
            </p>
          </div>
        </div>
      </div>

      {/* Technique Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {techniques.map((tech) => {
          const isExpanded = expandedTechnique === tech.id;
          return (
            <div key={tech.id} style={{ ...cardStyle, cursor: "pointer", padding: 0, overflow: "hidden" }}
              onClick={() => setExpandedTechnique(isExpanded ? null : tech.id)}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 20px" }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 11, background: tech.bg,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <tech.icon size={22} color={tech.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: colors.text }}>{tech.name}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 5,
                      background: tech.rating === "Alta" ? colors.successLight : tech.rating === "Recuperació" ? "#E0E7FF" : colors.warningLight,
                      color: tech.rating === "Alta" ? colors.success : tech.rating === "Recuperació" ? "#6366F1" : colors.warning,
                    }}>
                      {tech.rating}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: colors.textSecondary, lineHeight: 1.5 }}>{tech.summary}</p>
                </div>
                <ChevronRight size={18} color={colors.textMuted}
                  style={{ transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
              </div>

              {isExpanded && (
                <div style={{ padding: "0 20px 20px", borderTop: `1px solid ${colors.borderLight}` }}
                  onClick={(e) => e.stopPropagation()}>
                  <div style={{ paddingTop: 18 }}>
                    <h4 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 700, color: colors.text }}>Com aplicar-ho pas a pas:</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {tech.steps.map((step, i) => (
                        <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                          <div style={{
                            width: 24, height: 24, borderRadius: 7, background: tech.bg,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 12, fontWeight: 700, color: tech.color, flexShrink: 0,
                          }}>
                            {i + 1}
                          </div>
                          <span style={{ fontSize: 13, color: colors.text, lineHeight: 1.5, paddingTop: 2 }}>{step}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{
                      marginTop: 16, padding: "14px 16px", borderRadius: 10,
                      background: tech.bg, border: `1px solid ${tech.color}20`,
                    }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <Brain size={16} color={tech.color} style={{ marginTop: 2, flexShrink: 0 }} />
                        <div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: tech.color }}>Base científica</span>
                          <p style={{ margin: "4px 0 0", fontSize: 12, color: colors.textSecondary, lineHeight: 1.6 }}>{tech.science}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Protocol Summary */}
      <div style={{ ...cardStyle, background: `linear-gradient(135deg, ${colors.accentLight}, ${colors.purpleLight})`, border: "none" }}>
        <h3 style={{ margin: "0 0 14px 0", fontSize: 16, fontWeight: 800, color: colors.text }}>Protocol Mestre: Ordre recomanat</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { phase: "Fase I", text: "Entorn: aïlla't, mòbil fora, Deep Work mode activat", icon: Zap },
            { phase: "Fase II", text: "Comprensió: Interrogació Elaborativa + Tècnica Feynman (NO rellegir!)", icon: Lightbulb },
            { phase: "Fase III", text: "Memorització: Recuperació Activa × 3 encerts + Repetició Espaïada", icon: Brain },
            { phase: "Fase IV", text: "Transferència: Pràctica Intercalada (barreja problemes sense apunts)", icon: Layers },
            { phase: "Fase V", text: "Recuperació: NSDR entre sessions + 7-9h son + zero pantalles al descans", icon: Moon },
          ].map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 14px", background: "rgba(255,255,255,0.6)", borderRadius: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(255,255,255,0.8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p.icon size={18} color={colors.accent} />
              </div>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: colors.accent }}>{p.phase}</span>
                <p style={{ margin: "2px 0 0", fontSize: 13, color: colors.text }}>{p.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ─── MAIN LAYOUT ───
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: colors.bg, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* Sidebar */}
      <div style={{
        width: 240, background: colors.surface, borderRight: `1px solid ${colors.border}`,
        padding: "24px 14px", display: "flex", flexDirection: "column", gap: 6, flexShrink: 0,
      }}>
        <div style={{ padding: "0 12px 20px", borderBottom: `1px solid ${colors.borderLight}`, marginBottom: 10 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: colors.text, letterSpacing: -0.5 }}>StudyFlow</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: colors.textMuted }}>El teu assistent d'estudi</p>
        </div>

        {[
          { id: "dashboard", icon: BarChart3, label: "Dashboard" },
          { id: "timer", icon: Timer, label: "Timer" },
          { id: "exams", icon: Calendar, label: "Exàmens" },
          { id: "techniques", icon: BookOpen, label: "Tècniques" },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={tabStyle(tab.id)}>
            <tab.icon size={18} /> {tab.label}
          </button>
        ))}

        {/* Sidebar stats */}
        <div style={{ marginTop: "auto", padding: "16px 12px", borderTop: `1px solid ${colors.borderLight}` }}>
          <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 10 }}>Resum d'avui</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: colors.textSecondary }}>Sessions</span>
              <span style={{ fontWeight: 700, color: colors.text }}>{todaySessions}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: colors.textSecondary }}>Minuts</span>
              <span style={{ fontWeight: 700, color: colors.text }}>{totalStudyMin}m</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: colors.textSecondary }}>Tasques</span>
              <span style={{ fontWeight: 700, color: colors.text }}>
                {todayTasks.filter(t => completedTasks.has(t.id)).length}/{todayTasks.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: "28px 36px", maxWidth: 960, overflowY: "auto" }}>
        {activeTab === "dashboard" && renderDashboard()}
        {activeTab === "timer" && renderTimer()}
        {activeTab === "exams" && renderExams()}
        {activeTab === "techniques" && renderTechniques()}
      </div>
    </div>
  );
}