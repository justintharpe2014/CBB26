
/*
 SATURDAY DYNASTY
 ATHLETIC DIRECTOR EXPECTATIONS 2.0

 COMPLETE REPLACEMENT: career-goals.js

 Includes:
 - Annual coaching objectives
 - National scoring rankings
 - Offensive / defensive PPG
 - Rivalry victories
 - Real player development tracking
 - Recruiting responsibilities
 - Prestige-based multi-year milestones
 - XP and reputation rewards
 - Program expectation deadlines
 - Assistant recruiting

 Compatible with existing depth.js,
 simulation.js, career-mode.js and
 startup.js.
*/

(function () {
  "use strict";

  const OFF = new Set([
    "QB","HB","RB","FB","WR","TE",
    "OT","OG","C"
  ]);

  const DEF = new Set([
    "DE","DT","OLB","MLB","LB",
    "CB","FS","SS","S","DB"
  ]);

  function side(pos) {
    if (OFF.has(pos)) return "OC";
    if (DEF.has(pos)) return "DC";
    return "HC";
  }

  function schoolFor(x) {
    return S.teams.find(
      t => t.id === x.teamId
    );
  }

  function safeNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function allGames(year = S.year) {
    const regular = (S.games || [])
      .filter(g =>
        g.played &&
        (g.year === undefined || g.year === year)
      );

    const postseason = (S.postseason || [])
      .filter(g =>
        g.played &&
        g.year === year
      );

    return [...regular, ...postseason];
  }

  function statsFor(t, year = S.year) {
    const games = allGames(year).filter(
      g => g.a === t.id || g.b === t.id
    );

    let scored = 0;
    let allowed = 0;
    let rivalryWins = 0;
    let rivalryGames = 0;
    let conferenceTitles = 0;
    let bowlWins = 0;
    let playoffWins = 0;
    let nationalTitles = 0;

    for (const g of games) {
      const home = g.a === t.id;

      const pf = home ? g.sa : g.sb;
      const pa = home ? g.sb : g.sa;

      scored += safeNumber(pf);
      allowed += safeNumber(pa);

      const won = pf > pa;

      if (g.rivalry) {
        rivalryGames++;
        if (won) rivalryWins++;
      }

      if (won) {
        if (g.phase === "conference") {
          conferenceTitles++;
        }

        if (g.phase === "Bowl") {
          bowlWins++;
        }

        if (
          typeof g.phase === "string" &&
          g.phase.startsWith("CFP")
        ) {
          playoffWins++;
        }

        if (
          g.phase === "CFP National Championship"
        ) {
          nationalTitles++;
        }
      }
    }

    const played = games.length;

    return {
      games: played,
      scored,
      allowed,
      ppg: played ? scored / played : 0,
      papg: played ? allowed / played : 0,
      rivalryWins,
      rivalryGames,
      conferenceTitles,
      bowlWins,
      playoffWins,
      nationalTitles
    };
  }

  function rankings(year = S.year) {
    const rows = S.teams.map(t => ({
      id: t.id,
      ...statsFor(t, year)
    }));

    const eligible = rows.filter(
      r => r.games > 0
    );

    const offense = [...eligible].sort(
      (a,b) => b.ppg - a.ppg
    );

    const defense = [...eligible].sort(
      (a,b) => a.papg - b.papg
    );

    const result = {};

    for (const t of S.teams) {
      result[t.id] = {
        offense: null,
        defense: null,
        stats: rows.find(
          r => r.id === t.id
        )
      };
    }

    offense.forEach((r,i) => {
      result[r.id].offense = i + 1;
    });

    defense.forEach((r,i) => {
      result[r.id].defense = i + 1;
    });

    return result;
  }

  function devCount(x, year = S.year) {
    const t = schoolFor(x);

    if (!t) return 0;

    const history =
      S.management?.development?.history || [];

    const improved = new Map();

    for (const h of history) {
      if (
        h.year !== year ||
        h.teamId !== t.id
      ) continue;

      if (
        x.role !== "HC" &&
        side(h.pos) !== x.role
      ) continue;

      improved.set(
        h.playerId,
        (improved.get(h.playerId) || 0) +
        safeNumber(h.gained)
      );
    }

    return [...improved.values()]
      .filter(gained => gained >= 2)
      .length;
  }

  function recruitCount(x) {
    const t = schoolFor(x);

    if (!t) return 0;

    return (S.recruits || []).filter(
      r =>
        r.committed === t.id &&
        (
          x.role === "HC" ||
          side(r.pos) === x.role
        )
    ).length;
  }

  function objective(
    id, label, target, xp,
    kind = "count"
  ) {
    return {
      id,
      label,
      target,
      xp,
      kind
    };
  }

  function annualGoals(x) {
    const t = schoolFor(x);

    if (!t) return [];

    const prestige = safeNumber(t.prestige, 2);

    const previous = t.history?.at(-1);

    const previousWins =
      previous?.w ??
      (prestige >= 4 ? 8 : 5);

    const winsTarget = Math.max(
      4,
      Math.min(
        11,
        Math.round(
          (previousWins + prestige + 2) / 2
        )
      )
    );

    const topTarget =
      prestige >= 5 ? 25 :
      prestige >= 4 ? 40 :
      prestige >= 3 ? 60 : 85;

    const offense = [
      objective(
        "scoringOffense",
        "Finish Top " + topTarget +
        " in National Scoring Offense",
        topTarget,
        150,
        "rank"
      ),

      objective(
        "offensivePPG",
        "Average at Least " +
        (prestige >= 4 ? 30 : 25) +
        " Points Per Game",
        prestige >= 4 ? 30 : 25,
        120
      ),

      objective(
        "development",
        "Develop 2 Offensive Players " +
        "by at Least 2 OVR Each",
        2,
        140
      ),

      objective(
        "recruits",
        "Sign 2 Offensive Recruits",
        2,
        100
      )
    ];

    const defense = [
      objective(
        "scoringDefense",
        "Finish Top " + topTarget +
        " in National Scoring Defense",
        topTarget,
        150,
        "rank"
      ),

      objective(
        "defensivePPG",
        "Allow No More Than " +
        (prestige >= 4 ? 23 : 28) +
        " Points Per Game",
        prestige >= 4 ? 23 : 28,
        120,
        "max"
      ),

      objective(
        "development",
        "Develop 2 Defensive Players " +
        "by at Least 2 OVR Each",
        2,
        140
      ),

      objective(
        "recruits",
        "Sign 2 Defensive Recruits",
        2,
        100
      )
    ];

    const shared = [
      objective(
        "wins",
        "Win " + winsTarget +
        " Games",
        winsTarget,
        120
      ),

      objective(
        "rivalry",
        "Win a Rivalry Game",
        1,
        100
      )
    ];

    if (x.role === "OC") {
      return [
        ...offense,
        ...shared
      ];
    }

    if (x.role === "DC") {
      return [
        ...defense,
        ...shared
      ];
    }

    return [
      ...shared,
      offense[0],
      defense[0],
      objective(
        "development",
        "Develop 2 Players by " +
        "at Least 2 OVR Each",
        2,
        140
      ),
      objective(
        "recruits",
        "Sign 3 Recruits",
        3,
        110
      )
    ];
  }

  function milestoneTemplates(prestige) {
    if (prestige <= 1) {
      return [
        ["bowlAppearance",
         "Reach a Bowl Game Within 3 Years",
         3, 260],

        ["eightWins",
         "Win 8 Games in a Season Within 4 Years",
         4, 300]
      ];
    }

    if (prestige === 2) {
      return [
        ["bowlWin",
         "Win a Bowl Game Within 3 Years",
         3, 320],

        ["eightWins",
         "Win 8 Games in a Season Within 3 Years",
         3, 260]
      ];
    }

    if (prestige === 3) {
      return [
        ["conferenceTitle",
         "Win a Conference Championship " +
         "Within 3 Years",
         3, 420],

        ["tenWins",
         "Win 10 Games in a Season " +
         "Within 4 Years",
         4, 350]
      ];
    }

    if (prestige === 4) {
      return [
        ["conferenceTitle",
         "Win a Conference Championship " +
         "Within 3 Years",
         3, 450],

        ["playoffWin",
         "Win a CFP Game Within 4 Years",
         4, 550]
      ];
    }

    return [
      ["playoffWin",
       "Win a CFP Game Within 2 Years",
       2, 500],

      ["nationalTitle",
       "Win the National Championship " +
       "Within 4 Years",
       4, 1000]
    ];
  }

  function milestoneState(x) {
    const t = schoolFor(x);

    if (!t) return null;

    if (!x.sdMilestones) {
      x.sdMilestones = {};
    }

    const current = x.sdMilestones;

    /*
     Moving to a new school starts a
     new set of program expectations.
     Completed historical milestones
     remain in the coach's history.
    */

    if (
      current.teamId !== t.id ||
      current.role !== x.role
    ) {
      const templates =
        milestoneTemplates(
          safeNumber(t.prestige, 2)
        );

      x.sdMilestones = {
        teamId: t.id,
        role: x.role,
        startedYear: S.year,
        goals: templates.map(
          ([id,label,years,xp]) => ({
            id,
            label,
            years,
            xp,
            deadline: S.year + years - 1,
            completed: false,
            failed: false,
            completedYear: null
          })
        )
      };
    }

    return x.sdMilestones;
  }

  function goalState(x) {
    if (
      !x.goals ||
      x.goals.year !== S.year ||
      !Array.isArray(x.goals.goals) ||
      x.goals.version !== 2
    ) {
      x.goals = {
        version: 2,
        year: S.year,
        awarded: [],
        goals: annualGoals(x),
        results: []
      };
    }

    if (!Array.isArray(x.goals.awarded)) {
      x.goals.awarded = [];
    }

    if (!Array.isArray(x.goals.results)) {
      x.goals.results = [];
    }

    milestoneState(x);

    return x.goals;
  }

  function progress(x, g, year = S.year) {
    const t = schoolFor(x);

    if (!t) return 0;

    const s = statsFor(t, year);
    const ranks = rankings(year)[t.id];

    switch (g.id) {
      case "wins":
        return t.wins || 0;

      case "recruits":
        return recruitCount(x);

      case "development":
        return devCount(x, year);

      case "rivalry":
        return s.rivalryWins;

      case "scoringOffense":
        return ranks?.offense ?? 999;

      case "scoringDefense":
        return ranks?.defense ?? 999;

      case "offensivePPG":
        return s.ppg;

      case "defensivePPG":
        return s.papg;

      default:
        return 0;
    }
  }

  function goalComplete(g, value, final = false) {
    if (g.kind === "rank") {
      return final && value <= g.target;
    }

    if (g.kind === "max") {
      return final && value <= g.target;
    }

    if (
      g.id === "offensivePPG"
    ) {
      return final && value >= g.target;
    }

    return value >= g.target;
  }

  function award(x, xp, label) {
    if (typeof sdAwardXP === "function") {
      sdAwardXP(x, xp, label);
    } else {
      x.xp = (x.xp || 0) + xp;
    }

    x.prestigePoints =
      (x.prestigePoints || 0) +
      Math.ceil(xp / 5);

    x.sdADConfidence = Math.min(
      100,
      (x.sdADConfidence ?? 65) + 5
    );

    if (x.id === S.user) {
      addNews(
        "AD GOAL COMPLETED: " +
        label + " (+" + xp + " XP)"
      );
    }
  }

  function checkAnnual(x, final = false) {
    if (
      !x ||
      x.retired ||
      x.teamId == null
    ) return;

    const state = goalState(x);

    for (const g of state.goals) {
      if (state.awarded.includes(g.id)) {
        continue;
      }

      const value = progress(x,g);

      if (!goalComplete(g,value,final)) {
        continue;
      }

      state.awarded.push(g.id);

      state.results.push({
        year: S.year,
        id: g.id,
        completed: true
      });

      award(x,g.xp,g.label);
    }

    if (final) {
      const missed = state.goals.filter(
        g => !state.awarded.includes(g.id)
      );

      if (missed.length) {
        x.sdADConfidence = Math.max(
          0,
          (x.sdADConfidence ?? 65) -
          Math.min(12,missed.length * 2)
        );
      }
    }
  }

  function historicalResult(t, year) {
    return (S.seasonHistory || [])
      .find(h => h.year === year);
  }

  function milestoneAchieved(x, goal, year) {
    const t = schoolFor(x);

    if (!t) return false;

    const stats = statsFor(t, year);

    const history = historicalResult(
      t,year
    );

    const record = (history?.results || [])
      .find(r => r.team === t.name);

    switch (goal.id) {
      case "bowlAppearance":
        return (
          stats.bowlWins > 0 ||
          (S.postseason || []).some(
            g =>
              g.year === year &&
              g.phase === "Bowl" &&
              (g.a === t.id || g.b === t.id)
          )
        );

      case "bowlWin":
        return stats.bowlWins > 0;

      case "eightWins":
        return (record?.w ?? t.wins) >= 8;

      case "tenWins":
        return (record?.w ?? t.wins) >= 10;

      case "conferenceTitle":
        return stats.conferenceTitles > 0;

      case "playoffWin":
        return stats.playoffWins > 0;

      case "nationalTitle":
        return stats.nationalTitles > 0;

      default:
        return false;
    }
  }

  function checkMilestones(x, year) {
    const state = milestoneState(x);

    if (!state) return;

    for (const g of state.goals) {
      if (g.completed || g.failed) {
        continue;
      }

      if (
        milestoneAchieved(x,g,year)
      ) {
        g.completed = true;
        g.completedYear = year;

        award(x,g.xp,g.label);

        continue;
      }

      if (year >= g.deadline) {
        g.failed = true;

        x.sdADConfidence = Math.max(
          0,
          (x.sdADConfidence ?? 65) - 15
        );

        if (x.id === S.user) {
          addNews(
            "AD EXPECTATION MISSED: " +
            g.label
          );
        }
      }
    }
  }

  function formatValue(g,value) {
    if (g.kind === "rank") {
      return value >= 999
        ? "Not ranked yet"
        : "#" + value + " nationally";
    }

    if (
      g.id === "offensivePPG" ||
      g.id === "defensivePPG"
    ) {
      return value.toFixed(1) + " PPG";
    }

    return (
      Math.min(value,g.target) +
      "/" + g.target
    );
  }

  function annualPanel(x) {
    const state = goalState(x);

    return state.goals.map(g => {
      const value = progress(x,g);

      const done =
        state.awarded.includes(g.id);

      const displayed =
        formatValue(g,value);

      return `
        <div style="
          padding:9px 0;
          border-bottom:1px solid #5555;
        ">
          <div>
            <b>
              ${done ? "✓" : "○"}
              ${esc(g.label)}
            </b>
          </div>

          <small>
            ${esc(displayed)}
            · +${g.xp} XP
            ${done ? " · COMPLETED" : ""}
          </small>
        </div>
      `;
    }).join("");
  }

  function milestonePanel(x) {
    const state = milestoneState(x);

    if (!state) return "";

    return state.goals.map(g => {
      const yearsRemaining = Math.max(
        0,
        g.deadline - S.year + 1
      );

      const status =
        g.completed
          ? "COMPLETED in " + g.completedYear
          : g.failed
            ? "FAILED"
            : yearsRemaining +
              " season(s) remaining";

      return `
        <div style="
          padding:10px 0;
          border-bottom:1px solid #5555;
        ">
          <b>
            ${g.completed ? "✓" :
              g.failed ? "✕" : "○"}
            ${esc(g.label)}
          </b>

          <p class="muted">
            ${esc(status)}
            · +${g.xp} XP
          </p>
        </div>
      `;
    }).join("");
  }

  function panel() {
    const t = team();
    const u = user();

    if (!t || !u) return "";

    const r = rankings()[t.id];

    const s = r.stats;

    const staff = [
      u,
      c(t.oc),
      c(t.dc)
    ].filter(
      (x,i,a) =>
        x &&
        a.findIndex(
          z => z.id === x.id
        ) === i
    );

    return `
      <div class="card">
        <h2>
          Athletic Director Expectations
        </h2>

        <p class="muted">
          ${esc(t.name)}
          · ${t.prestige}-Star Program
          · Season ${S.year}
        </p>

        <div class="grid">
          ${box(
            "Scoring Offense",
            r.offense
              ? "#" + r.offense
              : "—"
          )}

          ${box(
            "Scoring Defense",
            r.defense
              ? "#" + r.defense
              : "—"
          )}

          ${box(
            "Points Per Game",
            s.ppg.toFixed(1)
          )}

          ${box(
            "Points Allowed",
            s.papg.toFixed(1)
          )}
        </div>

        <p class="muted">
          National rankings are based on
          completed games this season.
          Annual ranking and PPG goals
          are finalized at season's end.
        </p>

        ${staff.map(x => `
          <details
            class="card"
            ${x.id === u.id ? "open" : ""}
          >
            <summary>
              <b>
                ${esc(x.role)}
                · ${esc(x.name)}
              </b>

              · Level ${x.level || 1}
              · ${x.points || 0} CP
            </summary>

            <p>
              AD Confidence:
              <b>
                ${x.sdADConfidence ?? 65}/100
              </b>
            </p>

            <h3>Annual Goals</h3>
            ${annualPanel(x)}

            <h3>Multi-Year Program Goals</h3>
            ${milestonePanel(x)}
          </details>
        `).join("")}
      </div>
    `;
  }

  /*
   ASSISTANT RECRUITING
   Preserve the existing manual,
   assisted and delegated options.
  */

  window.sdRecruitStrategy = function() {
    S.assist = S.assist || {
      mode:"assisted",
      ocBudget:200,
      dcBudget:200
    };

    return S.assist;
  };

  window.sdSetAssist = function(mode) {
    if (![
      "manual","assisted","delegated"
    ].includes(mode)) return;

    sdRecruitStrategy().mode = mode;

    save();
  };

  function assistedRecruit() {
    const cfg = sdRecruitStrategy();

    if (cfg.mode === "manual") return;

    for (const t of S.teams) {
      const isUser =
        t.id === team().id;

      if (
        isUser &&
        cfg.mode === "assisted"
      ) continue;

      const needs =
        typeof sdNeeds === "function"
          ? sdNeeds(t).sort(
              (a,b) => b.need - a.need
            )
          : [];

      let count = 0;

      for (const need of needs) {
        if (
          need.need <= 0 ||
          count >= 3
        ) break;

        const options = S.recruits
          .filter(r =>
            r.committed === null &&
            r.pos === need.pos &&
            (!isUser || !r.offer)
          )
          .sort((a,b) =>
            influence(b,t) -
            influence(a,t)
          );

        for (
          const r of options.slice(
            0,
            Math.min(need.need,2)
          )
        ) {
          const role = side(r.pos);

          const staff = c(
            t[
              role === "OC"
                ? "oc"
                : role === "DC"
                  ? "dc"
                  : "coach"
            ]
          );

          const amount = Math.max(
            2,
            Math.round(
              (staff?.recruit || 55) / 15
            )
          );

          r.interest[t.id] =
            influence(r,t) + amount;

          if (isUser) {
            r.offer = true;
            r.target = true;
            r.assigned =
              role.toLowerCase();
          }

          count++;

          if (count >= 3) break;
        }
      }
    }
  }

  /*
   SEASON HOOKS

   Important: the postseason is simulated
   inside endSeason(), before the calendar
   advances. Capture completed outcomes
   before calling the original function's
   offseason roster reset.
  */

  const beforeEndSeason = endSeason;

  endSeason = function() {
    const year = S.year;

    const coaches = S.coaches.filter(
      x => !x.retired &&
           x.teamId != null
    );

    /*
     Complete the underlying postseason.
     It will advance to the new season.
    */

    const result = beforeEndSeason();

    /*
     Annual goals for the prior season
     are evaluated from completed games.
     Historical recruiting/development
     records may already have changed,
     so evaluate only recorded stats here.
    */

    for (const x of coaches) {
      if (
        x.goals?.version === 2 &&
        x.goals.year === year
      ) {
        for (const g of x.goals.goals) {
          if (
            x.goals.awarded.includes(g.id)
          ) continue;

          if (
            ![
              "scoringOffense",
              "scoringDefense",
              "offensivePPG",
              "defensivePPG"
            ].includes(g.id)
          ) continue;

          /*
           Scores for the completed year
           are retained in S.postseason,
           while the regular-season
           scores must be read from the
           just-completed games.
          */

          const t = schoolFor(x);

          if (!t) continue;

          const saved = S.sdGoalSeasonStats?.[
            year + ":" + t.id
          ];

          if (!saved) continue;

          let value = 0;

          if (g.id === "scoringOffense") {
            value = saved.offenseRank;
          }

          if (g.id === "scoringDefense") {
            value = saved.defenseRank;
          }

          if (g.id === "offensivePPG") {
            value = saved.ppg;
          }

          if (g.id === "defensivePPG") {
            value = saved.papg;
          }

          if (goalComplete(g,value,true)) {
            x.goals.awarded.push(g.id);
            award(x,g.xp,g.label);
          }
        }
      }

      /*
       Milestone checks use the completed
       postseason records.
      */

      checkMilestones(x,year);
    }

    return result;
  };

  /*
   Capture final regular-season rankings
   immediately before postseason begins.
  */

  const postseasonWrapper = endSeason;

  endSeason = function() {
    const year = S.year;

    const ranks = rankings(year);

    S.sdGoalSeasonStats =
      S.sdGoalSeasonStats || {};

    for (const t of S.teams) {
      const r = ranks[t.id];

      S.sdGoalSeasonStats[
        year + ":" + t.id
      ] = {
        offenseRank: r.offense ?? 999,
        defenseRank: r.defense ?? 999,
        ppg: r.stats.ppg,
        papg: r.stats.papg
      };
    }

    /*
     Check count-based annual goals
     before the offseason changes
     recruiting and rosters.
    */

    for (const x of S.coaches) {
      if (
        !x.retired &&
        x.teamId != null
      ) {
        checkAnnual(x,false);
      }
    }

    return postseasonWrapper();
  };

  const beforeRecruitWeek = recruitWeek;

  recruitWeek = function() {
    assistedRecruit();

    const result =
      beforeRecruitWeek();

    /*
     Check progress without awarding
     final-season PPG/rank goals early.
    */

    for (const x of S.coaches) {
      if (
        !x.retired &&
        x.teamId != null
      ) {
        checkAnnual(x,false);
      }
    }

    return result;
  };

  /*
   Public functions used elsewhere
   in the existing game.
  */

  window.sdSide = side;
  window.sdGoalInit = goalState;
  window.sdGoalProgress = progress;
  window.sdCheckGoals = checkAnnual;
  window.sdGoalsPanel = panel;

  /*
   Add the goals panel to the Office.
  */

  const beforeRender = render;

  render = function() {
    beforeRender();

    if (!S) return;

    const main =
      document.getElementById("main");

    if (!main) return;

    if (tab === "Office") {
      main.insertAdjacentHTML(
        "beforeend",
        panel()
      );
    }

    if (tab === "Recruiting") {
      const cfg = sdRecruitStrategy();

      main.insertAdjacentHTML(
        "afterbegin",
        `
          <div class="card">
            <b>Assistant Recruiting</b>

            <p>
              Manual: no delegation.
              Assisted: staff support.
              Delegated: assistants pursue
              positional needs automatically.
            </p>

            <select onchange="
              sdSetAssist(this.value)
            ">
              ${[
                "manual",
                "assisted",
                "delegated"
              ].map(m => `
                <option
                  value="${m}"
                  ${
                    cfg.mode === m
                      ? "selected"
                      : ""
                  }
                >
                  ${
                    m[0].toUpperCase() +
                    m.slice(1)
                  }
                </option>
              `).join("")}
            </select>
          </div>
        `
      );
    }
  };

})();
