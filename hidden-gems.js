
/*
 SATURDAY DYNASTY
 Hidden Gems & Development v1.0

 - Meaningful potential for low-star gems
 - Rare Star and Elite development
 - Modest offseason growth advantage
 - No guaranteed 90+ superstars

 Load after simulation.js and before
 startup.js.

 No save reset required.
*/

(function () {
  "use strict";

  const rand = (min, max) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  const clamp = (n, min, max) =>
    Math.max(min, Math.min(max, n));

  /*
   Generate a player's development trait
   based on recruiting stars.

   Lower-rated gems are intentionally rare.
  */
  function recruitTrait(stars) {
    const roll = Math.random() * 100;

    if (stars <= 2) {
      if (roll < 1.5) return "Elite";
      if (roll < 7.5) return "Star";
      if (roll < 29) return "Impact";
      return "Normal";
    }

    if (stars === 3) {
      if (roll < 4) return "Elite";
      if (roll < 16) return "Star";
      if (roll < 46) return "Impact";
      return "Normal";
    }

    if (stars === 4) {
      if (roll < 9) return "Elite";
      if (roll < 30) return "Star";
      if (roll < 67) return "Impact";
      return "Normal";
    }

    if (roll < 18) return "Elite";
    if (roll < 48) return "Star";
    if (roll < 80) return "Impact";
    return "Normal";
  }

  /*
   The trait affects potential,
   but the starting OVR still matters.

   A 57 OVR Elite recruit should not
   automatically become a 95 OVR.
  */
  function potentialFor(p, stars) {
    const growth = {
      Normal: [5, 11],
      Impact: [10, 16],
      Star: [15, 22],
      Elite: [19, 26]
    }[p.dev] || [5, 11];

    let gain = rand(growth[0], growth[1]);

    /*
     Small additional upside for
     higher-star recruits.
    */
    if (stars === 3) gain += rand(0, 2);
    if (stars === 4) gain += rand(1, 4);
    if (stars === 5) gain += rand(2, 5);

    return clamp(p.ovr + gain, p.ovr, 99);
  }

  /*
   Rebalance the recruiting class
   exactly once per player.

   Do not rewrite players who have
   already entered a college roster.
  */
  function balanceClass() {
    if (
      typeof S === "undefined" ||
      !Array.isArray(S.recruits)
    ) return;

    for (const r of S.recruits) {
      if (r.sdGemBalanced) continue;

      const stars = Number(r.stars) || 2;

      r.dev = recruitTrait(stars);
      r.pot = potentialFor(r, stars);

      r.sdGemBalanced = true;
    }
  }

  /*
   Returning players receive a modest
   extra offseason boost.

   We only add growth to players who
   existed before endSeason(), never
   incoming freshmen.

   The existing engine still handles
   graduation, roster turnover and
   recruiting.
  */
  function snapshotRosters() {
    const records = new Map();

    for (const t of S.teams) {
      const players = new Map();

      for (const p of t.roster || []) {
        players.set(String(p.id), {
          ovr: p.ovr,
          pot: p.pot
        });
      }

      records.set(String(t.id), players);
    }

    return records;
  }

  function improveReturningPlayers(before) {
    for (const t of S.teams) {
      const oldRoster = before.get(
        String(t.id)
      );

      if (!oldRoster) continue;

      for (const p of t.roster || []) {
        const old = oldRoster.get(
          String(p.id)
        );

        if (!old) continue;

        const room = Math.max(
          0,
          Number(p.pot || p.ovr) - p.ovr
        );

        if (!room) continue;

        let bonus = 0;

        if (p.dev === "Impact") {
          bonus = Math.random() < 0.30
            ? 1 : 0;
        }

        if (p.dev === "Star") {
          bonus = Math.random() < 0.65
            ? 1 : 0;
        }

        if (p.dev === "Elite") {
          bonus = 1;

          if (Math.random() < 0.25) {
            bonus++;
          }
        }

        p.ovr = Math.min(
          99,
          Number(p.pot || p.ovr),
          p.ovr + Math.min(room, bonus)
        );
      }
    }
  }

  /*
   Wrap recruiting class generation.

   Newly generated prospects get
   balanced before the player sees them.
  */
  if (typeof makeRecruits === "function") {
    const originalMakeRecruits = makeRecruits;

    makeRecruits = function () {
      const result = originalMakeRecruits.apply(
        this, arguments
      );

      balanceClass();

      return result;
    };
  }

  /*
   Wrap the original full-season
   transition without replacing it.

   This assumes endSeason() still
   performs roster advancement.
   If postseason becomes staged,
   move this bonus to the dedicated
   offseason roster-transition step.
  */
  if (typeof endSeason === "function") {
    const originalEndSeason = endSeason;

    endSeason = function () {
      const before = snapshotRosters();
      const previousYear = S.year;

      const result = originalEndSeason.apply(
        this, arguments
      );

      if (S.year !== previousYear) {
        improveReturningPlayers(before);
        balanceClass();
      }

      return result;
    };
  }

  /*
   Existing saves:
   Preserve recruits already targeted,
   offered, or committed.

   Only untouched prospects get
   rebalanced.
  */
  function balanceExistingClass() {
    if (
      typeof S === "undefined" ||
      !Array.isArray(S.recruits)
    ) return;

    for (const r of S.recruits) {
      if (
        r.target ||
        r.offer ||
        r.committed !== null
      ) {
        r.sdGemBalanced = true;
      }
    }

    balanceClass();
  }

  const originalRender = render;
  let initialized = false;

  render = function () {
    if (!initialized &&
        typeof S !== "undefined" &&
        S?.recruits) {
      initialized = true;
      balanceExistingClass();
    }

    return originalRender.apply(
      this, arguments
    );
  };

  console.info(
    "[Saturday Dynasty] Hidden Gems active."
  );
})();
