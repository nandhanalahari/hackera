"use strict";

/* System design judgment drills — render + progress wiring. */

function sdCourse(topic) {
  if (topic.course && topic.course.length) return topic.course;
  return topic.scenarios.map((sc) => ({
    id: sc.id,
    title: sc.title,
    teach: sc.axis,
    points: sc.constraints,
    check: sc.id
  }));
}

function sdCheckDone(topicId, scenarioId) {
  return !!state.designProgress?.[sdScenarioKey(topicId, scenarioId)]?.completed;
}

function renderDesign() {
  const s = sdStats();
  $("design-count").textContent = `${s.done} / ${s.total} checks done`;
  $("design-bar").style.width = pct(s.done, s.total) + "%";

  $("design-body").innerHTML = SD_TOPICS.map((t) => {
    const done = t.scenarios.filter((sc) => sdCheckDone(t.id, sc.id)).length;
    const course = sdCourse(t);
    return `<section class="sd-topic${done === t.scenarios.length ? " complete" : ""}">
      <header class="sd-topic-head">
        <span class="sd-icon">${t.icon}</span>
        <div class="sd-topic-copy">
          <h3><a href="#/design/${encodeURIComponent(t.id)}">${escapeHtml(t.name)}</a></h3>
          <p>${escapeHtml(t.summary)}</p>
        </div>
        <div class="sd-topic-prog">
          <div class="bar"><i style="width:${pct(done, t.scenarios.length)}%"></i></div>
          <span class="muted mono">${done}/${t.scenarios.length}</span>
        </div>
      </header>
      <ol class="sd-tree sd-tree-index">
        ${course
          .map((node) => {
            const sc = t.scenarios.find((x) => x.id === node.check);
            const href = `#/design/${encodeURIComponent(t.id)}`;
            return `<li>
              <a class="sd-branch-link" href="${href}">
                <span class="sd-badge">Learn</span>
                <span class="rname">${escapeHtml(node.title)}</span>
              </a>
              ${
                sc
                  ? `<span class="sd-branch-check muted">${sdCheckDone(t.id, sc.id) ? "✓" : "○"} then check · ${escapeHtml(sc.title)}</span>`
                  : ""
              }
            </li>`;
          })
          .join("")}
      </ol>
    </section>`;
  }).join("");

  document.title = "System design - Hackera";
}

function renderDesignTopic() {
  const t = SD_TOPICS.find((x) => x.id === state.route.topicId);
  if (!t) return go("#/design");

  $("design-topic-title").textContent = t.name;
  $("design-topic-sub").textContent = "Read each branch, then answer the check underneath it.";
  const course = sdCourse(t);

  $("design-topic-scenarios").innerHTML = `<p class="sd-topic-lead">${escapeHtml(t.summary)}</p>
    <ol class="sd-tree">
      ${course
        .map((node) => {
          const sc = t.scenarios.find((x) => x.id === node.check);
          const done = sc && sdCheckDone(t.id, sc.id);
          const paras = String(node.teach || "")
            .split(/\n\n/)
            .filter(Boolean)
            .map((p) => `<p>${escapeHtml(p)}</p>`)
            .join("");
          return `<li class="sd-branch" id="learn-${escapeHtml(node.id)}">
            <article class="sd-node">
              <span class="sd-badge">Learn</span>
              <h3>${escapeHtml(node.title)}</h3>
              ${paras}
              ${
                node.points && node.points.length
                  ? `<ul class="sd-points">${node.points.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>`
                  : ""
              }
            </article>
            ${
              sc
                ? `<ul class="sd-tree">
                    <li>
                      <a class="sd-check${done ? " done" : ""}" href="#/design/${encodeURIComponent(t.id)}/${encodeURIComponent(sc.id)}">
                        <span class="sd-badge check">${done ? "Done" : "Check"}</span>
                        <span>
                          <strong>${escapeHtml(sc.title)}</strong>
                          <em>${escapeHtml(sc.prompt)}</em>
                        </span>
                        <span class="go">${done ? "Review" : "Answer"} →</span>
                      </a>
                    </li>
                  </ul>`
                : ""
            }
          </li>`;
        })
        .join("")}
    </ol>`;

  document.title = `${t.name} - Hackera`;
}

function renderDesignDrill() {
  const t = SD_TOPICS.find((x) => x.id === state.route.topicId);
  if (!t) return go("#/design");
  const sc = t.scenarios.find((x) => x.id === state.route.scenarioId);
  if (!sc) return go(`#/design/${encodeURIComponent(t.id)}`);

  const key = sdScenarioKey(t.id, sc.id);
  const prog = state.designProgress[key] || {};
  const answered = prog.pick != null;

  $("design-drill-back").href = `#/design/${encodeURIComponent(t.id)}`;
  $("design-drill-title").textContent = sc.title;
  $("design-drill-kicker").textContent = t.name;

  const lesson = sdCourse(t).find((n) => n.check === sc.id);
  const lessonRecap = lesson
    ? `<div class="sd-recap">
        <h4>From the lesson · ${escapeHtml(lesson.title)}</h4>
        <p>${escapeHtml(String(lesson.teach || "").split(/\n\n/)[0])}</p>
        <a class="back" href="#/design/${encodeURIComponent(t.id)}">← Reread the full branch</a>
      </div>`
    : "";

  $("design-drill-body").innerHTML = `
    ${lessonRecap}
    <div class="sd-constraints">
      <h4>Constraints on screen</h4>
      <ul>${sc.constraints.map((c) => `<li>${escapeHtml(c)}</li>`).join("")}</ul>
    </div>
    <div class="sd-prompt"><h4>Make the call</h4><p>${escapeHtml(sc.prompt)}</p></div>
    <div class="sd-choices" id="sd-choices">
      ${sc.choices
        .map(
          (ch, i) => `<button type="button" class="sd-choice${answered && i === sc.answer ? " correct" : answered && i === prog.pick && i !== sc.answer ? " wrong" : ""}" data-pick="${i}" ${answered ? "disabled" : ""}>
            <span class="sd-choice-letter">${String.fromCharCode(65 + i)}</span>
            <span>${escapeHtml(ch)}</span>
          </button>`
        )
        .join("")}
    </div>
    <div id="sd-axis" class="sd-axis${answered ? "" : " hidden"}">
      <h4>Learn the axis</h4>
      <p>${escapeHtml(sc.axis)}</p>
      ${prog.pick === sc.answer ? '<p class="sd-verdict ok">✓ Strong judgment call.</p>' : '<p class="sd-verdict bad">Not the best call under these constraints — study the axis above.</p>'}
    </div>`;

  $("sd-choices").querySelectorAll(".sd-choice").forEach((btn) => {
    btn.addEventListener("click", () => {
      const pick = +btn.dataset.pick;
      if (!state.designProgress) state.designProgress = {};
      state.designProgress[key] = { pick, completed: true, at: Date.now() };
      persist.designProgress();
      if (typeof bumpActivity === "function") bumpActivity("design");
      renderDesignDrill();
    });
  });

  const idx = t.scenarios.findIndex((x) => x.id === sc.id);
  const next = t.scenarios[idx + 1];
  $("design-drill-next").classList.toggle("hidden", !answered || !next);
  if (next) $("design-drill-next").href = `#/design/${encodeURIComponent(t.id)}/${encodeURIComponent(next.id)}`;

  document.title = `${sc.title} - Hackera`;
}
