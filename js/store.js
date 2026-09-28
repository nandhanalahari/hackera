"use strict";

/* State, localStorage persistence, and the Supabase mirror.
   localStorage is authoritative for rendering so the UI never blocks on the
   network; Supabase is a durable copy that is merged back in on startup. */

const $ = (id) => document.getElementById(id);

const KEYS = {
  progress: "oa.progress",
  code: "oa.code",
  reviews: "oa.reviews",
  bank: "oa.bank",
  chat: "oa.chat",
  timer: "oa.timer",
  apiKey: "oa.apiKey",
  layout: "oa.layout",
  prefs: "oa.prefs",
  learning: "oa.learning",
  designProgress: "oa.designProgress",
  user: "oa.userKey"
};

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or private mode; the session still works in memory */
  }
}

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* Guest id for local-only use. Signed-in users switch to auth.uid(). */
let guestKey = load(KEYS.user, null);
if (!guestKey) {
  guestKey =
    (crypto.randomUUID && crypto.randomUUID()) ||
    "u-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  save(KEYS.user, guestKey);
}
let userKey = guestKey;

function scopedKey(base) {
  if (!userKey || userKey === guestKey) return base;
  return `${base}.${userKey}`;
}

function loadScoped(base, fallback) {
  return load(scopedKey(base), fallback);
}

function saveScoped(base, value) {
  save(scopedKey(base), value);
}

function reloadScopedState() {
  state.progress = loadScoped(KEYS.progress, {});
  state.code = loadScoped(KEYS.code, {});
  state.reviews = loadScoped(KEYS.reviews, {});
  state.bank = loadScoped(KEYS.bank, []);
  state.chat = loadScoped(KEYS.chat, []);
  state.learning = loadScoped(KEYS.learning, {});
  state.designProgress = loadScoped(KEYS.designProgress, {});
  state.activity = load(scopedKey("oa.activity"), state.activity || {});
  state.synced = false;
}

function setActiveUserKey(nextKey) {
  const key = nextKey || guestKey;
  if (key === userKey) return false;
  userKey = key;
  reloadScopedState();
  return true;
}

/* ------------------------------------------------------------------ */
/* state                                                               */
/* ------------------------------------------------------------------ */

const state = {
  /* problemKey -> { status, attempts, bestScore, solvedAt } */
  progress: load(KEYS.progress, {}),
  /* problemKey -> last code in the editor */
  code: load(KEYS.code, {}),
  /* problemKey -> most recent structured review */
  reviews: load(KEYS.reviews, {}),
  bank: load(KEYS.bank, []),
  chat: load(KEYS.chat, []),
  timer: load(KEYS.timer, {
    endsAt: null,
    remainingMs: 70 * 60 * 1000,
    running: false,
    paused: false
  }),
  layout: load(KEYS.layout, { desc: 46, chat: 380, chatOpen: false }),
  prefs: load(KEYS.prefs, {
    company: "tiktok",
    uiTheme: "hackerrank",
    companySort: "freq",
    filters: { q: "", difficulty: "all", status: "all", company: "all" },
    practiceCollapsed: {},
    starred: {},
    activityBackfilled: false,
    expandedPattern: null
  }),
  learning: load(KEYS.learning, {}),
  designProgress: load(KEYS.designProgress, {}),
  route: { name: "home" },
  busy: false,
  synced: false
};

const persist = {
  progress: () => saveScoped(KEYS.progress, state.progress),
  code: () => saveScoped(KEYS.code, state.code),
  reviews: () => saveScoped(KEYS.reviews, state.reviews),
  bank: () => saveScoped(KEYS.bank, state.bank),
  chat: () => saveScoped(KEYS.chat, state.chat),
  timer: () => save(KEYS.timer, state.timer),
  layout: () => save(KEYS.layout, state.layout),
  prefs: () => save(KEYS.prefs, state.prefs),
  learning: () => saveScoped(KEYS.learning, state.learning),
  designProgress: () => saveScoped(KEYS.designProgress, state.designProgress)
};

