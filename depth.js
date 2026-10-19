
/*
 SATURDAY DYNASTY
 Depth Chart, Player Development, Portal,
 Staff Management and National Awards

 Full replacement for depth.js

 Development:
 - Three training slots
 - OC: offense only
 - DC: defense only
 - HC: all positions
 - Weekly progress
 - Real OVR improvements
 - Development history for AD goals
*/

const SD_POS = [
  "QB","HB","WR","TE","OT","OG","C",
  "DE","DT","OLB","MLB","CB","FS","SS",
  "K","P"
];

const SD_OFFENSE = [
  "QB","HB","RB","FB","WR","TE",
  "OT","OG","C"
];

const SD_DEFENSE = [
  "DE","DT","OLB","MLB","LB",
  "CB","FS","SS","S"
];

const SD_TRAINING = {
  QB: ["Passing Mechanics","Decision Making","Mobility"],
  HB: ["Ball Security","Vision","Explosiveness"],
  RB: ["Ball Security","Vision","Explosiveness"],
  FB: ["Power Running","Blocking","Conditioning"],
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

function sdInit() {
  if (!S.management) {
    S.management = {
      awards: [],
      transfers: [],
      staffMoves: [],
      records: [],
      depth: {},
      redshirts: [],
      injuries: [],
      portalYear: 0
    };
  }

  const m = S.management;

  for (const key of [
    "awards","transfers","staffMoves",
    "records","redshirts","injuries"
  ]) {
    if (!Array.isArray(m[key])) m[key] = [];
  }

  if (!m.depth) m.depth = {};

  if (!m.development) {
    m.development = {
      assignments: [],
      history: [],
      year: S.year
    };
  }

  if (!Array.isArray(m.development.assignments)) {
    m.development.assignments = [];
  }

  if (!Array.isArray(m.development.history)) {
    m.development.history = [];
  }

  return m;
}

function sdDevState() {
  return sdInit().development;
}

function sdCanDevelop(p) {
  const role = user().role || "HC";

  if (role === "HC") return true;

  if (role === "OC") {
    return SD_OFFENSE.includes(p.pos);
  }

  if (role === "DC") {
    return SD_DEFENSE.includes(p.pos);
  }

  return false;
}

function sdDevOptions(p) {
  return SD_TRAINING[p.pos] ||
    ["Fundamentals","Strength","Conditioning"];
}

function sdDevAssignment(pid) {
  return sdDevState().assignments.find(
    a => a.playerId === pid &&
         a.teamId === team().id
  );
}

function sdDevRate(p) {
  const traits = {
    Normal: 1,
    Impact: 1.15,
    Star: 1.30,
    Elite: 1.50
  };

  const trait = traits[p.dev] || 1;

  const u = user();

  const coachBonus =
    1 + Math.min(
      0.30,
      (u.skills?.Developer || 0) * 0.06
    );

  const staffBonus =
    1 + Math.min(
      0.15,
      (u.develop || 60) / 600
    );

  return trait * coachBonus * staffBonus;
}

function sdDevRequired(p) {
  /*
   Higher OVR players require more training.
   Progress is measured toward one OVR point.
  */

  return Math.max(
    65,
    70 + Math.max(0, p.ovr - 65) * 2
  );
}

function sdDevAssign(pid) {
  const p = team().roster.find(
    x => x.id === pid
  );

  if (!p) return;

  if (!sdCanDevelop(p)) {
    alert(
      "Your coaching position does not " +
      "control this side of the football."
    );
    return;
  }

  const state = sdDevState();

  const existing = sdDevAssignment(pid);

  if (existing) {
    state.assignments =
      state.assignments.filter(
        a => !(
          a.playerId === pid &&
          a.teamId === team().id
        )
      );

    save();
    return;
  }

  const active = state.assignments.filter(
    a => a.teamId === team().id
  );

  if (active.length >= 3) {
    alert(
      "All three development slots are full. " +
      "Remove a player before adding another."
    );
    return;
  }

  state.assignments.push({
    playerId: p.id,
    teamId: team().id,
    focus: sdDevOptions(p)[0],
    progress: 0,
    totalGained: 0,
    assignedYear: S.year,
    assignedWeek: S.week
  });

  save();
}

function sdDevFocus(pid, focus) {
  const p = team().roster.find(
    x => x.id === pid
  );

  const a = sdDevAssignment(pid);

  if (!p || !a || !sdCanDevelop(p)) return;

  if (!sdDevOptions(p).includes(focus)) return;

  a.focus = focus;

  save();
}

function sdDevHistory(year, teamId) {
  return sdDevState().history.filter(
    h => h.year === year &&
         h.teamId === teamId
  );
}

function sdDevAdvanceWeek() {
  const state = sdDevState();

  /*
   Only progress assignments for the
   current school. A coordinator who
   changes jobs doesn't keep training
   players at their old school.
  */

  const t = team();

  state.assignments =
    state.assignments.filter(
      a => a.teamId === t.id &&
           t.roster.some(
             p => p.id === a.playerId
           )
    );

  for (const a of state.assignments) {
    const p = t.roster.find(
      x => x.id === a.playerId
    );

    if (!p || !sdCanDevelop(p)) continue;

    if (p.redshirt) {
      /*
       Redshirt players still train,
       but at a slightly reduced rate.
      */
    }

    const potential =
      Math.max(p.ovr, p.pot || p.ovr);

    if (p.ovr >= potential || p.ovr >= 99) {
      continue;
    }

    const base = 7 + Math.floor(
      Math.random() * 5
    );

    const starter =
      sdInit().depth[t.id + ":" + p.pos] === p.id;

    const playingBonus = starter ? 1.12 : 1;

    const redshirtBonus =
      p.redshirt ? 0.85 : 1;

    const gain =
      base *
      sdDevRate(p) *
      playingBonus *
      redshirtBonus;

    a.progress += gain;

    const required = sdDevRequired(p);

    if (a.progress >= required) {
      a.progress -= required;

      const previous = p.ovr;

      p.ovr = Math.min(
        99,
        potential,
        p.ovr + 1
      );

      if (p.ovr > previous) {
        a.totalGained += p.ovr - previous;

        state.history.push({
          year: S.year,
          week: S.week,
          teamId: t.id,
          playerId: p.id,
          name: p.name,
          pos: p.pos,
          focus: a.focus,
          from: previous,
          to: p.ovr,
          gained: p.ovr - previous
        });

        addNews(
          "PLAYER DEVELOPMENT: " +
          p.name +
          " (" + p.pos + ") improved to " +
          p.ovr + " OVR."
        );
      }
    }
  }

  /*
   Keep the history compact without
   deleting recent seasons.
  */

  if (state.history.length > 600) {
    state.history =
      state.history.slice(-600);
  }
}

function sdDevelopment() {
  const t = team();
  const state = sdDevState();

  const active = state.assignments.filter(
    a => a.teamId === t.id
  );

  const eligible = t.roster.filter(
    sdCanDevelop
  ).sort(
    (a,b) => b.pot - a.pot ||
             b.ovr - a.ovr
  );

  const improvements =
    sdDevHistory(S.year, t.id);

  const developedPlayers = new Set(
    improvements.map(x => x.playerId)
  ).size;

  const totalGrowth =
    improvements.reduce(
      (n,x) => n + x.gained, 0
    );

  let html = `
    <h2>Player Development Center</h2>

    <p class="muted">
      Choose up to three players for
      focused weekly training.
      Improvements are saved with
      your dynasty.
    </p>

    <div class="grid">
      ${box(
        "Training Slots",
        active.length + "/3"
      )}

      ${box(
        "Players Improved",
        developedPlayers
      )}

      ${box(
        "OVR Gained This Year",
        totalGrowth
      )}
    </div>

    <h3>Active Development Plans</h3>
  `;

  if (!active.length) {
    html += `
      <div class="card">
        No players assigned yet.
        Select players from the roster below.
      </div>
    `;
  }

  for (const a of active) {
    const p = t.roster.find(
      x => x.id === a.playerId
    );

    if (!p) continue;

    const required = sdDevRequired(p);

    const percent = Math.min(
      100,
      Math.round(
        a.progress / required * 100
      )
    );

    const focusOptions =
      sdDevOptions(p).map(
        f => `
          <option value="${esc(f)}"
            ${a.focus === f ? "selected" : ""}>
            ${esc(f)}
          </option>
        `
      ).join("");

    html += `
      <div class="card">
        <div class="row">
          <div>
            <h3>${esc(p.name)} · ${p.pos}</h3>
            <p>
              ${p.ovr} OVR ·
              ${p.pot} Potential ·
              ${esc(p.dev)}
            </p>
          </div>

          <button onclick="
            sdDevAssign('${p.id}')
          ">
            Remove
          </button>
        </div>

        <p>
          Training Focus
        </p>

        <select onchange="
          sdDevFocus(
            '${p.id}',
            this.value
          )
        ">
          ${focusOptions}
        </select>

        <p>
          Progress toward next OVR:
          <b>${percent}%</b>
        </p>

        <div style="
          height:12px;
          background:#333;
          border-radius:8px;
          overflow:hidden;
        ">
          <div style="
            height:100%;
            width:${percent}%;
            background:#42b983;
          "></div>
        </div>

        <p class="muted">
          Improvement from focused training:
          +${a.totalGained} OVR
        </p>
      </div>
    `;
  }

  html += `
    <h3>Eligible Players</h3>

    <p class="muted">
      ${
        user().role === "OC"
          ? "Offensive players only"
          : user().role === "DC"
            ? "Defensive players only"
            : "All roster positions"
      }
    </p>

    <div class="grid">
  `;

  for (const p of eligible) {
    const assigned = sdDevAssignment(p.id);

    html += `
      <div class="card">
        <div class="row">
          <div>
            <b>${esc(p.name)}</b>

            <p class="muted">
              ${p.pos} · Year ${p.yr}
            </p>

            <p>
              ${p.ovr} OVR ·
              ${p.pot} POT
            </p>

            <small>
              Development: ${esc(p.dev)}
            </small>
          </div>

          <button onclick="
            sdDevAssign('${p.id}')
          ">
            ${
              assigned
                ? "Remove"
                : "Train"
            }
          </button>
        </div>
      </div>
    `;
  }

  html += `</div>`;

  html += `
    <h3>Recent Development Results</h3>
  `;

  const recent = improvements.slice(-20).reverse();

  html += recent.length
    ? recent.map(
        h => `
          <div class="card">
            <b>${esc(h.name)}</b>
            · ${h.pos}

            <p>
              Week ${h.week}:
              ${h.from} → ${h.to} OVR
            </p>

            <small>
              ${esc(h.focus)}
            </small>
          </div>
        `
      ).join("")
    : `<p class="muted">
         No completed improvements yet.
       </p>`;

  return html;
}

/* DEPTH CHART */

function sdDepth() {
  const m = sdInit();
  const t = team();

  const cards = SD_POS.map(pos => {
    const ps = t.roster.filter(
      p => p.pos === pos
    ).sort(
      (a,b) => b.ovr - a.ovr
    );

    const pinned = m.depth[
      t.id + ":" + pos
    ];

    if (pinned) {
      const index = ps.findIndex(
        p => p.id === pinned
      );

      if (index > 0) {
        ps.unshift(
          ...ps.splice(index, 1)
        );
      }
    }

    return `
      <div class="card">
        <h3>${pos} · ${ps.length} players</h3>

        ${ps.slice(0,5).map(
          (p,i) => `
            <div class="row">
              <span>
                ${i === 0 ? "★ " : ""}
                ${esc(p.name)}
                · ${p.ovr} OVR
                · Y${p.yr}
                ${p.redshirt ? " · RS" : ""}
                ${p.injury ? " · INJ" : ""}
              </span>

              <button onclick="
                sdPin('${pos}','${p.id}')
              ">
                Start
              </button>

              <button onclick="
                sdRedshirt('${p.id}')
              ">
                ${p.redshirt ? "Undo RS" : "Redshirt"}
              </button>
            </div>
          `
        ).join("")}
      </div>
    `;
  }).join("");

  return `
    <h2>Depth Chart & Eligibility</h2>

    <p class="muted">
      Choose starters and redshirt players.
      Starting players receive a small
      focused-training bonus.
    </p>

    <button onclick="
      tab='Player Development';
      render()
    ">
      Open Player Development
    </button>

    <div class="grid">
      ${cards}
    </div>
  `;
}

function sdPin(pos,pid) {
  const p = team().roster.find(
    p => p.id === pid &&
         p.pos === pos
  );

  if (!p) return;

  sdInit().depth[
    team().id + ":" + pos
  ] = pid;

  save();
}

function sdRedshirt(pid) {
  const p = team().roster.find(
    p => p.id === pid
  );

  if (!p) return;

  if (!p.redshirt && p.used) {
    alert(
      "This player has already used " +
      "a redshirt season."
    );
    return;
  }

  p.redshirt = !p.redshirt;

  save();
}

/* STAFF MARKET */

function sdStaff() {
  const t = team();
  const m = sdInit();

  const available = S.coaches.filter(
    x => !x.retired &&
         x.role !== "HC" &&
         x.teamId !== t.id
  ).sort(
    (a,b) => b.skill - a.skill
  ).slice(0,12);

  return `
    <h2>Staff Hiring & Development</h2>

    <div class="grid">
      ${["oc","dc"].map(role => {
        const x = c(t[role]);

        return `
          <div class="card">
            <h3>
              ${role.toUpperCase()}:
              ${esc(x?.name || "Vacant")}
            </h3>

            <p>
              Ability ${x?.skill || 0}
              · Recruiting ${x?.recruit || 0}
              · Development ${x?.develop || 0}
            </p>

            <p>
              Scheme ${esc(x?.scheme || "Multiple")}
            </p>
          </div>
        `;
      }).join("")}
    </div>

    <h3>Assistant Coach Market</h3>

    <section>
      <table>
        <tr>
          <th>Coach</th>
          <th>Rating</th>
          <th>Role</th>
          <th>Hire</th>
        </tr>

        ${available.map(x => `
          <tr>
            <td>${esc(x.name)}</td>
            <td>${x.skill}</td>
            <td>${x.role}</td>

            <td>
              <button onclick="
                sdHire('${x.id}','oc')
              ">OC</button>

              <button onclick="
                sdHire('${x.id}','dc')
              ">DC</button>
            </td>
          </tr>
        `).join("")}
      </table>
    </section>

    <h3>Recent Staff Moves</h3>

    ${m.staffMoves.slice(-15).reverse().map(
      x => `<p>${esc(x)}</p>`
    ).join("") || "<p>None yet.</p>"}
  `;
}

function sdHire(cid,role) {
  const x = c(cid);
  const t = team();

  if (
    !x ||
    x.retired ||
    x.role === "HC" ||
    x.teamId === t.id
  ) return;

  const oldTeam = S.teams.find(
    z => z.oc === x.id ||
         z.dc === x.id
  );

  if (oldTeam) {
    const oldRole =
      oldTeam.oc === x.id ? "oc" : "dc";

    const replacement = coach(
      nm(),
      oldRole.toUpperCase(),
      oldTeam.id
    );

    S.coaches.push(replacement);

    oldTeam[oldRole] = replacement.id;
  }

  const previous = c(t[role]);

  if (previous) {
    previous.retired = true;
    previous.teamId = null;
  }

  x.role = role.toUpperCase();
  x.teamId = t.id;
  t[role] = x.id;

  sdInit().staffMoves.push(
    `${S.year}: ${t.name} hired ` +
    `${x.name} as ${role.toUpperCase()}`
  );

  addNews(
    `${t.name} hired ${x.name} ` +
    `as ${role.toUpperCase()}`
  );

  save();
}

/* TRANSFER PORTAL */

function sdPortal() {
  const m = sdInit();
  const t = team();

  const options = m.transfers.filter(
    x => x.year === S.year &&
         x.to === null &&
         x.from !== t.id
  ).sort(
    (a,b) => b.ovr - a.ovr
  ).slice(0,60);

  return `
    <h2>Transfer Portal · ${S.year}</h2>

    <div class="grid">
      ${box("Portal Players",options.length)}
      ${box("Your Roster",t.roster.length)}
      ${box("NIL Budget","$"+(t.nil||0)+"k")}
    </div>

    <p class="muted">
      Transfers require available roster
      space and sufficient NIL budget.
    </p>

    <section>
      <table>
        <tr>
          <th>Player</th>
          <th>Position</th>
          <th>OVR</th>
          <th>Former School</th>
          <th>NIL</th>
          <th>Action</th>
        </tr>

        ${options.map(x => `
          <tr>
            <td>${esc(x.name)}</td>
            <td>${x.pos}</td>
            <td>${x.ovr}</td>
            <td>
              ${esc(
                S.teams[x.from]?.name ||
                "Unknown"
              )}
            </td>
            <td>$${x.cost}k</td>

            <td>
              <button onclick="
                sdTakeTransfer('${x.id}')
              ">
                Recruit
              </button>
            </td>
          </tr>
        `).join("")}
      </table>
    </section>
  `;
}

function sdTakeTransfer(id) {
  const m = sdInit();

  const x = m.transfers.find(
    x => x.id === id &&
         x.year === S.year &&
         x.to === null
  );

  if (!x) return;

  const t = team();

  if (t.roster.length >= 95) {
    return alert("Roster full.");
  }

  if ((t.nil || 0) < x.cost) {
    return alert("Not enough NIL budget.");
  }

  const from = S.teams[x.from];

  const index = from.roster.findIndex(
    p => p.id === id
  );

  if (index < 0) {
    return alert(
      "Player no longer available."
    );
  }

  const p = from.roster.splice(
    index,1
  )[0];

  t.roster.push(p);
  t.nil -= x.cost;
  x.to = t.id;

  addNews(
    `TRANSFER: ${p.name} joins ` +
    `${t.name} from ${from.name}`
  );

  save();
}

function sdMakePortal() {
  const m = sdInit();

  if (m.portalYear === S.year) return;

  m.portalYear = S.year;
  m.transfers = [];

  for (const t of S.teams) {
    const eligible = t.roster.filter(
      p => p.yr <= 3 &&
           !p.custom
    ).sort(
      (a,b) => b.ovr - a.ovr
    );

    const count = Math.min(
      3,
      Math.max(
        0,
        Math.floor(eligible.length / 30)
      )
    );

    for (const p of eligible.slice(0,count)) {
      if (Math.random() < 0.68) {
        m.transfers.push({
          id: p.id,
          name: p.name,
          pos: p.pos,
          ovr: p.ovr,
          from: t.id,
          to: null,
          year: S.year,
          cost: Math.max(
            25,
            Math.round(
              p.ovr * 2 + rnd(-30,80)
            )
          )
        });
      }
    }
  }
}

/* NATIONAL AWARDS */

function sdHonors(year) {
  const m = sdInit();
  const last = S.seasonHistory.at(-1);

  if (
    !last ||
    m.awards.some(x => x.year === year)
  ) return;

  const candidates = S.teams.flatMap(
    t => t.roster.map(p => ({
      p,
      t,
      score:
        p.ovr * 1.7 +
        (p.stats?.yards || 0) * 0.03 +
        (p.stats?.td || 0) * 3
    }))
  );

  candidates.sort(
    (a,b) => b.score - a.score
  );

  const winner = candidates[0];

  if (!winner) return;

  const award = {
    year,
    name: winner.p.name,
    school: winner.t.name,
    pos: winner.p.pos,
    ovr: winner.p.ovr,
    coach: winner.t.coach
  };

  m.awards.push(award);

  const hc = c(winner.t.coach);

  if (hc) {
    hc.career.heisman =
      (hc.career.heisman || 0) + 1;
  }

  addNews(
    `${year} Player of the Year: ` +
    `${award.name} (${award.school})`
  );

  if (winner.t.id === team().id) {
    spotlight(
      "sign",
      "PLAYER OF THE YEAR",
      award.name,
      `${award.school} · ${award.pos}`
    );
  }

  m.records.push({
    year,
    champion: last.champion,
    heisman: award.name
  });
}

/* WEEKLY DEVELOPMENT INTEGRATION */

const sdPreviousAdvance = advance;

advance = function() {
  const beforeYear = S.year;
  const beforeWeek = S.week;

  const result = sdPreviousAdvance();

  /*
   A completed regular-season week
   triggers one training session.
  */

  if (
    S.year === beforeYear &&
    S.week === beforeWeek + 1 &&
    beforeWeek <= 12
  ) {
    sdDevAdvanceWeek();

    /*
     The existing advance() saves before
     returning. Save again so development
     gains are included in the checkpoint.
    */
    save();
  }

  return result;
};

/* OFFSEASON INTEGRATION */

const sdOriginalEnd = endSeason;

endSeason = function() {
  const year = S.year;

  sdInit();

  sdOriginalEnd();

  if (
    S.seasonHistory.some(
      x => x.year === year
    )
  ) {
    sdHonors(year);
    sdMakePortal();

    for (const t of S.teams) {
      t.nil = Math.min(
        4000,
        (t.nil || 0) + t.prestige * 100
      );

      for (const p of t.roster) {
        if (p.redshirt) {
          p.yr = Math.max(1,p.yr-1);
          p.used = true;
          p.redshirt = false;
        }
      }
    }
  }

  /*
   Remove development assignments for
   players who graduated or transferred.
  */

  const state = sdDevState();

  state.assignments =
    state.assignments.filter(
      a => {
        const t = S.teams.find(
          x => x.id === a.teamId
        );

        return !!t?.roster.some(
          p => p.id === a.playerId
        );
      }
    );
};

/* NAVIGATION */

const sdOriginalNav = nav;

nav = function() {
  sdOriginalNav();

  const n = document.getElementById("nav");

  const tabs = [
    "Depth Chart",
    "Player Development",
    "Transfer Portal",
    "Staff Market",
    "Awards"
  ];

  n.insertAdjacentHTML(
    "beforeend",
    tabs.map(
      x => `
        <button
          class="${tab === x ? "active" : ""}"
          onclick="
            tab='${x}';
            render()
          "
        >
          ${x}
        </button>
      `
    ).join("")
  );
};

/* RENDERING */

const sdOriginalRender = render;

render = function() {
  sdInit();

  sdOriginalRender();

  const main = document.getElementById(
    "main"
  );

  if (!main) return;

  if (tab === "Depth Chart") {
    main.innerHTML = sdDepth();
  }

  if (tab === "Player Development") {
    main.innerHTML = sdDevelopment();
  }

  if (tab === "Transfer Portal") {
    main.innerHTML = sdPortal();
  }

  if (tab === "Staff Market") {
    main.innerHTML = sdStaff();
  }

  if (tab === "Awards") {
    main.innerHTML = `
      <h2>National Awards & Coaching Legacy</h2>

      <section>
        <table>
          <tr>
            <th>Season</th>
            <th>Player of the Year</th>
            <th>School</th>
            <th>Position</th>
          </tr>

          ${sdInit().awards.slice().reverse().map(
            x => `
              <tr>
                <td>${x.year}</td>
                <td>${esc(x.name)}</td>
                <td>${esc(x.school)}</td>
                <td>${x.pos}</td>
              </tr>
            `
          ).join("")}
        </table>
      </section>

      <p class="muted">
        Award selections are generated
        by the dynasty simulation.
      </p>
    `;
  }
};
