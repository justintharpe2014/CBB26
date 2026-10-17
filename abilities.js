
/* Saturday Dynasty — expanded coaching ability system. */

const SD_UNITS={
  QB:['QB'],
  RB:['HB','RB'],
  REC:['WR','TE'],
  OL:['OT','OG','C'],
  DL:['DE','DT'],
  LB:['OLB','MLB'],
  DB:['CB','FS','SS'],
  ST:['K','P']
};

const SD_ARCH={
  Recruiter:{
    group:'base',
    branches:['QB','RB','REC','OL','DL','LB','DB','ST'],
    effects:['scout','sway','initial','portal']
  },
  Motivator:{
    group:'base',
    branches:['QB','RB','REC','OL','DL','LB','DB','ST'],
    effects:['training','morale','breakout','retention']
  },
  Tactician:{
    group:'base',
    branches:['QB','RB','REC','OL','DL','LB','DB','ST'],
    effects:['scheme','consistency','matchup','clutch']
  },
  'Elite Recruiter':{
    group:'elite',
    parent:['Recruiter'],
    branches:['QB','RB','REC','OL','DL','LB','DB','ST'],
    effects:['scout','influence','pipeline','hours']
  },
  'Master Motivator':{
    group:'elite',
    parent:['Motivator'],
    branches:['QB','RB','REC','OL','DL','LB','DB','ST'],
    effects:['training','breakout','retention','leadership']
  },
  'Scheme Guru':{
    group:'elite',
    parent:['Tactician'],
    branches:['QB','RB','REC','OL','DL','LB','DB','ST'],
    effects:['scheme','matchup','clutch','adjustment']
  },
  Strategist:{
    group:'hybrid',
    parent:['Recruiter','Tactician'],
    branches:['QB','RB','REC','OL','DL','LB','DB','ST'],
    effects:['fit','scout','scheme','influence']
  },
  'Talent Developer':{
    group:'hybrid',
    parent:['Recruiter','Motivator'],
    branches:['QB','RB','REC','OL','DL','LB','DB','ST'],
    effects:['potential','training','breakout','retention']
  },
  Architect:{
    group:'hybrid',
    parent:['Motivator','Tactician'],
    branches:['QB','RB','REC','OL','DL','LB','DB','ST'],
    effects:['scheme','training','potential','clutch']
  },
  'Program Builder':{
    group:'leadership',
    parent:[],
    branches:['Culture','Retention','Staff','Pipelines'],
    effects:['morale','retention','leadership','pipeline']
  },
  CEO:{
    group:'leadership',
    parent:[],
    branches:['Leadership','Recruiting','Resources','Championships'],
    effects:['leadership','influence','hours','clutch']
  },
  Rainmaker:{
    group:'special',
    parent:[],
    branches:['NIL','Budget','Retention','Expectations'],
    effects:['influence','hours','retention','leadership']
  },
  Visionary:{
    group:'special',
    parent:[],
    branches:['Planning','Facilities','Preparation','Contracts'],
    effects:['potential','training','matchup','leadership']
  }
};

const SD_EFFECT_LABEL={
  scout:'Scouting efficiency',
  sway:'Recruiting persuasion',
  initial:'Starting recruit interest',
  portal:'Transfer interest',
  training:'Offseason development',
  morale:'Player morale',
  breakout:'Breakout probability',
  retention:'Retention strength',
  scheme:'Scheme execution',
  consistency:'Game consistency',
  matchup:'Matchup advantage',
  clutch:'Close-game performance',
  influence:'Recruiting influence',
  pipeline:'Pipeline effectiveness',
  hours:'Recruiting hours',
  leadership:'Staff effectiveness',
  adjustment:'Halftime adjustments',
  fit:'Scheme-fit evaluation',
  potential:'Potential discovery'
};

function sdCoachInit(x){
  if(!x.abilityTree){
    x.abilityTree={
      unlocked:['Recruiter','Motivator','Tactician'],
      tiers:{},
      spent:{},
      cp:0
    };
  }
  return x.abilityTree;
}

function sdKey(arch,branch){
  return arch+'|'+branch;
}

function sdTier(x,arch,branch){
  return sdCoachInit(x).tiers[sdKey(arch,branch)]||0;
}

function sdAbilityCost(arch,branch,tier){
  const g=SD_ARCH[arch].group;
  let cost=g==='base'
    ?[10,15,20,25][tier-1]
    :g==='elite'||g==='hybrid'
      ?[25,30,35,40][tier-1]
      :[30,35,40,45][tier-1];

  if(branch==='ST')cost=Math.ceil(cost/2);
  return cost;
}

