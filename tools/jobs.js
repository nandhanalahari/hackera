"use strict";

/* Fetch + parse the public GitHub internship/new-grad lists into a uniform
   shape the Jobs page can filter and rank. */

const SOURCES = [
  {
    id: "speedy-intern-usa",
    label: "SWE Internships (USA)",
    kind: "intern",
    repo: "speedyapply/2027-SWE-College-Jobs",
    url: "https://raw.githubusercontent.com/speedyapply/2027-SWE-College-Jobs/main/README.md",
    html: "https://github.com/speedyapply/2027-SWE-College-Jobs",
    format: "speedy"
  },
  {
    id: "speedy-newgrad-usa",
    label: "SWE New Grad (USA)",
    kind: "newgrad",
    repo: "speedyapply/2027-SWE-College-Jobs",
    url: "https://raw.githubusercontent.com/speedyapply/2027-SWE-College-Jobs/main/NEW_GRAD_USA.md",
    html: "https://github.com/speedyapply/2027-SWE-College-Jobs/blob/main/NEW_GRAD_USA.md",
    format: "speedy"
  },
  {
    id: "summer2027",
    label: "Summer 2027 Internships",
    kind: "intern",
    repo: "vanshb03/Summer2027-Internships",
    url: "https://raw.githubusercontent.com/vanshb03/Summer2027-Internships/dev/README.md",
    html: "https://github.com/vanshb03/Summer2027-Internships",
    format: "pitt"
  },
  {
    id: "pm-intern",
    label: "PM Internships",
    kind: "pm",
    repo: "jobright-ai/2026-Product-Management-Internship",
    url: "https://raw.githubusercontent.com/jobright-ai/2026-Product-Management-Internship/master/README.md",
    html: "https://github.com/jobright-ai/2026-Product-Management-Internship",
    format: "jobright"
  }
];

const RESOURCES = [
  {
    title: "LeetCode company-wise questions",
    blurb: "Reported interview questions by company, with frequency. Powers the Companies track in PrepForge.",
    url: "https://github.com/snehasishroy/leetcode-companywise-interview-questions/tree/master",
    kind: "prep"
  },
  {
    title: "2027 SWE College Jobs",
    blurb: "Daily-updated USA/intl SWE internships and new-grad roles (SpeedyApply).",
    url: "https://github.com/speedyapply/2027-SWE-College-Jobs",
    kind: "jobs"
  },
  {
    title: "Summer 2027 Internships",
    blurb: "Community-maintained Summer 2027 internship list (Simplify / Ouckah fork).",
    url: "https://github.com/vanshb03/Summer2027-Internships",
    kind: "jobs"
  },
  {
    title: "2026 Product Management Internships",
    blurb: "Recent PM internship postings curated by Jobright.ai.",
    url: "https://github.com/jobright-ai/2026-Product-Management-Internship",
    kind: "jobs"
  },
  {
    title: "Your resume",
    blurb: "The PDF used to rank job fit on this page.",
    url: "https://drive.google.com/file/d/16oEUJL-XmHyHdqVRyKIlIfg--nqvJ8T5/view?usp=sharing",
    kind: "resume"
  }
];

function stripTags(html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, ", ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function firstHref(html) {
  const m = String(html || "").match(/href="([^"]+)"/i);
  return m ? m[1] : null;
}

function parseAgeDays(age) {
  const s = String(age || "").trim().toLowerCase();
  if (!s) return null;
  if (s === "0d" || s === "today") return 0;
  const d = s.match(/^(\d+)\s*d/);
  if (d) return Number(d[1]);
  // Month Day like "Aug 04" — approximate age from current year
  const m = s.match(/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})/i);
  if (m) {
    const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    const now = new Date();
    let dt = new Date(now.getFullYear(), months[m[1].toLowerCase()], Number(m[2]));
    if (dt > now) dt = new Date(now.getFullYear() - 1, months[m[1].toLowerCase()], Number(m[2]));
    return Math.max(0, Math.round((now - dt) / 86400000));
  }
  return null;
}

function splitRow(line) {
  // Markdown table row: | a | b | c |
  const raw = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return raw.split("|").map((c) => c.trim());
}

function isSeparator(line) {
  return /^\|?\s*:?-{2,}/.test(line.trim());
}