/* ------------------------------------------------------------------ */
/* progress                                                            */
/* ------------------------------------------------------------------ */

function relatedKeys(key) {
  return typeof progressKeys === "function" ? progressKeys(key) : [key];
}

function progressFor(key) {
  return state.progress[key] || { status: "todo", attempts: 0, bestScore: null, solvedAt: null };
}

/* Prefer the richest record among aliases so a Learn solve lights up Blind 75. */
function bestProgress(key) {
  let best = progressFor(key);
  for (const k of relatedKeys(key)) {
    const p = progressFor(k);
    const rank = (s) => (s === "solved" ? 2 : s === "attempted" ? 1 : 0);
    if (
      rank(p.status) > rank(best.status) ||
      (rank(p.status) === rank(best.status) && (p.attempts || 0) > (best.attempts || 0)) ||
      (rank(p.status) === rank(best.status) && (p.bestScore || 0) > (best.bestScore || 0))
    ) {
      best = p;
    }
  }
  return best;
}

function isSolved(key) {
  return relatedKeys(key).some((k) => progressFor(k).status === "solved");
}

function isAttempted(key) {
  return relatedKeys(key).some((k) => {
    const s = progressFor(k).status;
    return s === "attempted" || s === "solved";
  });
}

function setStatus(key, status) {
  const now = new Date().toISOString();
  for (const k of relatedKeys(key)) {
    const p = progressFor(k);
    p.status = status;
    p.solvedAt = status === "solved" ? p.solvedAt || now : null;
    state.progress[k] = p;
    db.upsertProgress(k, p);
  }
  persist.progress();
}

function recordAttempt(key) {
  for (const k of relatedKeys(key)) {
    const p = progressFor(k);
    p.attempts = (p.attempts || 0) + 1;
    if (p.status === "todo") p.status = "attempted";
    state.progress[k] = p;
    db.upsertProgress(k, p);
  }
  persist.progress();
}

function bumpBestScore(key, score) {
  if (typeof score !== "number") return;
  for (const k of relatedKeys(key)) {
    const p = progressFor(k);
    if (p.bestScore == null || score > p.bestScore) {
      p.bestScore = score;
      state.progress[k] = p;
      db.upsertProgress(k, p);
    }
  }
  persist.progress();
}

function getCode(key) {
  for (const k of relatedKeys(key)) {
    if (state.code[k] != null && state.code[k] !== "") return state.code[k];
  }
  return state.code[key];
}

function setCode(key, code) {
  for (const k of relatedKeys(key)) state.code[k] = code;
  persist.code();
}

/* ------------------------------------------------------------------ */
/* Supabase mirror                                                     */
/* ------------------------------------------------------------------ */