function sdUnlockRequirements(x,arch){
  let a=SD_ARCH[arch];
  let st=sdCoachInit(x);
  let spent=p=>st.spent[p]||0;

  if(st.unlocked.includes(arch)){
    return {ok:true,why:'Unlocked',cost:0};
  }

  if(a.group==='base'){
    return {ok:true,why:'Base archetype',cost:25};
  }

  if(a.group==='special'){
    return {ok:true,why:'Optional special archetype',cost:40};
  }

  if(a.group==='leadership'){
    return {
      ok:x.role==='HC'&&x.level>=20&&
        Object.values(st.spent).reduce((v,n)=>v+n,0)>=200,
      why:'Head coach · Level 20 · 200 CP invested',
      cost:75
    };
  }

  let threshold=a.group==='hybrid'?65:100;

  return {
    ok:x.level>=10&&a.parent.every(p=>spent(p)>=threshold),
    why:`Level 10 · ${threshold} CP invested in ${a.parent.join(' + ')}`,
    cost:a.group==='hybrid'?90:50
  };
}

function sdBuyUnlock(id,arch){
  let x=c(id);
  if(!x||!SD_ARCH[arch])return;

  let a=sdUnlockRequirements(x,arch);
  let st=sdCoachInit(x);

  if(st.unlocked.includes(arch))return;

  if(!a.ok||x.points<a.cost){
    return alert('Requirements or Coach Points not met: '+a.why);
  }

  x.points-=a.cost;
  st.unlocked.push(arch);
  save();
}

function sdBuyTier(id,arch,branch){
  let x=c(id);
  if(!x)return;

  let st=sdCoachInit(x);
  let a=SD_ARCH[arch];

  if(!a||!a.branches.includes(branch)||!st.unlocked.includes(arch)){
    return;
  }

  let t=sdTier(x,arch,branch);
  if(t>=4)return;

  let cost=sdAbilityCost(arch,branch,t+1);

  if(x.points<cost){
    return alert(`Requires ${cost} Coach Points; available ${x.points}.`);
  }

  x.points-=cost;
  st.tiers[sdKey(arch,branch)]=t+1;
  st.spent[arch]=(st.spent[arch]||0)+cost;
  save();
}

function sdEffect(x,e,pos){
  let unit=Object.keys(SD_UNITS)
    .find(k=>SD_UNITS[k].includes(pos))||pos;

  let score=0;

  for(let [key,tier] of Object.entries(sdCoachInit(x).tiers)){
    let [arch,branch]=key.split('|');
    let a=SD_ARCH[arch];

    if(!a)continue;

    if(!(
      branch===unit||
      a.group==='leadership'||
      a.group==='special'
    ))continue;

    for(let i=0;i<tier;i++){
      if(a.effects[i]===e){
        score+=a.group==='base'
          ?0.20
          :a.group==='elite'
            ?0.25
            :0.22;
      }
    }
  }

  return Math.min(.45,score);
}

function sdScoutingCost(x,pos){
  return Math.max(
    4,
    Math.ceil(10*(1-sdEffect(x,'scout',pos)))
  );
}

function sdRecruitBoost(x,pos){
  return 1+
    sdEffect(x,'influence',pos)+
    sdEffect(x,'pipeline',pos)+
    sdEffect(x,'initial',pos);
}

function sdAutoCoach(x){
  if(!x||x.id===S.user||x.retired)return;

  let st=sdCoachInit(x);
  let pref=x.role==='OC'
    ?['QB','REC','OL','RB']
    :x.role==='DC'
      ?['DB','DL','LB']
      :['QB','REC','DL','DB','OL'];

  let archetypes=st.unlocked.filter(
    a=>SD_ARCH[a]?.branches.some(b=>pref.includes(b))
  );

  if(!archetypes.length)return;

  for(let attempts=0;attempts<3;attempts++){
    let opts=[];

    for(let a of archetypes){
      for(let b of pref){
        if(!SD_ARCH[a].branches.includes(b))continue;

        let tier=sdTier(x,a,b);

        if(tier<4&&sdAbilityCost(a,b,tier+1)<=x.points){
          opts.push({a,b,tier});
        }
      }
    }

    if(!opts.length)break;

    opts.sort((p,q)=>p.tier-q.tier);

    let o=opts[0];
    let cost=sdAbilityCost(o.a,o.b,o.tier+1);

    x.points-=cost;
    st.tiers[sdKey(o.a,o.b)]=o.tier+1;
    st.spent[o.a]=(st.spent[o.a]||0)+cost;
  }
}

