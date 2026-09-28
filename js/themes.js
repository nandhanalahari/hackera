"use strict";

/* Solve IDE themes. HackerRank is the default; LeetCode is the other option. */

const UI_THEME_CHOICES = ["hackerrank", "leetcode"];
const DEFAULT_UI_THEME = "hackerrank";

const UI_THEMES = {
  codesignal: {
    id: "codesignal",
    name: "CodeSignal",
    cmTheme: "eclipse",
    runLabel: "Run tests",
    submitLabel: "Submit",
    submitClass: "btn-submit",
    runClass: "btn-primary small",
    resultsLabel: "Test Results",
    tabs: "vertical",
    descTabLabels: { description: "Desc", hint: "Hints", review: "Review", lesson: "Lesson" }
  },
  hackerrank: {
    id: "hackerrank",
    name: "HackerRank",
    cmTheme: "dracula",
    runLabel: "Run Code",
    submitLabel: "Submit Code",
    submitClass: "btn-primary small",
    runClass: "btn-ghost small",
    resultsLabel: "Output",
    tabs: "horizontal",
    descTabLabels: { description: "Problem", hint: "Hints", review: "Review", lesson: "Lesson" }
  },
  leetcode: {
    id: "leetcode",
    name: "LeetCode",
    cmTheme: "material-darker",
    runLabel: "Run",
    submitLabel: "Submit",
    submitClass: "btn-primary small",
    runClass: "btn-ghost small",
    resultsLabel: "Testcase",
    tabs: "horizontal",
    descTabLabels: { description: "Description", hint: "Hint", review: "Review", lesson: "Solution" }
  },
  codility: {
    id: "codility",
    name: "Codility",
    cmTheme: "eclipse",
    runLabel: "Run",
    submitLabel: "Submit solution",
    submitClass: "btn-submit",
    runClass: "btn-ghost small",
    resultsLabel: "Results",
    tabs: "vertical",
    descTabLabels: { description: "Task", hint: "Hints", review: "Review", lesson: "Lesson" }
  },
  karat: {
    id: "karat",
    name: "Karat",
    cmTheme: "eclipse",
    runLabel: "Test",
    submitLabel: "Submit",
    submitClass: "btn-submit",
    runClass: "btn-primary small",
    resultsLabel: "Test output",
    tabs: "horizontal",
    descTabLabels: { description: "Instructions", hint: "Hints", review: "Feedback", lesson: "Notes" }
  }
};

const CM_THEMES_LOADED = new Set(["eclipse"]);

function loadCmTheme(name) {
  if (!name || CM_THEMES_LOADED.has(name) || name === "default") return Promise.resolve();
  CM_THEMES_LOADED.add(name);
  return new Promise((resolve) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/theme/${name}.min.css`;
    link.onload = resolve;
    link.onerror = resolve;
    document.head.appendChild(link);
  });
}

function resolveUiTheme(themeId) {
  return UI_THEME_CHOICES.includes(themeId) ? UI_THEMES[themeId] : UI_THEMES[DEFAULT_UI_THEME];
}

function currentUiTheme() {
  return resolveUiTheme(state.prefs.uiTheme);
}

function applyUiTheme(themeId) {
  const theme = resolveUiTheme(themeId);
  state.prefs.uiTheme = theme.id;
  persist.prefs();

  document.documentElement.dataset.ui = theme.id;
  document.body.dataset.ui = theme.id;

  if (!document.body.classList.contains("solving")) {
    document.body.removeAttribute("data-ui");
    document.documentElement.removeAttribute("data-ui");
  }

  const sel = $("ui-theme");
  if (sel && sel.value !== theme.id) sel.value = theme.id;

  /* Button labels in solve view */
  const runBtn = $("q-run");
  const submitBtn = $("q-submit");
  if (runBtn && !state.busy) runBtn.textContent = theme.runLabel;
  if (submitBtn && !state.busy) submitBtn.textContent = theme.submitLabel;

  if (runBtn) {
    runBtn.className = theme.runClass;
  }
  if (submitBtn) {
    submitBtn.className = theme.submitClass;
  }

  const runSummary = $("run-summary");
  if (runSummary && runSummary.childElementCount === 0) {
    runSummary.textContent = theme.resultsLabel;
  }

  /* Tab orientation */
  const ptabs = document.querySelector(".ptabs");
  if (ptabs) {
    ptabs.dataset.layout = theme.tabs;
    document.querySelectorAll(".ptab").forEach((tab) => {
      const key = tab.dataset.dtab;
      if (key && theme.descTabLabels[key]) tab.textContent = theme.descTabLabels[key];
    });
  }

  loadCmTheme(theme.cmTheme).then(() => {
    if (typeof cm !== "undefined" && cm) {
      cm.setOption("theme", theme.cmTheme);
      setTimeout(() => cm.refresh(), 0);
    }
  });
}

function syncUiThemeForRoute(isSolve) {
  if (isSolve) {
    applyUiTheme(state.prefs.uiTheme || DEFAULT_UI_THEME);
  } else {
    document.body.removeAttribute("data-ui");
    document.documentElement.removeAttribute("data-ui");
  }
}

function initUiTheme() {
  const sel = $("ui-theme");
  if (sel) {
    sel.innerHTML = UI_THEME_CHOICES
      .map((id) => `<option value="${id}">${escapeHtml(UI_THEMES[id].name)}</option>`)
      .join("");
    sel.value = resolveUiTheme(state.prefs.uiTheme).id;
    sel.addEventListener("change", () => applyUiTheme(sel.value));
  }
}

function themeTabLabels(problem, descTab) {
  const theme = currentUiTheme();
  const hasHints = problem.hints && problem.hints.length;
  const review = state.reviews[problem.key];
  const labels = { ...theme.descTabLabels };
  if (hasHints && problem.hints.length) labels.hint = `${labels.hint} (${problem.hints.length})`;
  if (review && review.score != null) labels.review = `${labels.review} (${review.score})`;
  return labels;
}