const db = {
  url: (window.SUPABASE_URL || "").replace(/\/+$/, ""),
  key: window.SUPABASE_KEY || "",
  online: false,

  get enabled() {
    return !!(this.url && this.key);
  },

  async req(path, opts = {}) {
    if (!this.enabled) return null;
    const token =
      (typeof Auth !== "undefined" && Auth.getAccessToken && Auth.getAccessToken()) || this.key;
    const res = await fetch(`${this.url}/rest/v1/${path}`, {
      ...opts,
      headers: {
        apikey: this.key,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(opts.headers || {})
      }
    });
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
    return res.status === 204 ? null : res.json();
  },

  get canSync() {
    return this.enabled && typeof Auth !== "undefined" && Auth.isLoggedIn && Auth.isLoggedIn();
  },

  /* Every write is best-effort. Losing the network must never cost you the
     code sitting in the editor, which is already in localStorage. */
  async safe(fn) {
    if (!this.enabled) return null;
    try {
      const out = await fn();
      this.setOnline(true);
      return out;
    } catch (err) {
      console.warn("[supabase]", err.message);
      this.setOnline(false);
      return null;
    }
  },

  setOnline(v) {
    if (this.online === v) return;
    this.online = v;
    renderSyncBadge();
  },

  async saveAttempt({ key, title, section, code }) {
    if (!this.canSync) return null;
    const rows = await this.safe(() =>
      this.req("oa_attempts", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          user_key: userKey,
          problem_slug: key,
          problem_title: title,
          section,
          code
        })
      })
    );
    return rows && rows[0] ? rows[0].id : null;
  },

  async saveReview(attemptId, key, review) {
    if (!this.canSync) return null;
    return this.safe(() =>
      this.req("oa_reviews", {
        method: "POST",
        body: JSON.stringify({
          attempt_id: attemptId,
          user_key: userKey,
          problem_slug: key,
          verdict: review.verdict || null,
          score: typeof review.score === "number" ? review.score : null,
          time_complexity: review.time || null,
          space_complexity: review.space || null,
          summary: review.summary || null,
          strengths: review.strengths || [],
          improvements: review.improvements || [],
          resources: review.resources || [],
          raw: review.raw || null
        })
      })
    );
  },

  async upsertProgress(key, p) {
    if (!this.canSync) return null;
    return this.safe(() =>
      this.req("oa_progress", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({
          user_key: userKey,
          problem_slug: key,
          status: p.status,
          attempts: p.attempts || 0,
          best_score: p.bestScore,
          last_code: (state.code[key] || "").slice(0, 20000),
          solved_at: p.solvedAt,
          updated_at: new Date().toISOString()
        })
      })
    );
  },

  async loadProgress() {
    if (!this.canSync) return null;
    return this.safe(() =>
      this.req(`oa_progress?user_key=eq.${encodeURIComponent(userKey)}&select=*`)
    );
  },

  async loadReviews(limit = 200) {
    if (!this.canSync) return null;
    return this.safe(() =>
      this.req(
        `oa_reviews?user_key=eq.${encodeURIComponent(userKey)}&select=*&order=created_at.desc&limit=${limit}`
      )
    );
  }
};

async function applyAuthUser(user) {
  const switched = setActiveUserKey(user?.id || null);
  if (switched && typeof navigate === "function") navigate();
  if (user) {
    const ok = await syncFromDb();
    if (ok && typeof navigate === "function") navigate();
    if (typeof renderSyncBadge === "function") renderSyncBadge();
  } else if (typeof renderSyncBadge === "function") {
    renderSyncBadge();
  }
}

/* Pull the durable copy back in. Remote wins only where it is strictly ahead,
   so a fresh browser recovers history without clobbering unsynced local work. */
async function syncFromDb() {
  const rows = await db.loadProgress();
  if (rows) {
    let changed = false;
    for (const r of rows) {
      const local = state.progress[r.problem_slug];
      const remoteSolved = r.status === "solved";
      if (!local || (remoteSolved && local.status !== "solved") || (r.attempts || 0) > (local.attempts || 0)) {
        state.progress[r.problem_slug] = {
          status: remoteSolved || local?.status === "solved" ? (remoteSolved ? "solved" : local.status) : r.status,
          attempts: Math.max(r.attempts || 0, local?.attempts || 0),
          bestScore: r.best_score ?? local?.bestScore ?? null,
          solvedAt: r.solved_at || local?.solvedAt || null
        };
        changed = true;
      }
      if (r.last_code && !state.code[r.problem_slug]) {
        state.code[r.problem_slug] = r.last_code;
        changed = true;
      }
    }
    if (changed) {
      persist.progress();
      persist.code();
    }
  }

  const reviews = await db.loadReviews();
  if (reviews) {
    for (const r of reviews) {
      if (state.reviews[r.problem_slug]) continue; // newest first, keep the first seen
      state.reviews[r.problem_slug] = {
        verdict: r.verdict,
        score: r.score,
        time: r.time_complexity,
        space: r.space_complexity,
        summary: r.summary,
        strengths: r.strengths || [],
        improvements: r.improvements || [],
        resources: r.resources || [],
        at: r.created_at
      };
    }
    persist.reviews();
  }

  state.synced = true;
  return !!rows;
}
