
/*
 SATURDAY DYNASTY
 Realistic Coaching Carousel v1.0

 - Career advancement must be earned
 - Coordinator success matters
 - G5 HC jobs are stepping stones
 - Elite HC jobs require an elite resume
 - No forced multi-year waiting for
   truly exceptional performance
 - No changes to saved records

 Load AFTER career-mode.js
 and BEFORE startup.js.
*/

(function () {
  "use strict";

  const num = x => Number(x) || 0;

  function getResume() {
    const u = user();
    const seasons = Array.isArray(u.careerResume)
      ? u.careerResume
      : [];

    const last3 = seasons.slice(-3);
    const last5 = seasons.slice(-5);

    const average = list =>
      list.length
        ? list.reduce((n, s) => n + num(s.wins), 0)
          / list.length
        : 0;

    const totalWins = seasons.reduce(
      (n, s) => n + num(s.wins), 0
    );

    const totalLosses = seasons.reduce(
      (n, s) => n + num(s.losses), 0
    );

    const headSeasons = seasons.filter(
      s => s.role === "HC"
    );

    const headWins = headSeasons.reduce(
      (n, s) => n + num(s.wins), 0
    );

    const headLosses = headSeasons.reduce(
      (n, s) => n + num(s.losses), 0
    );

    const hcRate = headWins + headLosses
      ? headWins / (headWins + headLosses)
      : 0;

    const careerRate = totalWins + totalLosses
      ? totalWins / (totalWins + totalLosses)
      : 0;

    const bestSeason = seasons.reduce(
      (best, s) => Math.max(best, num(s.wins)),
      0
    );

    const titles = num(u.career?.titles);
    const conferenceTitles =
      num(u.career?.conferenceTitles);

    return {
      seasons: seasons.length,
      recentWins: average(last3),
      fiveYearWins: average(last5),
      careerRate,
      headSeasons: headSeasons.length,
      hcRate,
      bestSeason,
      titles,
      conferenceTitles,
      role: u.role
    };
  }

  function eligible(t, role) {
    const r = getResume();
    const p = num(t.prestige);
    const isHC = role === "HC";

    if (r.seasons === 0) return false;

    /*
     Coordinator jobs:
     Lateral moves remain possible
     even after difficult seasons.
    */

    if (!isHC) {
      if (p <= 2) return true;

      if (p === 3) {
        return r.seasons >= 1 &&
          (r.recentWins >= 5 ||
           r.bestSeason >= 8);
      }

      if (p === 4) {
        return r.seasons >= 2 &&
          (r.recentWins >= 7 ||
           r.bestSeason >= 10);
      }

      return r.seasons >= 3 &&
        r.recentWins >= 8 &&
        r.careerRate >= 0.55;
    }

    /*
     Lower-prestige HC jobs:
     Strong G5 coordinators can
     earn an early opportunity.
    */

    if (p <= 2) {
      return (
        r.seasons >= 2 &&
        r.recentWins >= 7
      ) || (
        r.bestSeason >= 11 &&
        r.careerRate >= 0.70
      );
    }

    /*
     Mid-level HC jobs:
     Require sustained success or
     an excellent HC track record.
    */

    if (p === 3) {
      return (
        r.seasons >= 3 &&
        r.recentWins >= 8 &&
        r.careerRate >= 0.58
      ) || (
        r.headSeasons >= 2 &&
        r.hcRate >= 0.65 &&
        r.recentWins >= 7
      );
    }

    /*
     Major P4 HC jobs:
     Usually require proven HC
     performance, or a truly elite
     coordinator track record.
    */

    if (p === 4) {
      return (
        r.headSeasons >= 3 &&
        r.hcRate >= 0.65 &&
        r.recentWins >= 8
      ) || (
        r.seasons >= 5 &&
        r.recentWins >= 10 &&
        r.careerRate >= 0.72
      ) || (
        r.titles >= 1 &&
        r.headSeasons >= 1
      );
    }

    /*
     Elite / blue-blood HC jobs:
     Require national-level success.
    */

    return (
      r.headSeasons >= 4 &&
      r.hcRate >= 0.72 &&
      r.recentWins >= 10 &&
      (
        r.conferenceTitles >= 2 ||
        r.titles >= 1
      )
    ) || (
      r.titles >= 2 &&
      r.headSeasons >= 2
    );
  }

  function filterOffers() {
    if (!S || !Array.isArray(S.teams)) return;

    if (Array.isArray(S.careerOffers)) {
      S.careerOffers = S.careerOffers.filter(o => {
        const t = S.teams.find(
          x => String(x.id) === String(o.teamId)
        );

        return t && eligible(t, o.role);
      });
    }

    if (Array.isArray(S.jobs)) {
      S.jobs = S.jobs.filter(id => {
        const t = S.teams.find(
          x => String(x.id) === String(id)
        );

        return t && eligible(t, "HC");
      });
    }
  }

  /*
   The career-mode carousel already
   records the completed season.
   Filter only after it finishes.
  */

  const previousCarousel = carousel;

  carousel = function () {
    const result = previousCarousel.apply(
      this, arguments
    );

    filterOffers();

    return result;
  };

  /*
   Guard the original HC job action
   so an older UI button cannot
   bypass the eligibility rules.
  */

  const previousAcceptJob = acceptJob;

  acceptJob = function (id) {
    const t = S.teams.find(
      x => String(x.id) === String(id)
    );

    if (!t ||
        !Array.isArray(S.jobs) ||
        !S.jobs.some(
          x => String(x) === String(id)
        ) ||
        !eligible(t, "HC")) {
      alert(
        "You have not yet earned an " +
        "interview for this head coaching job."
      );
      return;
    }

    return previousAcceptJob.apply(
      this, arguments
    );
  };

  /*
   Guard coordinator / HC offers.
   The existing acceptance function
   still handles the actual hiring.
  */

  const previousAcceptCareerOffer =
    window.sdAcceptCareerOffer;

  window.sdAcceptCareerOffer = function (index) {
    const offer = S.careerOffers?.[index];

    const t = offer && S.teams.find(
      x => String(x.id) ===
           String(offer.teamId)
    );

    if (!offer || !t ||
        !eligible(t, offer.role)) {
      alert(
        "This position requires a stronger " +
        "coaching résumé."
      );
      return;
    }

    return previousAcceptCareerOffer(
      index
    );
  };

  /*
   Display a small career status
   panel on the Carousel screen.
  */

  const previousRender = render;

  render = function () {
    const result = previousRender.apply(
      this, arguments
    );

    if (tab !== "Carousel") return result;

    const main = document.getElementById("main");
    if (!main || document.getElementById(
      "sd-career-ladder"
    )) return result;

    const r = getResume();

    const panel = document.createElement("div");
    panel.className = "card";
    panel.id = "sd-career-ladder";

    panel.innerHTML = `
      <h3>Coaching Career Progress</h3>
      <p>
        Seasons completed:
        <b>${r.seasons}</b>
      </p>
      <p>
        Recent average:
        <b>${r.recentWins.toFixed(1)}
        wins per season</b>
      </p>
      <p>
        Best season:
        <b>${r.bestSeason} wins</b>
      </p>
      <p class="muted">
        Major head coaching opportunities
        require sustained winning,
        exceptional coordinator success,
        or a proven head coaching résumé.
      </p>
    `;

    main.prepend(panel);

    return result;
  };

  console.info(
    "[Saturday Dynasty] Career Realism loaded."
  );

})();
