
/*
 SATURDAY DYNASTY
 Office Upgrade v1

 - Collapsible Coach's Inbox
 - Latest game result on Office tab
 - Season game-by-game results
 - Clear wins and losses
 - No changes to simulation or saves

 Load after clean-ui.js and
 before startup.js.
*/

(function () {
  "use strict";

  const escapeText = value =>
    String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));

  let inboxOpen = false;

  function gameData(g, t) {
    if (!g || !g.played) return null;

    const isHome = String(g.a) === String(t.id);
    const opponentId = isHome ? g.b : g.a;
    const opponent = S.teams.find(
      x => String(x.id) === String(opponentId)
    );

    const ours = Number(isHome ? g.sa : g.sb);
    const theirs = Number(isHome ? g.sb : g.sa);

    if (!Number.isFinite(ours) ||
        !Number.isFinite(theirs)) {
      return null;
    }

    return {
      week: g.week,
      opponent: opponent?.name || "Unknown",
      ours,
      theirs,
      won: ours > theirs,
      conference: !!g.conference
    };
  }

  function gameRow(g, latest) {
    const result = g.won ? "W" : "L";
    const color = g.won ? "#45c987" : "#f27b7b";

    return `
      <div class="card" style="
        margin-bottom:8px;
        ${latest ? "border:1px solid " + color + ";" : ""}
      ">
        <div class="row" style="
          align-items:center;
          gap:12px;
        ">
          <div style="
            min-width:32px;
            font-weight:900;
            font-size:20px;
            color:${color};
          ">${result}</div>

          <div style="flex:1;min-width:0;">
            <b>${escapeText(g.opponent)}</b>
            <div class="muted" style="font-size:12px;">
              Week ${escapeText(g.week)}
              ${g.conference ? " · Conference" : ""}
            </div>
          </div>

          <b style="
            white-space:nowrap;
            font-size:18px;
            color:${color};
          ">
            ${g.ours}–${g.theirs}
          </b>
        </div>
      </div>
    `;
  }

  function buildResults(t) {
    const games = Array.isArray(S.games)
      ? S.games.filter(
          g =>
            String(g.a) === String(t.id) ||
            String(g.b) === String(t.id)
        )
      : [];

    const completed = games
      .map(g => gameData(g, t))
      .filter(Boolean)
      .sort((a, b) => Number(a.week) - Number(b.week));

    if (!completed.length) {
      return `
        <section id="sd-office-results">
          <h3>Game Results</h3>
          <div class="card">
            No games played yet.
            Your results will appear here
            after you simulate Week 1.
          </div>
        </section>
      `;
    }

    const latest = completed[completed.length - 1];
    const wins = completed.filter(g => g.won).length;
    const losses = completed.length - wins;

    return `
      <section id="sd-office-results">
        <h3>Latest Game</h3>

        ${gameRow(latest, true)}

        <details style="margin:12px 0;">
          <summary style="
            cursor:pointer;
            padding:14px;
            border:1px solid #555;
            border-radius:10px;
            font-weight:bold;
          ">
            Full Season Results
            (${wins}-${losses})
          </summary>

          <div style="padding-top:10px;">
            ${completed.slice().reverse()
              .map(g => gameRow(g, false))
              .join("")}
          </div>
        </details>
      </section>
    `;
  }

  function upgradeInbox(main) {
    const heading = Array.from(
      main.querySelectorAll("h3")
    ).find(el =>
      el.textContent.trim() === "Coach's Inbox"
    );

    if (!heading) return;

    const messages = Array.isArray(S.news)
      ? S.news.slice(0, 16)
      : [];

    /*
      The original Office renderer puts
      each inbox message in a card
      immediately after the heading.
    */

    const oldCards = [];
    let node = heading.nextElementSibling;

    while (
      node &&
      node.classList.contains("card") &&
      oldCards.length < messages.length
    ) {
      const next = node.nextElementSibling;
      oldCards.push(node);
      node = next;
    }

    const wrapper = document.createElement("div");
    wrapper.id = "sd-office-inbox";

    const details = document.createElement("details");
    details.open = inboxOpen;

    details.style.margin = "16px 0";

    const summary = document.createElement("summary");
    summary.style.cssText = `
      cursor:pointer;
      padding:14px;
      border:1px solid #555;
      border-radius:10px;
      font-weight:bold;
    `;

    summary.textContent =
      "Coach's Inbox (" + messages.length + " messages)";

    details.appendChild(summary);

    const contents = document.createElement("div");
    contents.style.paddingTop = "10px";

    if (oldCards.length) {
      oldCards.forEach(card =>
        contents.appendChild(card)
      );
    } else {
      messages.forEach(message => {
        const card = document.createElement("div");
        card.className = "card";
        card.textContent = message;
        contents.appendChild(card);
      });
    }

    if (!messages.length) {
      contents.innerHTML =
        '<div class="card">No messages yet.</div>';
    }

    details.appendChild(contents);

    details.addEventListener("toggle", () => {
      inboxOpen = details.open;
    });

    wrapper.appendChild(details);
    heading.replaceWith(wrapper);
  }

  function upgradeOffice() {
    if (typeof tab === "undefined" ||
        tab !== "Office") {
      return;
    }

    const main = document.getElementById("main");

    if (!main ||
        !S ||
        !Array.isArray(S.teams)) {
      return;
    }

    const t = team();

    if (!t) return;

    /*
      Insert results immediately before
      Coach's Inbox.
    */

    const inboxHeading = Array.from(
      main.querySelectorAll("h3")
    ).find(el =>
      el.textContent.trim() === "Coach's Inbox"
    );

    if (!inboxHeading) return;

    if (!document.getElementById("sd-office-results")) {
      const results = document.createElement("div");
      results.innerHTML = buildResults(t);

      inboxHeading.parentNode.insertBefore(
        results,
        inboxHeading
      );
    }

    upgradeInbox(main);
  }

  const previousRender = render;

  render = function () {
    const result = previousRender.apply(
      this,
      arguments
    );

    upgradeOffice();

    return result;
  };

  document.addEventListener(
    "DOMContentLoaded",
    upgradeOffice
  );

  console.info(
    "[Saturday Dynasty] Office Upgrade loaded."
  );
})();
