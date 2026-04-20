# EstudIA v2

Port modern, installable i offline-first de **EstudIA** (la versió HTML monolítica d'1 fitxer) a una PWA feta amb Vite + React 18 + TypeScript strict.

Tota la UI és en català. Les variables, funcions i fitxers del codi font són en anglès.

## Fase 1 — Paritat estricta ✅

Aquesta fase reprodueix 1:1 les 11 seccions del Pro, sense afegir ni treure funcionalitat:

- Dashboard (nivell, XP, 4 targetes d'estadístiques, pla d'avui, pròxims exàmens, heatmap de 90 dies, activitat setmanal, retenció, assoliments, Zeigarnik, consell diari)
- Temporitzador (3 modes: Pomodoro 25/5/15, Deep Work 52/17, Ultra 90/27)
- Flashcards (Regla del 3 + SRS, `interval *= 2.2`, max 90 dies)
- Feynman (tutor simulat amb 32 patrons de jerga)
- Mode Caos (pràctica intercalada)
- Idiomes (SRS més suau: `interval *= 2`, max 60 dies)
- Mixer de sons (6 sorolls procedurals via Web Audio API)
- Recuperació (NSDR + respiració 4-4-6 de 8 cicles + estiraments)
- Exàmens (tasques SRS automàtiques segons dificultat)
- Estadístiques (últims 7 dies, 16 assoliments, globals)
- Tècniques (5 tècniques científiques expandibles)

## Requisits

- **Node.js 20+** i npm (comprova amb `node --version`)
- Navegador modern amb Web Audio API i IndexedDB

Si no tens Node instal·lat a Windows: https://nodejs.org (LTS, instal·lador `.msi`).

## Primers passos

```bash
npm install
npm run dev        # obre http://localhost:5173
```

Altres comandes:

```bash
npm run build       # compila TypeScript i genera el bundle de producció
npm run preview     # serveix el build localment
npm run typecheck   # tsc --noEmit
npm run lint
npm run format
```

## Migració automàtica des del Pro

La primera vegada que es carrega, l'aplicació busca la clau `sfpro` de
`localStorage` (la que fa servir el monòlit HTML) i fusiona el seu contingut
sobre els valors per defecte. **No s'esborra** la clau antiga per permetre
tornar enrere si cal.

L'estat nou es guarda a IndexedDB (`idb-keyval`) sota la clau
`studyflow-state-v2`. El tema (clar/fosc) també migra des de `sfpro-dark`.

## Estructura

```
src/
├── components/       UI primitives (Toast, XPPopup) i Sidebar
├── features/         Una carpeta per cada secció
├── hooks/            useInterval, useTheme
├── lib/              Lògica pura: date, xp, srs, exams, feynman, audio…
├── store/            Zustand + persistència idb-keyval + migració
├── styles/           index.css amb totes les variables del Pro
└── types/            Tipus estrictes que reflecteixen la forma de `sfpro`
```

## Fitxers de referència

- `StudyFlow-Pro.html` — monòlit v1 conservat per paritat visual
- `reference-v1.html` — versió anterior (renombrada per no col·lidir amb l'entrada de Vite)

## Fases pendents (no incloses en aquest commit)

- **Fase 2** — PWA (vite-plugin-pwa), router navegable, i18n (`react-i18next`)
- **Fase 3** — Proxy a Gemini via Cloudflare Workers per Feynman real
- **Fase 4** — Tests (Vitest + Playwright), mètriques, Sentry
- **Fase 5** — Deploy a Cloudflare Pages + Workers
