
/*
 * SATURDAY DYNASTY
 * Part 14 — Performance and Tier Integrity
 *
 * Loaded after final-integration.js.
 *
 * Features:
 * - Validates all coaching archetypes and tiers
 * - Checks coaching skill purchases
 * - Tracks simulation performance
 * - Adds expanded dynasty integrity checks
 * - Provides a diagnostic dashboard
 * - Prevents duplicate season-end execution
 */

const SD_PERFORMANCE_VERSION='1.0.0';

const SD_EXPECTED_ARCHETYPES=13;
const SD_EXPECTED_BRANCHES=88;
const SD_EXPECTED_TIERS=352;

const SD_PERFORMANCE={
  advances:0,
  completedSeasons:0,
  lastAdvanceMs:0,
  longestAdvanceMs:0,
  lastSeasonMs:0,
  longestSeasonMs:0,
  warnings:[],
  seasonLock:false
};

function sdPerformanceNow(){
  if(
    typeof performance!=='undefined'&&
    typeof performance.now==='function'
  ){
    return performance.now();
  }

  return Date.now();
}

function sdPerformanceWarning(message){
  if(!SD_PERFORMANCE.warnings.includes(message)){
    SD_PERFORMANCE.warnings.push(message);
  }

  if(SD_PERFORMANCE.warnings.length>30){
    SD_PERFORMANCE.warnings.shift();
  }

  console.warn('[Saturday Dynasty]',message);
}

/* ---------------------------------------
   ABILITY-TREE STRUCTURE AUDIT
--------------------------------------- */

function sdTierAudit(){
  const issues=[];
  const names=Object.keys(SD_ARCH);

  let branches=0;
  let tiers=0;

  const groups={
    base:0,
    elite:0,
    hybrid:0,
    leadership:0,
    special:0
  };

  const keys=new Set();

  for(const name of names){
    const arch=SD_ARCH[name];

    if(!arch){
      issues.push('Missing archetype: '+name);
      continue;
    }

    if(!Array.isArray(arch.branches)){
      issues.push(
        name+' does not contain a branch list'
      );
      continue;
    }

    if(!Array.isArray(arch.effects)){
      issues.push(
        name+' does not contain an effect list'
      );
      continue;
    }

    if(arch.effects.length!==4){
      issues.push(
        name+' must contain four tier effects'
      );
    }

    if(!(arch.group in groups)){
      issues.push(
        name+' has an unknown archetype group'
      );
    }else{
      groups[arch.group]++;
    }

    for(const branch of arch.branches){
      const key=sdKey(name,branch);

      if(keys.has(key)){
        issues.push(
          'Duplicate ability branch: '+key
        );
      }

      keys.add(key);
      branches++;
      tiers+=4;

      for(let tier=1;tier<=4;tier++){
        const cost=sdAbilityCost(
          name,branch,tier
        );

        if(
          !Number.isFinite(cost)||
          cost<=0
        ){
          issues.push(
            'Invalid cost: '+
            key+' tier '+tier
          );
        }
      }
    }

    for(const parent of arch.parent||[]){
      if(!SD_ARCH[parent]){
        issues.push(
          name+' has missing prerequisite '+parent
        );
      }
    }
  }

  if(names.length!==SD_EXPECTED_ARCHETYPES){
    issues.push(
      'Expected 13 archetypes; found '+
      names.length
    );
  }

  if(branches!==SD_EXPECTED_BRANCHES){
    issues.push(
      'Expected 88 branches; found '+
      branches
    );
  }

  if(tiers!==SD_EXPECTED_TIERS){
    issues.push(
      'Expected 352 tiers; found '+
      tiers
    );
  }

  return {
    passed:issues.length===0,
    archetypes:names.length,
    branches,
    tiers,
    groups,
    issues
  };
}

/* ---------------------------------------
   INDIVIDUAL COACH ABILITY AUDIT
--------------------------------------- */

