"use strict";

/* NeetCode-style unified practice page — one shell, switch lists in the sidebar. */

function renderPractice() {
  const listId = practiceListId(state.route.listId);
  const meta = PRACTICE_LISTS[listId];
  const problems = listProblems(listId);
  const stats = statsFor(problems);
  const f = state.prefs.filters;

  $("practice-title").textContent = meta.title;
  $("practice-desc").textContent = meta.description;

  $("practice-nav").innerHTML = Object.values(PRACTICE_LISTS)
    .map(
      (l) => `<a class="pr-nav-item${l.id === listId ? " active" : ""}" href="#/practice/${encodeURIComponent(l.id)}">
        <span class="pr-nav-name">${escapeHtml(l.nav)}</span>
        <span class="pr-nav-count">${statsFor(listProblems(l.id)).solved}/${statsFor(listProblems(l.id)).total}</span>
      </a>`
    )
    .join("");

  const circumference = 2 * Math.PI * 46;
  const ring = $("practice-ring-fg");
  ring.style.strokeDasharray = String(circumference);
  ring.style.strokeDashoffset = String(circumference * (1 - stats.solved / (stats.total || 1)));
  $("practice-ring-num").textContent = stats.solved;
  $("practice-ring-total").textContent = `/ ${stats.total}`;

  $("pr-easy").textContent = `${stats.easy[0]} / ${stats.easy[1]}`;
  $("pr-medium").textContent = `${stats.medium[0]} / ${stats.medium[1]}`;
  $("pr-hard").textContent = `${stats.hard[0]} / ${stats.hard[1]}`;
  $("pr-solved-label").textContent = `${stats.solved} / ${stats.total} solved`;

  $("pf-search").value = f.q;
  $("pf-difficulty").value = f.difficulty;
  $("pf-status").value = f.status;
  $("pf-company").value = f.company;

  const companyOptions = ['<option value="all">Any company</option>']
    .concat(COMPANIES_BY_SIZE.map((c) => `<option value="${c}">${escapeHtml(companyLabel(c))}</option>`))
    .join("");
  $("pf-company").innerHTML = companyOptions;
  $("pf-company").value = f.company;

  const filtered = problems.filter((p) => matchesFilters(p, f));
  const keys = filtered.map((p) => p.slug);
  setQueue(keys, meta.nav, `#/practice/${encodeURIComponent(listId)}`);

  if (!filtered.length) {
    $("practice-body").innerHTML = `<p class="empty-state">Nothing matches these filters.</p>`;
    document.title = `${meta.nav} - PrepForge`;
    return;
  }

  const groups = new Map();
  for (const p of filtered) {
    const c = categoryOf(p, listId);
    if (!groups.has(c)) groups.set(c, []);
    groups.get(c).push(p);
  }

  const collapsed = state.prefs.practiceCollapsed || {};
  const defaultCollapsed = listId === "all";
  const cats = orderedCategories(listId, groups);

  $("practice-body").innerHTML = cats
    .map((cat) => {
      const items = groups.get(cat);
      const done = items.filter((p) => isSolved(p.slug)).length;
      const key = `${listId}:${cat}`;
      const isCollapsed = collapsed[key] != null ? collapsed[key] : defaultCollapsed;
      const rows = items
        .map((p) => {
          const review = state.reviews[p.slug];
          const diff = p.difficulty.toLowerCase();
          return `<a class="pr-row" href="#/solve/${encodeURIComponent(p.slug)}">
            <span class="pr-status">${statusIcon(p.slug)}</span>
            <span class="pr-num">${p.id}</span>
            <span class="pr-title">${escapeHtml(p.title)}</span>
            ${p.paid ? '<span class="pr-premium" title="Premium">+</span>' : ""}
            ${review && review.score != null ? `<span class="pr-score s${scoreBand(review.score)}">${review.score}</span>` : ""}
            <span class="pr-diff ${diff}">${p.difficulty}</span>
          </a>`;
        })
        .join("");
      return `<section class="pr-cat${isCollapsed ? " collapsed" : ""}${done === items.length ? " complete" : ""}" data-cat-key="${escapeHtml(key)}">
        <button type="button" class="pr-cat-head" aria-expanded="${!isCollapsed}">
          <span class="pr-cat-name">${escapeHtml(cat)}</span>
          <span class="pr-cat-prog">${done} / ${items.length}</span>
          <span class="pr-cat-bar"><i style="width:${pct(done, items.length)}%"></i></span>
        </button>
        <div class="pr-cat-body">${rows}</div>
      </section>`;
    })
    .join("");

  $("practice-body").querySelectorAll(".pr-cat-head").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sec = btn.closest(".pr-cat");
      const catKey = sec.dataset.catKey;
      const nowCollapsed = !sec.classList.toggle("collapsed");
      btn.setAttribute("aria-expanded", String(!nowCollapsed));
      if (!state.prefs.practiceCollapsed) state.prefs.practiceCollapsed = {};
      state.prefs.practiceCollapsed[catKey] = nowCollapsed;
      persist.prefs();
    });
  });

  document.title = `${meta.nav} - PrepForge`;
}

function initPracticeFilters() {
  const f = state.prefs.filters;
  const update = (patch) => {
    Object.assign(f, patch);
    persist.prefs();
    if (state.route.name === "practice") renderPractice();
  };

  let searchTimer = null;
  $("pf-search").addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    const v = e.target.value;
    searchTimer = setTimeout(() => update({ q: v }), 150);
  });
  $("pf-difficulty").addEventListener("change", (e) => update({ difficulty: e.target.value }));
  $("pf-status").addEventListener("change", (e) => update({ status: e.target.value }));
  $("pf-company").addEventListener("change", (e) => update({ company: e.target.value }));
  $("pf-clear").addEventListener("click", () => update({ q: "", difficulty: "all", status: "all", company: "all" }));
}
