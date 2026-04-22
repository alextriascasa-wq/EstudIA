# ConvIA — AI Conversation Partner

**Date:** 2026-04-22
**Feature:** ConvIA — voice conversation practice inside the Languages module
**Status:** Design approved, pending implementation

---

## Context

The Languages module currently does vocabulary SRS only (word → translation → spaced repetition). The biggest gap in language learning apps is **speaking practice** — users can memorise vocab but never practise producing language under real conversational pressure. ConvIA adds a "Conversa" tab to the existing Languages route: preset scenario conversations with an AI character, inline grammar/vocabulary corrections, and automatic feeding of errors back into the SRS deck.

---

## Decisions Made

| Question | Decision |
|---|---|
| Placement | New tab inside `/languages` — existing SRS unchanged |
| Correction style | Inline highlights on user transcript, tap to expand |
| Conversation structure | Scenario library (8 presets), AI plays a character |
| SRS integration | Errors auto-queue as new LangCards in the active deck |
| Architecture | Single-call JSON envelope per turn (Approach A) |

---

## Scenarios (8 presets)

| ID | Emoji | Title (ca) | AI character |
|---|---|---|---|
| `cafe` | ☕ | Al cafè / restaurant | Cambrer/a |
| `shop` | 🛒 | A la botiga | Dependent/a |
| `doctor` | 🏥 | Al metge | Metge/essa |
| `job` | 💼 | Entrevista de feina | Entrevistador/a |
| `hotel` | 🏨 | Check-in a l'hotel | Recepcionista |
| `phone` | 📞 | Trucada telefònica | Interlocutor/a |
| `debate` | 🎬 | Debat sobre una pel·lícula | Crític/a |
| `directions` | 🗺️ | Demanar direccions | Vianant |

Difficulty: `cafe`, `shop`, `directions` → easy · `hotel`, `phone`, `debate` → medium · `doctor`, `job` → hard

---

## Types (`src/types/index.ts`)

```typescript
export interface Scenario {
  id: string;
  emoji: string;
  titleKey: string;           // i18n key
  character: string;          // e.g. 'barista'
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface ConvCorrection {
  original: string;
  corrected: string;
  explanation: string;
  type: 'grammar' | 'vocabulary' | 'fluency';
}

export interface ConvMessage {
  role: 'user' | 'ai';
  text: string;
  corrections: ConvCorrection[];   // populated only for 'user' messages
}

export interface ConvSession {
  id: string;
  langDeckId: string;              // links to existing LangDeck
  scenarioId: string;
  language: string;                // e.g. 'en', 'fr'
  messages: ConvMessage[];
  fluencyScore: number;            // 0–100, updated each turn
  newCards: number;                // vocab cards queued this session
  startedAt: string;               // ISO date string
  endedAt: string | null;
}
```

---

## Store (`src/store/useAppStore.ts`)

Add to `AppState`:
```typescript
convSessions: ConvSession[];
```

Add actions:
```typescript
startConvSession: (langDeckId: string, scenarioId: string) => string; // returns session id
addConvMessage: (sessionId: string, message: ConvMessage) => void;
endConvSession: (sessionId: string, fluencyScore: number) => void;
queueConvCards: (sessionId: string, cards: Pick<LangCard, 'word' | 'translation' | 'example'>[]) => void;
```

`queueConvCards` appends to the deck's `cards` array via `patch({ langDecks: [...] })` — same pattern as manual card addition.

---

## Worker Endpoint (`worker/src/index.ts`)

### `POST /converse`

**Request:**
```typescript
{
  language: string;          // e.g. 'en'
  scenario: {
    id: string;
    character: string;       // e.g. 'barista'
    title: string;           // scenario title in target language
  };
  messages: { role: 'user' | 'ai'; text: string }[];
  latestUserSpeech: string;
  targetVocab: string[];     // words from active LangDeck (top 20 by due date)
}
```

**Response:**
```typescript
{
  reply: string;
  corrections: ConvCorrection[];
  newVocabCards: { word: string; translation: string; example: string }[];
  fluencyScore: number;      // 0–100
}
```

