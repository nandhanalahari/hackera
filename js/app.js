"use strict";

/* ------------------------------------------------------------------ */
window.currentLang = localStorage.getItem("hackera-lang") || "java";

/* router                                                              */
/* ------------------------------------------------------------------ */

const VIEWS = ["landing", "home", "list", "companies", "learn", "lesson", "bank", "jobs", "progress", "solve", "design", "design-topic", "design-drill", "practice"];

function isLoggedIn() {
  return typeof Auth !== "undefined" && Auth.isLoggedIn && Auth.isLoggedIn();
}

function parseRoute() {
  const raw = (location.hash || "#/").replace(/^#\/?/, "");
  const parts = raw.split("/").filter(Boolean).map(decodeURIComponent);

  if (!parts.length) return { name: "home" };
  switch (parts[0]) {
    case "landing":
      return { name: "landing" };
    case "practice":
      return { name: "practice", listId: practiceListId(parts[1] || "neetcode150") };
    case "neetcode150":
    case "blind75":
    case "all":
      return { name: "practice", listId: practiceListId(parts[0]) };
    case "companies":
      return { name: "companies" };
    case "company":
      return { name: "list", section: "company", company: parts[1] || "tiktok" };
    case "learn":
      return parts[1] ? { name: "lesson", patternId: parts[1] } : { name: "learn" };
    case "design":
      if (parts[2]) return { name: "design-drill", topicId: parts[1], scenarioId: parts[2] };
      if (parts[1]) return { name: "design-topic", topicId: parts[1] };
      return { name: "design" };
    case "solve":
      return { name: "solve", key: parts.slice(1).join("/") };
    case "bank":
      return { name: "bank" };
    case "jobs":
      return { name: "jobs" };
    case "progress":
      return { name: "progress" };
    default:
      return { name: "home" };
  }
}

function navigate() {
  let route = parseRoute();

  if (!isLoggedIn()) {
    route = { name: "landing" };
  } else if (route.name === "landing") {
    route = { name: "home" };
    if (location.hash === "#/landing") history.replaceState(null, "", "#/");
  }

  state.route = route;
  document.body.classList.toggle("guest", route.name === "landing");
  document.body.classList.toggle("authed", route.name !== "landing");

  VIEWS.forEach((v) => {
    const el = $("view-" + v);
    if (el) el.classList.toggle("hidden", v !== route.name);
  });
  const solving = route.name === "solve";
  document.body.classList.toggle("solving", solving);
  if (typeof syncUiThemeForRoute === "function") syncUiThemeForRoute(solving);

  document.querySelectorAll("[data-nav]").forEach((a) => {
    const k = a.dataset.nav;
    a.classList.toggle(
      "active",
      (route.name === "home" && k === "home") ||
        (route.name === "practice" && k === "practice") ||
        (route.name === "list" && route.section === k) ||
        (route.name === "companies" && k === "companies") ||
        (route.name === "list" && route.section === "company" && k === "companies") ||
        ((route.name === "learn" || route.name === "lesson") && k === "learn") ||
        ((route.name === "design" || route.name === "design-topic" || route.name === "design-drill") && k === "design") ||
        (route.name === "bank" && k === "bank") ||
        (route.name === "jobs" && k === "jobs") ||
        (route.name === "progress" && k === "progress")
    );
  });

  switch (route.name) {
    case "landing":
      document.title = "Hackera";
      break;
    case "home": renderHome(); break;
    case "list": renderList(); break;
    case "practice": renderPractice(); break;
    case "companies": renderCompanies(); break;
    case "learn": renderLearn(); break;
    case "lesson": renderLesson(); break;
    case "bank": renderBank(); break;
    case "jobs": renderJobs(); break;
    case "progress": renderProgress(); break;
    case "design": renderDesign(); break;
    case "design-topic": renderDesignTopic(); break;
    case "design-drill": renderDesignDrill(); break;
    case "solve": renderSolve(); break;
  }

  if (route.name !== "solve" && route.name !== "landing") document.title = "Hackera";
  window.scrollTo(0, 0);
}

function go(hash) {
  location.hash = hash;
}

/* ------------------------------------------------------------------ */
/* shared bits                                                         */
/* ------------------------------------------------------------------ */

function diffBadge(d) {
  return `<span class="badge ${d.toLowerCase()}">${d}</span>`;
}

function statusIcon(key) {
  if (isSolved(key)) return `<span class="tick done" title="Solved">&#10003;</span>`;
  if (isAttempted(key)) return `<span class="tick tried" title="Attempted">&#9679;</span>`;
  return `<span class="tick" title="Not started">&#9675;</span>`;
}

function companyChips(companies, limit = 3) {
  if (!companies || !companies.length) return "";
  const shown = companies.slice(0, limit);
  const rest = companies.length - shown.length;
  return (
    shown
      .map(
        (c) =>
          `<span class="chip${c.recent ? " hot" : ""}" title="${escapeHtml(companyLabel(c.name))} - asked in ${c.freq}% of reported interviews${c.recent ? ", including the last 6 months" : ""}">${escapeHtml(companyLabel(c.name))}</span>`
      )
      .join("") + (rest > 0 ? `<span class="chip more">+${rest}</span>` : "")
  );
}

function pct(a, b) {
  return b ? Math.round((a / b) * 100) : 0;
}

function renderSyncBadge() {
  const el = $("sync-badge");
  if (!el) return;
  const loggedIn = typeof Auth !== "undefined" && Auth.isLoggedIn && Auth.isLoggedIn();
  if (!db.enabled) {
    el.textContent = "\u25CF local";
    el.className = "sync";
    el.title = "Supabase is not configured; progress lives in this browser only.";
  } else if (!loggedIn) {
    el.textContent = "\u25CF guest";
    el.className = "sync";
    el.title = "Browsing as guest. Sign in to sync progress across devices.";
  } else if (db.online) {
    el.textContent = "\u25CF synced";
    el.className = "sync ok";
    el.title = "Signed in — attempts and reviews sync to your account.";
  } else {
    el.textContent = "\u25CF offline";
    el.className = "sync warn";
    el.title = "Supabase unreachable. Work is saved locally and will sync later.";
  }
}

/* ------------------------------------------------------------------ */
/* home                                                                */
/* ------------------------------------------------------------------ */

function renderHome() {
  const all = overallStats();
  const lcStats = statsFor(PROBLEMS);
  const design = sdStats();

  $("home-solved").textContent = all.solved;
  $("home-total").textContent = `of ${all.total} solved`;

  $("home-easy").textContent = `${lcStats.easy[0]} / ${lcStats.easy[1]}`;
  $("home-medium").textContent = `${lcStats.medium[0]} / ${lcStats.medium[1]}`;
  $("home-hard").textContent = `${lcStats.hard[0]} / ${lcStats.hard[1]}`;

  $("home-design-done").textContent = design.done;
  $("home-design-total").textContent = `of ${design.total} practiced`;
  $("home-design-bar").style.width = pct(design.done, design.total) + "%";

  const recent = Object.entries(state.progress)
    .filter(([, p]) => p.attempts)
    .sort((a, b) => (b[1].solvedAt || "").localeCompare(a[1].solvedAt || ""))
    .map(([key]) => getProblem(key))
    .filter(Boolean);

  const cont = recent.find((p) => !isSolved(p.key));
  $("home-continue").href = cont ? `#/solve/${encodeURIComponent(cont.key)}` : "#/learn";
  $("home-continue").textContent = cont ? `Continue: ${cont.title}` : "Start learning";

  loadHomeJobsPulse();
}

async function loadHomeJobsPulse() {
  const pulse = $("home-jobs-pulse");
  const countEl = $("home-jobs-count");
  if (!pulse) return;
  try {
    const res = await fetch("/api/jobs?kind=intern&sort=new&limit=6");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (countEl) {
      const hint = data.openingsHint || data.total;
      countEl.textContent = hint ? Number(hint).toLocaleString() : String(data.total || 0);
    }
    const jobs = data.jobs || [];
    if (!jobs.length) {
      pulse.innerHTML = `<p class="muted">No live roles yet — open Jobs to refresh.</p>`;
      return;
    }
    pulse.innerHTML = jobs
      .map(
        (j) => `<a class="home-pulse-row" href="${escapeHtml(j.apply)}" target="_blank" rel="noopener">
          <span class="home-pulse-co">${escapeHtml(j.company)}</span>
          <span class="home-pulse-title">${escapeHtml(j.title)}</span>
          <span class="home-pulse-meta muted">${escapeHtml(j.location || "—")} · ${escapeHtml(j.age || "new")}</span>
        </a>`
      )
      .join("");
  } catch (err) {
    pulse.innerHTML = `<p class="muted">Couldn’t load openings. Is the server running?</p>`;
    if (countEl) countEl.textContent = "—";
  }
}

function cardHtml(c) {
  const hasBar = typeof c.total === "number" && c.total > 0;
  return `<a class="card ${c.accent}" href="${c.href}">
    <span class="kicker">${escapeHtml(c.kicker)}</span>
    <h3>${escapeHtml(c.title)}</h3>
    <p>${escapeHtml(c.body)}</p>
    ${
      hasBar
        ? `<div class="card-foot">
             <div class="bar"><i style="width:${pct(c.done, c.total)}%"></i></div>
             <span>${c.done} / ${c.total}</span>
           </div>`
        : `<div class="card-foot"><span class="go">Browse &#8594;</span></div>`
    }
  </a>`;
}

/* ------------------------------------------------------------------ */
/* list                                                                */
/* ------------------------------------------------------------------ */

function renderList() {
  const { section, company } = state.route;
  const problems = listProblems(section, company);
  const stats = statsFor(problems);

  $("list-title").textContent = sectionTitle(section, company);
  $("list-sub").textContent =
    section === "company"
      ? companyListSubtitle(section, company, problems.length)
      : section === "all"
        ? `${problems.length} problems with company tags where reported.`
        : `${problems.length} problems.`;
  $("list-bar").style.width = pct(stats.solved, stats.total) + "%";
  $("list-count").textContent = `${stats.solved} / ${stats.total} solved`;

  const f = state.prefs.filters;
  $("f-search").value = f.q;
  $("f-difficulty").value = f.difficulty;
  $("f-status").value = f.status;

  const companyOptions = ['<option value="all">Any company</option>']
    .concat(COMPANIES_BY_SIZE.map((c) => `<option value="${c}">${escapeHtml(companyLabel(c))}</option>`))
    .join("");
  $("f-company").innerHTML = companyOptions;
  $("f-company").value = f.company;
  $("f-company").classList.toggle("hidden", section === "company");
  $("f-company-sort").classList.toggle("hidden", section !== "company");
  $("f-group-wrap").classList.toggle("hidden", section === "company");
  if (section === "company") $("f-company-sort").value = state.prefs.companySort || "freq";

  const grouped = section === "company" ? state.prefs.companySort === "topic" : $("f-group").checked;
  const filtered = problems.filter((p) => matchesFilters(p, f));

  if (!filtered.length) {
    $("list-body").innerHTML = `<p class="empty-state">Nothing matches these filters.</p>`;
    return;
  }

  const keys = filtered.map((p) => p.slug);
  const label = sectionTitle(section, company);
  const back = section === "company" ? "#/companies" : "#/practice";

  if (!grouped) {
    $("list-body").innerHTML = tableHtml(filtered, section, company);
  } else {
    const groups = new Map();
    for (const p of filtered) {
      const c = categoryOf(p, section);
      if (!groups.has(c)) groups.set(c, []);
      groups.get(c).push(p);
    }
    $("list-body").innerHTML = [...groups.entries()]
      .map(([cat, items]) => {
        const done = items.filter((p) => isSolved(p.slug)).length;
        return `<section class="group">
          <header class="group-head">
            <h3>${escapeHtml(cat)}</h3>
            <span class="muted">${done} / ${items.length}</span>
          </header>
          ${tableHtml(items, section, company)}
        </section>`;
      })
      .join("");
  }

  setQueue(keys, label, back);
}

function matchesFilters(p, f) {
  if (f.q) {
    const q = f.q.toLowerCase();
    const hay = `${p.id} ${p.title} ${p.topics.join(" ")}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (f.difficulty !== "all" && p.difficulty !== f.difficulty) return false;
  if (f.status !== "all") {
    const solved = isSolved(p.slug);
    const tried = isAttempted(p.slug) && !solved;
    if (f.status === "solved" && !solved) return false;
    if (f.status === "attempted" && !tried) return false;
    if (f.status === "todo" && (solved || tried)) return false;
  }
  if (f.company !== "all" && !p.companies.some((c) => c.name === f.company)) return false;
  return true;
}

