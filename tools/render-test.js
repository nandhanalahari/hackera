/* Headless smoke test: loads the app in jsdom, walks every route, and fails
   on any thrown error, console error, or empty view.

   node tools/render-test.js */

const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const errors = [];
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => errors.push("jsdomError: " + e.message));
vc.on("error", (...a) => errors.push("console.error: " + a.join(" ")));
vc.on("warn", (m) => {
  if (!/supabase/i.test(String(m))) errors.push("console.warn: " + m);
});

const dom = new JSDOM(read("index.html"), {
  url: "http://localhost:8000/",
  runScripts: "outside-only",
  pretendToBeVisual: true,
  virtualConsole: vc
});

const { window } = dom;

/* Things the CDN and the browser would normally provide. */
window.CodeMirror = undefined;
window.fetch = () => Promise.reject(new Error("offline in tests"));
window.crypto = window.crypto || {};
window.crypto.randomUUID = () => "test-user-key";
window.confirm = () => true;
window.scrollTo = () => {};
window.HTMLElement.prototype.scrollIntoView = () => {};

/* Browsers share one global scope across <script> tags, so concatenate. */
const bundle =
  [
    "config.js",
    "data.js",
    "data/problems.js",
    "data/system-design.js",
    "js/store.js",
    "js/catalog.js",
    "js/themes.js",
    "js/lesson-visuals.js",
    "js/design.js",
    "js/activity.js",
    "js/practice.js",
    "js/relearn.js",
    "js/coach.js",
    "js/app.js"
  ]
    .map(read)
    .join("\n;\n") +
  /* Top-level const is script-scoped, not a window property, in browsers too.
     The app relies on that shared scope; the test needs handles. */
  `\n;window.Auth = {
      isLoggedIn: () => true,
      getAccessToken: () => null,
      getUser: () => ({ id: "test-user", email: "test@example.com", name: "Test" }),
      onChange: () => {},
      init: async () => {}
    };
    Object.assign(window, {
      PROBLEMS, PATTERNS, PRACTICE_QUESTIONS, SD_TOPICS, state, isSolved, isAttempted,
      setChatOpen, getProblem, COMPANY_INDEX, statsFor, overallStats,
      submitForReview, setEditorValue, db, progressFor,
      markRelearn, relearnQueue, relearnStats
    });`;

let failures = 0;
const check = (name, ok, detail) => {
  if (ok) {
    console.log(`  ok    ${name}`);
  } else {
    failures++;
    console.log(`  FAIL  ${name}${detail ? " -- " + detail : ""}`);
  }
};

try {
  window.eval(bundle);
} catch (e) {
  console.error("Bundle threw on load:\n", e.stack);
  process.exit(1);
}

const $ = (id) => window.document.getElementById(id);

function visit(hash) {
  window.location.hash = hash;
  window.dispatchEvent(new window.Event("hashchange"));
}

console.log("\ndata");
check("problems loaded", window.PROBLEMS.length >= 3000, `got ${window.PROBLEMS.length}`);
check("150 in NeetCode 150", window.PROBLEMS.filter((p) => p.neetcode150).length === 150);
check("75 in Blind 75", window.PROBLEMS.filter((p) => p.blind75).length === 75);
check(
  "curated lists have content",
  window.PROBLEMS.filter((p) => p.neetcode150 || p.blind75).every((p) => p.content.length > 40)
);
check(
  "most problems have a Java stub",
  window.PROBLEMS.filter((p) => p.java && (p.java.includes("class") || p.java.includes("interface"))).length >= 2400
);
check("every problem has a difficulty", window.PROBLEMS.every((p) => ["Easy", "Medium", "Hard"].includes(p.difficulty)));
check("company tags present", window.PROBLEMS.every((p) => p.companies.length > 0));
check("tiktok has 300+ questions", window.PROBLEMS.filter((p) => p.companies.some((c) => c.name === "tiktok")).length >= 300);
check("40 curated questions", window.PRACTICE_QUESTIONS.length === 40);
check("system design topics", window.SD_TOPICS.length >= 5);
check("design scenarios", window.SD_TOPICS.reduce((n, t) => n + t.scenarios.length, 0) >= 15);

console.log("\nroutes");
const routes = [
  ["#/", "view-home", "home-continue"],
  ["#/practice", "view-practice", "practice-body"],
  ["#/practice/neetcode150", "view-practice", "practice-body"],
  ["#/practice/blind75", "view-practice", "practice-body"],
  ["#/blind75", "view-practice", "practice-body"],
  ["#/companies", "view-companies", "company-grid"],
  ["#/company/tiktok", "view-list", "list-body"],
  ["#/learn", "view-learn", "learn-body"],
  ["#/design", "view-design", "design-body"],
  ["#/design/requirements", "view-design-topic", "design-topic-scenarios"],
  ["#/bank", "view-bank", "bank-body"],
  ["#/progress", "view-progress", "progress-summary"],
  ["#/relearn", "view-relearn", "relearn-due"]
];

