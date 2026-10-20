
/*
 SATURDAY DYNASTY
 Clean Interface v1

 Removes all visible Audit and
 diagnostic menus without changing
 simulation, careers, or saves.
*/

(function () {
  "use strict";

  function cleanInterface() {
    const header = document.querySelector("header");
    const nav = document.getElementById("nav");
    const main = document.getElementById("main");

    // Remove Audit and diagnostic buttons.
    for (const area of [header, nav, main]) {
      if (!area) continue;

      area.querySelectorAll("button").forEach(button => {
        const label = button.textContent.trim();
        const action = button.getAttribute("onclick") || "";

        if (
          /audit|integrity audit|check all ability tiers/i.test(label) ||
          /runAudit|sdShowFullAudit|sdShowTierAudit/i.test(action)
        ) {
          button.remove();
        }
      });
    }

    // Remove diagnostic panels from Office.
    if (main && tab === "Office") {
      main.querySelectorAll(".card, section").forEach(panel => {
        const heading = panel.querySelector("h2, h3, b, strong");

        if (!heading) return;

        const title = heading.textContent.trim();

        if (
          title === "Simulation Integrity" ||
          title === "Engine Diagnostics"
        ) {
          panel.remove();
        }
      });
    }

    // If an old Audit tab was selected,
    // return to the Office.
    if (/audit|diagnostics/i.test(String(tab))) {
      tab = "Office";
    }
  }

  const previousRender = render;

  render = function () {
    const result = previousRender.apply(this, arguments);
    cleanInterface();
    return result;
  };

  const previousNav = nav;

  nav = function () {
    const result = previousNav.apply(this, arguments);
    cleanInterface();
    return result;
  };

  document.addEventListener(
    "DOMContentLoaded",
    cleanInterface
  );

})();
