"use strict";

/* One shape for every solvable thing in the app, so the solve view and the
   coach do not care whether a problem came from LeetCode, the guided
   curriculum, or a question you pasted in yourself. */

const BY_SLUG = new Map(PROBLEMS.map((p) => [p.slug, p]));

const COMPANY_LABELS = {
  tiktok: "TikTok",
  bytedance: "ByteDance",
  google: "Google",
  meta: "Meta",
  amazon: "Amazon",
  microsoft: "Microsoft",
  apple: "Apple",
  bloomberg: "Bloomberg",
  uber: "Uber",
  linkedin: "LinkedIn",
  netflix: "Netflix",
  airbnb: "Airbnb",
  doordash: "DoorDash",
  stripe: "Stripe",
  snap: "Snap",
  salesforce: "Salesforce",
  oracle: "Oracle",
  nvidia: "NVIDIA",
  pinterest: "Pinterest",
  twitter: "Twitter",
  lyft: "Lyft",
  "goldman-sachs": "Goldman Sachs",
  citadel: "Citadel",
  databricks: "Databricks",
  coinbase: "Coinbase",
  robinhood: "Robinhood",
  adobe: "Adobe"
};

function companyLabel(name) {
  return COMPANY_LABELS[name] || name.replace(/-/g, " ");
}

/* company -> problems asked there, most frequently asked first */
const COMPANY_INDEX = (() => {
  const idx = {};
  for (const p of PROBLEMS) {
    for (const c of p.companies) {
      (idx[c.name] = idx[c.name] || []).push({ problem: p, freq: c.freq, recent: c.recent });
    }
  }
  for (const list of Object.values(idx)) list.sort((a, b) => b.freq - a.freq);
  return idx;
})();

const COMPANIES_BY_SIZE = Object.keys(COMPANY_INDEX).sort(
  (a, b) => COMPANY_INDEX[b].length - COMPANY_INDEX[a].length
);

/* ------------------------------------------------------------------ */
/* unified problem                                                     */
/* ------------------------------------------------------------------ */

function lcProblem(slug) {
  const p = BY_SLUG.get(slug);
  if (!p) return null;
  return {
    key: p.slug,
    kind: "lc",
    num: p.id,
    title: p.title,
    heading: `${p.id}. ${p.title}`,
    difficulty: p.difficulty,
    acRate: p.acRate,
    html:
      p.content ||
      `<p class="muted">Full statement not available locally${p.paid ? " (LeetCode Premium)" : ""}. ` +
        `<a href="https://leetcode.com/problems/${p.slug}/" target="_blank" rel="noopener">Open on LeetCode ↗</a></p>`,
    starter:
      p.java ||
      `// Starter not available locally. See https://leetcode.com/problems/${p.slug}/\npublic class Solution {\n}\n`,
    hints: p.hints,
    topics: p.topics,
    companies: p.companies,
    paid: p.paid,
    runnable: !!p.runnable,
    notRunnable: p.notRunnable || "",
    tests: p.tests || [],
    meta: p.meta || null,
    url: `https://leetcode.com/problems/${p.slug}/`,
    lists: [
      p.neetcode150 ? "NeetCode 150" : null,
      p.blind75 ? "Blind 75" : null
    ].filter(Boolean),
    category: (p.neetcode150 && p.neetcode150.category) || (p.blind75 && p.blind75.category) || null
  };
}

function learnProblem(id) {
  const q = PRACTICE_QUESTIONS.find((x) => x.id === id);
  if (!q) return null;
  const pattern = PATTERNS.find((p) => p.id === q.patternId);
  /* When a curriculum question is a real LeetCode problem, reuse its
     runnable tests so Run works the same way as in NeetCode 150. */
  const lc = q.lc ? PROBLEMS.find((p) => p.id === q.lc) : null;
  return {
    key: "learn:" + q.id,
    kind: "learn",
    num: q.lc || null,
    title: q.title,
    heading: q.lc ? `${q.lc}. ${q.title}` : q.title,
    difficulty: q.difficulty,
    acRate: lc ? lc.acRate : null,
    html: "<p>" + escapeHtml(q.prompt).replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>") + "</p>",
    starter: q.starter,
    hints: q.hint ? [q.hint] : [],
    topics: pattern ? [pattern.name] : [],
    companies: q.lc ? lcCompaniesByNumber(q.lc) : [],
    url: q.lc ? `https://leetcode.com/problems/${slugGuess(q.title)}/` : null,
    lists: [q.stage === "practice" ? "Warm-up" : "Interview"],
    category: pattern ? pattern.name : null,
    patternId: q.patternId,
    stage: q.stage,
    source: q.source,
    runnable: !!(lc && lc.runnable),
    notRunnable: lc ? lc.notRunnable || "" : "Custom curriculum problem",
    tests: lc ? lc.tests || [] : [],
    meta: lc ? lc.meta : null,
    runSlug: lc ? lc.slug : null
  };
}

