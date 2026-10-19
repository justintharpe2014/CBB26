
/*
 SATURDAY DYNASTY
 Player Development Rendering Repair

 Load AFTER career-mode.js
 and BEFORE startup.js.
*/

(function () {
  "use strict";

  const previousRender = render;

  render = function () {
    const result = previousRender.apply(this, arguments);

    if (tab !== "Player Development") {
      return result;
    }

    const main = document.getElementById("main");

    if (!main) return result;

    try {
      if (typeof sdDevelopment !== "function") {
        throw new Error(
          "Player Development function is missing."
        );
      }

      // Rebuild the screen after all other
      // rendering wrappers have finished.
      main.innerHTML = sdDevelopment();

    } catch (error) {
      console.error(
        "Player Development error:",
        error
      );

      main.innerHTML = `
        <div class="card">
          <h2>Player Development Error</h2>
          <p>
            The development screen could
            not load.
          </p>
          <p class="muted">
            ${String(error.message || error)
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")}
          </p>
        </div>
      `;
    }

    return result;
  };
})();
