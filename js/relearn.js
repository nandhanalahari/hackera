"use strict";

/* Relearn: problems solved on LeetCode, reviewed here by when they were marked.
   See docs/relearn-requirements.md. */

const RELEARN_DAILY = 3;
const RELEARN_LADDER = [3, 7, 21, 45];
const RELEARN_DAY = 24 * 60 * 60 * 1000;
const RELEARN_EARLIER = { week: 7, month: 30, months: 90 };

let relearnQuery = "";

function relearnMap() {
  if (!state.relearn || typeof state.relearn !== "object" || Array.isArray(state.relearn)) {
    state.relearn = {};
  }
  return state.relearn;
}

function relearnSlug(problem) {
  if (!problem || problem.kind === "bank") return null;
  if (problem.kind === "learn") {
    if (problem.num == null) return null;
    const hit = PROBLEMS.find((p) => p.id === problem.num);
    return hit ? hit.slug : null;
  }
  return problem.url && BY_SLUG.has(problem.key) ? problem.key : null;
}

function nextRelearnInterval(current) {
  for (const step of RELEARN_LADDER) {
    if (current < step) return step;
  }
  return RELEARN_LADDER[RELEARN_LADDER.length - 1];
}

function markRelearn(slug, action, now = Date.now()) {
  if (!slug || !BY_SLUG.has(slug)) return false;
  const map = relearnMap();
  const record = map[slug];

  if (action === "remove") {
    if (!record) return false;
    delete map[slug];
    persist.relearn();
    return true;
  }

  if (action === "just-now" || RELEARN_EARLIER[action] != null) {
    if (record) return false;
    const daysAgo = action === "just-now" ? 0 : RELEARN_EARLIER[action];
    const solvedAt = now - daysAgo * RELEARN_DAY;
    const intervalDays = RELEARN_LADDER[0];
    map[slug] = {
      solvedAt,
      dueAt: solvedAt + intervalDays * RELEARN_DAY,
      intervalDays,
      lapses: 0,
      reviews: 0,
      lastResult: action === "just-now" ? "just-now" : "earlier"
    };
    persist.relearn();
    return true;
  }

  if (!record) return false;

  if (action === "got-it") {
    const intervalDays = nextRelearnInterval(record.intervalDays || 0);
    record.intervalDays = intervalDays;
    record.dueAt = now + intervalDays * RELEARN_DAY;
    record.reviews = (record.reviews || 0) + 1;
    record.lastResult = "got-it";
    persist.relearn();
    return true;
  }

  if (action === "forgot") {
    record.intervalDays = 1;
    record.dueAt = now + RELEARN_DAY;
    record.lapses = (record.lapses || 0) + 1;
    record.reviews = (record.reviews || 0) + 1;
    record.lastResult = "forgot";
    persist.relearn();
    return true;
  }

  return false;
}

function relearnEntries() {
  const map = relearnMap();
  const out = [];
  for (const slug of Object.keys(map)) {
    const problem = BY_SLUG.get(slug);
    if (!problem) continue;
    out.push({ slug, problem, ...map[slug] });
  }
  return out;
}

function relearnDue(now = Date.now()) {
  return relearnEntries()
    .filter((entry) => entry.dueAt <= now)
    .sort((a, b) => (b.lapses || 0) - (a.lapses || 0) || a.solvedAt - b.solvedAt || a.dueAt - b.dueAt);
}

function relearnNext(now = Date.now()) {
  return relearnEntries()
    .filter((entry) => entry.dueAt > now)
    .sort((a, b) => a.dueAt - b.dueAt)[0] || null;
}

function searchRelearnProblems(query) {
  const q = query.trim().toLowerCase();
  if (!q) return { shown: [], total: 0 };
  const scored = [];
  for (const problem of PROBLEMS) {
    const title = problem.title.toLowerCase();
    const id = String(problem.id);
    const slug = problem.slug.toLowerCase();
    if (!title.includes(q) && id !== q && !id.startsWith(q) && !slug.includes(q)) continue;
    let rank = 4;
    if (id === q) rank = 0;
    else if (title === q) rank = 1;
    else if (title.startsWith(q) || id.startsWith(q)) rank = 2;
    else if (slug.startsWith(q)) rank = 3;
    scored.push({ problem, rank });
  }
  scored.sort((a, b) => a.rank - b.rank || a.problem.id - b.problem.id);
  return { shown: scored.slice(0, 8).map((row) => row.problem), total: scored.length };
}

function formatAgo(ts, now) {
  const days = Math.round((now - ts) / RELEARN_DAY);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 45) return `${Math.round(days / 7)} weeks ago`;
  const months = Math.max(1, Math.round(days / 30));
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

function formatDue(ts, now) {
  const days = Math.ceil((ts - now) / RELEARN_DAY);
  if (days <= 0) return "due now";
  if (days === 1) return "due tomorrow";
  return `due in ${days} days`;
}

function relearnStatusText(record, now) {
  const bits = [`Marked ${formatAgo(record.solvedAt, now)}`, formatDue(record.dueAt, now)];
  if (record.lapses === 1) bits.push("forgotten once");
  else if (record.lapses > 1) bits.push(`forgotten ${record.lapses} times`);
  return bits.join(" · ");
}

