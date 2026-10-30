# ¡NO, CARAJO! — Academia de Enfermería

This is an educational game for nursing students. **El Jefe de Guardia**, an animated virtual instructor, asks questions aloud, listens to answers through the microphone, grades them, explains every mistake and reacts with Argentine humour. The humour is always aimed at the mistake, never at the person.

> **Pedagogical principle:** students can laugh at their mistake, but they never finish a question without understanding why they got it wrong.
>
> This is an educational simulator. It does not replace real clinical supervision, medical orders or institutional protocols. Teaching staff must review the question bank against local regulations before institutional use.

---

## 1. What this version includes (functional prototype)

| Feature | Status |
|---|---|
| Welcome screen, game mode, module (12), personality, difficulty, number of questions, spoken/written mode | ✅ |
| Animated Jefe de Guardia (original SVG): idle, talking, celebration, hand on forehead, surprise, alarm with siren, thinking | ✅ |
| Speech synthesis (prefers an `es-AR` voice) and speech recognition (`es-AR`), with a fallback to typing or buttons | ✅ |
| 36 starter questions: multiple choice, true/false, open answer, calculations and a progressive clinical case | ✅ |
| Game modes: **Duelo**, **Guardia** (progressive case), **Código rojo** (timed), **Examen final** (no hints or retries), **Revancha** (your mistakes, rephrased) | ✅ |
| 3 personalities; "sin filtro" requires 18+ confirmation and the teacher can turn it off | ✅ |
| Serious safety error: red alert, simulation stopped, risk explained, **mandatory recovery question** | ✅ |
| Correction with a hint and a second attempt before the explanation | ✅ |
| **Deterministic** dose and drip calculations (never done by AI), unit-error detection, reworded numbers in Revancha | ✅ |
| Open-question grading by key concepts and synonyms, tolerant of dictation errors | ✅ |
| XP that rewards reasoning, 6 levels, 10 badges, streaks, per-module stats, frequent mistakes, recommendations | ✅ |
| Teacher panel: bank, editor, CSV/Excel import, AI drafts with review, results, CSV/PDF export, spicy-language switch | ✅ (demo PIN, local storage) |
| **Demo with no external API** | ✅ |
| Optional AI (Claude) **from the server only**, with per-IP and daily limits | ✅ |
| Installable PWA with offline play using the local bank | ✅ |
| Original sound effects synthesised with Web Audio (no copyrighted files) | ✅ |

---

## 2. Folder structure

```
no-carajo/
├── public/
│   ├── manifest.webmanifest        # PWA
│   ├── sw.js                       # Service worker (offline)
│   └── icons/                      # Icons 192/512/maskable + SVG
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Fonts, metadata, PWA
│   │   ├── page.tsx                # Game
│   │   ├── globals.css             # Neon theme + character animations
│   │   ├── docente/page.tsx        # Teacher panel
│   │   └── api/ai/
│   │       ├── status/route.ts     # Is AI on? How many calls are left today?
│   │       ├── evaluate/route.ts   # AI grading of open answers
│   │       └── generate/route.ts   # Generates question drafts (teacher)
│   ├── components/
│   │   ├── Jefe.tsx                # Animated character
│   │   ├── Game.tsx                # Screen flow + top bar
│   │   ├── Setup.tsx               # Game options
│   │   ├── Play.tsx                # Game engine (questions, voice, timer, serious errors)
│   │   ├── Summary.tsx             # End-of-session summary
│   │   ├── Stats.tsx               # Student progress
│   │   └── PwaRegister.tsx
│   ├── data/
│   │   ├── modules.ts              # The 12 modules
│   │   └── questions.ts            # Official starter bank (editable)
│   └── lib/
│       ├── types.ts
│       ├── engine/
│       │   ├── calc.ts             # Deterministic calculation engine
│       │   ├── grade.ts            # Local grading (MC, T/F, open, calculation)
│       │   ├── text.ts             # Normalisation, spoken numbers, fuzzy matching
│       │   ├── session.ts          # Builds the session for each mode
│       │   └── *.test.ts           # Tests
│       ├── personality.ts          # Jefe's phrase banks (editorial rules)
│       ├── speech.ts               # TTS / STT with fallbacks
│       ├── sfx.ts                  # Original sounds (Web Audio)
│       ├── progress.ts             # XP, levels, badges, recommendations
│       ├── settings.ts             # Teacher settings and local bank
│       ├── csv.ts                  # CSV import/export (Excel-compatible)
│       ├── ai-client.ts            # Browser calls to /api/ai
│       └── server/                 # Server only (API key, limits)
├── supabase/schema.sql             # Phase 2: accounts, roles, RLS, group stats
├── .env.example
└── netlify.toml
```

---

## 3. Running it locally

Requirements: **Node.js 20 or later** (22 recommended).

```bash
cd no-carajo
npm install
cp .env.example .env.local     # optional: works without editing anything (DEMO mode)
npm run dev
```

Open <http://localhost:3000>. To test on your Android phone on the same Wi-Fi network:

