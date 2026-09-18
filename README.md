# DemoLens — Quality Auditor PWA

An installable, fully offline PWA for auditing tutoring demo classes. It converts
rough, real-time observation notes (English or Hinglish) into a structured
11-question evaluation report matching the sample "Quality Auditor Assignment:
Demo Class Evaluation," with a live scoring dashboard alongside it.

No AI, no API, no network calls at runtime — everything is deterministic
keyword-rule matching that runs entirely in your browser, and every generated
sentence is editable before you export it.

## Running it

Because service workers require a real origin (not `file://`), serve the folder
over local HTTP rather than double-clicking `index.html`:

```bash
cd quality-auditor-pwa
python3 -m http.server 8080
# open http://localhost:8080 in your browser
```

Then use the browser's "Install app" prompt (or the in-app "Install" banner) to
add it to your home screen / desktop as a standalone app. After the first load
it works with zero connectivity.

To host it for real (so you can install it on your phone), push this folder to
any static host — GitHub Pages, Netlify, Vercel, or your own server — and open
the URL once while online.

## How to use it

1. **Capture** — type or tap-in rough notes while watching the demo (one
   observation per line). A live timeline on the right shows each line turned
   into structured audit language as you type.
2. **Dashboard** — after clicking "Analyze," see an auto-suggested overall
   score, a Pass/Retrain/Reject decision, a conversion forecast, and a
   category-by-category breakdown gauge/bar chart.
3. **Report** — the full 11-question draft (Executive Assessment through Final
   Decision), auto-filled from your notes. Every field is a plain editable
   textarea — treat it as a first draft, not a final verdict. Export as
   plain text, copy to clipboard, or print/save as PDF.
4. **Rule Library** — see every built-in trigger phrase, and add your own
   (e.g. "camera kept freezing" → issue + recommendation). Custom rules are
   saved on-device and immediately become quick-tap chips too.

## Files

- `index.html` / `styles.css` / `app.js` — the app shell and UI logic.
- `rules.js` — the editable rule library (11 questions, ~30 built-in
  observation rules, quick-tap chips).
- `engine.js` — the pure scoring/report-generation engine (no DOM access —
  reusable, and covered by `test/test_engine.js`).
- `manifest.webmanifest`, `sw.js`, `icons/` — the PWA shell (installability +
  offline caching).
- `test/` — a Node test suite for the rule engine and a Playwright script that
  exercises the full UI, including an offline-reload check.

## Notes on the auto-scoring

Scores, decisions and forecasts are a rule-of-thumb starting point calibrated
against the sample assignment (the sample's own transcript reproduces ~8.0/10,
RETRAIN, Probably Yes against the sample's stated 7.5/10, RETRAIN, Probably
Yes). You're always expected to review and adjust the numbers and wording —
that's why every field in the Report tab stays editable.
