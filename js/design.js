"use strict";

/* System design judgment drills — render + progress wiring. */

function renderDesign() {
  const s = sdStats();
  $("design-count").textContent = `${s.done} / ${s.total} decisions practiced`;
  $("design-bar").style.width = pct(s.done, s.total) + "%";

  $("design-body").innerHTML = SD_TOPICS.map((t, i) => {
    const done = t.scenarios.filter((sc) => state.designProgress[sdScenarioKey(t.id, sc.id)]?.completed).length;
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
      <div class="sd-scenario-list">
        ${t.scenarios
          .map(
            (sc) => `<a class="sd-scenario-row" href="#/design/${encodeURIComponent(t.id)}/${encodeURIComponent(sc.id)}">
              ${state.designProgress[sdScenarioKey(t.id, sc.id)]?.completed ? '<span class="tick done">✓</span>' : '<span class="tick">○</span>'}
              <span class="rname">${escapeHtml(sc.title)}</span>
            </a>`
          )
          .join("")}
      </div>
    </section>`;
  }).join("");

  document.title = "System design - Hackera";
}

function renderDesignTopic() {
  const t = SD_TOPICS.find((x) => x.id === state.route.topicId);
  if (!t) return go("#/design");

  $("design-topic-title").textContent = t.name;
  $("design-topic-sub").textContent = t.summary;
  $("design-topic-scenarios").innerHTML = t.scenarios
    .map(
      (sc, i) => `<a class="card compact sd-card" href="#/design/${encodeURIComponent(t.id)}/${encodeURIComponent(sc.id)}">
        <span class="kicker">Decision ${i + 1}</span>
        <h3>${escapeHtml(sc.title)}</h3>
        <p>${escapeHtml(sc.prompt)}</p>
        <div class="card-foot">
          ${state.designProgress[sdScenarioKey(t.id, sc.id)]?.completed ? '<span class="badge solved">Done</span>' : '<span class="go">Practice →</span>'}
        </div>
      </a>`
    )
    .join("");

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

  $("design-drill-body").innerHTML = `
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
