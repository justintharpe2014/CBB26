
/* Saturday Dynasty — coaching goals and assistant recruiting. */

const SD_OFFENSE=new Set([
  'QB','HB','RB','WR','TE','OT','OG','C'
]);

const SD_DEFENSE=new Set([
  'DE','DT','OLB','MLB','CB','FS','SS','DB'
]);

function sdSide(pos){
  return SD_OFFENSE.has(pos)
    ?'OC'
    :SD_DEFENSE.has(pos)
      ?'DC'
      :'HC';
}

function sdGoalInit(x){
  if(!x.goals||x.goals.year!==S.year){
    let t=S.teams[x.teamId];
    let last=t?.history?.at(-1);

    let wins=last?.w??(t?.prestige>=4?7:4);

    x.goals={
      year:S.year,
      awarded:[],
      baseWins:wins,
      goals:x.role==='HC'
        ?[
          {
            id:'wins',
            label:`Win ${Math.max(3,Math.min(11,wins))} games`,
            target:Math.max(3,Math.min(11,wins)),
            xp:160
          },
          {
            id:'recruits',
            label:'Sign 3 players at positions of need',
            target:3,
            xp:90
          },
          {
            id:'bowl',
            label:'Reach a bowl game',
            target:1,
            xp:100
          }
        ]
        :[
          {
            id:'wins',
            label:'Contribute to 5 team victories',
            target:5,
            xp:70
          },
          {
            id:'recruits',
            label:`Sign 2 ${x.role==='OC'?'offensive':'defensive'} prospects`,
            target:2,
            xp:100
          },
          {
            id:'development',
            label:'Develop 1 player on your side of the ball',
            target:1,
            xp:80
          }
        ]
    };
  }

  return x.goals;
}

function sdGoalProgress(x,g){
  let t=S.teams[x.teamId];
  if(!t)return 0;

  if(g.id==='wins'){
    return t.wins;
  }

  if(g.id==='bowl'){
    return Number(t.wins>=6);
  }

  if(g.id==='recruits'){
    return S.recruits.filter(r=>
      r.committed===t.id&&
      (x.role==='HC'||sdSide(r.pos)===x.role)
    ).length;
  }

  if(g.id==='development'){
    return t.roster.filter(p=>
      sdSide(p.pos)===x.role&&
      p.growthYear===S.year&&
      p.growthAmount>=4
    ).length;
  }

  return 0;
}

function sdCheckGoals(x){
  if(!x||x.retired||x.teamId==null)return;

  let state=sdGoalInit(x);

  for(let g of state.goals){
    if(
      state.awarded.includes(g.id)||
      sdGoalProgress(x,g)<g.target
    )continue;

    state.awarded.push(g.id);

    sdAwardXP(
      x,
      g.xp,
      'Goal: '+g.label
    );

    x.prestigePoints=(x.prestigePoints||0)+
      Math.ceil(g.xp/5);

    if(x.id===S.user){
      addNews(
        `GOAL COMPLETED: ${g.label} (+${g.xp} XP)`
      );
    }
  }
}

function sdGoalsPanel(){
  let t=team();
  let u=user();

  let staff=[
    u,
    c(t.oc),
    c(t.dc)
  ].filter(Boolean);

  return `
    <div class="card">
      <h2>Coaching Goals & AD Expectations</h2>

      <p class="muted">
        Goals scale by coaching role.
        Coordinators earn XP and spend Coach Points
        independently.
      </p>

      ${staff.map(x=>{
        let st=sdGoalInit(x);

        return `
          <details class="card" ${x.id===u.id?'open':''}>
            <summary>
              <b>${esc(x.role)} · ${esc(x.name)}</b>
              · Level ${x.level}
              · ${x.points} CP
            </summary>

            ${st.goals.map(g=>{
              let progress=sdGoalProgress(x,g);
              let done=st.awarded.includes(g.id);

              return `
                <p>
                  ${done?'✓':'○'}
                  ${esc(g.label)}
                  —
                  ${Math.min(progress,g.target)}/${g.target}
                  · +${g.xp} XP
                </p>
              `;
            }).join('')}
          </details>
        `;
      }).join('')}
    </div>
  `;
}

function sdRecruitStrategy(){
  S.assist=S.assist||{
    mode:'assisted',
    ocBudget:200,
    dcBudget:200
  };

  return S.assist;
}

function sdSetAssist(mode){
  if(![
    'manual',
    'assisted',
    'delegated'
  ].includes(mode))return;

  sdRecruitStrategy().mode=mode;
  save();
}

function sdAssistedRecruit(){
  let cfg=sdRecruitStrategy();

  if(cfg.mode==='manual')return;

  for(let t of S.teams){
    let isUser=t.id===team().id;

    if(isUser&&cfg.mode==='assisted'){
      continue;
    }

    let needs=typeof sdNeeds==='function'
      ?sdNeeds(t).sort((a,b)=>b.need-a.need)
      :[];

    let count=0;

    for(let need of needs){
      if(need.need<=0||count>=3)break;

      let options=S.recruits.filter(r=>
        r.committed===null&&
        r.pos===need.pos&&
        (!isUser||!r.offer)
      ).sort((a,b)=>{
        let ia=influence(a,t);
        let ib=influence(b,t);

        return (
          ib+Math.max(0,5-b.stars)*4
        )-(
          ia+Math.max(0,5-a.stars)*4
        );
      });

      for(let r of options.slice(
        0,
        Math.min(need.need,2)
      )){
        let side=sdSide(r.pos);

        let staff=c(
          t[
            side==='OC'
              ?'oc'
              :side==='DC'
                ?'dc'
                :'coach'
          ]
        );

        let amount=Math.max(
          2,
          Math.round((staff?.recruit||55)/15)
        );

        r.interest[t.id]=influence(r,t)+amount;

        if(isUser){
          r.offer=true;
          r.target=true;
          r.assigned=side.toLowerCase();
        }

        count++;

        if(count>=3)break;
      }
    }
  }
}

const sdGoalsBeforeRender=render;

render=function(){
  sdGoalsBeforeRender();

  if(tab==='Office'){
    document.getElementById('main')
      .insertAdjacentHTML(
        'beforeend',
        sdGoalsPanel()
      );
  }

  if(tab==='Recruiting'){
    let cfg=sdRecruitStrategy();

    document.getElementById('main')
      .insertAdjacentHTML(
        'afterbegin',
        `<div class="card">
          <b>Assistant Recruiting</b>

          <p>
            Manual: no delegation ·
            Assisted: staff recommendations and assigned targets ·
            Delegated: assistants pursue positional needs automatically.
          </p>

          <select onchange="sdSetAssist(this.value)">
            ${[
              'manual',
              'assisted',
              'delegated'
            ].map(m=>`
              <option
                value="${m}"
                ${cfg.mode===m?'selected':''}>
                ${m[0].toUpperCase()+m.slice(1)}
              </option>
            `).join('')}
          </select>
        </div>`
      );
  }
};

const sdGoalsBeforeRecruitWeek=recruitWeek;

recruitWeek=function(){
  sdAssistedRecruit();
  sdGoalsBeforeRecruitWeek();

  for(let x of S.coaches){
    sdCheckGoals(x);
  }
};

const sdGoalsBeforeEndSeason=endSeason;

endSeason=function(){
  for(let x of S.coaches){
    if(!x.retired&&x.teamId!=null){
      sdCheckGoals(x);
    }
  }

  sdGoalsBeforeEndSeason();
};
