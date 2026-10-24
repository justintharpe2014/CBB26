
/*
 SATURDAY DYNASTY
 PLAYER DEVELOPMENT v2.0

 Complete replacement of the player
 development screen and training rules.

 Preserves:
 - Depth charts
 - Redshirts
 - Staff management
 - Transfer portal
 - Awards
 - Existing dynasty saves

 Install after final-integration.js,
 development-fix.js, and other
 gameplay modules, before startup.js.
*/

(function () {
  "use strict";

  const oldOffseasonDevelopment =
    typeof sdDevelopment === "function"
      ? sdDevelopment
      : null;

  const safe = value =>
    String(value ?? "").replace(
      /[&<>"']/g,
      ch => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[ch]
    );

  const num = value =>
    Number.isFinite(Number(value))
      ? Number(value)
      : 0;

  const offense = [
    "QB","HB","RB","FB","WR","TE",
    "OT","OG","C"
  ];

  const defense = [
    "DE","DT","OLB","MLB","LB",
    "CB","FS","SS","S"
  ];

  const focusByPosition = {
    QB: ["Passing Mechanics","Decision Making","Mobility"],
    HB: ["Vision","Ball Security","Explosiveness"],
    RB: ["Vision","Ball Security","Explosiveness"],
    FB: ["Blocking","Power Running","Conditioning"],
    WR: ["Route Running","Catching","Speed"],
    TE: ["Receiving","Blocking","Strength"],
    OT: ["Pass Protection","Run Blocking","Strength"],
    OG: ["Pass Protection","Run Blocking","Strength"],
    C: ["Blocking Technique","Strength","Awareness"],
    DE: ["Pass Rush","Run Defense","Strength"],
    DT: ["Run Defense","Pass Rush","Strength"],
    OLB: ["Coverage","Pass Rush","Tackling"],
    MLB: ["Tackling","Run Defense","Coverage"],
    LB: ["Tackling","Run Defense","Coverage"],
    CB: ["Man Coverage","Zone Coverage","Speed"],
    FS: ["Zone Coverage","Ball Skills","Tackling"],
    SS: ["Tackling","Coverage","Ball Skills"],
    S: ["Coverage","Tackling","Ball Skills"],
    K: ["Accuracy","Kick Power","Consistency"],
    P: ["Accuracy","Kick Power","Consistency"]
  };

  function state() {
    if (!S.management) S.management = {};
    if (!S.management.development) {
      S.management.development = {};
    }

    const d = S.management.development;

    if (!Array.isArray(d.assignments)) {
      d.assignments = [];
    }

    if (!Array.isArray(d.history)) {
      d.history = [];
    }

    return d;
  }

  function canTrain(p) {
    const role = user()?.role || "HC";

    if (role === "HC") return true;
    if (role === "OC") {
      return offense.includes(p.pos);
    }
    if (role === "DC") {
      return defense.includes(p.pos);
    }

    return false;
  }

  function options(p) {
    return focusByPosition[p.pos] ||
      ["Fundamentals","Strength","Conditioning"];
  }

  function assignment(pid) {
    return state().assignments.find(
      a =>
        String(a.playerId) === String(pid) &&
        String(a.teamId) === String(team().id)
    );
  }

  function potential(p) {
    return Math.max(
      num(p.ovr),
      num(p.pot || p.ovr)
    );
  }

  function rate(p) {
    const traits = {
      Normal: 1,
      Impact: 1.20,
      Star: 1.50,
      Elite: 1.85
    };

    const trait = traits[p.dev] || 1;

    const coach = user();

    const developer = Math.min(
      0.25,
      num(coach?.skills?.Developer) * 0.05
    );

    return trait * (1 + developer);
  }

  function required(p) {
    return Math.round(
      76 + Math.max(0, num(p.ovr) - 65) * 2.2
    );
  }

  function currentWeekKey() {
    return String(S.year) + ":" +
      String(S.week);
  }

  /*
   Keep the existing weekly integration
   from depth.js. It already invokes
   sdDevAdvanceWeek() after advancing
   the regular-season calendar.
  */

  sdDevAdvanceWeek = function () {
    const d = state();
    const t = team();
    const key = currentWeekKey();

    if (d.lastTrainingKey === key) return;

    d.assignments = d.assignments.filter(
      a =>
        String(a.teamId) === String(t.id) &&
        t.roster.some(
          p => String(p.id) ===
               String(a.playerId)
        )
    );

    for (const a of d.assignments) {
      const p = t.roster.find(
        x => String(x.id) ===
             String(a.playerId)
      );

      if (!p || !canTrain(p)) continue;

      const ceiling = potential(p);

      if (num(p.ovr) >= ceiling) continue;

      const base = 8 + Math.random() * 4;

      const depth = S.management?.depth || {};

      const starter =
        String(depth[t.id + ":" + p.pos]) ===
        String(p.id);

      const starterBonus = starter ? 1.08 : 1;
      const redshirtBonus = p.redshirt ? 0.92 : 1;

      const gain =
        base *
        rate(p) *
        starterBonus *
        redshirtBonus;

      a.progress = num(a.progress) + gain;
      a.sessions = num(a.sessions) + 1;

      /*
       A player can improve multiple times
       across the season, but never exceed
       their actual potential.
      */

      let gainedThisWeek = 0;

      while (
        a.progress >= required(p) &&
        num(p.ovr) < ceiling &&
        gainedThisWeek < 2
      ) {
        a.progress -= required(p);

        const before = num(p.ovr);
        p.ovr = Math.min(99, ceiling, before + 1);

        gainedThisWeek += p.ovr - before;
        a.totalGained =
          num(a.totalGained) + p.ovr - before;

        d.history.push({
          year: S.year,
          week: S.week,
          teamId: t.id,
          playerId: p.id,
          name: p.name,
          pos: p.pos,
          focus: a.focus,
          from: before,
          to: p.ovr,
          gained: p.ovr - before
        });
      }

      if (gainedThisWeek > 0 &&
          typeof addNews === "function") {
        addNews(
          "PLAYER DEVELOPMENT: " +
          p.name + " (" + p.pos + ") reached " +
          p.ovr + " OVR through " +
          a.focus + " training."
        );
      }
    }

    d.lastTrainingKey = key;

    if (d.history.length > 600) {
      d.history = d.history.slice(-600);
    }
  };

  sdDevAssign = function (pid) {
    const t = team();
    const p = t.roster.find(
      x => String(x.id) === String(pid)
    );

    if (!p || !canTrain(p)) return;

    const d = state();
    const existing = assignment(pid);

    if (existing) {
      d.assignments = d.assignments.filter(
        a => a !== existing
      );
      save();
      render();
      return;
    }

    const active = d.assignments.filter(
      a => String(a.teamId) === String(t.id)
    );

    if (active.length >= 3) {
      alert(
        "All three development slots are full."
      );
      return;
    }

    d.assignments.push({
      playerId: p.id,
      teamId: t.id,
      focus: options(p)[0],
      progress: 0,
      sessions: 0,
      totalGained: 0,
      assignedYear: S.year,
      assignedWeek: S.week
    });

    save();
    render();
  };

  sdDevFocus = function (pid, focus) {
    const p = team().roster.find(
      x => String(x.id) === String(pid)
    );

    const a = assignment(pid);

    if (!p || !a || !canTrain(p)) return;
    if (!options(p).includes(focus)) return;

    a.focus = focus;
    save();
    render();
  };

  function playerCard(p) {
    const a = assignment(p.id);
    const room = potential(p) - num(p.ovr);

    return `
      <div class="card">
        <div class="row">
          <div style="flex:1;">
            <b>${safe(p.name)}</b>
            <p class="muted">
              ${safe(p.pos)}
              · Year ${safe(p.yr)}
              · ${safe(p.dev || "Normal")} Dev
            </p>
          </div>

          <div style="text-align:right;">
            <h3>${num(p.ovr)} OVR</h3>
            <small>
              ${potential(p)} Potential
            </small>
          </div>
        </div>

        <p class="muted">
          ${room > 0
            ? room + " OVR growth remaining"
            : "Potential reached"}
        </p>

        <button onclick="sdDevAssign('${safe(p.id)}')">
          ${a ? "Remove Training" : "Train Player"}
        </button>
      </div>
    `;
  }

  function activeCard(a, t) {
    const p = t.roster.find(
      x => String(x.id) ===
           String(a.playerId)
    );

    if (!p) return "";

    const ceiling = potential(p);
    const needed = required(p);
    const finished = num(p.ovr) >= ceiling;

    const pct = finished
      ? 100
      : Math.min(
          100,
          Math.round(
            num(a.progress) / needed * 100
          )
        );

    const focuses = options(p).map(f => `
      <option
        value="${safe(f)}"
        ${a.focus === f ? "selected" : ""}
      >${safe(f)}</option>
    `).join("");

    return `
      <div class="card">
        <div class="row">
          <div style="flex:1;">
            <h3>${safe(p.name)} · ${safe(p.pos)}</h3>
            <p>
              ${num(p.ovr)} OVR
              · ${ceiling} Potential
              · ${safe(p.dev || "Normal")} Dev
            </p>
          </div>

          <button onclick="sdDevAssign('${safe(p.id)}')">
            Remove
          </button>
        </div>

        <p><b>Training Focus</b></p>

        <select onchange="
          sdDevFocus('${safe(p.id)}', this.value)
        ">
          ${focuses}
        </select>

        <div class="row" style="
          justify-content:space-between;
          margin-top:14px;
        ">
          <span>Progress to next OVR</span>
          <b>${pct}%</b>
        </div>

        <div style="
          background:#333;
          border-radius:8px;
          height:12px;
          overflow:hidden;
          margin-top:6px;
        ">
          <div style="
            width:${pct}%;
            height:100%;
            background:#42b983;
          "></div>
        </div>

        <p class="muted">
          ${finished
            ? "Potential reached"
            : num(a.sessions) + " sessions completed"}
          · +${num(a.totalGained)}
          OVR from focused training
        </p>
      </div>
    `;
  }

  function developmentScreen() {
    const t = team();
    const d = state();

    const active = d.assignments.filter(
      a => String(a.teamId) === String(t.id) &&
        t.roster.some(
          p => String(p.id) ===
               String(a.playerId)
        )
    );

    const eligible = t.roster
      .filter(canTrain)
      .sort((a, b) =>
        potential(b) - num(b.ovr) -
        (potential(a) - num(a.ovr)) ||
        num(b.ovr) - num(a.ovr)
      );

    const history = d.history.filter(
      h =>
        String(h.teamId) === String(t.id) &&
        Number(h.year) === Number(S.year)
    );

    const totalGrowth = history.reduce(
      (sum, h) => sum + num(h.gained),
      0
    );

    const improved = new Set(
      history.map(h => h.playerId)
    ).size;

    return `
      <h2>Player Development Center</h2>

      <p class="muted">
        Assign up to three players to
        focused weekly development.
        Training runs automatically when
        you simulate regular-season weeks.
      </p>

      <div class="grid">
        <div class="card">
          <small>Training Slots</small>
          <h2>${active.length}/3</h2>
        </div>

        <div class="card">
          <small>Players Improved</small>
          <h2>${improved}</h2>
        </div>

        <div class="card">
          <small>Training OVR Gained</small>
          <h2>+${totalGrowth}</h2>
        </div>
      </div>

      <h3>Active Development Plans</h3>

      ${active.length
        ? active.map(a => activeCard(a, t)).join("")
        : `<div class="card">
             No active training plans.
             Select players below.
           </div>`}

      <details style="margin:16px 0;">
        <summary style="
          cursor:pointer;
          padding:14px;
          border:1px solid #555;
          border-radius:10px;
          font-weight:bold;
        ">
          Eligible Players (${eligible.length})
        </summary>

        <div class="grid" style="margin-top:12px;">
          ${eligible.map(playerCard).join("")}
        </div>
      </details>

      <details style="margin:16px 0;">
        <summary style="
          cursor:pointer;
          padding:14px;
          border:1px solid #555;
          border-radius:10px;
          font-weight:bold;
        ">
          Development History (${history.length})
        </summary>

        <div style="margin-top:12px;">
          ${history.length
            ? history.slice(-30).reverse().map(h => `
                <div class="card">
                  <b>${safe(h.name)}</b>
                  · ${safe(h.pos)}
                  <p>
                    Week ${safe(h.week)}:
                    ${num(h.from)} →
                    ${num(h.to)} OVR
                  </p>
                  <small>${safe(h.focus)}</small>
                </div>
              `).join("")
            : `<div class="card">
                 No improvements recorded yet.
               </div>`}
        </div>
      </details>
    `;
  }

  /*
   Fix the collision with final-integration.js.

   That file calls sdDevelopment(team, oldRoster)
   during the offseason.

   Keep that call working, while restoring
   sdDevelopment() as the actual screen.
  */

  sdDevelopment = function (...args) {
    if (args.length > 0) {
      if (oldOffseasonDevelopment) {
        return oldOffseasonDevelopment.apply(
          this, args
        );
      }
      return;
    }

    return developmentScreen();
  };

  /*
   The existing development-fix.js already
   calls sdDevelopment() when the screen
   opens, so no additional render wrapper
   is necessary.
  */

  console.info(
    "[Saturday Dynasty] Player Development v2 ready."
  );
})();
