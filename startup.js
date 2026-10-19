
/*
 * SATURDAY DYNASTY
 * Reliable Career Save System
 *
 * REPLACE ALL of startup.js with this file.
 * Keep startup.js LAST in index.html.
 *
 * Features:
 * - IndexedDB career saves
 * - Automatic restore on launch
 * - Save verification
 * - Previous-save backup
 * - Continue / Load Career
 * - Export / Import JSON backups
 * - Recovery of old localStorage saves
 * - No automatic overwrite of damaged saves
 */

(function () {
  "use strict";

  const DB_NAME = "SaturdayDynastyCareerDB";
  const DB_VERSION = 1;
  const STORE = "careerSaves";

  const PRIMARY = "primary";
  const BACKUP = "backup";

  let database = null;
  let saving = Promise.resolve();
  let storageReady = false;
  let loadedCareer = false;
  let saveCounter = 0;
  let lastSavedAt = null;

  const originalSave = save;
  const originalImport = importSave;

  function status(message) {
    const el = document.getElementById(
      "sd-save-status"
    );

    if (el) {
      el.textContent = message;
    }
  }

  function reportError(error) {
    console.error(
      "[Saturday Dynasty Save System]",
      error
    );

    status("Save error — export a backup");

    alert(
      "Your career could not be saved.\n\n" +
      String(error.message || error) +
      "\n\nTry Export Backup to protect " +
      "your current progress."
    );
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(
          new Error(
            "IndexedDB is unavailable in this browser."
          )
        );
        return;
      }

      const request = indexedDB.open(
        DB_NAME,
        DB_VERSION
      );

      request.onupgradeneeded = function () {
        const db = request.result;

        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, {
            keyPath: "slot"
          });
        }
      };

      request.onsuccess = function () {
        resolve(request.result);
      };

      request.onerror = function () {
        reject(
          request.error ||
          new Error("Could not open save database.")
        );
      };

      request.onblocked = function () {
        console.warn(
          "Save database is blocked by another tab."
        );
      };
    });
  }

  function readSlot(slot) {
    return new Promise((resolve, reject) => {
      const tx = database.transaction(
        STORE,
        "readonly"
      );

      const request = tx
        .objectStore(STORE)
        .get(slot);

      request.onsuccess = function () {
        resolve(request.result || null);
      };

      request.onerror = function () {
        reject(
          request.error ||
          new Error("Could not read save.")
        );
      };
    });
  }

  function writeCareer(snapshot) {
    return new Promise((resolve, reject) => {
      const tx = database.transaction(
        STORE,
        "readwrite"
      );

      const store = tx.objectStore(STORE);

      /*
       * Move the previous primary save
       * into the backup slot before
       * replacing it.
       */

      const request = store.get(PRIMARY);

      request.onsuccess = function () {
        const previous = request.result;

        if (previous) {
          store.put({
            ...previous,
            slot: BACKUP
          });
        }

        store.put({
          slot: PRIMARY,
          savedAt: Date.now(),
          year: snapshot.year,
          week: snapshot.week,
          coachName: snapshot.coachName,
          schoolName: snapshot.schoolName,
          data: snapshot.data
        });
      };

      request.onerror = function () {
        try {
          tx.abort();
        } catch (e) {}
      };

      tx.oncomplete = function () {
        resolve();
      };

      tx.onerror = function () {
        reject(
          tx.error ||
          new Error("Database save failed.")
        );
      };

      tx.onabort = function () {
        reject(
          tx.error ||
          new Error("Database save was canceled.")
        );
      };
    });
  }

  function validCareer(value) {
    return !!(
      value &&
      typeof value === "object" &&
      Array.isArray(value.teams) &&
      value.teams.length > 0 &&
      Array.isArray(value.coaches) &&
      value.coaches.length > 0 &&
      value.user !== undefined &&
      value.year !== undefined &&
      value.week !== undefined
    );
  }

  function prepareCareer(value) {
    if (!validCareer(value)) {
      throw new Error(
        "The selected save is not a valid dynasty."
      );
    }

    let result = value;

    if (typeof migrate === "function") {
      result = migrate(result);
    }

    if (!validCareer(result)) {
      throw new Error(
        "The saved dynasty could not be migrated."
      );
    }

    result.mode =
      result.mode || "simulation";

    result.yearLimit =
      result.yearLimit || 35;

    result.ended = !!result.ended;

    for (const field of [
      "postseason",
      "seasonHistory",
      "champions",
      "jobs",
      "news",
      "games",
      "recruits"
    ]) {
      if (!Array.isArray(result[field])) {
        result[field] = [];
      }
    }

    for (const coach of result.coaches) {
      if (coach.simSeasons === undefined) {
        coach.simSeasons = 0;
      }
    }

    return result;
  }

  function initializeSystems() {
    for (const coach of S.coaches) {
      if (typeof sdCoachInit === "function") {
        sdCoachInit(coach);
      }
    }

    if (typeof sdInit === "function") {
      sdInit();
    }

    if (
      typeof sdRecruitStrategy === "function"
    ) {
      sdRecruitStrategy();
    }

    if (typeof sdTierAudit === "function") {
      try {
        const result = sdTierAudit();

        if (result && !result.passed) {
          console.warn(
            "Ability tree audit:",
            result.issues
          );
        }
      } catch (error) {
        console.warn(
          "Optional ability audit failed:",
          error
        );
      }
    }
  }

  function currentSnapshot() {
    if (!validCareer(S)) {
      throw new Error(
        "There is no valid career to save."
      );
    }

    const coach = user();
    const school = team();

    /*
     * Capture the state immediately.
     * The queued write must not read S later,
     * because simulation may have advanced.
     */

    return {
      year: S.year,
      week: S.week,
      coachName: coach?.name || "Coach",
      schoolName: school?.name || "Unknown",
      data: JSON.stringify(S)
    };
  }

  function persist() {
    if (!storageReady || !database) {
      return Promise.reject(
        new Error(
          "Career storage is not ready."
        )
      );
    }

    let snapshot;

    try {
      snapshot = currentSnapshot();
    } catch (error) {
      return Promise.reject(error);
    }

    const number = ++saveCounter;

    /*
     * Serialize writes to avoid one
     * simulated week overwriting another
     * out of order.
     */

    saving = saving
      .catch(() => {})
      .then(() => writeCareer(snapshot))
      .then(() => {
        lastSavedAt = Date.now();

        status(
          "Saved: " +
          snapshot.schoolName +
          " · " +
          snapshot.year +
          " Week " +
          snapshot.week
        );

        console.info(
          "Career save #" + number +
          " verified."
        );
      });

    return saving;
  }

  /*
   * Replace the old localStorage save
   * function without changing the other
   * game files that call save().
   */

  save = function () {
    if (!storageReady) {
      status("Storage not ready");
      return;
    }

    status("Saving...");

    persist().catch(reportError);

    try {
      render();
    } catch (error) {
      console.error(
        "Save completed rendering with error:",
        error
      );
    }
  };

  window.sdSaveCareer = function () {
    if (!storageReady) {
      alert(
        "Career storage is not ready."
      );
      return;
    }

    status("Saving...");

    persist()
      .then(() => {
        alert(
          "Career saved successfully!\n\n" +
          team().name +
          "\nSeason " +
          S.year +
          " — Week " +
          S.week
        );
      })
      .catch(reportError);
  };

  function activateCareer(value) {
    const prepared = prepareCareer(value);

    S = prepared;

    initializeSystems();

    tab = "Office";

    loadedCareer = true;

    render();
  }

  function readLegacySave() {
    const keys = [
      KEY,
      "saturday_dynasty_v6",
      "saturday_dynasty_v5"
    ];

    for (const key of [...new Set(keys)]) {
      let raw = null;

      try {
        raw = localStorage.getItem(key);
      } catch (error) {
        console.warn(
          "Legacy storage inaccessible:",
          error
        );

        break;
      }

      if (!raw) {
        continue;
      }

      try {
        const value = JSON.parse(raw);

        if (validCareer(value)) {
          return {
            key,
            data: value
          };
        }
      } catch (error) {
        console.warn(
          "Legacy save could not be parsed:",
          key,
          error
        );
      }
    }

    return null;
  }

  function careerDescription(record) {
    if (!record) {
      return "No saved career";
    }

    return (
      record.coachName +
      " · " +
      record.schoolName +
      " · " +
      record.year +
      " Week " +
      record.week
    );
  }

  window.sdLoadCareer = async function () {
    if (!database) {
      alert(
        "Career database is unavailable."
      );
      return;
    }

    try {
      await saving.catch(() => {});

      const primary = await readSlot(PRIMARY);
      const backup = await readSlot(BACKUP);

      const choices = [
        primary
          ? "1 — Latest: " +
            careerDescription(primary)
          : "1 — No latest save",

        backup
          ? "2 — Previous: " +
            careerDescription(backup)
          : "2 — No previous save",

        "Cancel"
      ];

      const answer = prompt(
        "LOAD CAREER\n\n" +
        choices.join("\n") +
        "\n\nEnter 1 or 2:",
        "1"
      );

      if (answer === null) {
        return;
      }

      const selected =
        answer.trim() === "2"
          ? backup
          : answer.trim() === "1"
            ? primary
            : null;

      if (!selected) {
        alert(
          "That save slot is unavailable."
        );
        return;
      }

      const parsed = JSON.parse(
        selected.data
      );

      const prepared = prepareCareer(parsed);

      if (
        !confirm(
          "Load this career?\n\n" +
          careerDescription(selected) +
          "\n\nUnsaved changes in your " +
          "current session will be lost."
        )
      ) {
        return;
      }

      activateCareer(prepared);

      status(
        "Loaded: " +
        careerDescription(selected)
      );

      /*
       * Loading does not immediately save.
       * This protects the recovery slots.
       */

    } catch (error) {
      reportError(error);
    }
  };

  window.sdExportCareer = function () {
    try {
      const snapshot = currentSnapshot();

      const blob = new Blob(
        [snapshot.data],
        {
          type: "application/json"
        }
      );

      const url = URL.createObjectURL(blob);

      const link = document.createElement(
        "a"
      );

      link.href = url;

      link.download =
        "saturday-dynasty-" +
        snapshot.year +
        "-week-" +
        snapshot.week +
        ".json";

      document.body.appendChild(link);

      link.click();

      link.remove();

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 10000);

      status(
        "Backup export requested"
      );

    } catch (error) {
      reportError(error);
    }
  };

  window.sdImportCareer = async function (
    input
  ) {
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    try {
      const raw = await file.text();

      const value = JSON.parse(raw);

      const prepared = prepareCareer(value);

      const coach = prepared.coaches.find(
        c => c.id === prepared.user
      );

      const school = prepared.teams.find(
        t => t.id === coach?.teamId
      );

      if (
        !confirm(
          "IMPORT CAREER\n\n" +
          (coach?.name || "Coach") +
          " at " +
          (school?.name || "Unknown") +
          "\nSeason " +
          prepared.year +
          " — Week " +
          prepared.week +
          "\n\nReplace the active career?"
        )
      ) {
        return;
      }

      if (!storageReady) {
        throw new Error(
          "Career storage is unavailable."
        );
      }

      /*
       * Write the imported career first.
       * Do not replace the active session
       * until the database confirms success.
       */

      await saving.catch(() => {});

      await writeCareer({
        year: prepared.year,
        week: prepared.week,
        coachName: coach?.name || "Coach",
        schoolName:
          school?.name || "Unknown",
        data: JSON.stringify(prepared)
      });

      activateCareer(prepared);

      status("Imported career saved");

      alert(
        "Career imported successfully."
      );

    } catch (error) {
      reportError(error);
    } finally {
      input.value = "";
    }
  };

  /*
   * Redirect existing game export/import
   * functions to the upgraded system.
   */

  exportSave = function () {
    window.sdExportCareer();
  };

  importSave = function (input) {
    window.sdImportCareer(input);
  };

  function installButtons() {
    if (
      document.getElementById(
        "sd-save-controls"
      )
    ) {
      return;
    }

    const header = document.querySelector(
      "header"
    );

    if (!header) {
      return;
    }

    const controls = document.createElement(
      "div"
    );

    controls.id = "sd-save-controls";

    controls.style.cssText = [
      "display:flex",
      "flex-wrap:wrap",
      "align-items:center",
      "gap:8px",
      "padding:8px 0"
    ].join(";");

    controls.innerHTML = `
      <button onclick="sdSaveCareer()">
        Save Career
      </button>

      <button onclick="sdLoadCareer()">
        Load Career
      </button>

      <button onclick="sdExportCareer()">
        Export Backup
      </button>

      <button onclick="
        document.getElementById(
          'sd-import-file'
        ).click()
      ">
        Import Backup
      </button>

      <input
        id="sd-import-file"
        type="file"
        accept=".json,application/json"
        style="display:none"
        onchange="sdImportCareer(this)"
      >

      <small
        id="sd-save-status"
        style="width:100%;opacity:.85"
      >
        Initializing storage...
      </small>
    `;

    header.appendChild(controls);
  }

  function showRecoveryError(error) {
    console.error(
      "Career recovery error:",
      error
    );

    const main = document.getElementById(
      "main"
    );

    if (main) {
      main.innerHTML = `
        <div class="card">
          <h2>Career Recovery Needed</h2>

          <p>
            Saturday Dynasty found a
            problem loading your saved
            career.
          </p>

          <p>
            The saved data has not been
            intentionally deleted.
          </p>

          <p class="muted">
            ${String(
              error.message || error
            ).replace(
              /[&<>"']/g,
              ""
            )}
          </p>

          <button onclick="sdLoadCareer()">
            Try Another Save
          </button>

          <button onclick="
            document.getElementById(
              'sd-import-file'
            ).click()
          ">
            Import Backup
          </button>
        </div>
      `;
    }

    status(
      "Recovery needed — save protected"
    );
  }

  async function startup() {
    installButtons();

    try {
      if (
        typeof create !== "function" ||
        typeof render !== "function"
      ) {
        throw new Error(
          "Core game files are missing."
        );
      }

      database = await openDatabase();

      storageReady = true;

      const primary = await readSlot(PRIMARY);

      if (primary) {
        /*
         * A damaged primary save must
         * never be replaced by a fresh
         * dynasty automatically.
         */

        const parsed = JSON.parse(
          primary.data
        );

        activateCareer(parsed);

        status(
          "Continued: " +
          careerDescription(primary)
        );

        console.info(
          "Existing career restored."
        );

        return;
      }

      /*
       * Migrate a previously saved
       * localStorage career to IndexedDB.
       */

      const legacy = readLegacySave();

      if (legacy) {
        const prepared = prepareCareer(
          legacy.data
        );

        const coach = prepared.coaches.find(
          c => c.id === prepared.user
        );

        const school = prepared.teams.find(
          t => t.id === coach?.teamId
        );

        await writeCareer({
          year: prepared.year,
          week: prepared.week,
          coachName: coach?.name || "Coach",
          schoolName:
            school?.name || "Unknown",
          data: JSON.stringify(prepared)
        });

        activateCareer(prepared);

        status(
          "Previous career recovered"
        );

        console.info(
          "Migrated legacy save from:",
          legacy.key
        );

        return;
      }

      /*
       * No saved career exists.
       * Create the initial dynasty only
       * after confirming that storage
       * is accessible.
       */

      S = create();

      S = prepareCareer(S);

      initializeSystems();

      render();

      await persist();

      status(
        "New career ready — saved"
      );

    } catch (error) {
      showRecoveryError(error);
    }
  }

  /*
   * Warn about unsaved data during
   * navigation. Safari may not display
   * a custom message.
   */

  window.addEventListener(
    "pagehide",
    function () {
      if (
        storageReady &&
        validCareer(S)
      ) {
        /*
         * The game already saves after
         * normal actions. Do not depend
         * on an asynchronous pagehide
         * write for data safety.
         */
        console.info(
          "Saturday Dynasty session closed."
        );
      }
    }
  );

  startup();

})();