function relearnMarkHtml(slug, record, now) {
  const safe = escapeHtml(slug);
  if (!record) {
    return `<span class="relearn-label">Solved on LeetCode?</span>
      <button type="button" class="btn-primary small" data-relearn="just-now" data-slug="${safe}">Solved just now</button>
      <span class="relearn-label">Earlier:</span>
      <button type="button" class="btn-ghost small" data-relearn="week" data-slug="${safe}">A week ago</button>
      <button type="button" class="btn-ghost small" data-relearn="month" data-slug="${safe}">A month ago</button>
      <button type="button" class="btn-ghost small" data-relearn="months" data-slug="${safe}">A few months ago</button>`;
  }
  const review = record.dueAt <= now
    ? `<button type="button" class="btn-primary small" data-relearn="got-it" data-slug="${safe}">Still got it</button>
       <button type="button" class="btn-ghost small" data-relearn="forgot" data-slug="${safe}">Forgot it</button>`
    : "";
  return `<span class="relearn-status">${escapeHtml(relearnStatusText(record, now))}</span>
    ${review}
    <button type="button" class="btn-ghost small" data-relearn="remove" data-slug="${safe}">Remove</button>`;
}

function renderRelearnOnProblem(problem) {
  const box = $("q-relearn");
  if (!box) return;
  const slug = relearnSlug(problem);
  if (!slug) {
    box.innerHTML = "";
    box.classList.add("hidden");
    return;
  }
  box.classList.remove("hidden");
  box.innerHTML = relearnMarkHtml(slug, relearnMap()[slug], Date.now());
}

function renderRelearnResults() {
  const box = $("relearn-results");
  if (!box) return;
  const now = Date.now();
  const { shown, total } = searchRelearnProblems(relearnQuery);
  if (!relearnQuery.trim()) {
    box.innerHTML = `<p class="empty-state">Search a problem you just solved on LeetCode.</p>`;
    return;
  }
  if (!shown.length) {
    box.innerHTML = `<p class="empty-state">No problem matches that.</p>`;
    return;
  }
  const more = total > shown.length ? `<p class="muted relearn-more">Showing ${shown.length} of ${total}. Keep typing to narrow it.</p>` : "";
  box.innerHTML = shown.map((problem) => `<div class="relearn-result">
      <div class="relearn-result-main">
        <span class="pr-num">${problem.id}</span>
        <a href="#/solve/${encodeURIComponent(problem.slug)}">${escapeHtml(problem.title)}</a>
        ${diffBadge(problem.difficulty)}
        <a class="badge link" href="https://leetcode.com/problems/${encodeURIComponent(problem.slug)}/" target="_blank" rel="noopener">LeetCode &#8599;</a>
      </div>
      <div class="relearn-actions">${relearnMarkHtml(problem.slug, relearnMap()[problem.slug], now)}</div>
    </div>`).join("") + more;
}

function renderRelearn() {
  const now = Date.now();
  const due = relearnDue(now);
  const shown = due.slice(0, RELEARN_DAILY);
  const waiting = due.length - shown.length;
  const marked = relearnEntries().length;
  const count = $("relearn-count");
  if (count) {
    count.textContent = marked ? `${due.length} due · ${marked} marked` : "Nothing marked yet";
  }

  const dueBox = $("relearn-due");
  if (dueBox) {
    if (!marked) {
      dueBox.innerHTML = `<p class="empty-state">Nothing marked yet. Search a problem below after you solve it on LeetCode.</p>`;
    } else if (!shown.length) {
      const next = relearnNext(now);
      dueBox.innerHTML = `<p class="empty-state">${next
        ? `Nothing due right now. Next up is ${escapeHtml(next.problem.title)}, ${formatDue(next.dueAt, now)}.`
        : "Nothing due right now."}</p>`;
    } else {
      const extra = waiting > 0
        ? `<p class="muted relearn-more">${waiting} more due after these.</p>`
        : "";
      dueBox.innerHTML = shown.map((entry) => {
        const problem = entry.problem;
        const lapses = entry.lapses
          ? ` · ${entry.lapses === 1 ? "forgotten once" : `forgotten ${entry.lapses} times`}`
          : "";
        return `<article class="relearn-card">
          <div class="relearn-card-main">
            <a class="relearn-title" href="#/solve/${encodeURIComponent(problem.slug)}">${problem.id}. ${escapeHtml(problem.title)}</a>
            ${diffBadge(problem.difficulty)}
            <p class="muted">Solved ${formatAgo(entry.solvedAt, now)}${lapses}</p>
          </div>
          <div class="relearn-actions">
            <a class="btn-ghost small" href="https://leetcode.com/problems/${encodeURIComponent(problem.slug)}/" target="_blank" rel="noopener">Open on LeetCode</a>
            <button type="button" class="btn-primary small" data-relearn="got-it" data-slug="${escapeHtml(problem.slug)}">Still got it</button>
            <button type="button" class="btn-ghost small" data-relearn="forgot" data-slug="${escapeHtml(problem.slug)}">Forgot it</button>
            <button type="button" class="btn-ghost small" data-relearn="remove" data-slug="${escapeHtml(problem.slug)}">Remove</button>
          </div>
        </article>`;
      }).join("") + extra;
    }
  }

  renderRelearnResults();
}

function onRelearnClick(event) {
  const button = event.target.closest("[data-relearn]");
  if (!button) return;
  event.preventDefault();
  if (!markRelearn(button.dataset.slug, button.dataset.relearn)) return;
  if (state.route.name === "relearn") renderRelearn();
  if (state.route.name === "solve") renderRelearnOnProblem(getProblem(state.route.key));
}

function initRelearn() {
  const page = $("view-relearn");
  if (page) page.addEventListener("click", onRelearnClick);
  const inline = $("q-relearn");
  if (inline) inline.addEventListener("click", onRelearnClick);
  const search = $("relearn-search");
  if (search) {
    search.addEventListener("input", () => {
      relearnQuery = search.value;
      renderRelearnResults();
    });
  }
}
