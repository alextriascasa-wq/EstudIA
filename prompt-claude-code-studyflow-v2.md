# Prompt per Claude Code — Migració i millora de StudyFlow Pro

## CONTEXT DEL PROJECTE

Tinc una webapp d'estudi anomenada **StudyFlow Pro** que he construït iterativament. Et passo tres fitxers de referència que has de llegir abans de res:

- `StudyFlow-Pro.html` — **VERSIÓ DEFINITIVA** (~1450 línies). És la versió més recent i completa, i la font de veritat per a funcionalitat, UI i paleta. És on has de basar la migració.
- `index.html` — versió anterior (StudyFlow v1, sense gamificació). **No la facis servir com a referència per UI ni funcions**; serveix només per entendre l'evolució.
- `study-app.jsx` — intent previ de migració a React amb `lucide-react`. Pots reutilitzar patrons de components que vegis útils, però el disseny visual i la llista de funcions han de coincidir amb la versió Pro, no amb aquesta.

L'app és en **català**. Conté 11 seccions al sidebar: Dashboard, Timer (Pomodoro/Deep Work 90/Deep Work 120), Flashcards amb "Regla del 3" + SRS, Tutor Feynman, Mode Caos (pràctica intercalada), **Idiomes** (decks word/translation/example), **Sound Mixer** (6 sorolls generats amb Web Audio API), Recuperació (NSDR + respiració 4-4-6 + estiraments), Exàmens (genera pla SRS automàtic), **Estadístiques** (assoliments + heatmap + logs diaris), i Tècniques d'Estudi.

A més té: sistema de **gamificació** (XP, 50 nivells amb taula `XP_TABLE`, 16 assoliments), **toasts** i **XP popups**, **tema clar/fosc**, export/import JSON, sons de notificació amb Web Audio API, detector de jerga tècnica al Feynman, i efecte Zeigarnik (nota persistent al Dashboard).

Les dades es guarden en localStorage amb la clau `sfpro`. El codi actual és HTML+CSS+JS vanilla en un sol fitxer.

L'objectiu és transformar-la en una aplicació moderna, gratuïta, instal·lable (PWA) i amb IA real, **sense perdre cap funcionalitat actual i mantenint la mateixa estètica**.

---

## STACK TÈCNIC OBJECTIU

