"use strict";

/* Daily activity log, streak, and week calendar — NeetCode-style sidebar stats. */

const ACTIVITY_KEY = "oa.activity";

function dateKey(d) {
  const x = d instanceof Date ? d : new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function loadActivity() {
  return load(ACTIVITY_KEY, {});
}

function saveActivity(log) {
  save(ACTIVITY_KEY, log);
}

if (!state.activity) state.activity = loadActivity();

function persistActivity() {
  saveActivity(state.activity);
}

function bumpActivity(kind) {
  const k = dateKey(new Date());
  const day = state.activity[k] || { total: 0, solves: 0, attempts: 0, design: 0 };
  day.total = (day.total || 0) + 1;
  if (kind === "solve") day.solves = (day.solves || 0) + 1;
  else if (kind === "design") day.design = (day.design || 0) + 1;
  else day.attempts = (day.attempts || 0) + 1;
  state.activity[k] = day;
  persistActivity();
}

function dayCount(log, key) {
  const e = log[key];
  if (!e) return 0;
  return typeof e === "number" ? e : e.total || 0;
}

function backfillActivity() {
  if (state.prefs.activityBackfilled) return;
  const log = { ...state.activity };

  for (const p of Object.values(state.progress)) {
    if (p.solvedAt) {
      const k = dateKey(new Date(p.solvedAt));
      const e = log[k] || { total: 0, solves: 0, attempts: 0, design: 0 };
      e.solves = (e.solves || 0) + 1;
      e.total = Math.max(e.total || 0, (e.attempts || 0) + (e.solves || 0) + (e.design || 0));
      log[k] = e;
    }
  }

  for (const r of Object.values(state.reviews)) {
    if (r.at) {
      const k = dateKey(new Date(r.at));
      const e = log[k] || { total: 0, solves: 0, attempts: 0, design: 0 };
      e.attempts = (e.attempts || 0) + 1;
      e.total = Math.max(e.total || 0, (e.attempts || 0) + (e.solves || 0) + (e.design || 0));
      log[k] = e;
    }
  }

  for (const p of Object.values(state.designProgress || {})) {
    if (p.at) {
      const k = dateKey(new Date(p.at));
      const e = log[k] || { total: 0, solves: 0, attempts: 0, design: 0 };
      e.design = (e.design || 0) + 1;
      e.total = Math.max(e.total || 0, (e.attempts || 0) + (e.solves || 0) + (e.design || 0));
      log[k] = e;
    }
  }

  state.activity = log;
  state.prefs.activityBackfilled = true;
  persistActivity();
  persist.prefs();
}

function currentStreak(log) {
  log = log || state.activity;
  let streak = 0;
  const d = new Date();
  const today = dateKey(d);
  if (!dayCount(log, today)) d.setDate(d.getDate() - 1);
  while (dayCount(log, dateKey(d)) > 0) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function weekCalendar(log) {
  log = log || state.activity;
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  const labels = ["S", "M", "T", "W", "T", "F", "S"];
  return labels.map((label, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = dateKey(d);
    const count = dayCount(log, key);
    return { label, key, count, isToday: key === dateKey(now) };
  });
}

function activityLevel(count) {
  if (!count) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  return 3;
}

function starredCount() {
  return Object.keys(state.prefs.starred || {}).length;
}

function isStarred(slug) {
  return !!(state.prefs.starred && state.prefs.starred[slug]);
}

function toggleStar(slug) {
  if (!state.prefs.starred) state.prefs.starred = {};
  if (state.prefs.starred[slug]) delete state.prefs.starred[slug];
  else state.prefs.starred[slug] = true;
  persist.prefs();
}

function renderActivitySidebar(listStats) {
  backfillActivity();
  const log = state.activity;
  const streak = currentStreak(log);
  const week = weekCalendar(log);

  $("pr-sidebar-solved").textContent = `${listStats.solved}/${listStats.total}`;
  $("pr-sidebar-starred").textContent = String(starredCount());
  $("pr-streak-num").textContent = String(streak);
  $("pr-streak-wrap").classList.toggle("active", streak > 0);

  $("pr-week-cal").innerHTML = week
    .map(
      (d) => `<div class="pr-week-col${d.isToday ? " today" : ""}" title="${d.key}: ${d.count} activit${d.count === 1 ? "y" : "ies"}">
        <span class="pr-week-lbl">${d.label}</span>
        <span class="pr-week-bar lvl-${activityLevel(d.count)}"><i style="height:${d.count ? Math.min(100, 20 + d.count * 18) : 0}%"></i></span>
      </div>`
    )
    .join("");
}

function initActivity() {
  backfillActivity();
}