for (const [hash, viewId, contentId] of routes) {
  visit(hash);
  const shown = !$(viewId).classList.contains("hidden");
  const filled = $(contentId).innerHTML.trim().length > 0;
  check(`${hash} shows ${viewId}`, shown);
  check(`${hash} renders content`, filled, `${contentId} is empty`);
}

console.log("\nproblem checklist");
visit("#/learn");
const problemBoxes = $("learn-body").querySelectorAll("[data-problem]");
check("one finish box per problem", problemBoxes.length === window.PRACTICE_QUESTIONS.length, `got ${problemBoxes.length}`);
check("no chapter-level boxes", $("learn-body").querySelectorAll("[data-chapter]").length === 0);
const firstBox = problemBoxes[0];
firstBox.checked = true;
firstBox.dispatchEvent(new window.Event("change"));
check("checking a problem sticks", window.state.prefs.problemDone[firstBox.dataset.problem] === true);
check("problem count updates", $("learn-done").textContent.startsWith("1 /"));
visit("#/learn");
check(
  "problem check survives a rerender",
  $("learn-body").querySelector(`[data-problem="${firstBox.dataset.problem}"]`).checked
);
console.log("\nrelearn");
window.state.relearn = {};
visit("#/relearn");
check("relearn starts empty", $("relearn-due").textContent.includes("Nothing marked yet"));
const t0 = Date.now();
const DAY = 24 * 60 * 60 * 1000;
window.markRelearn("two-sum", "just-now", t0);
check("a fresh mark is in the queue right away", window.relearnQueue().length === 1);
window.markRelearn("two-sum", "months", t0);
check("earlier does not reset a fresh mark", window.state.relearn["two-sum"].lastResult === "just-now");
window.markRelearn("add-two-numbers", "month", t0);
window.markRelearn("container-with-most-water", "week", t0);
let q = window.relearnQueue().map((e) => e.slug);
check("least recently visited is first", q.join() === "add-two-numbers,container-with-most-water,two-sum", q.join());
window.markRelearn("add-two-numbers", "flawless", t0 + 1000);
q = window.relearnQueue().map((e) => e.slug);
check("flawless goes to the back", q[q.length - 1] === "add-two-numbers", q.join());
window.markRelearn("container-with-most-water", "practice", t0 + 2000);
q = window.relearnQueue().map((e) => e.slug);
check("needs more practice goes back into the queue", q.includes("container-with-most-water") && q.length === 3);
check("needs more practice is counted", window.state.relearn["container-with-most-water"].lapses === 1);
["longest-substring-without-repeating-characters", "3sum", "group-anagrams", "valid-anagram"].forEach((extra, i) => {
  window.markRelearn(extra, "months", t0 - (200 - i * 10) * DAY + 90 * DAY);
});
window.markRelearn("two-sum", "practice", t0 + 3000);
const after = window.relearnQueue().map((e) => e.slug);
check("needs more practice lands a few places down, not at the front", after.indexOf("two-sum") === 3, after.join());
check("needs more practice is not the very back", after.indexOf("two-sum") < after.length - 1, after.join());
check("reviews never reset the original solve date", window.state.relearn["two-sum"].solvedAt === t0);
check("last visited shows the real review time", window.state.relearn["two-sum"].lastSeenAt === t0 + 3000);
const stats = window.relearnStats();
check("stats count marked problems", stats.markedTotal === Object.keys(window.state.relearn).length);
check("stats split by difficulty", stats.marked.Easy + stats.marked.Medium + stats.marked.Hard === stats.markedTotal);
check("stats compare against the catalog", stats.total === window.PROBLEMS.length);
visit("#/relearn");
check("stat cards render", $("relearn-stats").querySelectorAll("[data-relearn-filter]").length === 4);
check("the top of the queue is highlighted", $("relearn-due").querySelector(".relearn-next .relearn-title") !== null);
check("queue shows every marked problem", $("relearn-due").querySelectorAll(".relearn-card").length === stats.markedTotal);
$("relearn-stats").querySelector('[data-relearn-filter="Easy"]').click();
const easyOnly = [...$("relearn-marked").querySelectorAll(".badge")].map((b) => b.textContent);
check("clicking Easy filters the marked list", easyOnly.length > 0 && easyOnly.every((d) => d === "Easy"), easyOnly.join());
$("relearn-stats").querySelector('[data-relearn-filter="Easy"]').click();
check("clicking it again shows everything", $("relearn-marked").querySelectorAll(".relearn-mrow").length === stats.markedTotal);
$("relearn-search").value = "two sum";
$("relearn-search").dispatchEvent(new window.Event("input"));
check("search lists Two Sum", $("relearn-results").textContent.includes("Two Sum"));
check(
  "a marked problem does not offer a first mark",
  !$("relearn-results").querySelector('[data-slug="two-sum"][data-relearn="just-now"]')
);
window.markRelearn("two-sum", "remove", t0);
$("relearn-search").dispatchEvent(new window.Event("input"));
const justNow = $("relearn-results").querySelector('[data-slug="two-sum"][data-relearn="just-now"]');
check("search can mark a solve", !!justNow);
justNow.click();
check("search mark sticks", window.state.relearn["two-sum"].lastResult === "just-now");
visit("#/solve/two-sum");
check("solve page shows queue position", $("q-relearn").textContent.includes("In your queue"));
window.state.relearn = {};