function sdCoachAbilityAudit(x){
  const issues=[];

  if(!x){
    return {
      passed:false,
      issues:['Coach not found']
    };
  }

  const tree=sdCoachInit(x);

  for(const arch of tree.unlocked){
    if(!SD_ARCH[arch]){
      issues.push(
        'Unknown unlocked archetype: '+arch
      );
    }
  }

  for(const [key,tier] of Object.entries(
    tree.tiers
  )){
    const divider=key.indexOf('|');

    if(divider<0){
      issues.push(
        'Invalid ability key: '+key
      );
      continue;
    }

    const arch=key.slice(0,divider);
    const branch=key.slice(divider+1);

    if(!SD_ARCH[arch]){
      issues.push(
        'Unknown archetype: '+arch
      );
      continue;
    }

    if(!SD_ARCH[arch].branches.includes(branch)){
      issues.push(
        'Unknown branch: '+key
      );
    }

    if(
      !Number.isInteger(tier)||
      tier<0||
      tier>4
    ){
      issues.push(
        'Invalid purchased tier: '+key
      );
    }

    if(
      tier>0&&
      !tree.unlocked.includes(arch)
    ){
      issues.push(
        'Purchased ability in locked archetype: '+
        key
      );
    }
  }

  if(
    !Number.isFinite(x.points)||
    x.points<0
  ){
    issues.push(
      'Invalid Coach Points balance'
    );
  }

  return {
    passed:issues.length===0,
    coach:x.name,
    purchasedBranches:Object.values(
      tree.tiers
    ).filter(v=>v>0).length,
    purchasedTiers:Object.values(
      tree.tiers
    ).reduce((a,b)=>a+b,0),
    points:x.points,
    issues
  };
}

/* ---------------------------------------
   ROSTER AND SCHOOL AUDIT
--------------------------------------- */

function sdRosterAudit(){
  const issues=[];
  let players=0;
  let oversized=0;

  for(const t of S.teams){
    if(!Array.isArray(t.roster)){
      issues.push(
        t.name+' has no roster array'
      );
      continue;
    }

    players+=t.roster.length;

    if(t.roster.length>95){
      oversized++;
      issues.push(
        t.name+' exceeds the 95-player limit'
      );
    }

    const seen=new Set();

    for(const p of t.roster){
      if(seen.has(p.id)){
        issues.push(
          t.name+' has duplicate player ID '+p.id
        );
      }

      seen.add(p.id);

      if(
        !Number.isFinite(p.ovr)||
        p.ovr<0||
        p.ovr>99
      ){
        issues.push(
          'Invalid player overall: '+p.name
        );
      }

      if(
        !Number.isFinite(p.yr)||
        p.yr<1||
        p.yr>4
      ){
        issues.push(
          'Invalid class year: '+p.name
        );
      }
    }
  }

  return {
    passed:issues.length===0,
    schools:S.teams.length,
    players,
    oversized,
    issues
  };
}

/* ---------------------------------------
   RECRUITING AUDIT
--------------------------------------- */

function sdRecruitingAudit(){
  const issues=[];
  let committed=0;
  let uncommitted=0;

  const schoolIds=new Set(
    S.teams.map(t=>t.id)
  );

  for(const r of S.recruits){
    if(r.committed===null){
      uncommitted++;
    }else{
      committed++;

      if(!schoolIds.has(r.committed)){
        issues.push(
          'Recruit committed to missing school: '+
          r.name
        );
      }
    }

    if(
      !Number.isFinite(r.stars)||
      r.stars<1||
      r.stars>5
    ){
      issues.push(
        'Invalid recruit star rating: '+r.name
      );
    }
  }

  return {
    passed:issues.length===0,
    recruits:S.recruits.length,
    committed,
    uncommitted,
    issues
  };
}

/* ---------------------------------------
   SEASON HISTORY AUDIT
--------------------------------------- */

