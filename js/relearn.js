"use strict";

/* Relearn: a queue of problems solved on LeetCode, least recently visited first.
   See docs/relearn-requirements.md. */

const RELEARN_PRACTICE_GAP = 3;
const RELEARN_DAY = 24 * 60 * 60 * 1000;
const RELEARN_EARLIER = { week: 7, month: 30, months: 90 };
const RELEARN_LEVELS = ["Easy", "Medium", "Hard"];

let relearnQuery = "";
let relearnFilter = "all";

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

/* lastSeenAt is when you actually last did the problem (shown to you).
   queueAt only decides the order. Marks made before the queue existed only have solvedAt. */
function relearnLastSeen(record) {
  return record.lastSeenAt != null ? record.lastSeenAt : record.solvedAt;
}

function relearnQueueAt(record) {
  return record.queueAt != null ? record.queueAt : relearnLastSeen(record);
}

function relearnEntries() {
  const map = relearnMap();
  const out = [];
  for (const slug of Object.keys(map)) {
    const problem = BY_SLUG.get(slug);
    if (!problem) continue;
    out.push({ slug, problem, ...map[slug], lastSeenAt: relearnLastSeen(map[slug]), queueAt: relearnQueueAt(map[slug]) });
  }
  return out;
}

/* Least recently visited first: the problem you are most likely to have forgotten. */
function relearnQueue() {
  return relearnEntries().sort((a, b) => a.queueAt - b.queueAt || a.problem.id - b.problem.id);
}

function relearnStats() {
  const totals = { Easy: 0, Medium: 0, Hard: 0 };
  for (const p of PROBLEMS) if (totals[p.difficulty] != null) totals[p.difficulty]++;
  const marked = { Easy: 0, Medium: 0, Hard: 0 };
  for (const e of relearnEntries()) if (marked[e.problem.difficulty] != null) marked[e.problem.difficulty]++;
  return {
    marked,
    totals,
    markedTotal: marked.Easy + marked.Medium + marked.Hard,
    total: totals.Easy + totals.Medium + totals.Hard
  };
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
    map[slug] = {
      solvedAt,
      lastSeenAt: solvedAt,
      queueAt: solvedAt,
      lapses: 0,
      reviews: 0,
      lastResult: action === "just-now" ? "just-now" : "earlier"
    };
    persist.relearn();
    return true;
  }

  if (!record) return false;

  if (action === "flawless") {
    /* Went perfectly: to the back of the queue. */
    record.lastSeenAt = now;
    record.queueAt = now;
    record.reviews = (record.reviews || 0) + 1;
    record.lastResult = "flawless";
    persist.relearn();
    return true;
  }

  if (action === "practice") {
    /* Needs more work: back in the queue, but only a few places down. */
    const others = relearnQueue().filter((e) => e.slug !== slug);
    let queueAt = now;
    if (others.length) {
      const anchor = others[Math.min(RELEARN_PRACTICE_GAP, others.length) - 1];
      queueAt = Math.min(now, anchor.queueAt + 1);
    }
    record.lastSeenAt = now;
    record.queueAt = queueAt;
    record.lapses = (record.lapses || 0) + 1;
    record.reviews = (record.reviews || 0) + 1;
    record.lastResult = "practice";
    persist.relearn();
    return true;
  }

  return false;
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

function practiceText(lapses) {
  if (!lapses) return "";
  return lapses === 1 ? "needed more practice once" : `needed more practice ${lapses} times`;
}

function relearnReviewButtons(slug) {
  const safe = escapeHtml(slug);
  return `<button type="button" class="btn-primary small" data-relearn="flawless" data-slug="${safe}">Flawless</button>
    <button type="button" class="btn-ghost small" data-relearn="practice" data-slug="${safe}">Needs more practice</button>
    <button type="button" class="btn-ghost small" data-relearn="remove" data-slug="${safe}">Remove</button>`;
}

function relearnMarkHtml(slug, record, queue, now) {
  const safe = escapeHtml(slug);
  if (!record) {
    return `<span class="relearn-label">Solved on LeetCode?</span>
      <button type="button" class="btn-primary small" data-relearn="just-now" data-slug="${safe}">Solved just now</button>
      <span class="relearn-label">Earlier:</span>
      <button type="button" class="btn-ghost small" data-relearn="week" data-slug="${safe}">A week ago</button>
      <button type="button" class="btn-ghost small" data-relearn="month" data-slug="${safe}">A month ago</button>
      <button type="button" class="btn-ghost small" data-relearn="months" data-slug="${safe}">A few months ago</button>`;
  }
  const pos = queue.findIndex((e) => e.slug === slug) + 1;
  const bits = [`In your queue: #${pos} of ${queue.length}`, `last visited ${formatAgo(relearnLastSeen(record), now)}`];
  const practice = practiceText(record.lapses);
  if (practice) bits.push(practice);
  return `<span class="relearn-status">${escapeHtml(bits.join(" · "))}</span>${relearnReviewButtons(slug)}`;
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
  box.innerHTML = relearnMarkHtml(slug, relearnMap()[slug], relearnQueue(), Date.now());
}