function bankProblem(id) {
  const b = state.bank.find((x) => x.id === id);
  if (!b) return null;
  return {
    key: "bank:" + b.id,
    kind: "bank",
    title: b.title || "(untitled)",
    heading: b.title || "(untitled)",
    difficulty: b.difficulty || "Medium",
    html: b.prompt
      ? "<p>" + escapeHtml(b.prompt).replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>") + "</p>"
      : "<p class='muted'>No prompt saved yet. Use Edit to paste the question.</p>",
    starter: "",
    hints: [],
    topics: [],
    companies: [],
    url: null,
    lists: ["My bank"],
    category: null,
    raw: b,
    runnable: false,
    notRunnable: "Custom bank questions have no local tests",
    tests: [],
    meta: null
  };
}

function slugGuess(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function lcCompaniesByNumber(num) {
  const hit = PROBLEMS.find((p) => p.id === num);
  return hit ? hit.companies : [];
}

/* "two-sum" | "learn:sw-1" | "bank:123" -> unified problem */
function getProblem(key) {
  if (!key) return null;
  if (key.startsWith("learn:")) return learnProblem(key.slice(6));
  if (key.startsWith("bank:")) return bankProblem(key.slice(5));
  return lcProblem(key);
}

/* Same LeetCode problem shows up as learn:hm1 and as two-sum. Progress,
   solved ticks and editor code should move together across those keys. */
const PROGRESS_ALIASES = (() => {
  const map = new Map();
  const link = (a, b) => {
    const group = new Set([...(map.get(a) || [a]), ...(map.get(b) || [b])]);
    for (const k of group) map.set(k, group);
  };
  for (const q of PRACTICE_QUESTIONS) {
    if (!q.lc) continue;
    const p = PROBLEMS.find((x) => x.id === q.lc);
    if (p) link("learn:" + q.id, p.slug);
  }
  return map;
})();

function progressKeys(key) {
  const group = PROGRESS_ALIASES.get(key);
  return group ? [...group] : [key];
}

/* ------------------------------------------------------------------ */
/* sections                                                            */
/* ------------------------------------------------------------------ */

function listProblems(section, company) {
  if (section === "all") {
    return [...PROBLEMS].sort((a, b) => a.id - b.id);
  }
  if (section === "neetcode150") {
    return PROBLEMS.filter((p) => p.neetcode150).sort(
      (a, b) =>
        NEETCODE_ORDER.indexOf(a.neetcode150.category) - NEETCODE_ORDER.indexOf(b.neetcode150.category) ||
        a.neetcode150.order - b.neetcode150.order
    );
  }
  if (section === "blind75") {
    return PROBLEMS.filter((p) => p.blind75).sort(
      (a, b) =>
        BLIND_ORDER.indexOf(a.blind75.category) - BLIND_ORDER.indexOf(b.blind75.category) ||
        a.blind75.order - b.blind75.order
    );
  }
  if (section === "company") {
    const entries = COMPANY_INDEX[company] || [];
    const sort = (typeof state !== "undefined" && state.prefs.companySort) || "freq";
    if (sort === "recent") {
      return [...entries]
        .sort((a, b) => (b.recent - a.recent) || (b.freq - a.freq))
        .map((e) => e.problem);
    }
    return entries.map((e) => e.problem);
  }
  return [];
}

function categoryOf(problem, section) {
  if (section === "neetcode150") return problem.neetcode150.category;
  if (section === "blind75") return problem.blind75.category;
  if (section === "company" || section === "all") return problem.topics[0] || "Other";
  return problem.topics[0] || "Other";
}

function sectionTitle(section, company) {
  if (section === "all") return "All questions";
  if (section === "neetcode150") return "NeetCode 150";
  if (section === "blind75") return "Blind 75";
  if (section === "company") return companyLabel(company);
  return section;
}

function companyListSubtitle(section, company, count) {
  if (section !== "company") return `${count} problems.`;
  const sort = state.prefs.companySort || "freq";
  if (sort === "recent") return `${count} reported questions, most recently asked first.`;
  if (sort === "topic") return `${count} reported questions, grouped by topic.`;
  return `${count} reported questions, most frequently asked first.`;
}

/* ------------------------------------------------------------------ */
/* stats                                                               */
/* ------------------------------------------------------------------ */

function statsFor(problems) {
  const out = { total: problems.length, solved: 0, attempted: 0, easy: [0, 0], medium: [0, 0], hard: [0, 0] };
  for (const p of problems) {
    const bucket = p.difficulty.toLowerCase();
    if (out[bucket]) out[bucket][1]++;
    if (isSolved(p.slug)) {
      out.solved++;
      if (out[bucket]) out[bucket][0]++;
    } else if (isAttempted(p.slug)) {
      out.attempted++;
    }
  }
  return out;
}

function learnStats() {
  const total = PRACTICE_QUESTIONS.length;
  const solved = PRACTICE_QUESTIONS.filter((q) => isSolved("learn:" + q.id)).length;
  return { total, solved, attempted: 0 };
}

function overallStats() {
  const all = new Set();
  PROBLEMS.forEach((p) => all.add(p.slug));
  /* Curriculum questions that are real LeetCode problems are already in
     PROBLEMS; only count the custom / unmatched ones separately. */
  PRACTICE_QUESTIONS.forEach((q) => {
    if (!q.lc || !PROBLEMS.some((p) => p.id === q.lc)) all.add("learn:" + q.id);
  });
  let solved = 0;
  let attempted = 0;
  for (const k of all) {
    if (isSolved(k)) solved++;
    else if (isAttempted(k)) attempted++;
  }
  return { total: all.size, solved, attempted };
}
