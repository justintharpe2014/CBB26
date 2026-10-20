
/*
 SATURDAY DYNASTY
 Postseason Results & Clean UI v1

 Load after career-mode.js and
 development-fix.js, BEFORE startup.js.

 Does not change game simulation,
 recruiting, or saved careers.
*/

(function () {
  'use strict';

  const MAX_REPORTS = 40;

  const html = value =>
    String(value ?? '').replace(
      /[&<>"']/g,
      ch => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[ch])
    );

  function currentSchool() {
    try {
      return typeof team === 'function'
        ? team()
        : null;
    } catch (_) {
      return null;
    }
  }

  function stageName(phase) {
    return ({
      conference: 'Conference Championship',
      Bowl: 'Bowl Game',
      'CFP First Round': 'CFP First Round',
      'CFP Quarterfinal': 'CFP Quarterfinal',
      'CFP Semifinal': 'CFP Semifinal',
      'CFP National Championship':
        'National Championship'
    })[phase] || phase || 'Postseason';
  }

  function collect(year, schoolId, schoolName) {
    const games = Array.isArray(S.postseason)
      ? S.postseason
      : [];

    const results = games
      .filter(g =>
        g &&
        g.played &&
        (
          g.year === year ||
          (g.year == null && S.year === year)
        ) &&
        (
          String(g.a) === String(schoolId) ||
          String(g.b) === String(schoolId)
        )
      )
      .map(g => {
        const first =
          String(g.a) === String(schoolId);

        const opponentId = first ? g.b : g.a;

        const opponent = (S.teams || []).find(
          t => String(t.id) === String(opponentId)
        );

        const ours = Number(
          first ? g.sa : g.sb
        );

        const theirs = Number(
          first ? g.sb : g.sa
        );

        return {
          stage: stageName(g.phase),
          opponent: opponent?.name ||
            'Unknown opponent',
          ours,
          theirs,
          win: ours > theirs,
          tie: ours === theirs
        };
      });

    return {
      year,
      schoolId,
      schoolName,
      games: results
    };
  }

  function ensureReports() {
    if (!Array.isArray(S.sdPostseasonReports)) {
      S.sdPostseasonReports = [];
    }

    return S.sdPostseasonReports;
  }

  /*
   Capture the school BEFORE the offseason
   and coaching carousel run.
  */

  const previousEndSeason = endSeason;

  endSeason = function () {
    const year = S?.year;
    const school = currentSchool();
    const schoolId = school?.id;
    const schoolName =
      school?.name || 'Your Team';

    const result = previousEndSeason.apply(
      this,
      arguments
    );

    if (
      S &&
      schoolId != null &&
      year != null
    ) {
      const report = collect(
        year,
        schoolId,
        schoolName
      );

      const reports = ensureReports();

      const oldIndex = reports.findIndex(
        r =>
          r.year === year &&
          String(r.schoolId) ===
          String(schoolId)
      );

      if (oldIndex >= 0) {
        reports.splice(oldIndex, 1);
      }

      reports.push(report);

      if (reports.length > MAX_REPORTS) {
        reports.splice(
          0,
          reports.length - MAX_REPORTS
        );
      }
    }

    return result;
  };

  function reportMarkup(report) {
    if (!report) {
      return `
        <div class="card">
          <p>
            No postseason report recorded yet.
            Finish a season to generate one.
          </p>
        </div>
      `;
    }

    const games = Array.isArray(report.games)
      ? report.games
      : [];

    const title = `
      <h3>
        ${html(report.year)}
        ${html(report.schoolName)}
        — Your Postseason
      </h3>
    `;

    if (!games.length) {
      return `
        <div class="card">
          ${title}
          <p>
            Your school did not play in a
            conference championship, bowl,
            or CFP game this season.
          </p>
        </div>
      `;
    }

    return `
      <div class="card">
        ${title}

        ${games.map(g => `
          <div
            class="row"
            style="
              padding:10px 0;
              border-bottom:1px solid #ffffff24;
              gap:12px;
              align-items:center;
            "
          >
            <strong style="min-width:28px">
              ${
                g.tie
                  ? 'T'
                  : g.win
                    ? 'W'
                    : 'L'
              }
            </strong>

            <div style="flex:1;min-width:0">
              <strong>
                ${html(g.stage)}
              </strong>

              <div class="muted">
                vs. ${html(g.opponent)}
              </div>
            </div>

            <strong style="white-space:nowrap">
              ${
                Number.isFinite(g.ours)
                  ? g.ours
                  : '—'
              }
              –
              ${
                Number.isFinite(g.theirs)
                  ? g.theirs
                  : '—'
              }
            </strong>
          </div>
        `).join('')}
      </div>
    `;
  }

  function allReportsMarkup() {
    const reports = ensureReports();

    return `
      <h2>My Postseason Results</h2>

      <p class="muted">
        Your school's results only,
        win or lose. Older seasons
        appear below.
      </p>

      ${
        reports.length
          ? reports.slice()
              .reverse()
              .map(reportMarkup)
              .join('')
          : reportMarkup(null)
      }
    `;
  }

  /*
   Remove visible Audit controls.
   Diagnostic functions remain available.
  */

  function cleanAuditControls() {
    const header =
      document.querySelector('header');

    if (header) {
      header.querySelectorAll(
        'button'
      ).forEach(button => {
        if (
          /^audit$/i.test(
            button.textContent.trim()
          ) ||
          /runAudit\s*\(/.test(
            button.getAttribute('onclick') || ''
          )
        ) {
          button.remove();
        }
      });
    }

    const navEl =
      document.getElementById('nav');

    if (navEl) {
      navEl.querySelectorAll(
        'button'
      ).forEach(button => {
        if (
          /audit/i.test(
            button.textContent.trim()
          )
        ) {
          button.remove();
        }
      });
    }
  }

  /*
   Add postseason screen to navigation.
  */

  const previousRender = render;

  render = function () {
    const result = previousRender.apply(
      this,
      arguments
    );

    if (!S) return result;

    cleanAuditControls();

    const navEl =
      document.getElementById('nav');

    const main =
      document.getElementById('main');

    if (!main) return result;

    if (
      navEl &&
      !Array.from(
        navEl.querySelectorAll('button')
      ).some(
        b =>
          b.textContent.trim() ===
          'My Postseason'
      )
    ) {
      const button =
        document.createElement('button');

      button.textContent = 'My Postseason';

      if (tab === 'My Postseason') {
        button.className = 'active';
      }

      button.onclick = () => {
        tab = 'My Postseason';
        render();
      };

      navEl.appendChild(button);
    }

    if (tab === 'My Postseason') {
      main.innerHTML = allReportsMarkup();

    } else if (tab === 'Office') {
      const reports = ensureReports();

      if (
        reports.length &&
        !document.getElementById(
          'sd-latest-postseason'
        )
      ) {
        const panel =
          document.createElement('section');

        panel.id = 'sd-latest-postseason';

        panel.innerHTML =
          '<h2>Latest Postseason</h2>' +
          reportMarkup(
            reports[reports.length - 1]
          );

        main.insertBefore(
          panel,
          main.firstChild
        );
      }
    }

    return result;
  };

})();