function tableHtml(problems, section, company) {
  const rows = problems
    .map((p) => {
      const freq =
        section === "company"
          ? (p.companies.find((c) => c.name === company) || {}).freq
          : null;
      const co = section === "company" ? p.companies.find((c) => c.name === company) : null;
      const recentMark = co && co.recent ? ' <span class="chip hot" title="Asked in the last 6 months">Recent</span>' : "";
      /* Inside a company list the Freq column already says who is asking, so
         the chips are more useful showing who else asks it. */
      const chips = section === "company" ? p.companies.filter((c) => c.name !== company) : p.companies;
      const review = state.reviews[p.slug];
      return `<tr data-key="${escapeHtml(p.slug)}">
        <td class="c-status">${statusIcon(p.slug)}</td>
        <td class="c-num">${p.id}</td>
        <td class="c-title">
          <a href="#/solve/${encodeURIComponent(p.slug)}">${escapeHtml(p.title)}</a>${recentMark}
          ${p.paid ? '<span class="chip lock" title="LeetCode Premium problem">Premium</span>' : ""}
          ${review && review.score != null ? `<span class="chip score s${scoreBand(review.score)}" title="Last review score">${review.score}</span>` : ""}
        </td>
        <td class="c-tags">${companyChips(chips, 3)}</td>
        ${freq != null ? `<td class="c-freq" title="Reported frequency">${Math.round(freq)}%</td>` : ""}
        <td class="c-diff">${diffBadge(p.difficulty)}</td>
      </tr>`;
    })
    .join("");

  return `<table class="ptable">
    <thead><tr>
      <th></th><th>#</th><th>Problem</th><th>Companies</th>
      ${section === "company" ? "<th>Freq</th>" : ""}<th>Difficulty</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function scoreBand(score) {
  return score >= 85 ? "hi" : score >= 60 ? "mid" : "lo";
}

/* ------------------------------------------------------------------ */
/* companies                                                           */
/* ------------------------------------------------------------------ */

function renderCompanies() {
  $("company-grid").innerHTML = COMPANIES_BY_SIZE.map((name) => {
    const entries = COMPANY_INDEX[name];
    const solved = entries.filter((e) => isSolved(e.problem.slug)).length;
    const recent = entries.filter((e) => e.recent).length;
    return `<a class="card compact" href="#/company/${encodeURIComponent(name)}">
      <h3>${escapeHtml(companyLabel(name))}</h3>
      <p>${entries.length} problems${recent ? ` &middot; ${recent} asked recently` : ""}</p>
      <div class="card-foot">
        <div class="bar"><i style="width:${pct(solved, entries.length)}%"></i></div>
        <span>${solved} / ${entries.length}</span>
      </div>
    </a>`;
  }).join("");
}

/* ------------------------------------------------------------------ */
/* learning path                                                       */
/* ------------------------------------------------------------------ */

function renderLearn() {
  const s = learnStats();
  $("learn-bar").style.width = pct(s.solved, s.total) + "%";
  $("learn-count").textContent = `${s.solved} / ${s.total} solved`;

  $("learn-body").innerHTML = PATTERNS.map((p, i) => {
    const qs = PRACTICE_QUESTIONS.filter((q) => q.patternId === p.id);
    const done = qs.filter((q) => isSolved("learn:" + q.id)).length;
    const rows = ["practice", "interview"]
      .map((stage) => {
        const items = qs.filter((q) => q.stage === stage);
        if (!items.length) return "";
        return `<div class="stage">
          <span class="stage-label">${stage === "practice" ? "Warm-up" : "Interview"}</span>
          ${items
            .map(
              (q) => `<a class="lrow" href="#/solve/${encodeURIComponent("learn:" + q.id)}">
                ${statusIcon("learn:" + q.id)}
                <span class="rname">${escapeHtml(q.title)}</span>
                ${q.source ? `<span class="chip">${escapeHtml(q.source)}</span>` : ""}
                ${diffBadge(q.difficulty)}
              </a>`
            )
            .join("")}
        </div>`;
      })
      .join("");

    return `<section class="lpattern${done === qs.length ? " complete" : ""}">
      <header>
        <span class="rank">${i + 1}</span>
        <div class="lhead">
          <h3><a href="#/learn/${encodeURIComponent(p.id)}">${escapeHtml(p.name)}</a></h3>
          <p>${escapeHtml(p.summary)}</p>
        </div>
        <div class="lprog">
          <div class="bar"><i style="width:${pct(done, qs.length)}%"></i></div>
          <span class="muted">${done} / ${qs.length}</span>
        </div>
      </header>
      <a class="lesson-link" href="#/learn/${encodeURIComponent(p.id)}">&#9673; Read the lesson</a>
      ${rows}
    </section>`;
  }).join("");
}

function renderLesson() {
  const p = PATTERNS.find((x) => x.id === state.route.patternId);
  if (!p) return go("#/learn");

  $("lesson-title").textContent = p.name;
  $("lesson-body").innerHTML = lessonHtml(p);
  wireLessonInteractive($("lesson-body"), p);

  const first = PRACTICE_QUESTIONS.find((q) => q.patternId === p.id);
  $("lesson-start").onclick = () => first && go(`#/solve/${encodeURIComponent("learn:" + first.id)}`);
  $("lesson-quiz").onclick = () => quizMe(p);
  document.title = `${p.name} - Hackera`;
}