function sdAwardXP(x,amount,reason){
  if(!x||x.retired)return;

  sdCoachInit(x);
  x.xp=(x.xp||0)+amount;

  while(x.level<100&&x.xp>=x.level*125){
    x.xp-=x.level*125;
    x.level++;
    x.points=(x.points||0)+10;
  }

  if(x.id!==S.user)sdAutoCoach(x);
}

function sdAbilitiesPanel(){
  let x=user();
  let st=sdCoachInit(x);

  return `<div class="card">
    <h2>Coach Ability Trees</h2>
    <p>
      ${esc(x.name)} · Level ${x.level} ·
      ${x.points} Coach Points ·
      XP ${x.xp}/${x.level*125}
    </p>
    <p class="muted">
      Each position branch has four cumulative upgrades.
      Tier costs rise. Specializations and hybrid paths
      unlock through investment.
    </p>

    ${Object.entries(SD_ARCH).map(([name,a])=>{
      let unlocked=st.unlocked.includes(name);
      let req=sdUnlockRequirements(x,name);

      return `<details class="card">
        <summary>
          <b>${esc(name)}</b> · ${a.group}
          ${unlocked?'✓':'🔒'}
        </summary>

        ${!unlocked
          ?`<p>${esc(req.why)} · Unlock ${req.cost} CP</p>
            <button
              ${!req.ok||x.points<req.cost?'disabled':''}
              onclick="sdBuyUnlock('${x.id}','${name}')">
              Unlock ${esc(name)}
            </button>`
          :a.branches.map(branch=>{
            let tier=sdTier(x,name,branch);

            return `<div class="card">
              <b>${branch}</b> · Tier ${tier}/4

              ${a.effects.map((e,i)=>`
                <p style="margin:3px 0;color:${i<tier?'#68d391':'inherit'}">
                  ${i+1}. ${SD_EFFECT_LABEL[e]} ·
                  ${sdAbilityCost(name,branch,i+1)} CP
                  ${i<tier?'✓':''}
                </p>
              `).join('')}

              <button
                ${tier===4||
                  x.points<sdAbilityCost(name,branch,Math.min(4,tier+1))
                    ?'disabled':''}
                onclick="sdBuyTier('${x.id}','${name}','${branch}')">
                ${tier===4
                  ?'Maxed'
                  :'Upgrade · '+sdAbilityCost(name,branch,tier+1)+' CP'}
              </button>
            </div>`;
          }).join('')
        }
      </details>`;
    }).join('')}
  </div>`;
}

const sdBeforeAbilitiesRender=render;

render=function(){
  sdBeforeAbilitiesRender();

  if(tab==='Skills'){
    document.getElementById('main')
      .insertAdjacentHTML('afterbegin',sdAbilitiesPanel());
  }
};

const sdBeforeRecruitAction=recruitAction;

recruitAction=function(id,action){
  if(action!=='Scout'){
    return sdBeforeRecruitAction(id,action);
  }

  let r=S.recruits.find(z=>z.id===id);
  if(!r)return;

  let cost=sdScoutingCost(user(),r.pos);

  if(S.hours<cost){
    return alert('Not enough scouting hours');
  }

  S.hours-=cost;
  r.scout=Math.min(100,r.scout+35);
  r.target=true;
  save();
  showRecruit(id);
};

const sdBeforeSimGame=simGame;

simGame=function(g){
  let was=g.played;
  let result=sdBeforeSimGame(g);

  if(was||!g.played)return result;

  let winner=S.teams[g.sa>g.sb?g.a:g.b];
  let loser=S.teams[g.sa>g.sb?g.b:g.a];

  for(let [t,won] of [[winner,true],[loser,false]]){
    let h=c(t.coach);
    let oc=c(t.oc);
    let dc=c(t.dc);

    for(let x of [h,oc,dc]){
      if(x&&x.id!==S.user){
        sdAwardXP(
          x,
          won?(x.role==='HC'?40:20):5,
          won?'Victory':'Game coached'
        );
      }
    }
  }

  return result;
};

const sdBeforeEndSeason=endSeason;

endSeason=function(){
  sdBeforeEndSeason();

  for(let x of S.coaches){
    if(!x.retired&&x.role!=='HC'){
      sdCoachInit(x);
      sdAwardXP(x,100,'Season completed');
    }
  }
};
