
/*
 SATURDAY DYNASTY
 Coach Progression v1.0

 Adds performance-based CP rewards
 when a season is completed.

 Safe for existing careers.
 One award per coach per season.
 Does not reset levels or abilities.

 Load after career-mode.js and
 before startup.js.
*/

(function () {
  "use strict";

  function seasonBonus(coach, school, year) {
    const record = school.history?.find(
      h => h.year === year
    );

    if (!record) return null;

    const wins = Number(record.w) || 0;

    let points = 3;
    const reasons = ["Season completed: +3"];

    if (wins >= 11) {
      points += 3;
      reasons.push("11+ wins: +3");
    } else if (wins >= 9) {
      points += 2;
      reasons.push("9+ wins: +2");
    } else if (wins >= 6) {
      points += 1;
      reasons.push("6+ wins: +1");
    }

    const season = S.seasonHistory?.find(
      h => h.year === year
    );

    const wonConference =
      season?.conferenceChampions?.some(
        x => x.team === school.name
      );

    if (wonConference) {
      points += 2;
      reasons.push("Conference championship: +2");
    }

    const playoffAppearance =
      season?.field?.includes(school.name);

    if (playoffAppearance) {
      points += 2;
      reasons.push("Playoff appearance: +2");
    }

    if (season?.champion === school.name) {
      points += 4;
      reasons.push("National championship: +4");
    }

    return { points, reasons };
  }

  function awardSeasonCP(year, schoolId, coachId) {
    const coach = S.coaches.find(
      x => x.id === coachId
    );

    const school = S.teams.find(
      x => x.id === schoolId
    );

    if (!coach || !school) return;

    if (!Array.isArray(coach.sdCPHistory)) {
      coach.sdCPHistory = [];
    }

    if (coach.sdCPHistory.some(
      x => x.year === year
    )) return;

    const bonus = seasonBonus(
      coach, school, year
    );

    if (!bonus) return;

    coach.points =
      (Number(coach.points) || 0) +
      bonus.points;

    coach.sdCPHistory.push({
      year,
      school: school.name,
      points: bonus.points,
      reasons: bonus.reasons
    });

    if (coach.id === S.user) {
      addNews(
        "COACH DEVELOPMENT: Earned +" +
        bonus.points +
        " CP for the " +
        year +
        " season at " +
        school.name +
        "."
      );
    }
  }

  const previousEndSeason = endSeason;

  endSeason = function () {
    const year = S.year;
    const schoolId = user()?.teamId;
    const coachId = S.user;

    const result = previousEndSeason.apply(
      this, arguments
    );

    const completed =
      S.seasonHistory?.some(
        x => x.year === year
      );

    if (completed) {
      awardSeasonCP(
        year,
        schoolId,
        coachId
      );
    }

    return result;
  };

  console.info(
    "[Saturday Dynasty] Coach progression active."
  );

})();