function lessonHtml(p) {
  const L = p.lesson;
  return (
    `<div class="lesson-intro"><p class="lesson-lead">${escapeHtml(p.summary)}</p></div>` +
    lessonVisualHtml(p.id) +
    `<h3>Reach for it when you see…</h3><ul class="recognize-list">${L.recognize.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>` +
    `<h3>How it works</h3>${L.mechanics.split("\n\n").map((t) => `<p>${escapeHtml(t)}</p>`).join("")}` +
    `<h3>Step through the example</h3>` +
    `<div class="walkthrough-interactive callout">` +
    `<div class="callout-title">${escapeHtml(L.walkthrough.title)}</div>` +
    `<ol class="wt-steps trace"></ol>` +
    `<button type="button" class="btn-primary small wt-next">Reveal step 1</button>` +
    `<div class="wt-result hidden callout-title"></div></div>` +
    `<h3>Java template <span class="muted snippet-hint">— reveal after the quiz below</span></h3>` +
    `<div class="snippet-gate"><button type="button" class="btn-ghost snippet-reveal">I'm ready — show the template</button>` +
    `<pre class="snippet-body hidden">${escapeHtml(p.snippet)}</pre></div>` +
    `<h3>Common bugs</h3><ul>${L.pitfalls.map((x) => `<li class="pitfall">${escapeHtml(x)}</li>`).join("")}</ul>` +
    `<h3>Complexity</h3><p>${escapeHtml(L.complexity)}</p>` +
    `<h3>Check yourself <span class="muted snippet-hint">— pick an answer, get instant feedback</span></h3><div class="checks"></div>`
  );
}

/* ------------------------------------------------------------------ */
/* bank                                                                */
/* ------------------------------------------------------------------ */

function renderBank() {
  if (!state.bank.length) {
    $("bank-body").innerHTML = `<p class="empty-state">
      Nothing saved yet. After an assessment, paste the questions you remember
      while they are fresh, then come back and solve them properly.</p>`;
    return;
  }

  $("bank-body").innerHTML = `<table class="ptable"><thead><tr>
      <th></th><th>Question</th><th>Notes</th><th>Difficulty</th><th></th>
    </tr></thead><tbody>${state.bank
      .map(
        (b) => `<tr>
          <td class="c-status">${statusIcon("bank:" + b.id)}</td>
          <td class="c-title"><a href="#/solve/${encodeURIComponent("bank:" + b.id)}">${escapeHtml(b.title || "(untitled)")}</a></td>
          <td class="c-note muted">${escapeHtml((b.notes || "").slice(0, 70))}</td>
          <td class="c-diff">${diffBadge(b.difficulty || "Medium")}</td>
          <td class="c-act"><button class="btn-ghost small" data-edit="${escapeHtml(b.id)}">Edit</button></td>
        </tr>`
      )
      .join("")}</tbody></table>`;

  $("bank-body").querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => openBankModal(btn.dataset.edit));
  });
}

let bankEditingId = null;

function openBankModal(id) {
  bankEditingId = id;
  const b = id ? state.bank.find((x) => x.id === id) : null;
  $("bank-modal-title").textContent = b ? "Edit question" : "Add question";
  $("bank-title").value = b ? b.title || "" : "";
  $("bank-difficulty").value = b ? b.difficulty || "Medium" : "Medium";
  $("bank-prompt").value = b ? b.prompt || "" : "";
  $("bank-notes").value = b ? b.notes || "" : "";
  $("bank-delete").classList.toggle("hidden", !b);
  $("bank-modal").classList.remove("hidden");
  $("bank-title").focus();
}

function closeBankModal() {
  $("bank-modal").classList.add("hidden");
  bankEditingId = null;
}

function saveBankModal() {
  const title = $("bank-title").value.trim() || "(untitled)";
  const patch = {
    title,
    difficulty: $("bank-difficulty").value,
    prompt: $("bank-prompt").value,
    notes: $("bank-notes").value
  };

  if (bankEditingId) {
    Object.assign(state.bank.find((b) => b.id === bankEditingId), patch);
  } else {
    state.bank.push({ id: "b" + Date.now().toString(36), ...patch });
  }
  persist.bank();
  closeBankModal();
  renderBank();
}

