# PrepForge

A local interview-prep app for Java coding assessments. Static HTML/JS, no build
step. Problems come from LeetCode's public API, company tags from real reported
interview data, and every solution you submit is graded by Gemini and stored.

## Run

```bash
cp config.example.js config.js   # add your Gemini key
brew install openjdk             # once, for the Run button
node server.js
open http://localhost:8000
```

`node server.js` serves the site and exposes `/api/run`, which compiles your Java
with the local JDK and checks it against each problem's example test cases.
`python3 -m http.server` still works for browsing, but Run will fail without
the Node server.

## What's in it

**Tracks**

| Track | Contents |
| --- | --- |
| Learning path | 10 patterns, each with a lesson, 2 warm-ups and 2 interview questions |
| NeetCode 150 | The standard 150, grouped by topic in the intended order |
| Blind 75 | The classic shortlist |
| Companies | 26 companies, ordered by how often each problem is reported |
| My bank | Questions you paste in after seeing them for real |
| Jobs | Live internship/new-grad tracker ranked against your resume |

201 LeetCode problems are bundled with their official statement, Java stub,
topic tags and hints, plus the 40 hand-written curriculum questions.

**Company tags** come from
[snehasishroy/leetcode-companywise-interview-questions](https://github.com/snehasishroy/leetcode-companywise-interview-questions),
which reports a frequency percentage per company. TikTok's set is 155 problems;
`LRU Cache` sits at 100%. Tags marked in amber were asked in the last six months.

**AI review.** Submitting a solution sends the problem and your code to Gemini,
which returns a structured verdict: a score out of 100, measured time and space
complexity, what worked, specific fixes tagged as bug / edge-case / performance /
style, edge cases to test, and links to study next. Resource links are filtered
against a host allowlist, because models invent plausible URLs. A `correct`
verdict marks the problem solved automatically.

**The coach panel** (Cmd/Ctrl+J) is separate from review: it leads with hints
rather than solutions, and it can see the problem and your current code.

## Data

Attempts, reviews and progress go to Supabase (`oa_attempts`, `oa_reviews`,
`oa_progress`) so they survive a cleared cache, keyed by a per-device id in
localStorage. Writes are best-effort: localStorage is what the UI reads, so
losing the network never costs you work. The badge in the top bar shows whether
sync is live. Leave the Supabase settings blank to run entirely offline.

Because the app has no login, it reaches Supabase with a publishable key that is
visible in the page source, and those three tables allow anonymous read and
write. That is fine for a personal tool but it is not a multi-user setup.

## Shortcuts

| Key | Action |
| --- | --- |
| Cmd/Ctrl + J | Toggle the coach |
| Cmd/Ctrl + Enter | Submit for review |
| `[` / `]` | Previous / next problem |
| Esc | Close the coach or a dialog |

## Regenerating the problem set

`data/problems.js` is generated. To change which problems are included, edit the
lists in `tools/lists.js` and re-run:

```bash
node tools/build-problems.js
```

It pulls from LeetCode's GraphQL API and merges the company CSVs. Responses are
cached in `tools/.cache.json`, so re-runs take seconds. The ten LeetCode Premium
problems in these lists return no content over the API and are written by hand in
`tools/premium.js`.

## Tests

```bash
node tools/render-test.js
```

Loads the app in jsdom and walks every route, lesson and a sample of problems,
checking that content renders and that solving, filtering, hints and review
display all behave.

## Layout

```
index.html          shell and all view containers
styles.css
config.js           keys (gitignored)
data.js             patterns, lessons, 40 curriculum questions
data/problems.js    generated: 201 problems with official content
js/store.js         state, localStorage, Supabase mirror
js/catalog.js       one problem shape across all sources
js/coach.js         Gemini chat and structured review
js/app.js           router and views
tools/              generator, premium fallbacks, tests
```