function renderRelearnStats() {
  const box = $("relearn-stats");
  if (!box) return;
  const s = relearnStats();
  const card = (key, label, mark, total, cls) => `<button type="button" class="relearn-stat ${cls}${relearnFilter === key ? " active" : ""}" data-relearn-filter="${key}" aria-pressed="${relearnFilter === key}">
      <span class="relearn-stat-label">${label}</span>
      <strong>${mark}</strong>
      <span class="relearn-stat-of">of ${total}</span>
      <span class="bar"><i style="width:${pct(mark, total)}%"></i></span>
    </button>`;
  box.innerHTML =
    card("all", "Total", s.markedTotal, s.total, "total") +
    RELEARN_LEVELS.map((level) => card(level, level, s.marked[level], s.totals[level], level.toLowerCase())).join("");
}

function renderRelearnMarked() {
  const box = $("relearn-marked");
  const title = $("relearn-marked-title");
  if (!box) return;
  const now = Date.now();
  const entries = relearnEntries()
    .filter((e) => relearnFilter === "all" || e.problem.difficulty === relearnFilter)
    .sort((a, b) => a.problem.id - b.problem.id);
  if (title) {
    title.textContent = `Marked problems${relearnFilter === "all" ? "" : ` · ${relearnFilter}`} (${entries.length})`;
  }
  if (!entries.length) {
    box.innerHTML = `<p class="empty-state">${relearnFilter === "all" ? "Nothing marked yet." : `No ${relearnFilter} problems marked yet.`}</p>`;
    return;
  }
  box.innerHTML = entries.map((e) => `<div class="relearn-mrow">
      <span class="pr-num">${e.problem.id}</span>
      <a class="relearn-mtitle" href="#/solve/${encodeURIComponent(e.slug)}">${escapeHtml(e.problem.title)}</a>
      ${diffBadge(e.problem.difficulty)}
      <span class="muted relearn-mseen">${formatAgo(e.lastSeenAt, now)}</span>
      <button type="button" class="btn-ghost small" data-relearn="remove" data-slug="${escapeHtml(e.slug)}">Remove</button>
    </div>`).join("");
}

function renderRelearnResults() {
  const box = $("relearn-results");
  if (!box) return;
  const now = Date.now();
  const queue = relearnQueue();
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
      <div class="relearn-actions">${relearnMarkHtml(problem.slug, relearnMap()[problem.slug], queue, now)}</div>
    </div>`).join("") + more;
}

function renderRelearn() {
  const now = Date.now();
  const queue = relearnQueue();
  const count = $("relearn-count");
  if (count) count.textContent = queue.length ? `${queue.length} in queue` : "Nothing marked yet";

  renderRelearnStats();

  const queueBox = $("relearn-due");
  if (queueBox) {
    if (!queue.length) {
      queueBox.innerHTML = `<p class="empty-state">Nothing marked yet. Search a problem below after you solve it on LeetCode.</p>`;
    } else {
      queueBox.innerHTML = queue.map((entry, i) => {
        const problem = entry.problem;
        const practice = practiceText(entry.lapses);
        return `<article class="relearn-card${i === 0 ? " relearn-next" : ""}">
          <span class="relearn-pos">${i + 1}</span>
          <div class="relearn-card-main">
            <a class="relearn-title" href="#/solve/${encodeURIComponent(problem.slug)}">${problem.id}. ${escapeHtml(problem.title)}</a>
            ${diffBadge(problem.difficulty)}
            <p class="muted">Last visited ${formatAgo(entry.lastSeenAt, now)}${practice ? ` · ${practice}` : ""}</p>
          </div>
          <div class="relearn-actions">
            <a class="btn-ghost small" href="https://leetcode.com/problems/${encodeURIComponent(problem.slug)}/" target="_blank" rel="noopener">Open on LeetCode</a>
            ${relearnReviewButtons(problem.slug)}
          </div>
        </article>`;
      }).join("");
    }
  }

  renderRelearnMarked();
  renderRelearnResults();
}

function onRelearnClick(event) {
  const filter = event.target.closest("[data-relearn-filter]");
  if (filter) {
    event.preventDefault();
    const next = filter.dataset.relearnFilter;
    relearnFilter = relearnFilter === next ? "all" : next;
    renderRelearnStats();
    renderRelearnMarked();
    return;
  }
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