function deleteBankItem() {
  if (!bankEditingId) return;
  const b = state.bank.find((x) => x.id === bankEditingId);
  if (!confirm(`Delete "${b.title}"?`)) return;
  state.bank = state.bank.filter((x) => x.id !== bankEditingId);
  persist.bank();
  closeBankModal();
  renderBank();
}

/* ------------------------------------------------------------------ */
/* jobs & resources                                                    */
/* ------------------------------------------------------------------ */

let jobsState = { loading: false, last: null };

async function renderJobs(opts = {}) {
  const refresh = !!opts.refresh;
  $("jobs-body").innerHTML = `<p class="empty-state">Loading live Intern List postings…</p>`;
  $("jobs-banner").textContent = "";
  jobsState.loading = true;

  const kind = $("jobs-kind").value;
  const section = $("jobs-section") ? $("jobs-section").value : "all";
  const sort = $("jobs-sort").value;
  const q = $("jobs-search").value.trim();
  const params = new URLSearchParams({ kind, sort, section });
  if (q) params.set("q", q);
  if (refresh) params.set("refresh", "1");

  try {
    const res = await fetch("/api/jobs?" + params.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    jobsState.last = data;
    paintJobs(data);
  } catch (err) {
    $("jobs-body").innerHTML = `<p class="empty-state">Could not load jobs: ${escapeHtml(err.message)}</p>`;
    $("jobs-meta").textContent = "";
  } finally {
    jobsState.loading = false;
  }
}

function paintJobs(data) {
  $("jobs-resources").innerHTML = (data.resources || [])
    .map(
      (r) => `<a class="card compact" href="${escapeHtml(r.url)}" target="_blank" rel="noopener">
        <span class="kicker">${escapeHtml(r.kind)}</span>
        <h3>${escapeHtml(r.title)}</h3>
        <p>${escapeHtml(r.blurb)}</p>
        <div class="card-foot"><span class="go">Open &#8599;</span></div>
      </a>`
    )
    .join("");

  const when = data.fetchedAt ? new Date(data.fetchedAt).toLocaleString() : "";
  const hint = data.openingsHint ? ` · ~${Number(data.openingsHint).toLocaleString()} in source` : "";
  $("jobs-meta").textContent = `${data.total} shown${hint} · ${when}`;

  const sort = $("jobs-sort").value;
  const fresh = (data.jobs || []).filter((j) => j.ageDays != null && j.ageDays <= 1).length;
  $("jobs-banner").innerHTML =
    sort === "company"
      ? `Sorted A–Z by company.`
      : `Newest first from Intern List / Jobright${fresh ? ` · <strong>${fresh}</strong> posted in the last day` : ""}.`;

  if (data.errors && data.errors.length) {
    $("jobs-banner").innerHTML += ` <span class="muted">(${data.errors.length} source error${data.errors.length > 1 ? "s" : ""})</span>`;
  }

  if (!data.jobs || !data.jobs.length) {
    $("jobs-body").innerHTML = `<p class="empty-state">No roles match these filters.</p>`;
    return;
  }

  $("jobs-body").innerHTML = jobsTableHtml(data.jobs);
}

function jobsTableHtml(jobs) {
  return `<table class="ptable jobs-table">
    <thead><tr>
      <th>Company</th><th>Role</th><th>Location</th><th>Salary</th><th>Age</th><th>Track</th><th></th>
    </tr></thead>
    <tbody>${jobs
      .map(
        (j) => `<tr>
          <td class="c-co"><strong>${escapeHtml(j.company)}</strong></td>
          <td class="c-title">
            <a href="${escapeHtml(j.apply)}" target="_blank" rel="noopener">${escapeHtml(j.title)}</a>
            ${j.workModel ? `<div class="muted tiny">${escapeHtml(j.workModel)}</div>` : ""}
          </td>
          <td class="c-loc muted">${escapeHtml(j.location || "")}</td>
          <td class="c-sal muted mono">${escapeHtml(j.salary || "—")}</td>
          <td class="c-age muted mono">${escapeHtml(j.age || (j.ageDays != null ? Math.round(j.ageDays) + "d" : ""))}</td>
          <td class="c-src"><span class="chip">${escapeHtml(j.section || j.kind)}</span></td>
          <td class="c-act"><a class="btn-ghost small" href="${escapeHtml(j.apply)}" target="_blank" rel="noopener">Apply</a></td>
        </tr>`
      )
      .join("")}</tbody></table>`;
}

/* ------------------------------------------------------------------ */
/* progress                                                            */
/* ------------------------------------------------------------------ */

function renderProgress() {
  const all = overallStats();
  const reviewed = Object.entries(state.reviews);
  const scores = reviewed.map(([, r]) => r.score).filter((s) => typeof s === "number");
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const attempts = Object.values(state.progress).reduce((n, p) => n + (p.attempts || 0), 0);

  $("progress-summary").innerHTML = [
    { title: "Solved", value: all.solved, body: `of ${all.total} tracked problems` },
    { title: "Submissions", value: attempts, body: "graded by the coach" },
    { title: "Average score", value: avg == null ? "-" : avg, body: "across reviewed solutions" },
    { title: "Reviewed", value: reviewed.length, body: "problems with stored feedback" }
  ]
    .map(
      (s) => `<div class="stat-card">
        <span class="kicker">${escapeHtml(s.title)}</span>
        <strong>${escapeHtml(String(s.value))}</strong>
        <p>${escapeHtml(s.body)}</p>
      </div>`
    )
    .join("");

  /* Recurring improvement themes are more useful than any single review. */
  const themes = new Map();
  for (const [, r] of reviewed) {
    for (const imp of r.improvements || []) {
      const k = imp.severity || "other";
      if (!themes.has(k)) themes.set(k, []);
      themes.get(k).push(imp.title);
    }
  }

  $("progress-weak").innerHTML = themes.size
    ? [...themes.entries()]
        .sort((a, b) => b[1].length - a[1].length)
        .map(
          ([sev, items]) => `<div class="weak-group">
            <h4><span class="sev ${escapeHtml(sev)}">${escapeHtml(sev)}</span> ${items.length}</h4>
            <ul>${[...new Set(items)].slice(0, 6).map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>
          </div>`
        )
        .join("")
    : `<p class="empty-state">Submit a few solutions and patterns in your mistakes will show up here.</p>`;

  const history = reviewed
    .map(([key, r]) => ({ key, r, p: getProblem(key) }))
    .filter((x) => x.p)
    .sort((a, b) => String(b.r.at || "").localeCompare(String(a.r.at || "")));

  $("progress-history").innerHTML = history.length
    ? history
        .map(
          ({ key, r, p }) => `<div class="hrow">
            <a class="hname" href="#/solve/${encodeURIComponent(key)}">${escapeHtml(p.heading)}</a>
            <span class="verdict ${escapeHtml(r.verdict)}">${escapeHtml(r.verdict)}</span>
            ${r.score != null ? `<span class="chip score s${scoreBand(r.score)}">${r.score}</span>` : ""}
            <span class="muted mono">${escapeHtml(r.time || "")} / ${escapeHtml(r.space || "")}</span>
            <span class="muted when">${r.at ? new Date(r.at).toLocaleDateString() : ""}</span>
          </div>`
        )
        .join("")
    : `<p class="empty-state">No reviews yet.</p>`;
}

/* ------------------------------------------------------------------ */
/* solve                                                               */
/* ------------------------------------------------------------------ */

let cm = null;
let currentKey = null;
let descTab = "description";
let hintsShown = 0;

function setQueue(keys, label, back) {
  state.prefs.queue = { keys, label, back };
  persist.prefs();
}

/* Prev/Next must work however you arrived: from a list, from a home link, or
   from a pasted URL. A stored queue only exists in the first case, so anything
   else falls back to the problem's natural neighbours. */
function queueFor(problem) {
  const stored = state.prefs.queue;
  if (stored && Array.isArray(stored.keys) && stored.keys.includes(problem.key)) return stored;
  return naturalQueue(problem);
}

function naturalQueue(problem) {
  if (problem.kind === "learn") {
    const qs = PRACTICE_QUESTIONS.filter((q) => q.patternId === problem.patternId);
    const ordered = qs.filter((q) => q.stage === "practice").concat(qs.filter((q) => q.stage === "interview"));
    const pattern = PATTERNS.find((p) => p.id === problem.patternId);
    return {
      keys: ordered.map((q) => "learn:" + q.id),
      label: pattern ? pattern.name : "Learning path",
      back: `#/learn/${encodeURIComponent(problem.patternId)}`
    };
  }

  if (problem.kind === "bank") {
    return { keys: state.bank.map((b) => "bank:" + b.id), label: "My bank", back: "#/bank" };
  }

  const p = BY_SLUG.get(problem.key);
  if (p && p.neetcode150) {
    return { keys: listProblems("neetcode150").map((x) => x.slug), label: "NeetCode 150", back: "#/practice/neetcode150" };
  }
  if (p && p.blind75) {
    return { keys: listProblems("blind75").map((x) => x.slug), label: "Blind 75", back: "#/practice/blind75" };
  }

  for (const name of COMPANIES_BY_SIZE) {
    const list = listProblems("company", name);
    if (list.some((x) => x.slug === problem.key)) {
      return {
        keys: list.map((x) => x.slug),
        label: companyLabel(name),
        back: `#/company/${encodeURIComponent(name)}`
      };
    }
  }

  if (p) {
    return { keys: listProblems("all").map((x) => x.slug), label: "All questions", back: "#/practice/all" };
  }

  return { keys: [problem.key], label: "Problems", back: "#/practice/neetcode150" };
}

let activeQueue = { keys: [], label: "", back: "#/" };

function initEditor() {
  if (!window.CodeMirror) return; // CDN unreachable; the textarea still works
  cm = CodeMirror.fromTextArea($("q-code"), {
    mode: "text/x-java",
    theme: (typeof currentUiTheme === "function" ? currentUiTheme() : { cmTheme: "eclipse" }).cmTheme,
    lineNumbers: true,
    indentUnit: 4,
    tabSize: 4,
    indentWithTabs: false,
    autoCloseBrackets: true,
    matchBrackets: true,
    styleActiveLine: true
  });
  cm.on("change", autosaveCode);
}

const editorValue = () => (cm ? cm.getValue() : $("q-code").value);

function setEditorValue(text) {
  if (cm) {
    cm.setValue(text || "");
    cm.clearHistory();
    setTimeout(() => cm.refresh(), 0);
  } else {
    $("q-code").value = text || "";
  }
}

function renderSolve() {
  const problem = getProblem(state.route.key);
  if (!problem) return go("#/");

  const switching = currentKey !== problem.key;
  currentKey = problem.key;
  if (switching) {
    descTab = "description";
    hintsShown = 0;
  }

  activeQueue = queueFor(problem);
  const i = activeQueue.keys.indexOf(problem.key);
  $("solve-back").href = activeQueue.back;
  $("solve-back").textContent = `\u2190 ${activeQueue.label}`;
  $("solve-crumb").innerHTML = problem.lists.map((l) => `<span class="chip">${escapeHtml(l)}</span>`).join("");

  $("q-position").textContent = activeQueue.keys.length > 1 ? `${i + 1} of ${activeQueue.keys.length}` : "";
  $("q-prev").disabled = i <= 0;
  $("q-next").disabled = i < 0 || i >= activeQueue.keys.length - 1;

  $("q-title").textContent = problem.heading;

  const meta = [diffBadge(problem.difficulty)];
  if (problem.acRate != null) meta.push(`<span class="badge tag" title="LeetCode acceptance rate">${problem.acRate}% AC</span>`);
  if (problem.category) meta.push(`<span class="badge tag">${escapeHtml(problem.category)}</span>`);
  if (problem.source) meta.push(`<span class="badge note">${escapeHtml(problem.source)}</span>`);
  if (problem.url) meta.push(`<a class="badge link" href="${problem.url}" target="_blank" rel="noopener">LeetCode &#8599;</a>`);
  if (isSolved(problem.key)) meta.push(`<span class="badge solved">&#10003; Solved</span>`);
  $("q-meta").innerHTML = meta.join("");

  $("q-companies").innerHTML = companyChips(problem.companies, 8);
  $("q-prompt").innerHTML = problem.html;

  setEditorValue(getCode(problem.key) ?? (problem[`${window.currentLang}Starter`] || problem.javaStarter));
  $("q-solved").checked = isSolved(problem.key);
  $("q-saved").textContent = "";

  $("q-run").disabled = !problem.runnable;
  $("q-run").title = problem.runnable
    ? "Run against example test cases (Ctrl/Cmd + Enter)"
    : problem.notRunnable || "This problem cannot be run locally";

  if (switching) hideRunPanel();

  renderTabs(problem);
  applyUiTheme(state.prefs.uiTheme || "hackerrank");
  document.title = `${problem.title} - Hackera`;
}

function renderTabs(problem) {
  const hasLesson = problem.kind === "learn" && problem.patternId;
  const hasHints = problem.hints && problem.hints.length;
  const review = state.reviews[problem.key];

  const visible = { description: true, hint: !!hasHints, review: !!review, lesson: !!hasLesson };
  if (!visible[descTab]) descTab = "description";

  const labels = themeTabLabels(problem, descTab);

  document.querySelectorAll(".ptab").forEach((b) => {
    const t = b.dataset.dtab;
    b.classList.toggle("hidden", !visible[t]);
    b.classList.toggle("active", t === descTab);
    b.textContent = labels[t];
  });

  $("tab-description").classList.toggle("hidden", descTab !== "description");
  $("tab-hint").classList.toggle("hidden", descTab !== "hint");
  $("tab-review").classList.toggle("hidden", descTab !== "review");
  $("tab-lesson").classList.toggle("hidden", descTab !== "lesson");

  if (descTab === "hint") renderHints(problem);
  if (descTab === "review") renderReview(problem);
  if (descTab === "lesson") {
    const p = PATTERNS.find((x) => x.id === problem.patternId);
    if (p) {
      $("tab-lesson").innerHTML = `<h2>${escapeHtml(p.name)}</h2>` + lessonHtml(p);
      wireLessonInteractive($("tab-lesson"), p);
    }
  }

  $("desc-body").scrollTop = 0;
}

/* Hints stay gated one at a time; seeing all of them at once is just the answer. */
function renderHints(problem) {
  const total = problem.hints.length;
  const shown = problem.hints.slice(0, hintsShown);

  $("tab-hint").innerHTML =
    (shown.length
      ? shown.map((h, i) => `<div class="hint"><span class="hint-n">Hint ${i + 1}</span><div class="prose lc">${h}</div></div>`).join("")
      : `<p class="muted">Try it for a few minutes first. Hints are revealed one at a time.</p>`) +
    (hintsShown < total
      ? `<button class="btn-ghost" id="hint-next">Reveal hint ${hintsShown + 1} of ${total}</button>`
      : `<p class="muted">That is all ${total}. Ask the coach if you are still stuck.</p>`);

  const btn = $("hint-next");
  if (btn)
    btn.addEventListener("click", () => {
      hintsShown++;
      renderHints(problem);
    });
}

function renderReview(problem) {
  const r = state.reviews[problem.key];
  if (!r) {
    $("tab-review").innerHTML = `<p class="empty-state">No review yet. Submit a solution to get one.</p>`;
    return;
  }

  const sev = (s) => `<span class="sev ${escapeHtml(s)}">${escapeHtml(s)}</span>`;

  $("tab-review").innerHTML = `
    <div class="review-head">
      <span class="verdict ${escapeHtml(r.verdict)}">${escapeHtml(r.verdict)}</span>
      ${r.score != null ? `<span class="score-big s${scoreBand(r.score)}">${r.score}</span>` : ""}
      <span class="muted mono">${escapeHtml(r.time || "?")} time / ${escapeHtml(r.space || "?")} space</span>
      ${r.optimal ? `<span class="badge solved">optimal</span>` : `<span class="badge note">not optimal</span>`}
    </div>
    <p class="review-summary">${escapeHtml(r.summary)}</p>
    ${
      (r.strengths || []).length
        ? `<h3>What worked</h3><ul class="tight">${r.strengths.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>`
        : ""
    }
    ${
      (r.improvements || []).length
        ? `<h3>Fix these</h3>${r.improvements
            .map(
              (i) => `<div class="imp">
                <div class="imp-head">${sev(i.severity)}<strong>${escapeHtml(i.title)}</strong></div>
                <p>${escapeHtml(i.detail)}</p>
              </div>`
            )
            .join("")}`
        : ""
    }
    ${
      (r.edgeCases || []).length
        ? `<h3>Edge cases to test</h3><ul class="tight">${r.edgeCases.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul>`
        : ""
    }
    ${
      (r.resources || []).length
        ? `<h3>Study these next</h3><ul class="resources">${r.resources
            .map(
              (x) => `<li><a href="${escapeHtml(x.url)}" target="_blank" rel="noopener">${escapeHtml(x.title)} &#8599;</a>
                <span class="muted">${escapeHtml(x.why)}</span></li>`
            )
            .join("")}</ul>`
        : ""
    }
    <p class="muted when">Reviewed ${r.at ? new Date(r.at).toLocaleString() : ""}</p>`;
}

let saveTimer = null;
function autosaveCode() {
  if (!currentKey) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    setCode(currentKey, editorValue());
    $("q-saved").textContent = "Saved";
    setTimeout(() => ($("q-saved").textContent = ""), 1200);
  }, 500);
}

function toggleSolved() {
  if (!currentKey) return;
  const marking = $("q-solved").checked;
  setStatus(currentKey, marking ? "solved" : "attempted");
  if (marking && typeof bumpActivity === "function") bumpActivity("solve");
  renderSolve();
}

function moveProblem(delta) {
  const i = activeQueue.keys.indexOf(currentKey);
  if (i < 0) return;
  const next = activeQueue.keys[i + delta];
  if (next) go(`#/solve/${encodeURIComponent(next)}`);
}

/* ------------------------------------------------------------------ */
/* submit + coach                                                      */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Run (local Java compile + example tests)                            */
/* ------------------------------------------------------------------ */

function hideRunPanel() {
  $("run-panel").classList.add("hidden");
  $("run-body").innerHTML = "";
  if (cm) setTimeout(() => cm.refresh(), 0);
}

function showRunPanel(summaryHtml, bodyHtml) {
  $("run-summary").innerHTML = summaryHtml;
  $("run-body").innerHTML = bodyHtml;
  $("run-panel").classList.remove("hidden");
  if (cm) setTimeout(() => cm.refresh(), 0);
}

function runSlugFor(problem) {
  if (problem.kind === "lc") return problem.key;
  return problem.runSlug || null;
}

async function runCode() {
  const problem = getProblem(currentKey);
  if (!problem) return;

  const code = editorValue();
  if (!code.trim()) {
    showRunPanel("Run", `<div class="run-compile">The editor is empty. Write an attempt first.</div>`);
    return;
  }

  const slug = runSlugFor(problem);
  if (!slug || !problem.runnable) {
    showRunPanel(
      "Can't run",
      `<div class="run-compile">${escapeHtml(problem.notRunnable || "This problem has no local test harness.")}</div>`
    );
    return;
  }

  setCode(currentKey, code);
  setBusy(true);
  $("q-run").textContent = "Running...";
  showRunPanel("Running...", `<p class="muted">Compiling and testing against ${problem.tests.length} example case${problem.tests.length === 1 ? "" : "s"}…</p>`);

  try {
    const res = await fetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        code,
        language: window.currentLang,
        meta: problem.meta,
        tests: problem.tests
      })
    });

    let data;
    try {
      data = await res.json();
    } catch {
      if (res.status !== 404 || !window.HackeraJava) {
        throw new Error(
          res.status === 404
            ? "Run API not found. Redeploy the site so /api/run is available."
            : `Bad response from server (HTTP ${res.status})`
        );
      }
      data = { fallback: "browser" };
    }

    if (data.fallback === "browser") {
      if (window.currentLang !== 'java') {
        throw new Error("Local/browser fallback is only available for Java. Ensure server API is running.");
      }
      data = await window.HackeraJava.run({
        code,
        meta: problem.meta,
        tests: problem.tests,
        onStatus(msg) {
          showRunPanel("Running...", `<p class="muted">${escapeHtml(msg)}</p>`);
        }
      });
    }

    if (data.stage === "compile" || (!data.ok && !data.cases?.length && data.error)) {
      showRunPanel(
        `<span style="color:var(--red)">Compile error</span>`,
        `<div class="run-compile">${escapeHtml(data.error || "Compilation failed")}</div>`
      );
      return;
    }

    if (data.stage === "runtime" && !data.cases?.length) {
      showRunPanel(
        `<span style="color:var(--amber)">Runtime error</span>`,
        `<div class="run-compile">${escapeHtml(data.error || "Runtime error")}</div>`
      );
      return;
    }

    const cases = data.cases || [];
    const passed = data.passed || 0;
    const total = data.total || cases.length;
    const allOk = data.ok;
    const summary = allOk
      ? `<span style="color:var(--green)">Accepted</span> <span class="muted">${passed}/${total} cases</span>`
      : `<span style="color:var(--red)">Wrong answer</span> <span class="muted">${passed}/${total} cases</span>`;

    const body = cases
      .map((c) => {
        const klass = c.error ? "error" : c.passed ? "pass" : "fail";
        const status = c.error ? "Error" : c.passed ? "Passed" : "Failed";
        const args = (c.args || []).map((a) => escapeHtml(a)).join("<br>");
        return `<div class="run-case ${klass}">
          <div class="run-case-head">
            <span class="status">${status}</span>
            <span class="muted">Case ${c.index}</span>
            <span class="muted mono">${c.ms || 0} ms</span>
          </div>
          <div class="run-kv">
            <div class="k">Input</div><div class="v">${args || "(none)"}</div>
            ${c.expected != null ? `<div class="k">Expected</div><div class="v">${escapeHtml(c.expected)}</div>` : ""}
            <div class="k">Output</div><div class="v">${escapeHtml(c.actual || "")}</div>
          </div>
          ${c.error ? `<div class="run-err">${escapeHtml(c.error)}</div>` : ""}
          ${c.stdout ? `<div class="run-kv" style="margin-top:6px"><div class="k">Stdout</div><div class="v">${escapeHtml(c.stdout)}</div></div>` : ""}
        </div>`;
      })
      .join("");

    showRunPanel(summary, body || `<div class="run-compile">${escapeHtml(data.error || "No cases returned")}</div>`);
  } catch (err) {
    showRunPanel(
      `<span style="color:var(--red)">Run failed</span>`,
      `<div class="run-compile">${escapeHtml(err.message)}</div>`
    );
  } finally {
    setBusy(false);
    $("q-run").textContent = currentUiTheme().runLabel;
  }
}

