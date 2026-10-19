
/*
 SATURDAY DYNASTY
 Player Development Screen Repair v2

 Does not modify saved career data.
*/

(function () {
  "use strict";

  function showDevelopment() {
    if (tab !== "Player Development") return;

    const main = document.getElementById("main");
    if (!main) return;

    try {
      if (typeof sdDevelopment !== "function") {
        throw new Error(
          "sdDevelopment() is not available."
        );
      }

      const content = sdDevelopment();

      if (!content || !content.trim()) {
        throw new Error(
          "Development returned an empty screen."
        );
      }

      main.innerHTML = content;

    } catch (error) {
      console.error("Development screen:", error);

      const message = String(
        error && error.message
          ? error.message
          : error
      );

      main.replaceChildren();

      const card = document.createElement("div");
      card.className = "card";

      const heading = document.createElement("h2");
      heading.textContent =
        "Player Development Diagnostic";

      const detail = document.createElement("p");
      detail.textContent = message;

      card.append(heading, detail);
      main.appendChild(card);
    }
  }

  /*
   Wrap the final render function.
  */

  const previousRender = render;

  render = function () {
    const result = previousRender.apply(this, arguments);

    showDevelopment();

    return result;
  };

  /*
   Also handle navigation clicks directly.
   This provides a second route to the
   Development Center.
  */

  document.addEventListener("click", function (event) {
    const button = event.target.closest(
      "#nav button"
    );

    if (!button) return;

    if (
      button.textContent.trim() !==
      "Player Development"
    ) return;

    tab = "Player Development";

    /*
     Let the existing button handler finish,
     then display the Development Center.
    */

    setTimeout(showDevelopment, 0);
  });

})();