- **Framework:** Vite + React 18 + TypeScript (mode estricte)
- **Estils:** Tailwind CSS v4 + CSS variables per preservar el sistema de temes exacte de StudyFlow Pro (paleta `--a` indigo `#6366f1`, `--p` violet `#8b5cf6`, `--r` rose `#f43f5e`, radis `--radius 16px`, ombres, gradient animat del logo, glassmorphism amb `backdrop-filter`, etc.)
- **Estat:** Zustand amb middleware `persist` adaptat a IndexedDB via `idb-keyval`
- **PWA:** `vite-plugin-pwa` amb Workbox (offline-first, instal·lable al iPhone 17 Pro)
- **Router:** React Router v6
- **IA real:** Cloudflare Workers com a proxy cap a **Google Gemini API** (model `gemini-2.5-flash` que té free tier real i generós, ~1.500 peticions/dia gratis). **NO Anthropic**, per mantenir cost zero.
- **Icones:** Lucide React (substituir els SVG inline del sidebar i mantenir emojis on l'original els fa servir)
- **Animacions:** Framer Motion (per transicions, flip flashcards, XP popups, toasts)
- **Testing:** Vitest + React Testing Library + Playwright (E2E mínim)
- **Deploy client:** Cloudflare Pages (gratis)
- **Deploy worker:** Cloudflare Workers (100.000 req/dia gratis)

---

## PRINCIPIS INNEGOCIABLES

1. **No trenquis cap funcionalitat de la versió Pro.** Cada fase ha de ser verificable per separat i mantenir paritat funcional amb l'original abans de continuar.
2. **Migració automàtica de dades.** Detecta la clau `sfpro` de localStorage i importa-la a IndexedDB al primer arrencament. També detecta la clau `sf2` antiga (v1) per si l'usuari encara la té, i fes merge intel·ligent. Abans de substituir, mostra un toast: "Dades importades correctament ✓".
3. **Tot en català.** UI, comentaris rellevants, missatges d'error visibles per l'usuari. Noms de variables i funcions en anglès.
4. **Paritat visual estricta amb StudyFlow Pro.** Colors, radis, ombres, espaiats, animacions del logo, glassmorphism, toasts, XP popups → tot igual. No "modernitzis" l'estètica sense permís.
5. **Offline-first.** Tot funciona sense connexió excepte els endpoints d'IA real (Feynman amb Gemini, generació de flashcards, Mètode Examen), que tenen fallback al sistema de regex actual.
6. **Type safety total.** Zero `any` sense justificació en comentari. Tipa tots els objectes del store (Deck, Card, LangDeck, LangCard, Exam, ChaosProblem, Achievement, DailyLog, HeatmapEntry, etc.).
7. **Commits atòmics** amb missatges estil Conventional Commits: `feat(timer): add Deep Work 120 mode`, `refactor(store): migrate to zustand`, `fix(srs): respect rule of 3 reset on failure`.
8. **Pregunta abans d'inventar.** Si detectes ambigüitat, escriu-me abans de decidir arquitectura. Si trobes bugs al codi original (ratxa mal calculada, log diari no es popula, etc.), comenta'ls abans de "corregir-los" silenciosament.

---

## FASE 1 — SETUP I REFACTOR BASE

**Objectiu:** passar de `StudyFlow-Pro.html` (1 fitxer) a projecte Vite+React+TS modular, sense afegir funcions noves i sense canvis visuals.

### Tasques

1. Inicialitza el projecte: `npm create vite@latest studyflow -- --template react-ts`. Instal·la: `tailwindcss@next`, `zustand`, `idb-keyval`, `react-router-dom`, `lucide-react`, `framer-motion`, `clsx`.
2. Configura Tailwind v4, ESLint estricte, Prettier, path aliases (`@/components`, `@/lib`, `@/store`, `@/features`, `@/types`, `@/hooks`).
3. Estructura de carpetes:
   ```
   src/
     components/
       ui/              (Button, Input, Card, Badge, Toast, XPPopup)
       layout/          (Sidebar, MainLayout)
     features/
       dashboard/       (Dashboard.tsx, ZeigarnikNote.tsx, WeeklyChart.tsx, TodayPlan.tsx)
       timer/           (Timer.tsx + hook useTimer)
       flashcards/      (Flashcards.tsx, CardReview.tsx, DeckList.tsx)
       feynman/         (Feynman.tsx, feynmanFallback.ts amb regex actual)
       chaos/           (Chaos.tsx)
       languages/       (Languages.tsx, LangCardReview.tsx)
       sounds/          (SoundMixer.tsx + hook useWebAudioNoise)
       recovery/        (Recovery.tsx, BreathingOrb.tsx, Stretches.tsx)
       exams/           (Exams.tsx, StudyPlan.tsx)
       stats/           (Stats.tsx, AchievementGrid.tsx, Heatmap.tsx)
       techniques/      (Techniques.tsx)
     lib/
       storage.ts       (wrapper IndexedDB amb idb-keyval)
       migration.ts     (detecta sfpro / sf2 i importa)
       utils.ts         (fmtTime, fmtDate, daysUntil, uid, xpForLevel, xpInLevel)
       xp.ts            (XP_TABLE, ACHIEVEMENTS, checkAchievements)
       sounds.ts        (createNoise per Web Audio API: rain, cafe, fire, forest, waves, brown)
       notification.ts  (playNotifSound amb OscillatorNode)
     store/
       useStore.ts      (Zustand: tot l'estat i accions)
     types/
       index.ts
     hooks/
       useDarkMode.ts
       useTimer.ts
       useBreathing.ts
     App.tsx
     main.tsx
   ```
4. Migra el sistema de temes clar/fosc. Les CSS variables van a `src/styles/theme.css`; el toggle viu al `useDarkMode` amb preferència persistida a localStorage (clau `sfpro-dark`, per compatibilitat).
5. Crea els tipus TypeScript a partir de l'objecte `defaults` del fitxer Pro. Exporta també els tipus `Tab` i `Mode`.
6. Implementa el store Zustand amb **totes** les accions actuals: `addXP`, `addDeck`, `addCard`, `gradeCard` (amb la Regla del 3 exacta: 3 encerts per sessió, reset a 0 si falla, interval `*2.2` fins màxim 90 dies), `deleteDeck`, `deleteCard`, `startReview`, `addLangDeck`, `addLangCard`, `gradeLangCard`, `addChaosProblem`, `startChaos`, `nextChaosProblem`, `chaosGrade`, `addExam`, `removeExam`, `genStudyTasks`, `toggleTask`, `saveZeig`, `setSoundVolume`, `checkAchievements`, `addToDailyLog`.
7. Migració automàtica: al primer arrencament, llegeix `localStorage.getItem("sfpro")`, valida amb un schema mínim (comprova `version` o presència de camps clau), fusiona amb `defaults`, guarda a IndexedDB, marca com a migrat amb un flag. Suporta també la clau `sf2` antiga com a fallback.
8. Refactoritza cada secció a un component separat **respectant pixel-to-pixel la UI del Pro**: mateixos radis, mateixos gradients, mateixes animacions (`gradShift`, `pulse`, `fadeIn`).
9. React Router: ruta arrel mostra Dashboard, `/timer`, `/cards`, `/feynman`, `/chaos`, `/languages`, `/sounds`, `/recovery`, `/exams`, `/stats`, `/techniques`. La URL s'ha de mantenir sincronitzada amb el tab actiu.
10. El Toast manager i l'XP popup es converteixen en components globals amb `createPortal`. La cua de toasts es gestiona al store.
11. Testeig manual: comprova que tot és idèntic al Pro i que una exportació JSON del Pro original es pot importar al nou projecte sense pèrdues.

**Entregable:** l'app funciona idènticament a StudyFlow Pro, amb codi modular, tipat i amb dades migrades automàticament.

---

## FASE 2 — PWA I OFFLINE

**Objectiu:** fer l'app instal·lable al iPhone 17 Pro i funcional sense connexió.

### Tasques

1. Afegeix `vite-plugin-pwa` amb estratègia `registerType: 'autoUpdate'`.
2. Genera `manifest.webmanifest` amb:
   - `name`: "StudyFlow Pro"
   - `short_name`: "StudyFlow"
   - `theme_color`: `#6366f1`
   - `background_color`: `#0b0f1a` (dark) o `#f8f9fb` (light), a decidir
   - `display`: "standalone"
   - Icones 192, 512, 512-maskable generades a partir del gradient del logo (indigo→violet→rose). Usa una llibreria com `pwa-asset-generator` o genera-les amb un script a `scripts/gen-icons.mjs`.
3. Configura Workbox:
   - Precache de tots els assets estàtics.
   - Runtime cache per Google Fonts (`stale-while-revalidate`, 1 any).
   - Runtime cache per crides al Worker de Gemini (`network-first` amb timeout 3s i fallback al sistema de regex local).
4. Pantalla d'install personalitzada: captura `beforeinstallprompt`, mostra un banner discret al sidebar ("📲 Instal·la StudyFlow") i, si l'usuari és a iOS Safari (no dispara l'event), mostra instruccions manuals (Compartir → Afegir a pantalla d'inici).
5. Badge petit al sidebar que indica connexió: 🟢 Online / 🔴 Offline (usa `navigator.onLine` + events `online/offline`).
6. Audit Lighthouse: PWA 100, Performance ≥90, Accessibility ≥95, Best Practices ≥95. Adjunta captura al PR.
7. Documenta al `README.md` com instal·lar-la a iPhone.

**Entregable:** StudyFlow Pro instal·lable al iPhone, operativa sense xarxa, passa audit Lighthouse.

---

## FASE 3 — IA REAL AL TUTOR FEYNMAN (GOOGLE GEMINI, GRATIS)

**Objectiu:** substituir el sistema de regex del Feynman per crides reals a l'API de Google Gemini via Cloudflare Worker, mantenint cost zero.

### 3.1 — Cloudflare Worker (carpeta `worker/` separada del client)

1. `npm create cloudflare@latest worker-gemini` → tipus Worker, TypeScript.
2. Endpoint `POST /feynman` que rep `{ topic: string, messages: Array<{role: "user"|"model", parts: [{text: string}]}> }` i crida `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent` amb clau d'API.
3. System prompt (en català) que converteix Gemini en "nen de 5 anys curiós" i incorpora les regles del Feynman actual:
   - Si l'usuari fa servir jerga tècnica (llista `JARGON_PATTERNS` del codi Pro, ampliable), respon amb una alerta explícita d'"il·lusió de competència" i demana una explicació simple amb analogia.
   - Si la resposta és massa curta (<15 paraules), demana detalls: "com funciona pas a pas?", "per què passa?", "dona'm un exemple".
   - Si no hi ha analogia, demana-la explícitament ("posa'm un exemple del tipus 'és com quan...'").
   - Periòdicament (30-40% de les voltes) fa interrogació elaborativa: "i per què?", "com es diferencia de X?", "quina és l'excepció?".
   - Quan l'explicació és clara, simple i amb analogia, felicita l'usuari i marca el tema com a dominat.
4. Endpoint `POST /generate-cards` que rep `{ text: string, count: number, language: "ca" }` i retorna un JSON array `[{question, answer}]` en català, llest per insertar al deck.
5. Endpoint `POST /exam-generate` per a la Fase 4.4 (més avall).
6. Endpoint `POST /exam-correct` per corregir els exàmens (Fase 4.4).
7. Endpoint `GET /health`.
8. CORS: permet `https://<el-teu-domini-cloudflare-pages>.pages.dev` i `http://localhost:5173`.
9. Rate limiting amb Cloudflare KV: màxim **30 peticions/dia per IP** (quota conservadora, encara tenim ~1.500 gratis al pla free de Gemini). Retorna 429 amb `Retry-After` quan s'excedeix.
10. Clau d'API com a secret: `wrangler secret put GEMINI_API_KEY`.
11. Logging mínim (comptador diari) sense guardar continguts de les converses.

### 3.2 — Integració al client

1. Variables d'entorn a `.env.example`: `VITE_WORKER_URL`.
2. `lib/feynmanAI.ts` amb `askFeynman(topic, messages, signal?)` → crida amb `AbortController` i timeout 8s.
3. Fallback automàtic al sistema de regex (`feynmanFallback.ts`) si:
   - `navigator.onLine === false`
   - Status HTTP ≠ 2xx
   - Timeout excedit
   - Rate limit (429)
4. Indicador visual permanent al capçalera del Feynman:
   - `🤖 IA real` (verd) quan funciona Gemini
   - `⚙️ Mode bàsic` (groc) quan s'ha activat el fallback (amb tooltip explicant per què)
5. Mostra peticions restants avui (obtingudes del header `X-RateLimit-Remaining` retornat pel Worker).
6. Els missatges es guarden a `feynmanHistory` al store amb `{timestamp, topic, role, text, source: "ai" | "fallback"}`.

**Entregable:** Tutor Feynman parla amb Gemini, manté el to de "nen de 5 anys curiós" en català, i cau net al mode regex quan cal.

---

## FASE 4 — FUNCIONALITATS NOVES

Implementa en aquest ordre, cada subfase verificable per separat. **No faig la sincronització cloud, saltem-la directament.**

### 4.1 — Importació/exportació Anki (.apkg)

1. Llibreria `sql.js` carregada dinàmicament (lazy, només quan obre el diàleg).
2. Botó "Importar Anki" al panell de Flashcards: llegeix un `.apkg`, descomprimeix amb `JSZip`, extrau `collection.anki2` (SQLite), llegeix la taula `notes` (camps separats per `\x1f`), crea un deck nou al store amb el nom del fitxer.
3. Botó "Exportar Anki" per deck: genera un `.apkg` amb el mateix format, respectant Front/Back mínim.
4. Test amb un `.apkg` real (crea'n un de prova amb 5 targetes i verifica que fa round-trip).

### 4.2 — Generació de flashcards amb IA

1. Al modal "Nou deck", afegeix tab "Generar des de text".
2. L'usuari enganxa fins a 2000 caràcters d'apunts + tria 5/10/15/20 targetes.
3. Crida a `/generate-cards` del Worker.
4. Mostra les targetes proposades amb checkboxes (l'usuari pot descartar abans de confirmar).
5. Al confirmar, s'afegeixen al deck amb `strength: 0, interval: 1, nextReview: avui`.

### 4.3 — Mètode Examen (segons les memòries de l'usuari)

> Recordatori: a les memòries es defineix que, quan l'usuari diu "mètode examen", Claude crea 2 exàmens complets, l'usuari els contesta i Claude corregeix amb feedback. Reproduïm aquest flux dins l'app.

1. Nova secció "Mètode Examen" al sidebar (icona graduació).
2. L'usuari tria: assignatura (pot venir dels exàmens ja creats), tema lliure, nombre de preguntes (10/20/30), dificultat.
3. Crida a `/exam-generate` del Worker → Gemini retorna 2 exàmens amb format `{titol, preguntes: [{enunciat, tipus: "oberta"|"tipus_test", opcions?, resposta_model}]}`.
4. Interfície d'examen: timer opcional, navegació entre preguntes, guardat automàtic de les respostes.
5. Quan l'usuari envia, crida a `/exam-correct` amb les seves respostes; Gemini retorna correcció per pregunta amb feedback detallat i nota final sobre 10.
6. Guarda a `examHistory` amb `{date, subject, topic, score, errors: [{questionId, userAnswer, correctAnswer, feedback}]}`.
7. Vista d'històric: llista d'exàmens passats, nota, clic per revisar els errors. Calcula "errors recurrents" agrupant conceptes i els suggereix per a pràctica dirigida al Mode Caos.

### 4.4 — Polit del sistema de gamificació

1. Afegeix **nous assoliments** relacionats amb les funcions noves:
   - `exam_10`: Completa 10 exàmens amb Mètode Examen
   - `perfect_exam`: Treu un 10 a un Mètode Examen
   - `ai_feynman`: Completa 5 sessions de Feynman amb IA real
   - `anki_import`: Importa el primer deck d'Anki
2. XP per les noves accions (exam correcte +20, flashcard generada +1, etc.).
3. Vista d'`StreakCalendar` al Stats: heatmap de 90 dies estil GitHub amb el `S.heatmap` existent, amb tooltips.

### 4.5 — Widgets i notificacions del navegador

1. Notificacions del navegador (`Notification API`) quan acaba un Pomodoro o Deep Work (si l'usuari dóna permís).
2. Badge API al icona de la PWA amb `navigator.setAppBadge(N)` on N = tasques pendents avui.
3. Opcional: quick actions al manifest (`shortcuts`) per saltar directament a Timer o Flashcards des de l'icona de la PWA.

---

## FASE 5 — QUALITAT I POLIMENT

1. **Tests unitaris (Vitest)** per lògica crítica del store:
   - Regla del 3 (3 encerts consecutius dins sessió → SRS; fallada → reset a 0).
   - Càlcul de ratxa amb salts de dies.
   - Reset setmanal del gràfic els dilluns.
   - `checkAchievements` no dispara el mateix assoliment dues vegades.
   - `genStudyTasks` respecta les intervals segons dificultat.
2. **Tests E2E (Playwright)** per tres fluxos:
   - Crear deck → afegir 3 flashcards → revisió amb Regla del 3.
   - Afegir examen → comprovar que apareix al pla d'estudi del Dashboard.
   - Completar un Pomodoro → verificar XP i sessió registrada.
3. **Accessibilitat:** audit amb `@axe-core/react` en mode dev, navegació per teclat a totes les seccions, `aria-label` als botons d'icona (`bi`).
4. **Animacions** amb Framer Motion: flip de flashcard, entrada de toasts, aparició d'XP popup, transicions entre seccions.
5. **Code splitting** amb `React.lazy` per secció. Budget: **<300 KB gzipped** al bundle inicial; la resta es carrega sota demanda.
6. **i18n preparat** amb `react-i18next`. Només català actiu ara, però els strings extretos a `src/locales/ca.json`.
7. **Documentació final:**
   - `README.md` amb screenshots, stack, URL de la demo, com instal·lar PWA, com deployar.
   - `ARCHITECTURE.md` explicant capes (UI / features / store / lib / worker) i decisions clau.
   - `CHANGELOG.md` generat a partir dels commits.

---

## DESPLEGAMENT FINAL

1. Repo Git (públic o privat, tu decideixes).
2. GitHub Actions:
   - Workflow `ci.yml` → lint + typecheck + test a cada PR.
   - Workflow `deploy.yml` → deploy a Cloudflare Pages a cada push a `main`.
   - Workflow `worker-deploy.yml` → deploy del Worker via `wrangler deploy`.
3. Worker a `studyflow-ai.<subdomini>.workers.dev`.
4. Domini custom opcional (si no, `<projecte>.pages.dev` ja funciona).

---

## COM VULL QUE TREBALLIS

- **Una fase cada cop.** No comencis la següent fins que jo confirmi que l'anterior funciona al iPhone.
- **Abans de cada fase**, mostra'm el pla concret (quins fitxers crearàs/tocaràs) i espera la meva confirmació per començar.
- **Després de cada fase**, fes un resum de canvis + què he de provar jo + quin és el pas següent.
- Si una decisió tècnica té tradeoffs, llista'ls breument i recomana (no preguntis per detalls trivials; sí que preguntes per arquitectura real).
- Si detectes bugs del codi original abans de migrar-los, anota'ls al PR (NO els "corregeixis" silenciosament). Exemples possibles a revisar: `dailyLog` sembla que no es popula enlloc; `checkAchievements` fa `save()` després d'afegir XP, però `addXP` també fa `save()` (pot haver-hi doble escriptura); la ratxa pot comptar malament si l'usuari obre l'app just abans de mitjanit.
- Comentaris al codi en català quan siguin rellevants; noms de variables i funcions en anglès.
- Prioritza llegibilitat sobre enginyeria excessiva. És una app personal, no un SaaS.

---

## COMENÇA AQUÍ

Llegeix primer els tres fitxers adjunts (`StudyFlow-Pro.html`, `index.html`, `study-app.jsx`). Després:

1. Resumeix-me en 10-15 línies què has entès que és l'app, quines són les funcions úniques de la versió Pro respecte la v1, i quins fragments del `.jsx` t'han semblat aprofitables.
2. Proposa el pla exacte de la Fase 1 (llista de fitxers i ordre d'implementació).
3. Espera la meva confirmació abans de tocar una sola línia de codi.
