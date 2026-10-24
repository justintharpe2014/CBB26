
/*
 SATURDAY DYNASTY
 GAME WEEK HEADQUARTERS v1.0

 Features:
 - Upcoming opponent
 - Current team records
 - Matchup strength
 - Conference standings
 - Season milestones
 - Coaching role context

 Read-only. No save modifications.

 Load after office-upgrade.js
 and before startup.js.
*/

(function () {
  "use strict";

  const escText = value =>
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

  const number = value =>
    Number.isFinite(Number(value))
      ? Number(value)
      : 0;

  function getState() {
    if (
      typeof S === "undefined" ||
      !S ||
      !Array.isArray(S.teams)
    ) return null;

    if (
      typeof team !== "function" ||
      typeof user !== "function"
    ) return null;

    return {
      school: team(),
      coach: user()
    };
  }

  function getNextGame(t) {
    if (!Array.isArray(S.games)) {
      return null;
    }

    return S.games
      .filter(g =>
        !g.played &&
        (
          String(g.a) === String(t.id) ||
          String(g.b) === String(t.id)
        )
      )
      .sort(
        (a, b) =>
          number(a.week) - number(b.week)
      )[0] || null;
  }

  function getOpponent(g, t) {
    if (!g) return null;

    const id =
      String(g.a) === String(t.id)
        ? g.b
        : g.a;

    return S.teams.find(
      x => String(x.id) === String(id)
    ) || null;
  }

  function rating(t) {
    if (!t) return 0;

    try {
      if (typeof expected === "function") {
        const value = expected(t);

        if (Number.isFinite(value)) {
          return value;
        }
      }
    } catch (error) {
      console.warn(
        "Game Week rating fallback:",
        error
      );
    }

    const roster = Array.isArray(t.roster)
      ? [...t.roster]
      : [];

    const top = roster
      .sort(
        (a, b) =>
          number(b.ovr) - number(a.ovr)
      )
      .slice(0, 44);

    if (!top.length) return 60;

    return top.reduce(
      (sum, p) => sum + number(p.ovr),
      0
    ) / top.length;
  }

  function matchup(a, b) {
    const difference = rating(a) - rating(b);

    if (difference >= 9) {
      return {
        title: "Strong favorite",
        note: "Your roster has a substantial advantage.",
        color: "#45c987"
      };
    }

    if (difference >= 3) {
      return {
        title: "Favorable matchup",
        note: "Your team has an edge, but an upset is possible.",
        color: "#45c987"
      };
    }

    if (difference > -3) {
      return {
        title: "Even matchup",
        note: "This could come down to a handful of plays.",
        color: "#e2b85d"
      };
    }

    if (difference > -9) {
      return {
        title: "Tough matchup",
        note: "Your opponent has the stronger roster on paper.",
        color: "#e2b85d"
      };
    }

    return {
      title: "Major underdog",
      note: "A win here would be a statement for your program.",
      color: "#ef8585"
    };
  }

  function record(t) {
    return (
      number(t.wins) +
      "-" +
      number(t.losses)
    );
  }

  function conferenceRank(t) {
    const schools = S.teams
      .filter(x => x.conf === t.conf)
      .sort(
        (a, b) =>
          number(b.cwins) -
            number(a.cwins) ||
          number(b.wins) -
            number(a.wins) ||
          rating(b) - rating(a)
      );

    return {
      rank: schools.findIndex(
        x => String(x.id) === String(t.id)
      ) + 1,
      total: schools.length
    };
  }

  function milestone(label, achieved, detail) {
    return `
      <div class="row" style="
        align-items:center;
        gap:10px;
        margin:8px 0;
      ">
        <span style="
          font-size:19px;
          color:${
            achieved
              ? "#45c987"
              : "#aaa"
          };
        ">
          ${achieved ? "✓" : "○"}
        </span>

        <div style="flex:1;">
          <b>${escText(label)}</b>

          <div class="muted" style="
            font-size:12px;
          ">
            ${escText(detail)}
          </div>
        </div>
      </div>
    `;
  }

  function buildMilestones(t) {
    const wins = number(t.wins);

    return `
      <h3>Season Milestones</h3>

      ${milestone(
        "First Victory",
        wins >= 1,
        wins >= 1
          ? "Completed"
          : "Win your first game"
      )}

      ${milestone(
        "Bowl Eligibility",
        wins >= 6,
        wins >= 6
          ? "Six wins achieved"
          : (6 - wins) + " wins remaining"
      )}

      ${milestone(
        "Eight-Win Season",
        wins >= 8,
        wins >= 8
          ? "Eight wins achieved"
          : (8 - wins) + " wins remaining"
      )}

      ${milestone(
        "Ten-Win Season",
        wins >= 10,
        wins >= 10
          ? "Double-digit wins achieved"
          : (10 - wins) + " wins remaining"
      )}
    `;
  }

  function buildHQ() {
    const state = getState();

    if (!state || !state.school) {
      return "";
    }

    const t = state.school;
    const coach = state.coach;

    const game = getNextGame(t);
    const opponent = getOpponent(game, t);

    const conf = conferenceRank(t);

    let matchupHTML = "";

    if (opponent) {
      const result = matchup(t, opponent);

      const home =
        String(game.a) === String(t.id);

      matchupHTML = `
        <div class="card">
          <h3>Next Opponent</h3>

          <p class="muted">
            Week ${escText(game.week)}
            · ${home ? "Home" : "Away"}
            ${game.conference
              ? " · Conference Game"
              : " · Nonconference"}
          </p>

          <div class="row" style="
            align-items:center;
            justify-content:space-between;
            gap:12px;
          ">
            <div>
              <b>${escText(t.name)}</b>
              <p>${record(t)}</p>
            </div>

            <b>VS</b>

            <div style="text-align:right;">
              <b>${escText(opponent.name)}</b>
              <p>${record(opponent)}</p>
            </div>
          </div>

          <hr>

          <b style="
            color:${result.color};
          ">
            ${result.title}
          </b>

          <p class="muted">
            ${result.note}
          </p>
        </div>
      `;
    } else {
      matchupHTML = `
        <div class="card">
          <h3>Regular Season Complete</h3>

          <p class="muted">
            No remaining regular-season
            games are scheduled.
            Check My Postseason for
            conference championships,
            bowl games, and playoffs.
          </p>
        </div>
      `;
    }

    const role = coach?.role || "HC";

    const roleName = {
      HC: "Head Coach",
      OC: "Offensive Coordinator",
      DC: "Defensive Coordinator"
    }[role] || role;

    return `
      <section id="sd-gameweek-hq">
        <h2>Game Week Headquarters</h2>

        <p class="muted">
          ${escText(t.name)}
          · ${escText(roleName)}
          · ${escText(S.year)}
        </p>

        <div class="grid">
          <div class="card">
            <small>Season Record</small>
            <h2>${record(t)}</h2>
          </div>

          <div class="card">
            <small>Conference Record</small>
            <h2>
              ${number(t.cwins)}-${number(t.closses)}
            </h2>
          </div>

          <div class="card">
            <small>Conference Position</small>
            <h2>
              ${conf.rank || "—"}
              / ${conf.total}
            </h2>
          </div>
        </div>

        ${matchupHTML}

        <details style="margin:12px 0;">
          <summary style="
            cursor:pointer;
            padding:14px;
            border:1px solid #555;
            border-radius:10px;
            font-weight:bold;
          ">
            Season Milestones
          </summary>

          <div class="card">
            ${buildMilestones(t)}
          </div>
        </details>
      </section>
    `;
  }

  function installHQ() {
    if (
      typeof tab === "undefined" ||
      tab !== "Office"
    ) return;

    const main = document.getElementById(
      "main"
    );

    if (!main) return;

    const previous = document.getElementById(
      "sd-gameweek-hq"
    );

    if (previous) previous.remove();

    const wrapper = document.createElement(
      "div"
    );

    wrapper.innerHTML = buildHQ();

    const results = document.getElementById(
      "sd-office-results"
    );

    if (results) {
      results.before(wrapper);
    } else {
      main.prepend(wrapper);
    }
  }

  const previousRender = render;

  render = function () {
    const result = previousRender.apply(
      this,
      arguments
    );

    try {
      installHQ();
    } catch (error) {
      console.error(
        "Game Week HQ:",
        error
      );
    }

    return result;
  };

  document.addEventListener(
    "DOMContentLoaded",
    () => {
      try {
        installHQ();
      } catch (error) {
        console.error(error);
      }
    }
  );

  console.info(
    "[Saturday Dynasty] Game Week HQ ready."
  );
})();