function parseSpeedy(md, source) {
  const jobs = [];
  let section = "Other";
  for (const line of md.split("\n")) {
    const h = line.match(/^###\s+(.+)/);
    if (h) {
      section = stripTags(h[1]).replace(/:.*/, "").trim() || section;
      continue;
    }
    if (!line.startsWith("|") || isSeparator(line) || /Company\s*\|\s*Position/i.test(line)) continue;
    const cols = splitRow(line);
    if (cols.length < 5) continue;
    const company = stripTags(cols[0]);
    if (!company || company === "↳" || company.toLowerCase() === "company") continue;
    const apply = firstHref(cols[4]) || firstHref(cols[0]);
    if (!apply || apply.startsWith("#") || apply.includes("imgur.com")) continue;
    jobs.push({
      id: source.id + ":" + apply,
      company: company === "↳" ? (jobs[jobs.length - 1] || {}).company || "Unknown" : company,
      title: stripTags(cols[1]),
      location: stripTags(cols[2]),
      salary: stripTags(cols[3]) || null,
      apply,
      age: stripTags(cols[5] || ""),
      ageDays: parseAgeDays(cols[5] || cols[3]),
      section,
      sourceId: source.id,
      sourceLabel: source.label,
      kind: source.kind
    });
  }
  // Fix ↳ company inheritance for speedy (company col is real name usually)
  return jobs.filter((j) => j.title && j.apply);
}

function parsePitt(md, source) {
  const jobs = [];
  let lastCompany = "";
  for (const line of md.split("\n")) {
    if (!line.startsWith("|") || isSeparator(line) || /Company\s*\|\s*Role/i.test(line) || /Company\s*\|\s*Position/i.test(line)) continue;
    const cols = splitRow(line);
    if (cols.length < 4) continue;
    let company = stripTags(cols[0]);
    if (company === "↳") company = lastCompany;
    else lastCompany = company;
    if (!company || /company/i.test(company)) continue;
    const apply = firstHref(cols[3]) || firstHref(cols[2]);
    if (!apply || apply.includes("imgur.com")) continue;
    jobs.push({
      id: source.id + ":" + apply,
      company,
      title: stripTags(cols[1]),
      location: stripTags(cols[2]),
      salary: null,
      apply,
      age: stripTags(cols[4] || ""),
      ageDays: parseAgeDays(cols[4] || ""),
      section: "Internship",
      sourceId: source.id,
      sourceLabel: source.label,
      kind: source.kind
    });
  }
  return jobs.filter((j) => j.title && j.apply);
}

function parseJobright(md, source) {
  const jobs = [];
  for (const line of md.split("\n")) {
    if (!line.startsWith("|") || isSeparator(line) || /Company\s*\|\s*Job Title/i.test(line)) continue;
    const cols = splitRow(line);
    if (cols.length < 4) continue;
    const company = stripTags(cols[0]);
    if (!company || /company/i.test(company)) continue;
    const apply = firstHref(cols[1]) || firstHref(cols[0]);
    if (!apply) continue;
    jobs.push({
      id: source.id + ":" + apply,
      company,
      title: stripTags(cols[1]),
      location: stripTags(cols[2]),
      salary: null,
      apply,
      age: stripTags(cols[4] || ""),
      ageDays: parseAgeDays(cols[4] || ""),
      section: stripTags(cols[3] || "PM"),
      sourceId: source.id,
      sourceLabel: source.label,
      kind: source.kind
    });
  }
  return jobs.filter((j) => j.title && j.apply);
}

const PARSERS = { speedy: parseSpeedy, pitt: parsePitt, jobright: parseJobright };

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "PrepForgeJobsTracker/1.0", Accept: "text/plain" }
  });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.text();
}