console.log("\nlessons");
for (const p of window.PATTERNS) {
  visit(`#/learn/${encodeURIComponent(p.id)}`);
  const body = $("lesson-body").innerHTML;
  check(`lesson ${p.id}`, body.length > 400 && $("lesson-title").textContent === p.name);
}

console.log("\nsolve view");
const samples = [
  "two-sum",
  "merge-k-sorted-lists",
  "meeting-rooms-ii",
  "alien-dictionary",
  "learn:" + window.PRACTICE_QUESTIONS[0].id
];
for (const key of samples) {
  visit(`#/solve/${encodeURIComponent(key)}`);
  const title = $("q-title").textContent;
  const prompt = $("q-prompt").innerHTML;
  const code = $("q-code").value;
  check(`solve ${key}`, title.length > 0 && prompt.length > 40, `title="${title}" prompt=${prompt.length}b`);
  check(`solve ${key} has starter code`, code.length > 10, `${code.length} chars`);
}

console.log("\npractice activity");
visit("#/practice/neetcode150");
check("activity sidebar renders", !!$("pr-week-cal").innerHTML.includes("pr-week-col"));
check("streak label present", $("pr-streak-num").textContent.length >= 1);

console.log("\ninteractions");
visit("#/solve/two-sum");
$("q-solved").checked = true;
$("q-solved").dispatchEvent(new window.Event("change"));
check("marking solved persists", window.isSolved("two-sum"));
check("solved shows on the list", (() => {
  visit("#/practice/neetcode150");
  return $("practice-body").innerHTML.includes("tick done");
})());

visit("#/solve/two-sum");
$("q-solved").checked = false;
$("q-solved").dispatchEvent(new window.Event("change"));
check("unmarking solved persists", !window.isSolved("two-sum"));

visit("#/practice/neetcode150");
$("pf-difficulty").value = "Hard";
$("pf-difficulty").dispatchEvent(new window.Event("change"));
const hardOnly = !$("practice-body").innerHTML.includes("pr-diff easy");
check("difficulty filter narrows the list", hardOnly);
$("pf-clear").click();
check("clear restores the list", $("practice-body").innerHTML.includes("pr-diff easy"));

$("pf-search").value = "island";
window.state.prefs.filters.q = "island";
visit("#/practice/neetcode150");
check("search matches", $("practice-body").innerHTML.toLowerCase().includes("island"));
window.state.prefs.filters.q = "";

console.log("\ncompany sort");
visit("#/company/tiktok");
check("company sort dropdown visible", !$("f-company-sort").classList.contains("hidden"));
check("group checkbox hidden on company page", $("f-group-wrap").classList.contains("hidden"));
$("f-company-sort").value = "recent";
$("f-company-sort").dispatchEvent(new window.Event("change"));
check("recent sort updates subtitle", /recent/i.test($("list-sub").textContent));
$("f-company-sort").value = "topic";
$("f-company-sort").dispatchEvent(new window.Event("change"));
check("topic sort groups list", $("list-body").innerHTML.includes("group-head"));
window.state.prefs.companySort = "freq";

console.log("\nreview rendering");
visit("#/solve/two-sum");
window.state.reviews["two-sum"] = {
  verdict: "almost",
  score: 72,
  time: "O(n)",
  space: "O(n)",
  optimal: false,
  summary: "Works but allocates twice.",
  strengths: ["Uses a hash map for the complement lookup."],
  improvements: [{ title: "Single pass", detail: "Build the map as you scan.", severity: "performance" }],
  edgeCases: ["Duplicate values that sum to the target."],
  resources: [{ title: "Two Sum", url: "https://leetcode.com/problems/two-sum/", why: "Editorial." }],
  at: new Date().toISOString()
};
visit("#/solve/two-sum");
window.descTab = "review";
const tabs = [...window.document.querySelectorAll(".ptab")];
tabs.find((t) => t.dataset.dtab === "review").click();
const rv = $("tab-review").innerHTML;
check("review tab renders", rv.includes("72") && rv.includes("Single pass") && rv.includes("leetcode.com"));
check("review tab is visible", !$("tab-review").classList.contains("hidden"));