async function submitForReview() {
  const problem = getProblem(currentKey);
  if (!problem) return;

  const code = editorValue();
  if (!code.trim()) {
    setChatOpen(true);
    pushMessage("model", "The editor is empty. Write an attempt first, even a partial one.", true);
    return;
  }

  setCode(currentKey, code);
  recordAttempt(currentKey);
  if (typeof bumpActivity === "function") bumpActivity("attempt");
  setBusy(true);
  $("q-submit").textContent = "Reviewing...";

  const section =
    state.route.name === "solve" && problem.kind === "lc"
      ? problem.lists.join(", ") || "leetcode"
      : problem.kind;

  try {
    const attemptId = await db.saveAttempt({
      key: problem.key,
      title: problem.title,
      section,
      code
    });

    const review = await reviewSolution(problem, code);

    state.reviews[problem.key] = review;
    persist.reviews();

    if (review.score != null) bumpBestScore(problem.key, review.score);
    if (review.verdict === "correct") {
      setStatus(problem.key, "solved");
      if (typeof bumpActivity === "function") bumpActivity("solve");
    }
    db.saveReview(attemptId, problem.key, review);

    descTab = "review";
    renderSolve();

    pushMessage(
      "model",
      `**${problem.title}** - ${review.verdict}${review.score != null ? ` (${review.score}/100)` : ""}\n\n` +
        `${review.summary}\n\nComplexity: ${review.time} time, ${review.space} space. ` +
        `Full breakdown is in the Review tab.`
    );
  } catch (err) {
    setChatOpen(true);
    pushMessage("model", "Review failed: " + err.message, true);
  } finally {
    setBusy(false);
    $("q-submit").textContent = currentUiTheme().submitLabel;
  }
}