async function loadAllJobs() {
  const results = [];
  const errors = [];
  await Promise.all(
    SOURCES.map(async (source) => {
      try {
        const md = await fetchText(source.url);
        const parsed = (PARSERS[source.format] || parseSpeedy)(md, source);
        results.push(...parsed);
      } catch (err) {
        errors.push({ source: source.id, error: err.message });
      }
    })
  );

  // Dedupe by apply URL
  const seen = new Set();
  const jobs = [];
  for (const j of results) {
    const key = j.apply.replace(/[?#].*$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    jobs.push(j);
  }
  return { jobs, errors, fetchedAt: new Date().toISOString(), sources: SOURCES, resources: RESOURCES };
}

/* ------------------------------------------------------------------ */
/* ranking against a resume                                            */
/* ------------------------------------------------------------------ */

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9+.#]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

function extractProfile(resumeText) {
  const t = resumeText.toLowerCase();
  const skills = [];
  const skillBank = [
    "python", "java", "javascript", "typescript", "c++", "c#", "swift", "assembly",
    "react", "react native", "node", "node.js", "supabase", "mongodb", "sql",
    "machine learning", "xgboost", "gemini", "api", "rest", "security",
    "obfuscation", "reverse engineering", "matlab", "solana", "aws", "docker",
    "backend", "frontend", "fullstack", "full-stack", "mobile", "ios", "android",
    "data", "ml", "ai", "llm", "distributed", "cloud"
  ];
  for (const s of skillBank) if (t.includes(s)) skills.push(s);

  const companies = [];
  for (const c of ["tiktok", "bytedance", "goldman", "american airlines", "nvidia", "google", "meta", "amazon", "microsoft", "apple"]) {
    if (t.includes(c)) companies.push(c);
  }

  const isIntern = /expected:\s*may\s*2028|class of 2028|graduat(?:e|ing).*2028|bachelor/.test(t);
  const prefers = [];
  if (/security|obfuscat|reverse engineer/.test(t)) prefers.push("security");
  if (/machine learning|xgboost|ml\b|llm|ai\//.test(t)) prefers.push("ml", "ai", "data");
  if (/react|frontend|front-end/.test(t)) prefers.push("frontend", "full");
  if (/backend|node|api|distributed/.test(t)) prefers.push("backend", "infrastructure", "platform");
  if (/mobile|swift|react native|ios|android/.test(t)) prefers.push("mobile", "ios", "android");

  return { skills, companies, isIntern, prefers, raw: resumeText };
}

function scoreJob(job, profile) {
  const hay = `${job.company} ${job.title} ${job.location} ${job.section}`.toLowerCase();
  let score = 0;
  const reasons = [];

  // Undergrad graduating 2028 → internships fit far better than new-grad.
  if (profile.isIntern) {
    if (job.kind === "intern") {
      score += 25;
      reasons.push("Internship matches your timeline (grad ~2028)");
    } else if (job.kind === "newgrad") {
      score -= 15;
      reasons.push("New-grad role — early for a 2028 grad");
    } else if (job.kind === "pm") {
      score -= 8;
      reasons.push("PM track — weaker fit vs SWE on your resume");
    }
  }

  for (const s of profile.skills) {
    if (hay.includes(s) || job.title.toLowerCase().includes(s)) {
      score += s.length > 6 ? 8 : 5;
      reasons.push(`Skill match: ${s}`);
    }
  }

  for (const p of profile.prefers) {
    if (hay.includes(p)) {
      score += 10;
      reasons.push(`Focus area: ${p}`);
    }
  }

  for (const c of profile.companies) {
    if (job.company.toLowerCase().includes(c) || hay.includes(c)) {
      score += 18;
      reasons.push(`Company signal on resume: ${c}`);
    }
  }

  // Hot companies for this user's prep context
  if (/tiktok|bytedance/.test(hay)) {
    score += 12;
    reasons.push("TikTok / ByteDance (your current prep target)");
  }

  // Location soft boost for TX / remote / major hubs
  if (/texas|dallas|richardson|austin|remote|san jose|seattle|new york|nyc|bay area|san francisco|redmond/i.test(job.location)) {
    score += 4;
  }

  // Freshness
  if (job.ageDays != null) {
    if (job.ageDays <= 3) {
      score += 10;
      reasons.push("Posted in the last 3 days");
    } else if (job.ageDays <= 7) {
      score += 6;
      reasons.push("Posted this week");
    } else if (job.ageDays <= 21) {
      score += 2;
    } else if (job.ageDays > 60) {
      score -= 8;
    }
  }

  // Cap reasons for UI
  const uniq = [];
  for (const r of reasons) if (!uniq.includes(r)) uniq.push(r);
  return { score, reasons: uniq.slice(0, 4) };
}

function rankJobs(jobs, resumeText) {
  const profile = extractProfile(resumeText);
  return jobs
    .map((j) => {
      const { score, reasons } = scoreJob(j, profile);
      return { ...j, score, reasons };
    })
    .sort((a, b) => b.score - a.score || (a.ageDays ?? 999) - (b.ageDays ?? 999));
}

module.exports = {
  SOURCES,
  RESOURCES,
  loadAllJobs,
  rankJobs,
  extractProfile,
  parseAgeDays
};