visit("#/progress");
check("review appears in history", $("progress-history").innerHTML.includes("Two Sum"));
check("weak spots computed", $("progress-weak").innerHTML.includes("Single pass"));

console.log("\nchat panel");
window.setChatOpen(true);
check("chat opens", !$("chat").classList.contains("hidden"));
window.setChatOpen(false);
check("chat closes", $("chat").classList.contains("hidden"));

console.log("\nhints");
visit("#/solve/two-sum");
tabs.find((t) => t.dataset.dtab === "hint").click();
check("hints start gated", !$("tab-hint").innerHTML.includes("Hint 1"));
$("hint-next").click();
check("first hint reveals", $("tab-hint").innerHTML.includes("Hint 1"));
check("second hint still gated", !$("tab-hint").innerHTML.includes("Hint 2"));

/* The full submit path, with every network call recorded rather than sent.
   Gemini and Supabase are each verified for real elsewhere; what matters here
   is that this app wires them together correctly. */
(async function submitFlow() {
  console.log("\nsubmit flow");

  const calls = [];
  const fakeReview = {
    verdict: "correct",
    score: 94,
    time: "O(n)",
    space: "O(n)",
    optimal: true,
    summary: "Single pass with a complement map.",
    strengths: ["Handles duplicates correctly."],
    improvements: [{ title: "Name the map", detail: "seen reads better than m.", severity: "style" }],
    edgeCases: ["Empty array."],
    resources: [
      { title: "Two Sum", url: "https://leetcode.com/problems/two-sum/", why: "Editorial." },
      { title: "Totally Made Up", url: "https://some-invented-blog.example.com/post", why: "Should be dropped." }
    ]
  };

  window.fetch = (url, opts = {}) => {
    calls.push({ url: String(url), body: opts.body ? JSON.parse(opts.body) : null });

    if (String(url).includes("/api/coach")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ text: JSON.stringify(fakeReview) })
      });
    }
    const rows = String(url).includes("oa_attempts") ? [{ id: "attempt-1" }] : [];
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(rows) });
  };

  visit("#/solve/two-sum");
  window.setEditorValue("class Solution { /* real attempt */ }");
  await window.submitForReview();

  /* Startup sync may still be issuing GETs, so match writes by their body. */
  const write = (table) => calls.find((c) => c.url.includes(table) && c.body);

  const attempt = write("oa_attempts");
  check("attempt POSTed to Supabase", !!attempt);
  check("attempt carries the code", !!attempt && attempt.body.code.includes("real attempt"));
  check("attempt carries the slug", !!attempt && attempt.body.problem_slug === "two-sum");

  const graded = calls.find((c) => String(c.url).includes("/api/coach"));
  check("solution sent to Gemini", !!graded);
  check(
    "prompt includes the problem text",
    !!graded && JSON.stringify(graded.body).includes("indices of the two numbers")
  );
  check("prompt includes the code", !!graded && JSON.stringify(graded.body).includes("real attempt"));

  const saved = window.state.reviews["two-sum"];
  check("review stored locally", !!saved && saved.score === 94);
  check("bad resource URL dropped", !!saved && saved.resources.length === 1);
  check("good resource URL kept", !!saved && saved.resources[0].url.includes("leetcode.com"));

  const reviewRow = write("oa_reviews");
  check("review POSTed to Supabase", !!reviewRow);
  check("review linked to the attempt", !!reviewRow && reviewRow.body.attempt_id === "attempt-1");

  check("a correct verdict marks it solved", window.isSolved("two-sum"));
  check("attempt counted", window.progressFor("two-sum").attempts === 1);
  check("best score recorded", window.progressFor("two-sum").bestScore === 94);

  const progressRow = calls.filter((c) => c.url.includes("oa_progress") && c.body).pop();
  check("progress upserted", !!progressRow && progressRow.body.status === "solved");

  visit("#/solve/two-sum");
  check("review tab opens after grading", !$("tab-review").classList.contains("hidden"));
  check("review tab shows the score", $("tab-review").innerHTML.includes("94"));

  finish();
})();

function finish() {
console.log("");
if (errors.length) {
  console.log("runtime errors:");
  errors.forEach((e) => console.log("  " + e));
  failures += errors.length;
}

console.log(failures ? `\n${failures} FAILURE(S)\n` : "\nAll checks passed.\n");
process.exit(failures ? 1 : 0);
}