function renderChat() {
  const log = $("chat-log");
  log.innerHTML = "";

  if (!state.chat.length) {
    const empty = document.createElement("div");
    empty.className = "chat-empty";
    empty.textContent =
      "Ask for a nudge on the problem you are on, or hit Submit for review to get it graded. Enter sends, Shift+Enter makes a newline.";
    log.appendChild(empty);
  }

  state.chat.forEach((m) => {
    const div = document.createElement("div");
    div.className = "msg " + (m.role === "user" ? "user" : m.error ? "error" : "model");
    div.innerHTML = `<span class="who">${m.role === "user" ? "You" : "Coach"}</span>` + renderMarkdown(m.content);
    log.appendChild(div);
  });

  log.scrollTop = log.scrollHeight;
}

function pushMessage(role, content, error) {
  state.chat.push({ role, content, timestamp: Date.now(), error: !!error });
  if (state.chat.length > 60) state.chat = state.chat.slice(-60);
  persist.chat();
  renderChat();

  if (role !== "user" && !state.layout.chatOpen) $("chat-dot").classList.add("show");
}

function setBusy(busy) {
  state.busy = busy;
  $("chat-send").disabled = busy;
  $("chat-send").textContent = busy ? "Thinking..." : "Send";
  $("q-submit").disabled = busy;
  const problem = getProblem(currentKey);
  $("q-run").disabled = busy || !(problem && problem.runnable);
}