function sdHistoryAudit(){
  const issues=[];
  const years=new Set();

  for(const season of S.seasonHistory||[]){
    if(years.has(season.year)){
      issues.push(
        'Duplicate completed season: '+
        season.year
      );
    }

    years.add(season.year);

    if(
      !Array.isArray(season.field)||
      season.field.length!==12
    ){
      issues.push(
        'Invalid 12-team playoff field: '+
        season.year
      );
    }

    if(
      !Array.isArray(season.playoffGames)||
      season.playoffGames.length!==11
    ){
      issues.push(
        'Invalid playoff game count: '+
        season.year
      );
    }

    if(!season.champion){
      issues.push(
        'Missing national champion: '+
        season.year
      );
    }
  }

  return {
    passed:issues.length===0,
    completedSeasons:years.size,
    issues
  };
}

/* ---------------------------------------
   EXPANDED INTEGRITY AUDIT
--------------------------------------- */

function sdFullAudit(){
  const results={
    schedule:audit(),
    abilities:sdTierAudit(),
    userAbilities:sdCoachAbilityAudit(user()),
    rosters:sdRosterAudit(),
    recruiting:sdRecruitingAudit(),
    history:sdHistoryAudit()
  };

  const issues=[];

  for(const [section,result] of Object.entries(
    results
  )){
    for(const issue of result.issues||[]){
      issues.push(
        section+': '+issue
      );
    }
  }

  return {
    passed:issues.length===0,
    year:S.year,
    week:S.week,
    sections:results,
    issues
  };
}

/* ---------------------------------------
   PERFORMANCE MONITORING
--------------------------------------- */

const sdBeforePerformanceAdvance=advance;

advance=function(){
  if(S?.ended){
    return alert(
      'Your coaching career has ended.'
    );
  }

  const start=sdPerformanceNow();

  try{
    return sdBeforePerformanceAdvance();
  }finally{
    const elapsed=
      sdPerformanceNow()-start;

    SD_PERFORMANCE.advances++;

    SD_PERFORMANCE.lastAdvanceMs=
      Math.round(elapsed);

    SD_PERFORMANCE.longestAdvanceMs=
      Math.max(
        SD_PERFORMANCE.longestAdvanceMs,
        elapsed
      );

    if(elapsed>5000){
      sdPerformanceWarning(
        'Week advancement took '+
        Math.round(elapsed)+
        ' milliseconds.'
      );
    }
  }
};

/* ---------------------------------------
   SEASON-END PROTECTION
--------------------------------------- */

const sdBeforePerformanceEnd=endSeason;

endSeason=function(){
  if(SD_PERFORMANCE.seasonLock){
    sdPerformanceWarning(
      'Duplicate season-end request blocked.'
    );
    return;
  }

  if(S?.ended){
    return;
  }

  const start=sdPerformanceNow();
  const previousYear=S.year;
  const previousHistory=
    S.seasonHistory?.length||0;

  SD_PERFORMANCE.seasonLock=true;

  try{
    const result=sdBeforePerformanceEnd();

    const completed=
      (S.seasonHistory?.length||0)>
      previousHistory;

    if(completed){
      SD_PERFORMANCE.completedSeasons++;

      const elapsed=
        sdPerformanceNow()-start;

      SD_PERFORMANCE.lastSeasonMs=
        Math.round(elapsed);

      SD_PERFORMANCE.longestSeasonMs=
        Math.max(
          SD_PERFORMANCE.longestSeasonMs,
          elapsed
        );

      if(elapsed>10000){
        sdPerformanceWarning(
          'Season '+previousYear+
          ' took '+Math.round(elapsed)+
          ' milliseconds to finish.'
        );
      }
    }

    return result;
  }finally{
    SD_PERFORMANCE.seasonLock=false;
  }
};

/* ---------------------------------------
   PERFORMANCE DASHBOARD
--------------------------------------- */

