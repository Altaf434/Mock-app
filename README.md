# Exam Portal

A website where users attempt your generated mock papers and get an
analytics scorecard afterwards. Every visitor is logged (name, location,
timestamp) before they can use the site.

No React, no build step — just Node + Express on the backend and plain
HTML/CSS/JS on the frontend. Deploys as a single web service.

## How it fits your existing pipeline

You already have a script that produces one JSON file per paper, shaped like:

```json
[
  {
    "question_text": "...",
    "options": ["...", "...", "...", "..."],
    "correct_option": 1,
    "explanation": "...",
    "topic": "Analogy",
    "difficulty": "Easy",
    "section": "Reasoning",
    "question_number": 1
  }
]
```

Drop each generated paper as its own `.json` file into the `papers/`
folder. The filename (minus `.json`) becomes the paper's URL id, and a
title-cased version of it is used as the display title unless the file
itself provides a `"title"` field. Two formats are accepted:

- a bare array of question objects (as above), or
- an object: `{ "title": "...", "blueprint": {...}, "questions": [...] }`

Nothing else needs to change in your generation script — just write the
output file straight into this folder (or sync the whole folder to it).

Two sample papers are already in `papers/` so you can see it working
immediately. Delete them once you drop in your real ones.

## Marking scheme & timer

- **Marking**: +1 for a correct answer, −0.5 for a wrong answer, 0 for a
  skipped question. This is set in `lib/grade.js` (`MARKS_PER_CORRECT` and
  `NEGATIVE_MARKING` constants) — change those two numbers if you want a
  different scheme later.
- **Timer**: every attempt gets a fixed 15-minute countdown (set in
  `public/exam.html` as `EXAM_DURATION_SECONDS`). The paper auto-submits
  whatever's answered so far when time runs out. If you later add papers
  with a different question count, bump this constant or make it
  per-paper (e.g. read a `duration_minutes` field from the paper JSON).

## Running locally

```bash
npm install
npm start
```

Then open http://localhost:3000

## What the site does

1. **Landing page (`/`)** — a mandatory "admit card" form asking for
   **name** and **location**. This is required before anything else loads;
   submitting creates a visitor record (name, location, IP, user agent,
   timestamp) and stores a visitor id in the browser's `localStorage`.
   Every later page checks for this id and bounces back to `/` if it's
   missing, so there's no way to reach a paper without registering first.
2. **Booklets page (`/papers.html`)** — lists every paper found in `papers/`.
3. **Attempt page (`/exam.html?paper=<id>`)** — OMR-bubble style question UI,
   a question palette (jump to any question, see what's answered), a
   running timer. The answer key is **never sent to the browser** while
   the exam is in progress (see `lib/papers.js`'s `toAttemptSafe`) — only
   revealed after submission.
4. **Scorecard page (`/results.html?attempt=<id>`)** — score ring, section-wise
   / topic-wise / difficulty-wise accuracy bars, time taken, and a full
   question-by-question review (filterable to wrong-only / skipped-only)
   with the explanation shown for every question.

## Where visits and attempts are logged

Everything is stored as plain JSON under `data/`:

- `data/visitors.json` — one row per person who filled the gate: name,
  location, IP, user agent, first-seen and last-seen timestamps.
- `data/attempts.json` — one row per submitted paper: who took it, which
  paper, full score breakdown, and the full question-by-question result.

To check these yourself, set an `ADMIN_KEY` environment variable and visit:

```
/api/admin/visitors?key=YOUR_ADMIN_KEY
/api/admin/attempts?key=YOUR_ADMIN_KEY
```

This is intentionally lightweight (a shared key in the URL) — enough to
check logs yourself, not a real auth system. Don't share the key.

### Persistence note

This JSON-file store is great for getting started, but on most hosting
platforms (including Render's free tier) the filesystem is **ephemeral** —
data can be wiped on redeploy or restart. Two ways to fix this once you
have real traffic:

- **Cheapest fix**: attach a persistent disk to your Render service
  (see the commented-out `disk:` block in `render.yaml`) and point it at
  the `data/` folder.
- **More robust fix**: swap `lib/store.js` for a real database (Postgres
  is a good default — Render has a managed Postgres add-on). Every route
  file only imports from `lib/store.js`, so this is the only file you'd
  need to rewrite.

## Deploying to Render

1. Push this folder to a GitHub repo.
2. On Render: **New +** → **Web Service** → connect the repo.
3. Render should auto-detect `render.yaml`. If not, set manually:
   - Build command: `npm install`
   - Start command: `npm start`
4. Add an environment variable `ADMIN_KEY` set to a password of your choice
   (this is what protects `/api/admin/*`).
5. Deploy. Your site is live at the `.onrender.com` URL Render gives you.
6. When you're ready to point your own domain at it, add it under the
   service's **Settings → Custom Domains**.

Any other Node-friendly host (Railway, Fly.io, a plain VPS) works the same
way — it's just `npm install && npm start`.

## Adding more papers later

Just drop new `.json` files into `papers/` and redeploy (or, if your host
supports it, sync the folder directly) — no code changes needed, no
restart-sensitive registration step. The papers list picks up every file
in that folder automatically on each request.

## Project structure

```
exam-portal/
  server.js            Express app entry point
  lib/
    store.js            JSON-file backed storage (visitors + attempts)
    papers.js           Loads & normalizes paper JSON files
    grade.js            Grading + analytics computation
  routes/
    visitors.js          POST /api/visitors, ping, history
    papers.js             GET  /api/papers, /api/papers/:id
    attempts.js            POST /api/attempts, GET /api/attempts/:id
    admin.js                GET /api/admin/visitors, /attempts
  papers/               <- put your generated paper JSON files here
  data/                 visitors.json / attempts.json (auto-created)
  public/               frontend (index/papers/exam/results .html + css/js)
```