```bash
npm run dev -- -H 0.0.0.0
# on the phone: http://<your-pc-ip>:3000
```

> The microphone and PWA installation need **HTTPS** (or `localhost`). On the phone over the local network they may be blocked. The deployed version on Vercel or Netlify already uses HTTPS.

Other commands:

```bash
npm test          # calculation, spoken-number and grading tests
npm run typecheck
npm run build && npm start   # production mode (enables the offline service worker)
```

**Teacher panel:** `/docente`, demo PIN `1234` (set with `NEXT_PUBLIC_DEMO_ADMIN_PIN`). This PIN is *not* real security; it is only for the prototype.

---

## 4. Turning on the real AI (optional)

1. Create an API key at <https://console.anthropic.com>.
2. In `.env.local` (locally) or in the hosting environment variables:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   AI_MODEL=claude-opus-5-5        # cheaper option: claude-haiku-5-5
   AI_DAILY_LIMIT=300
   AI_RATE_LIMIT_PER_IP=20
   ```
3. Restart. The top bar will show **IA ON** instead of **DEMO**.

How the AI is used:
- **Only from the server.** The key never reaches the browser.
- It grades the **reasoning** in open answers: partially correct answers, synonyms and dictation errors versus conceptual errors. It returns structured output: verdict, feedback, concepts found and missing, and a follow-up question.
- It generates **question drafts** in the teacher panel. They go into a **review queue** and only reach the official bank once a teacher approves them. You can paste validated reading material so the AI uses it as its main source.
- **It does not calculate doses.** Calculations are always solved by `engine/calc.ts`.
- If the AI fails, runs out of quota or is offline, grading falls back to the local engine automatically.
- Cost controls: per-IP limit, daily limit, cap on the length of the student's answer, low reasoning effort for grading, and AI used only for open questions.
- Server-side *fallback* is enabled (`fallbacks: "default"`). If the main model declines a request, the API retries automatically with a compatible model.

---

## 5. Deployment

### Option A — Vercel (recommended for Next.js)

1. Push the repository to GitHub.
2. At <https://vercel.com/new>, import the repo.
3. **Root Directory:** `no-carajo`. The framework is detected as Next.js automatically.
4. *Environment Variables* (optional): `ANTHROPIC_API_KEY`, `AI_MODEL`, `AI_DAILY_LIMIT`, `AI_RATE_LIMIT_PER_IP`, `NEXT_PUBLIC_DEMO_ADMIN_PIN`, `NEXT_PUBLIC_ALLOW_SPICY`.
5. Deploy. You get an HTTPS URL that can be installed as an app on Android ("Add to home screen" / "Install app").

### Option B — Netlify

1. At <https://app.netlify.com>, choose *Add new site → Import from Git*.
2. **Base directory:** `no-carajo`. The build command (`npm run build`) and publish directory (`.next`) come from `netlify.toml`. Netlify applies its Next.js runtime automatically, including the `/api` routes.
3. Add the same environment variables under *Site configuration → Environment variables*.
4. Deploy.

> The rate limits in this version are kept in memory for each server instance. On serverless platforms they are approximate. For strict control, move the counter to the `ai_usage` table in Supabase (phase 2).

---

## 6. Content and editorial rules

- **Official bank** in `src/data/questions.ts`. Each question has an explanation and, where relevant, a reference with the note "validate against local protocol".
- **Calculations:** in `calc.template` with `base` and `variants`. The engine solves them, shows the steps and detects unit mistakes.
- **Serious errors:** `critical` field with the dangerous options, the risk for the patient and the recovery question.
- **Personality:** `src/lib/personality.ts`. Humour targets the mistake or the situation, never the person's intelligence, identity, body or origin. No discriminatory insults, threats or humiliation. For serious errors the tone is always professional, in every mode.

CSV format for importing (Excel → *Save as CSV UTF-8*; separator `,` or `;`). Download the template from the panel:

```
modulo;nivel;tipo;enunciado;opcion_a;opcion_b;opcion_c;opcion_d;correcta;explicacion;referencia;conceptos_clave
bioseguridad;basico;mcq;¿...?;...;...;...;...;A;Porque...;OMS;
signos;basico;vf;La FC normal es 60-100 lpm;;;;;V;...;;
pae;intermedio;abierta;¿Qué es un dato subjetivo?;;;;;;Lo que refiere...;;refiere|dice;paciente
```

---

## 7. Roadmap (next phases)

1. **Accounts and roles (Supabase Auth):** admin, teacher and student. Apply `supabase/schema.sql` (it already includes RLS: students' results are private and only visible to their authorised teacher).
2. Move `settings.ts` and `progress.ts` from `localStorage` to Supabase. The functions are already isolated for this.
3. Group statistics by course (`course_module_stats` view) and Excel/PDF export per course.
4. Store AI usage per user (`ai_usage`) with quotas per course.
5. More clinical cases for the Guardia mode, and AI-generated follow-up questions.
6. Spaced repetition with review dates (SM-2) in Revancha.
