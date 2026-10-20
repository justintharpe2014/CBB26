
/*
 SATURDAY DYNASTY
 Recruiting Realism & Coaching Legacy
 Version 1.0

 Load AFTER career-mode.js and
 BEFORE startup.js.

 Does not replace saved career data.
*/

(function () {
  "use strict";

  const clamp = (n, min, max) =>
    Math.max(min, Math.min(max, n));

  function schoolMomentum(t) {
    const history = Array.isArray(t.history)
      ? t.history.slice(-3)
      : [];

    if (!history.length) return 0;

    const averageWins =
      history.reduce(
        (sum, season) =>
          sum + (Number(season.w) || 0),
        0
      ) / history.length;

    return clamp(
      Math.round((averageWins - 6) * 1.5),
      -5,
      9
    );
  }

  function recruitingPower(t) {
    return (
      (Number(t.prestige) || 2) * 12 +
      schoolMomentum(t)
    );
  }

  function isElite(r) {
    return Number(r.stars) === 5;
  }

  function eliteAdjustment(r, t) {
    if (!isElite(r)) return 0;

    const prestige = Number(t.prestige) || 2;

    const base = {
      1: -25,
      2: -18,
      3: -8,
      4: 5,
      5: 15
    }[prestige] ?? 0;

    return base + schoolMomentum(t);
  }

  /*
   Interest remains the game's original
   numeric value. We apply the prestige
   adjustment once per recruit/school.

   This avoids repeatedly penalizing
   a school every recruiting week.
  */

  function prepareEliteRecruit(r) {
    if (!isElite(r)) return;

    if (!r.interest ||
        typeof r.interest !== "object") {
      r.interest = {};
    }

    if (!r.sdRealismAdjusted) {
      r.sdRealismAdjusted = {};
    }

    for (const t of S.teams) {
      const key = String(t.id);

      if (r.sdRealismAdjusted[key]) {
        continue;
      }

      const current = Number(
        influence(r, t)
      ) || 0;

      r.interest[t.id] = clamp(
        current + eliteAdjustment(r, t),
        0,
        200
      );

      r.sdRealismAdjusted[key] = true;
    }
  }

  function eliteCompetition(r) {
    if (!isElite(r) ||
        r.committed !== null) {
      return;
    }

    /*
     Give elite prospects meaningful
     competition from prestigious schools.
    */

    const leaders = [...S.teams]
      .filter(t => t.prestige >= 4)
      .sort(
        (a, b) =>
          recruitingPower(b) -
          recruitingPower(a)
      )
      .slice(0, 12);

    for (const t of leaders) {
      const current =
        Number(influence(r, t)) || 0;

      const growth =
        t.prestige === 5 ? 3 : 2;

      r.interest[t.id] = clamp(
        current + growth,
        0,
        200
      );
    }
  }

  /*
   Prevent elite recruiting from being
   automatic at rebuilding programs.

   Smaller schools still have a chance,
   but need substantial recruiting effort
   and must overcome stronger competition.
  */

  function enforceEliteStandards(r) {
    if (!isElite(r) ||
        r.committed !== null) {
      return;
    }

    const t = team();

    if (!t) return;

    const prestige = Number(t.prestige) || 2;

    if (prestige >= 4) return;

    const key = t.id;
    const interest = Number(
      r.interest?.[key]
    ) || 0;

    /*
     Preserve earned recruiting progress.
     This is a ceiling on effective interest
     before a prospect has received enough
     attention, not a weekly deduction.
    */

    const hasOffer = !!r.offer;
    const hasVisit = !!r.visit;

    if (!hasOffer) {
      r.interest[key] = Math.min(
        interest,
        prestige <= 2 ? 75 : 85
      );
    } else if (!hasVisit) {
      r.interest[key] = Math.min(
        interest,
        prestige <= 2 ? 89 : 100
      );
    }
  }

  /*
   Recruiting weekly integration.

   Runs before the existing engine
   determines commitments.
  */

  const previousRecruitWeek = recruitWeek;

  recruitWeek = function () {
    if (!S || !Array.isArray(S.recruits)) {
      return previousRecruitWeek.apply(
        this, arguments
      );
    }

    for (const r of S.recruits) {
      if (!isElite(r) ||
          r.committed !== null) {
        continue;
      }

      prepareEliteRecruit(r);
      eliteCompetition(r);
      enforceEliteStandards(r);
    }

    return previousRecruitWeek.apply(
      this, arguments
    );
  };

  /*
   LEGACY REBALANCING

   Historical legends and active coaches
   use the same basic scoring categories.

   Recruiting rankings and five-star
   signings no longer inflate the score
   against historical coaches whose
   recruiting data isn't included.
  */

  scoreCoach = function (coach) {
    const career = coach?.career || {};

    const wins =
      Number(career.wins) || 0;

    const losses =
      Number(career.losses) || 0;

    const titles =
      Number(career.titles) || 0;

    const conferenceTitles =
      Number(career.conferenceTitles) || 0;

    const bowlWins =
      Number(career.bowlWins) || 0;

    const playoffWins =
      Number(career.playoffWins) || 0;

    const games = wins + losses;

    const winRate =
      games > 0 ? wins / games : 0;

    const longevity =
      Math.floor(wins / 50) * 75;

    return Math.round(
      wins * 12 +
      titles * 750 +
      conferenceTitles * 100 +
      bowlWins * 35 +
      playoffWins * 45 +
      longevity +
      (games >= 100 ? winRate * 200 : 0)
    );
  };

  /*
   Disable the broken development
   objective in annual AD evaluations.

   We remove it from the active goal
   definitions, so it cannot count
   as a missed objective going forward.
   Previously awarded XP is preserved.
  */

  function disableBrokenGoal() {
    if (!S ||
        !Array.isArray(S.coaches)) {
      return;
    }

    for (const coach of S.coaches) {
      const state = coach.goals;

      if (!state ||
          !Array.isArray(state.goals)) {
        continue;
      }

      state.goals = state.goals.filter(
        goal =>
          goal.id !== "development"
      );
    }
  }

  const previousRender = render;

  render = function () {
    disableBrokenGoal();

    return previousRender.apply(
      this, arguments
    );
  };

  /*
   Ensure development goals are removed
   before the season-end goal checks.
  */

  const previousEndSeason = endSeason;

  endSeason = function () {
    disableBrokenGoal();

    return previousEndSeason.apply(
      this, arguments
    );
  };

  console.info(
    "[Saturday Dynasty] Realism Balance loaded."
  );

})();