**Gemini system prompt (English, translated to target lang in prompt):**
```
You are {character} in a {scenario} scenario. Speak only in {language}.
Keep replies short (1-3 sentences) — natural conversation pace.
After each user turn, also return a JSON block (hidden from conversation) with:
- corrections: grammar/vocabulary issues in what the user just said
- newVocabCards: words the user got wrong or struggled with that they should study
- fluencyScore: 0-100 estimate of their current fluency this session

Format: reply first (plain text), then ---JSON--- delimiter, then the JSON object.
Never break character. Never explain corrections inside your reply — only in the JSON block.
If targetVocab words appear incorrectly, flag them in corrections.
```

Worker parses on `---JSON---` split: first part is `reply`, second is JSON-parsed for corrections/cards/score.

**Rate limiting:** shares existing 50 req/day per IP counter.

---

## Files

### New files

| File | Purpose |
|---|---|
| `src/features/languages/ConvIA.tsx` | Main conversation screen (messages, voice input, corrections) |
| `src/features/languages/ScenarioGrid.tsx` | Scenario picker — 8 cards with emoji, title, difficulty badge |
| `src/features/languages/ConvSummary.tsx` | End-of-session: fluency %, corrections list, "Add X cards to deck?" CTA |
| `src/lib/conviaAI.ts` | `callConverse(payload) → Promise<ConvResponse>` — mirrors feynmanAI.ts pattern |

### Modified files

| File | Change |
|---|---|
| `src/features/languages/Languages.tsx` | Add "Conversa" tab; render `<ScenarioGrid>` / `<ConvIA>` based on state |
| `src/store/useAppStore.ts` | Add `convSessions`, 4 new actions |
| `src/types/index.ts` | Add `Scenario`, `ConvCorrection`, `ConvMessage`, `ConvSession` |
| `worker/src/index.ts` | Add `/converse` route with Gemini call + reply/JSON split parser |
| `src/i18n/locales/ca.json` | New keys under `conv.*` namespace |
| `src/i18n/locales/en.json` | Same keys in English |
| `src/i18n/locales/es.json` | Same keys in Spanish |

---

## UI Flow

```
Languages
├── [Vocabulari tab] — unchanged
└── [Conversa tab]
      └── No active session?
            └── ScenarioGrid — pick scenario
                  └── ConvIA (active session)
                        ├── Header: scenario title + fluency score chip + end button
                        ├── Message list (scrollable)
                        │     ├── AI bubble (right, amber-tinted border)
                        │     └── User bubble (left, with correction underlines)
                        │           └── Tap underline → CorrectionPopover
                        │                 ├── original → corrected
                        │                 ├── explanation
                        │                 └── "Add to deck" button
                        └── Input bar
                              ├── Text input (fallback)
                              └── Mic button (hold to record, release to send)
                                    └── Transcribed text preview while recording
      └── Session ended?
            └── ConvSummary
                  ├── Fluency score (animated ring)
                  ├── Corrections list
                  ├── "Add X vocab cards to deck?" confirmation
                  └── "Torna a jugar" / "Nova conversa" buttons
```

---

## XP

- **5 XP** on session complete (≥ 5 user turns)
- **2 XP per card** added to SRS deck from corrections (cap: 10 XP/session from cards)

---

## Error Handling

| Error | Handling |
|---|---|
| Voice transcription empty | Show toast "No s'ha detectat veu", don't send |
| Network error on `/converse` | Show retry button inline in chat, keep session alive |
| Rate limit hit (50/day) | Toast + disable mic + show remaining resets at midnight |
| Worker parse fails (bad JSON) | Fall back: use full response as `reply`, `corrections: []`, `newVocabCards: []` |
| No lang deck selected | ScenarioGrid disabled with message "Selecciona un deck primer" |

---

## i18n Keys (new, `conv.*` namespace)

```json
{
  "conv": {
    "tab": "Conversa",
    "pickScenario": "Tria un escenari",
    "difficulty": { "easy": "Fàcil", "medium": "Mitjà", "hard": "Difícil" },
    "fluency": "Fluïdesa",
    "endSession": "Acabar",
    "holdToSpeak": "Mantén per parlar",
    "addToDecCta": "Afegir {{n}} targetes al deck",
    "sessionDone": "Sessió completada",
    "newConv": "Nova conversa",
    "correctionTypes": {
      "grammar": "Gramàtica",
      "vocabulary": "Vocabulari",
      "fluency": "Fluïdesa"
    }
  }
}
```

---

## Out of Scope (this iteration)

- Pronunciation scoring (requires audio analysis API)
- Custom scenario creation by user
- Conversation history browser (only last session retained in UI; all sessions stored in `convSessions` for stats)
- Multiplayer / shared conversations