async function sendToCoach(userText) {
  if (state.busy || !userText.trim()) return;
  setChatOpen(true);
  pushMessage("user", userText.trim());
  setBusy(true);
  try {
    pushMessage("model", await callGeminiChat());
  } catch (err) {
    pushMessage("model", "Request failed: " + err.message, true);
  } finally {
    setBusy(false);
  }
}

function askForHint() {
  const problem = getProblem(currentKey);
  if (!problem) return;
  const code = editorValue().trim();
  sendToCoach(
    `${problemContext(problem)}\n\n` +
      (code ? `--- MY CURRENT JAVA ---\n\`\`\`java\n${code}\n\`\`\`\n\n` : "") +
      `Give me ONE hint that moves me forward. Do not give the full solution.`
  );
}

function quizMe(p) {
  sendToCoach(
    `I just read the lesson on the "${p.name}" pattern. Quiz me: ask exactly three short questions, ` +
      `one at a time, testing whether I can RECOGNIZE when this pattern applies and whether I know its failure modes. ` +
      `Ask question one only and wait for my answer.`
  );
}

/* ------------------------------------------------------------------ */
/* chat panel + layout                                                 */
/* ------------------------------------------------------------------ */

function setChatOpen(open) {
  state.layout.chatOpen = open;
  persist.layout();
  $("chat").classList.toggle("hidden", !open);
  $("gutter-3").classList.toggle("hidden", !open);
  $("chat-toggle").classList.toggle("active", open);
  if (open) {
    $("chat-dot").classList.remove("show");
    $("chat-log").scrollTop = $("chat-log").scrollHeight;
  }
  if (cm) cm.refresh();
}

function applyLayout() {
  $("chat").style.flexBasis = state.layout.chat + "px";
  $("pane-desc").style.flexBasis = state.layout.desc + "%";
  $("pane-editor").style.flexBasis = 100 - state.layout.desc + "%";
  if (cm) cm.refresh();
}

