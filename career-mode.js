
/*
 * SATURDAY DYNASTY
 * Career Mode Upgrade 1.0
 *
 * Load after performance-and-tiers.js
 * and before startup.js.
 *
 * Simulation:
 * - Begin as OC or DC
 * - Start at a lower-prestige school
 * - Choose a scheme and game plan
 * - Recruit your side of the football
 * - Earn career opportunities
 *
 * Arcade:
 * - Start as HC, OC, or DC
 * - Choose any school
 *
 * New coaches begin 0-0.
 */

(function(){

"use strict";

const OFFENSE=[
  "Spread",
  "Air Raid",
  "Pro Style",
  "Power Run",
  "Option",
  "RPO"
];

const DEFENSE=[
  "4-3",
  "3-4",
  "4-2-5",
  "3-3-5",
  "4-4"
];

const OFFENSIVE_POS=[
  "QB","HB","RB","FB","WR",
  "TE","OT","OG","C"
];

const DEFENSIVE_POS=[
  "DE","DT","OLB","MLB","LB",
  "CB","FS","SS","S"
];

const SPECIAL_POS=["K","P"];

const SMALL_CONFERENCES=[
  "Sun Belt",
  "MAC",
  "CUSA",
  "Conference USA",
  "Mountain West",
  "American"
];

const CAREER_DEFAULTS={
  runPass:50,
  tempo:"Balanced",
  aggression:"Balanced",
  blitz:40,
  coverage:"Balanced",
  keyCalls:false
};

function schoolEligible(t){
  return t.prestige<=2 &&
    SMALL_CONFERENCES.includes(t.conf);
}

function eligibleSchools(mode){
  if(mode==="arcade"){
    return [...S.teams];
  }

  return S.teams.filter(schoolEligible);
}

function positionAllowed(pos,role){
  if(role==="HC")return true;

  if(role==="OC"){
    return OFFENSIVE_POS.includes(pos);
  }

  if(role==="DC"){
    return DEFENSIVE_POS.includes(pos);
  }

  return false;
}

function cleanRecord(){
  return {
    wins:0,
    losses:0,
    conferenceWins:0,
    conferenceTitles:0,
    bowlWins:0,
    playoffWins:0,
    titles:0,
    top5:0,
    no1:0,
    fiveStars:0
  };
}

function ensureCareer(u){
  if(!u)return;

  if(!u.career){
    u.career=cleanRecord();
  }

  if(!u.coordinatorRecord){
    u.coordinatorRecord={
      wins:0,
      losses:0,
      seasons:0,
      offensiveSeasons:0,
      defensiveSeasons:0
    };
  }

  if(!u.headCoachRecord){
    u.headCoachRecord={
      wins:u.career.wins||0,
      losses:u.career.losses||0
    };
  }

  if(!u.careerResume){
    u.careerResume=[];
  }

  if(!u.gamePlan){
    u.gamePlan={...CAREER_DEFAULTS};
  }
}

function resetCareer(u){
  u.career=cleanRecord();

  u.coordinatorRecord={
    wins:0,
    losses:0,
    seasons:0,
    offensiveSeasons:0,
    defensiveSeasons:0
  };

  u.headCoachRecord={
    wins:0,
    losses:0
  };

  u.careerResume=[];
  u.simSeasons=0;
  u.xp=0;
  u.level=1;
  u.points=2;
  u.retired=false;
  u.historicalRecord=null;
  u.gamePlan={...CAREER_DEFAULTS};
}

function placeCoach(u,t,role){
  const previous=S.teams.find(x=>
    x.coach===u.id ||
    x.oc===u.id ||
    x.dc===u.id
  );

  if(previous){
    for(const slot of ["coach","oc","dc"]){
      if(previous[slot]===u.id){
        const replacement=coach(
          nm(),
          slot==="coach"?"HC":slot.toUpperCase(),
          previous.id
        );

        S.coaches.push(replacement);
        previous[slot]=replacement.id;
      }
    }
  }

  const slot=role==="HC"
    ?"coach"
    :role.toLowerCase();

  const outgoing=c(t[slot]);

  if(outgoing && outgoing.id!==u.id){
    outgoing.teamId=null;
    outgoing.retired=false;
  }

  t[slot]=u.id;
  u.teamId=t.id;
  u.role=role;
}

function roleLabel(role){
  return {
    HC:"Head Coach",
    OC:"Offensive Coordinator",
    DC:"Defensive Coordinator"
  }[role]||role;
}

function options(items,selected){
  return items.map(x=>
    `<option value="${esc(x)}"
      ${x===selected?"selected":""}>
      ${esc(x)}
    </option>`
  ).join("");
}

function setupSchoolOptions(mode){
  return eligibleSchools(mode)
    .sort((a,b)=>
      a.conf.localeCompare(b.conf) ||
      a.name.localeCompare(b.name)
    )
    .map(t=>
      `<option value="${t.id}">
        ${esc(t.name)} — ${esc(t.conf)}
      </option>`
    ).join("");
}

function refreshSetup(){
  const mode=document.getElementById(
    "careerMode"
  ).value;

  const roleEl=document.getElementById(
    "careerRole"
  );

  const previousRole=roleEl.value;

  roleEl.innerHTML=options(
    mode==="simulation"
      ?["OC","DC"]
      :["HC","OC","DC"],
    previousRole
  );

  if(
    mode==="simulation" &&
    previousRole==="HC"
  ){
    roleEl.value="OC";
  }

  const schoolEl=document.getElementById(
    "careerSchool"
  );

  const previousSchool=schoolEl.value;

  schoolEl.innerHTML=
    setupSchoolOptions(mode);

  if(
    [...schoolEl.options].some(
      x=>x.value===previousSchool
    )
  ){
    schoolEl.value=previousSchool;
  }

  refreshScheme();
}

function refreshScheme(){
  const role=document.getElementById(
    "careerRole"
  ).value;

  const schemeEl=document.getElementById(
    "careerScheme"
  );

  const schemeLabel=document.getElementById(
    "careerSchemeLabel"
  );

  if(role==="DC"){
    schemeLabel.textContent=
      "Defensive scheme";

    schemeEl.innerHTML=options(
      DEFENSE,"4-2-5"
    );
  }else{
    schemeLabel.textContent=
      "Offensive scheme";

    schemeEl.innerHTML=options(
      OFFENSE,"Spread"
    );
  }
}

window.sdCareerSetup=function(){
  const el=document.getElementById(
    "modal"
  );

  el.innerHTML=`
    <div class="creator">
      <div class="row">
        <h2>New Coaching Career</h2>
        <button onclick="
          document.getElementById('modal').close()
        ">Close</button>
      </div>

      <p class="muted">
        Simulation Mode begins at a smaller
        program as an offensive or defensive
        coordinator. Arcade Mode removes
        those restrictions.
      </p>

      <label>
        Game mode
        <select id="careerMode"
          onchange="sdRefreshCareerSetup()">
          <option value="simulation">
            Simulation Mode
          </option>
          <option value="arcade">
            Arcade Mode
          </option>
        </select>
      </label>

      <label>
        Coach name
        <input
          id="careerName"
          maxlength="48"
          placeholder="Enter your coach's name"
          value="Your Coach"
        >
      </label>

      <label>
        Starting position
        <select id="careerRole"
          onchange="sdRefreshCareerScheme()">
        </select>
      </label>

      <label>
        Starting school
        <select id="careerSchool"></select>
      </label>

      <label>
        <span id="careerSchemeLabel">
          Offensive scheme
        </span>
        <select id="careerScheme"></select>
      </label>

      <p class="muted">
        New career record: 0–0.
        All coaching experience must be earned.
      </p>

      <button onclick="sdCreateCareer()">
        Begin Coaching Career
      </button>
    </div>
  `;

  if(!el.open){
    el.showModal();
  }

  refreshSetup();
};

window.sdRefreshCareerSetup=refreshSetup;
window.sdRefreshCareerScheme=refreshScheme;

window.sdCreateCareer=function(){
  const mode=document.getElementById(
    "careerMode"
  ).value;

  const name=document.getElementById(
    "careerName"
  ).value.trim();

  const role=document.getElementById(
    "careerRole"
  ).value;

  const schoolId=Number(
    document.getElementById(
      "careerSchool"
    ).value
  );

  const scheme=document.getElementById(
    "careerScheme"
  ).value;

  if(!name){
    return alert("Enter a coach name.");
  }

  if(
    mode==="simulation" &&
    !["OC","DC"].includes(role)
  ){
    return alert(
      "Simulation Mode requires OC or DC."
    );
  }

  const selected=S.teams.find(
    t=>t.id===schoolId
  );

  if(!selected){
    return alert("Choose a school.");
  }

  if(
    mode==="simulation" &&
    !schoolEligible(selected)
  ){
    return alert(
      "Choose an eligible smaller school."
    );
  }

  if(
    role==="DC" &&
    !DEFENSE.includes(scheme)
  ){
    return alert("Choose a defensive scheme.");
  }

  if(
    role!=="DC" &&
    !OFFENSE.includes(scheme)
  ){
    return alert("Choose an offensive scheme.");
  }

  if(!confirm(
    "Start a new dynasty? Your current save "+
    "will be replaced. Export it first if "+
    "you want to keep it."
  )){
    return;
  }

  S=create();

  S.mode=mode;
  S.yearLimit=35;
  S.ended=false;
  S.careerOffers=[];

  const u=user();
  const t=S.teams.find(
    x=>x.id===schoolId
  );

  resetCareer(u);

  u.name=name;
  u.scheme=scheme;
  u.custom=true;
  u.realName=false;
  u.source="New coaching career";

  placeCoach(u,t,role);

  S.careerStarted=true;

  S.news.unshift(
    `${name} begins a coaching career as `+
    `${roleLabel(role)} at ${t.name}.`
  );

  tab="Office";

  document.getElementById(
    "modal"
  ).close();

  save();
};

/* Replace the old text-prompt setup. */

startNewDynasty=function(){
  window.sdCareerSetup();
};

/* -----------------------------------
   SCHEME EFFECTS
----------------------------------- */

function schemeBonus(t){
  if(!S || t.id!==user().teamId){
    return 0;
  }

  const u=user();
  const plan=u.gamePlan||CAREER_DEFAULTS;

  const roster=t.roster||[];

  function avg(pos){
    const list=roster.filter(
      p=>pos.includes(p.pos)
    );

    if(!list.length)return 60;

    return list.reduce(
      (sum,p)=>sum+p.ovr,0
    )/list.length;
  }

  const pass=avg(["QB","WR","TE"]);
  const run=avg(["HB","RB","FB","OT","OG","C"]);
  const front=avg(["DE","DT","OLB","MLB"]);
  const secondary=avg(["CB","FS","SS"]);

  let bonus=0;

  switch(u.scheme){
    case "Air Raid":
      bonus=(pass-65)/16;
      break;
    case "Spread":
    case "RPO":
      bonus=(pass+run-130)/32;
      break;
    case "Power Run":
    case "Option":
      bonus=(run-65)/16;
      break;
    case "Pro Style":
      bonus=(pass+run-130)/34;
      break;
    case "4-3":
    case "3-4":
    case "4-4":
      bonus=(front-65)/16;
      break;
    case "4-2-5":
    case "3-3-5":
      bonus=(secondary-65)/16;
      break;
  }

  if(plan.tempo==="Fast"){
    bonus+=0.3;
  }

  if(plan.aggression==="Aggressive"){
    bonus+=0.3;
  }

  return Math.max(-2,Math.min(3,bonus));
}

if(typeof expected==="function"){
  const originalExpected=expected;

  expected=function(t){
    return originalExpected(t)+schemeBonus(t);
  };
}

/* -----------------------------------
   COORDINATOR GAME RECORDS
----------------------------------- */

const previousSimGame=simGame;

simGame=function(g){
  const u=user();

  const involved=
    g.a===u.teamId ||
    g.b===u.teamId;

  const wasPlayed=!!g.played;

  const result=previousSimGame(g);

  if(
    involved &&
    !wasPlayed &&
    g.played
  ){
    ensureCareer(u);

    const won=
      (g.a===u.teamId && g.sa>g.sb) ||
      (g.b===u.teamId && g.sb>g.sa);

    if(u.role==="HC"){
      u.headCoachRecord[
        won?"wins":"losses"
      ]++;
    }else{
      u.coordinatorRecord[
        won?"wins":"losses"
      ]++;
    }
  }

  return result;
};

/* -----------------------------------
   RECRUITING RESPONSIBILITIES
----------------------------------- */

function canRecruit(r){
  return positionAllowed(
    r.pos,user().role
  );
}

function denyRecruit(){
  alert(
    "As a coordinator, you control "+
    "recruiting on your side of the ball. "+
    "The head coach and other coordinator "+
    "handle the remaining positions."
  );
}

const previousRecruitAction=recruitAction;

recruitAction=function(id,action){
  const r=S.recruits.find(x=>x.id===id);

  if(r && !canRecruit(r)){
    return denyRecruit();
  }

  return previousRecruitAction(id,action);
};

const previousOffer=offer;

offer=function(id){
  const r=S.recruits.find(x=>x.id===id);

  if(r && !canRecruit(r)){
    return denyRecruit();
  }

  return previousOffer(id);
};

const previousTarget=target;

target=function(id){
  const r=S.recruits.find(x=>x.id===id);

  if(r && !canRecruit(r)){
    return denyRecruit();
  }

  return previousTarget(id);
};

/* -----------------------------------
   COACHING CAROUSEL
----------------------------------- */

const previousCarousel=carousel;

carousel=function(){
  const u=user();

  ensureCareer(u);

  const currentTeam=team();
  const season=currentTeam.history.at(-1);

  const wins=season?.w||0;
  const losses=season?.l||0;

  const priorRole=u.role;
  const priorSchool=currentTeam.name;

  const result=previousCarousel();

  if(priorRole!=="HC"){
    u.coordinatorRecord.seasons++;

    if(priorRole==="OC"){
      u.coordinatorRecord.offensiveSeasons++;
    }else{
      u.coordinatorRecord.defensiveSeasons++;
    }
  }

  u.careerResume.push({
    year:S.year,
    school:priorSchool,
    role:priorRole,
    scheme:u.scheme,
    wins,
    losses
  });

  const offers=[];
  const years=u.careerResume.length;

  /*
   * More successful seasons create better
   * opportunities. Offers are not guaranteed.
   */

  if(years>=1){
    for(const t of S.teams){
      if(t.id===u.teamId)continue;

      let chance=0;

      if(t.prestige<=2){
        chance=0.08;
      }else if(t.prestige===3){
        chance=0.035;
      }else{
        chance=0.012;
      }

      if(wins>=8)chance*=2;
      if(wins>=10)chance*=1.6;
      if(wins<=4)chance*=0.25;

      if(t.prestige>=4 && years<3){
        chance=0;
      }

      if(Math.random()<chance){
        const role=
          t.prestige>=4 && years<5
            ?priorRole
            :wins>=8 && Math.random()<0.55
              ?"HC"
              :priorRole;

        offers.push({
          teamId:t.id,
          role,
          year:S.year
        });
      }
    }
  }

  S.careerOffers=offers
    .sort((a,b)=>
      S.teams[b.teamId].prestige-
      S.teams[a.teamId].prestige
    )
    .slice(0,5);

  return result;
};

window.sdAcceptCareerOffer=function(index){
  const offer=S.careerOffers?.[index];

  if(!offer){
    return alert("That offer is unavailable.");
  }

  const t=S.teams.find(
    x=>x.id===offer.teamId
  );

  if(!t)return;

  const u=user();

  if(!confirm(
    `Accept the ${roleLabel(offer.role)} `+
    `position at ${t.name}?`
  )){
    return;
  }

  placeCoach(u,t,offer.role);

  S.careerOffers=[];

  addNews(
    `${u.name} accepted the `+
    `${roleLabel(offer.role)} job `+
    `at ${t.name}.`
  );

  save();
};

/* Keep the original carousel buttons
 * compatible with the new role system.
 */

acceptJob=function(id){
  const t=S.teams.find(x=>x.id===id);

  if(!t)return;

  if(!confirm(
    `Accept the head coaching job `+
    `at ${t.name}?`
  )){
    return;
  }

  placeCoach(user(),t,"HC");

  S.jobs=[];
  S.careerOffers=[];

  addNews(
    `You became head coach at ${t.name}.`
  );

  save();
};

/* -----------------------------------
   GAME PLAN
----------------------------------- */

window.sdGamePlan=function(){
  const u=user();

  ensureCareer(u);

  const p=u.gamePlan;

  const el=document.getElementById(
    "modal"
  );

  el.innerHTML=`
    <div class="creator">
      <div class="row">
        <h2>Coaching Game Plan</h2>
        <button onclick="
          document.getElementById('modal').close()
        ">Close</button>
      </div>

      <p>
        ${esc(roleLabel(u.role))} ·
        ${esc(u.scheme)}
      </p>

      <label>
        Run / Pass Balance
        <input id="gpRun"
          type="range"
          min="0"
          max="100"
          value="${p.runPass}">
        <small>
          0 = pass heavy;
          100 = run heavy
        </small>
      </label>

      <label>
        Tempo
        <select id="gpTempo">
          ${options(
            ["Slow","Balanced","Fast"],
            p.tempo
          )}
        </select>
      </label>

      <label>
        Aggressiveness
        <select id="gpAggression">
          ${options(
            ["Conservative","Balanced",
             "Aggressive"],
            p.aggression
          )}
        </select>
      </label>

      <label>
        Blitz Frequency
        <input id="gpBlitz"
          type="range"
          min="0"
          max="100"
          value="${p.blitz}">
      </label>

      <label>
        Coverage Preference
        <select id="gpCoverage">
          ${options(
            ["Balanced","Man","Zone"],
            p.coverage
          )}
        </select>
      </label>

      <label>
        <input id="gpKeyCalls"
          type="checkbox"
          ${p.keyCalls?"checked":""}>
        Enable optional critical-situation
        play calling
      </label>

      <button onclick="sdSaveGamePlan()">
        Save Game Plan
      </button>
    </div>
  `;

  if(!el.open){
    el.showModal();
  }
};

window.sdSaveGamePlan=function(){
  const u=user();

  ensureCareer(u);

  u.gamePlan={
    runPass:Number(
      document.getElementById("gpRun").value
    ),
    tempo:document.getElementById(
      "gpTempo"
    ).value,
    aggression:document.getElementById(
      "gpAggression"
    ).value,
    blitz:Number(
      document.getElementById("gpBlitz").value
    ),
    coverage:document.getElementById(
      "gpCoverage"
    ).value,
    keyCalls:document.getElementById(
      "gpKeyCalls"
    ).checked
  };

  document.getElementById(
    "modal"
  ).close();

  save();
};

/* -----------------------------------
   CAREER INTERFACE
----------------------------------- */

const previousRender=render;

render=function(){
  previousRender();

  if(!S)return;

  const u=user();

  if(!u)return;

  ensureCareer(u);

  const main=document.getElementById(
    "main"
  );

  if(!main)return;

  if(tab==="Office"){
    const coordinator=
      u.coordinatorRecord;

    const hc=u.headCoachRecord;

    const careerRecord=u.role==="HC"
      ?`${hc.wins}-${hc.losses}`
      :`${coordinator.wins}-${coordinator.losses}`;

    main.insertAdjacentHTML(
      "afterbegin",
      `
      <div class="card">
        <h2>${esc(roleLabel(u.role))}</h2>

        <p>
          ${esc(u.name)} ·
          ${esc(team().name)}
        </p>

        <p class="gold">
          ${esc(u.scheme)}
        </p>

        <div class="grid">
          ${box("Coaching Record",careerRecord)}
          ${box(
            "Coordinator W-L",
            coordinator.wins+"-"+coordinator.losses
          )}
          ${box(
            "Head Coach W-L",
            hc.wins+"-"+hc.losses
          )}
        </div>

        <div class="row">
          <button onclick="sdGamePlan()">
            Game Plan
          </button>

          <button onclick="sdCareerSetup()">
            New Coaching Career
          </button>
        </div>
      </div>
      `
    );
  }

  if(tab==="Recruiting" && u.role!=="HC"){
    const cards=[
      ...main.querySelectorAll(
        ".card"
      )
    ];

    /*
     * Leave the existing recruiting engine
     * intact. Disallowed positions cannot
     * receive offers, visits, pitches,
     * scouting or targeting.
     */

    const notice=document.createElement(
      "div"
    );

    notice.className="card";

    notice.innerHTML=`
      <b>Coordinator Recruiting</b>
      <p class="muted">
        You manage ${u.role==="OC"
          ?"offensive"
          :"defensive"} prospects.
        Other positions are handled by
        the rest of the staff.
      </p>
    `;

    main.prepend(notice);
  }

  if(tab==="Carousel"){
    const offers=S.careerOffers||[];

    main.insertAdjacentHTML(
      "afterbegin",
      `
      <div class="card">
        <h3>Your Career Opportunities</h3>

        ${
          offers.length
            ?offers.map((o,i)=>{
              const t=S.teams.find(
                x=>x.id===o.teamId
              );

              return `
                <div class="card row">
                  <div>
                    <b>${esc(t.name)}</b>
                    <p class="muted">
                      ${esc(t.conf)} ·
                      ${esc(roleLabel(o.role))}
                    </p>
                  </div>

                  <button onclick="
                    sdAcceptCareerOffer(${i})
                  ">
                    Accept
                  </button>
                </div>
              `;
            }).join("")
            :`<p class="muted">
                No new career offers.
                Build your résumé and
                check again next offseason.
              </p>`
        }
      </div>
      `
    );
  }

  if(tab==="History"){
    const entries=u.careerResume||[];

    main.insertAdjacentHTML(
      "afterbegin",
      `
      <div class="card">
        <h2>Coaching Résumé</h2>

        <p>
          Coordinator:
          ${u.coordinatorRecord.wins}–
          ${u.coordinatorRecord.losses}
        </p>

        <p>
          Head Coach:
          ${u.headCoachRecord.wins}–
          ${u.headCoachRecord.losses}
        </p>

        ${
          entries.map(x=>`
            <p>
              ${x.year} ·
              ${esc(x.school)} ·
              ${esc(x.role)} ·
              ${x.wins}-${x.losses}
            </p>
          `).join("")
        }
      </div>
      `
    );
  }
};

console.info(
  "[Saturday Dynasty] Career Mode loaded."
);

})();
