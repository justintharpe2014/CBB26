
/*
 * SATURDAY DYNASTY
 * Part 15 — Startup and Save Recovery
 *
 * Must be loaded LAST in index.html.
 */

(function startSaturdayDynasty(){

  function showStartupError(error){
    console.error(
      '[Saturday Dynasty] Startup failed:',
      error
    );

    const main=document.getElementById('main');
    const sub=document.getElementById('sub');

    if(sub){
      sub.textContent='Startup error';
    }

    if(main){
      main.innerHTML=`
        <div class="card">
          <h2>Saturday Dynasty couldn't start</h2>

          <p>
            One of the game files encountered an error.
            Your saved dynasty has not been deliberately
            deleted.
          </p>

          <p class="muted">
            ${typeof esc==='function'
              ?esc(String(error.message||error))
              :String(error.message||error)
                .replace(/[&<>"]/g,'')}
          </p>

          <button onclick="location.reload()">
            Try Again
          </button>
        </div>
      `;
    }
  }

  try{
    if(typeof create!=='function'){
      throw new Error(
        'core.js did not load correctly.'
      );
    }

    if(typeof render!=='function'){
      throw new Error(
        'The game interface did not load correctly.'
      );
    }

    let raw=null;

    try{
      raw=
        localStorage.getItem(KEY)||
        localStorage.getItem(
          'saturday_dynasty_v6'
        )||
        localStorage.getItem(
          'saturday_dynasty_v5'
        );
    }catch(storageError){
      console.warn(
        'Local storage is unavailable:',
        storageError
      );
    }

    if(raw){
      try{
        S=JSON.parse(raw);

        if(typeof migrate==='function'){
          S=migrate(S);
        }

        if(
          !S||
          !Array.isArray(S.teams)||
          !Array.isArray(S.coaches)
        ){
          throw new Error(
            'Saved dynasty structure is invalid.'
          );
        }
      }catch(saveError){
        console.warn(
          'Could not restore saved dynasty:',
          saveError
        );

        // Preserve the original save in storage.
        // Start a new in-memory dynasty instead.
        S=create();
      }
    }else{
      S=create();
    }

    S.mode=S.mode||'simulation';
    S.yearLimit=35;
    S.ended=!!S.ended;

    S.postseason=S.postseason||[];
    S.seasonHistory=S.seasonHistory||[];
    S.champions=S.champions||[];
    S.jobs=S.jobs||[];
    S.news=S.news||[];
    S.games=S.games||[];
    S.recruits=S.recruits||[];

    for(const x of S.coaches){
      if(x.simSeasons===undefined){
        x.simSeasons=0;
      }

      if(typeof sdCoachInit==='function'){
        sdCoachInit(x);
      }
    }

    if(typeof sdInit==='function'){
      sdInit();
    }

    if(typeof sdRecruitStrategy==='function'){
      sdRecruitStrategy();
    }

    if(typeof sdTierAudit==='function'){
      const result=sdTierAudit();

      if(!result.passed){
        console.warn(
          'Ability-tree validation issues:',
          result.issues
        );
      }
    }

    // Render first. Do not overwrite a save until
    // initialization has completed successfully.
    render();

    try{
      localStorage.setItem(
        KEY,
        JSON.stringify(S)
      );
    }catch(storageError){
      console.warn(
        'Autosave unavailable:',
        storageError
      );
    }

    console.info(
      '[Saturday Dynasty] Ready',
      {
        year:S.year,
        week:S.week,
        schools:S.teams.length,
        coaches:S.coaches.length,
        recruits:S.recruits.length,
        mode:S.mode
      }
    );

  }catch(error){
    showStartupError(error);
  }

})();