function makeDraggable(gutterId, onDrag) {
  $(gutterId).addEventListener("mousedown", (e) => {
    e.preventDefault();
    document.body.classList.add("dragging");
    const move = (ev) => onDrag(ev);
    const up = () => {
      document.body.classList.remove("dragging");
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      persist.layout();
      if (cm) cm.refresh();
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  });
}

function initSplits() {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  makeDraggable("gutter-2", (e) => {
    const box = $("content").getBoundingClientRect();
    state.layout.desc = clamp(((e.clientX - box.left) / box.width) * 100, 22, 78);
    applyLayout();
  });
  makeDraggable("gutter-3", (e) => {
    state.layout.chat = clamp(window.innerWidth - e.clientX - 8, 280, 640);
    applyLayout();
  });
  applyLayout();
}

/* ------------------------------------------------------------------ */
/* timer                                                               */
/* ------------------------------------------------------------------ */

function parseDuration(str) {
  const parts = String(str).trim().split(":").map((p) => parseInt(p, 10));
  if (parts.some((n) => Number.isNaN(n))) return null;
  let h = 0, m = 0, s = 0;
  if (parts.length === 3) [h, m, s] = parts;
  else if (parts.length === 2) [m, s] = parts;
  else if (parts.length === 1) [m] = parts;
  else return null;
  return ((h * 60 + m) * 60 + s) * 1000;
}

function formatDuration(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  return [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60]
    .map((n) => String(n).padStart(2, "0"))
    .join(":")
    .replace(/^00:/, "");
}

function timerRemaining() {
  if (state.timer.running && state.timer.endsAt) return Math.max(0, state.timer.endsAt - Date.now());
  return Math.max(0, state.timer.remainingMs || 0);
}

function renderTimer() {
  const ms = timerRemaining();
  const el = $("timer-display");
  el.textContent = formatDuration(ms);
  el.classList.toggle("warn", ms <= 5 * 60 * 1000 && ms > 0);

  // Showing the duration box and the countdown at once reads as two clocks.
  const live = state.timer.running || state.timer.paused;
  el.classList.toggle("hidden", !live);
  $("timer-input").classList.toggle("hidden", live);

  if (state.timer.running && ms === 0) {
    state.timer.running = false;
    state.timer.remainingMs = 0;
    persist.timer();
  }
}

function startTimer() {
  if (state.timer.running) return;
  const base =
    state.timer.paused && state.timer.remainingMs > 0
      ? state.timer.remainingMs
      : parseDuration($("timer-input").value) || 0;
  if (!base) return;
  state.timer = { endsAt: Date.now() + base, remainingMs: base, running: true, paused: false };
  persist.timer();
  renderTimer();
}

function pauseTimer() {
  if (!state.timer.running) return;
  state.timer = { endsAt: null, remainingMs: timerRemaining(), running: false, paused: true };
  persist.timer();
  renderTimer();
}

function resetTimer() {
  const parsed = parseDuration($("timer-input").value);
  state.timer = { endsAt: null, remainingMs: parsed === null ? 0 : parsed, running: false, paused: false };
  persist.timer();
  renderTimer();
}

/* ------------------------------------------------------------------ */
/* wiring                                                              */
/* ------------------------------------------------------------------ */

function initFilters() {
  const f = state.prefs.filters;
  const update = (patch) => {
    Object.assign(f, patch);
    persist.prefs();
    if (state.route.name === "list") renderList();
    if (state.route.name === "practice") renderPractice();
  };

  let searchTimer = null;
  $("f-search").addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    const v = e.target.value;
    searchTimer = setTimeout(() => update({ q: v }), 150);
  });
  $("f-difficulty").addEventListener("change", (e) => update({ difficulty: e.target.value }));
  $("f-status").addEventListener("change", (e) => update({ status: e.target.value }));
  $("f-company").addEventListener("change", (e) => update({ company: e.target.value }));
  $("f-group").addEventListener("change", () => state.route.name === "list" && renderList());
  $("f-company-sort").addEventListener("change", (e) => {
    state.prefs.companySort = e.target.value;
    persist.prefs();
    if (state.route.name === "list") renderList();
  });
  $("f-clear").addEventListener("click", () =>
    update({ q: "", difficulty: "all", status: "all", company: "all" })
  );
}

function init() {
  initUiTheme();
  initEditor();
  initSplits();
  initFilters();
  initPracticeFilters();
  initActivity();

  $("q-prev").addEventListener("click", () => moveProblem(-1));
  $("q-next").addEventListener("click", () => moveProblem(1));
  $("q-run").addEventListener("click", runCode);
  $("run-close").addEventListener("click", hideRunPanel);
  $("q-submit").addEventListener("click", submitForReview);
  $("q-solved").addEventListener("change", toggleSolved);
  $("q-hint-btn").addEventListener("click", askForHint);
  $("code-reset").addEventListener("click", () => {
    const p = getProblem(currentKey);
    if (p && confirm("Discard your code and restore the starter?")) {
      const starter = p[`${window.currentLang}Starter`] || p.javaStarter;
      setEditorValue(starter);
      setCode(p.key, starter);
    }
  });

  const langSelect = $("lang-select");
  if (langSelect) {
    langSelect.value = window.currentLang;
    langSelect.addEventListener("change", (e) => {
      window.currentLang = e.target.value;
      localStorage.setItem("hackera-lang", window.currentLang);
      const p = getProblem(currentKey);
      if (p) {
        setEditorValue(getCode(p.key) ?? (p[`${window.currentLang}Starter`] || p.javaStarter));
      }
    });
  }
  if (!cm) $("q-code").addEventListener("input", autosaveCode);

  document.querySelectorAll(".ptab").forEach((b) => {
    b.addEventListener("click", () => {
      descTab = b.dataset.dtab;
      const p = getProblem(currentKey);
      if (p) renderTabs(p);
    });
  });

  $("bank-new").addEventListener("click", () => openBankModal(null));
  $("bank-save").addEventListener("click", saveBankModal);
  $("bank-cancel").addEventListener("click", closeBankModal);
  $("bank-delete").addEventListener("click", deleteBankItem);
  $("bank-modal").addEventListener("click", (e) => {
    if (e.target === $("bank-modal")) closeBankModal();
  });

  let jobsSearchTimer = null;
  $("jobs-refresh").addEventListener("click", () => renderJobs({ refresh: true }));
  $("jobs-kind").addEventListener("change", () => renderJobs());
  if ($("jobs-section")) $("jobs-section").addEventListener("change", () => renderJobs());
  $("jobs-sort").addEventListener("change", () => renderJobs());
  $("jobs-search").addEventListener("input", () => {
    clearTimeout(jobsSearchTimer);
    jobsSearchTimer = setTimeout(() => renderJobs(), 200);
  });

  $("chat-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const text = $("chat-input").value;
    $("chat-input").value = "";
    sendToCoach(text);
  });
  $("chat-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      $("chat-form").requestSubmit();
    }
  });
  $("chat-clear").addEventListener("click", () => {
    if (!state.chat.length || confirm("Clear the whole conversation?")) {
      state.chat = [];
      persist.chat();
      renderChat();
    }
  });
  $("chat-close").addEventListener("click", () => setChatOpen(false));
  $("chat-toggle").addEventListener("click", () => setChatOpen(!state.layout.chatOpen));

  document.addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName) || (cm && cm.hasFocus());
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
      e.preventDefault();
      setChatOpen(!state.layout.chatOpen);
    } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && state.route.name === "solve" && !e.shiftKey) {
      e.preventDefault();
      runCode();
    } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "Enter" && state.route.name === "solve") {
      e.preventDefault();
      submitForReview();
    } else if (e.key === "Escape") {
      if (!$("bank-modal").classList.contains("hidden")) closeBankModal();
      else if (!$("run-panel").classList.contains("hidden")) hideRunPanel();
      else if (state.layout.chatOpen) setChatOpen(false);
    } else if (!typing && state.route.name === "solve") {
      if (e.key === "[") moveProblem(-1);
      if (e.key === "]") moveProblem(1);
    }
  });

  $("timer-start").addEventListener("click", startTimer);
  $("timer-pause").addEventListener("click", pauseTimer);
  $("timer-reset").addEventListener("click", resetTimer);

  const storedKey = load(KEYS.apiKey, "");
  if (storedKey) $("api-key").value = storedKey;
  else if (window.GEMINI_API_KEY) $("api-key").placeholder = "Using config.js";
  $("api-key").addEventListener("change", () => save(KEYS.apiKey, $("api-key").value.trim()));

  window.addEventListener("hashchange", navigate);
  window.addEventListener("resize", () => cm && cm.refresh());

  setChatOpen(state.layout.chatOpen === true);
  renderChat();
  renderTimer();
  renderSyncBadge();
  setInterval(renderTimer, 250);

  /* Auth first — guests only see landing; never flash app chrome. */
  document.body.classList.add("guest");
  const boot = async () => {
    if (typeof Auth !== "undefined" && Auth.init) {
      await Auth.init();
      Auth.onChange((user) => {
        applyAuthUser(user);
        navigate();
      });
    }
    if (isLoggedIn()) {
      await syncFromDb();
    }
    navigate();
    renderSyncBadge();
  };
  boot();
}

init();