function sdPerformancePanel(){
  const tree=sdTierAudit();

  const status=tree.passed
    ?'PASS'
    :'CHECK REQUIRED';

  return `
    <div class="card">
      <h2>Engine Diagnostics</h2>

      <p class="muted">
        Saturday Dynasty · Performance Module
        ${SD_PERFORMANCE_VERSION}
      </p>

      <div class="grid">
        <div class="card">
          <b>Coaching Archetypes</b>
          <div class="big">${tree.archetypes}/13</div>
        </div>

        <div class="card">
          <b>Ability Branches</b>
          <div class="big">${tree.branches}/88</div>
        </div>

        <div class="card">
          <b>Purchasable Tiers</b>
          <div class="big">${tree.tiers}/352</div>
        </div>

        <div class="card">
          <b>Tree Validation</b>
          <div class="big">${status}</div>
        </div>
      </div>

      <h3>Simulation Performance</h3>

      <p>
        Weeks advanced:
        <b>${SD_PERFORMANCE.advances}</b>
      </p>

      <p>
        Last advancement:
        <b>${SD_PERFORMANCE.lastAdvanceMs} ms</b>
      </p>

      <p>
        Longest advancement:
        <b>${Math.round(
          SD_PERFORMANCE.longestAdvanceMs
        )} ms</b>
      </p>

      <p>
        Last completed season:
        <b>${SD_PERFORMANCE.lastSeasonMs} ms</b>
      </p>

      <p>
        Longest season:
        <b>${Math.round(
          SD_PERFORMANCE.longestSeasonMs
        )} ms</b>
      </p>

      <div class="row">
        <button onclick="sdShowFullAudit()">
          Run Full Integrity Audit
        </button>

        <button onclick="sdShowTierAudit()">
          Check All Ability Tiers
        </button>
      </div>

      ${
        SD_PERFORMANCE.warnings.length
          ?`<h3>Performance Warnings</h3>
            ${SD_PERFORMANCE.warnings
              .slice(-5)
              .map(w=>`
                <p class="muted">${esc(w)}</p>
              `).join('')}`
          :'<p class="muted">No performance warnings recorded this session.</p>'
      }
    </div>
  `;
}

function sdShowTierAudit(){
  const result=sdTierAudit();

  alert(
    JSON.stringify(result,null,2)
  );
}

function sdShowFullAudit(){
  try{
    const result=sdFullAudit();

    const summary={
      passed:result.passed,
      year:result.year,
      week:result.week,
      schools:result.sections.rosters.schools,
      players:result.sections.rosters.players,
      recruits:result.sections.recruiting.recruits,
      completedSeasons:
        result.sections.history.completedSeasons,
      archetypes:
        result.sections.abilities.archetypes,
      branches:
        result.sections.abilities.branches,
      tiers:
        result.sections.abilities.tiers,
      issueCount:result.issues.length,
      issues:result.issues.slice(0,40)
    };

    alert(
      JSON.stringify(summary,null,2)
    );

    return result;
  }catch(error){
    console.error(
      'Full audit failed:',error
    );

    alert(
      'Audit error: '+error.message
    );

    return null;
  }
}

/* ---------------------------------------
   OFFICE SCREEN INTEGRATION
--------------------------------------- */

const sdBeforePerformanceRender=render;

render=function(){
  sdBeforePerformanceRender();

  if(tab==='Office'){
    const main=document.getElementById('main');

    if(main){
      main.insertAdjacentHTML(
        'beforeend',
        sdPerformancePanel()
      );
    }
  }
};

/* ---------------------------------------
   INITIAL VALIDATION
--------------------------------------- */

(function(){
  const result=sdTierAudit();

  if(!result.passed){
    console.error(
      'Saturday Dynasty ability-tree validation:',
      result.issues
    );
  }else{
    console.info(
      'Saturday Dynasty ability trees validated:',
      result.archetypes+' archetypes,',
      result.branches+' branches,',
      result.tiers+' tiers.'
    );
  }
})();
