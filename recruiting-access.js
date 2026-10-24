
/*
 SATURDAY DYNASTY
 Recruiting Access v1.0

 Prestige-based recruiting visibility.
 Some prospects are Open Recruitment.

 Load AFTER career-mode.js and other
 recruiting modules, BEFORE startup.js.

 Does not change saved roster or
 recruiting commitment logic.
*/

(function () {
  "use strict";

  const safe = value => String(value ?? "")
    .replace(/[&<>"']/g, ch => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[ch]));

  const offense = [
    "QB","HB","RB","FB","WR","TE",
    "OT","OG","C"
  ];

  const defense = [
    "DE","DT","OLB","MLB","LB",
    "CB","FS","SS","S"
  ];

  // Stable across reloads and seasons.
  // No new random roll on every render.
  function hash(value) {
    let h = 2166136261;

    for (const ch of String(value)) {
      h ^= ch.charCodeAt(0);
      h = Math.imul(h, 16777619);
    }

    return h >>> 0;
  }

  function isOpen(r) {
    if (typeof r.sdOpenRecruitment === "boolean") {
      return r.sdOpenRecruitment;
    }

    const chance = {
      2: 100,
      3: 28,
      4: 10,
      5: 3
    }[Number(r.stars)] ?? 100;

    return hash(
      String(r.id) + ":open"
    ) % 100 < chance;
  }

  function minPrestige(r) {
    const stars = Number(r.stars);

    if (stars <= 2) return 1;

    if (stars === 3) {
      return hash(r.id + ":three") % 4 === 0
        ? 1 : 2;
    }

    if (stars === 4) {
      return hash(r.id + ":four") % 5 === 0
        ? 2 : 3;
    }

    if (stars >= 5) {
      return hash(r.id + ":five") % 4 === 0
        ? 3 : 4;
    }

    return 1;
  }

  function accessible(r) {
    if (!r || !team()) return false;

    // Already-recruited players remain
    // accessible if the school improves
    // or the coach changes jobs.
    if (
      r.target ||
      r.offer ||
      r.committed === team().id
    ) {
      return true;
    }

    return isOpen(r) ||
      Number(team().prestige) >= minPrestige(r);
  }

  function roleAllowed(r) {
    const role = user()?.role || "HC";

    if (role === "OC") {
      return offense.includes(r.pos);
    }

    if (role === "DC") {
      return defense.includes(r.pos);
    }

    return true;
  }

  function allowed(r) {
    return accessible(r) && roleAllowed(r);
  }

  function deny() {
    alert(
      "This prospect is outside your " +
      "program's current recruiting reach. " +
      "Build school prestige or pursue " +
      "Open Recruitment prospects."
    );
  }

  // Protect actions, not just the UI.
  for (const name of [
    "recruitAction",
    "offer",
    "target",
    "assign",
    "showRecruit"
  ]) {
    const original = window[name];

    if (typeof original !== "function") {
      continue;
    }

    window[name] = function(id, ...args) {
      const r = S?.recruits?.find(
        x => String(x.id) === String(id)
      );

      if (r && !allowed(r)) {
        return deny();
      }

      return original.call(this, id, ...args);
    };
  }

  function card(r) {
    const t = team();

    const interest =
      typeof influence === "function"
        ? Math.round(influence(r, t))
        : 0;

    const status = r.committed === null
      ? "Uncommitted"
      : S.teams.find(
          x => x.id === r.committed
        )?.name || "Committed";

    return `
      <div class="card">
        <div class="row">
          <div class="avatar">
            ${safe(r.pos)}
          </div>

          <div style="flex:1;">
            <b>${safe(r.name)}</b>

            <div class="gold">
              ${"★".repeat(Number(r.stars) || 0)}
              · #${safe(r.rank)}
            </div>

            <small>
              ${safe(r.pos)} ·
              ${safe(r.home)} ·
              ${safe(status)}
            </small>
          </div>
        </div>

        <p>
          Interest ${interest}
          · ${r.offer
              ? "Scholarship offered"
              : "No offer"}
          ${r.assigned
              ? " · " + safe(
                  r.assigned.toUpperCase()
                ) + " assigned"
              : ""}
        </p>

        ${
          isOpen(r)
            ? `<p class="muted">
                 Open Recruitment
               </p>`
            : ""
        }

        <button onclick="showRecruit('${safe(r.id)}')">
          Full Recruiting Card
        </button>
      </div>
    `;
  }

  function renderBoard() {
    if (
      typeof tab === "undefined" ||
      tab !== "Recruiting" ||
      !Array.isArray(S?.recruits)
    ) return;

    const main = document.getElementById("main");
    if (!main) return;

    const t = team();

    const currentBoard =
      typeof board !== "undefined" ? board : "All";

    const search =
      typeof filter !== "undefined"
        ? String(filter).toLowerCase()
        : "";

    const available = S.recruits.filter(r => {
      if (!accessible(r) || !roleAllowed(r)) {
        return false;
      }

      const matchesBoard =
        currentBoard === "All" ||
        currentBoard === "Targets" && r.target ||
        currentBoard === "Offers" && r.offer ||
        currentBoard === "Committed" &&
          r.committed === t.id;

      const matchesSearch =
        `${r.name} ${r.pos} ${r.home}`
          .toLowerCase()
          .includes(search);

      return matchesBoard && matchesSearch;
    });

    const allAccessible = S.recruits.filter(
      r => accessible(r) && roleAllowed(r)
    );

    const openCount = allAccessible.filter(
      isOpen
    ).length;

    main.innerHTML = `
      <h2>Recruiting Center</h2>

      <p class="muted">
        ${safe(t.name)}
        · Prestige ${safe(t.prestige)}/5
        · ${allAccessible.length}
        reachable prospects
        · ${openCount} Open Recruitment
      </p>

      <div class="grid">
        ${box("Weekly Hours", S.hours)}
        ${box(
          "Scholarships Offered",
          S.recruits.filter(r => r.offer).length
        )}
        ${box(
          "Commitments",
          S.recruits.filter(
            r => r.committed === t.id
          ).length
        )}
      </div>

      <div class="row">
        ${[
          "All",
          "Targets",
          "Offers",
          "Committed"
        ].map(x => `
          <button
            class="${currentBoard === x
              ? "active" : ""}"
            onclick="
              board='${x}';
              render()
            "
          >${x}</button>
        `).join("")}
      </div>

      <input
        id="sd-recruit-search"
        placeholder="Search name, position, state"
        value="${safe(
          typeof filter !== "undefined"
            ? filter : ""
        )}"
      >

      <p class="muted">
        ${available.length} matching prospects
        · First 80 shown
      </p>

      <div class="grid">
        ${available.slice(0,80)
          .map(card).join("")}
      </div>
    `;

    const input = document.getElementById(
      "sd-recruit-search"
    );

    input?.addEventListener("input", e => {
      filter = e.target.value;

      // Update results while retaining focus.
      const cursor = e.target.selectionStart;
      renderBoard();

      const next = document.getElementById(
        "sd-recruit-search"
      );

      next?.focus();

      try {
        next?.setSelectionRange(cursor, cursor);
      } catch (_) {}
    });
  }

  const previousRender = render;

  render = function() {
    const result = previousRender.apply(
      this, arguments
    );

    if (tab === "Recruiting") {
      renderBoard();
    }

    return result;
  };

  console.info(
    "[Saturday Dynasty] Recruiting access active."
  );
})();
