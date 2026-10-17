
/* Saturday Dynasty — final systems integration */

function sdStaffFor(t,pos){
  return [
    c(t.coach),
    c(t[
      sdSide(pos)==='OC'?'oc':
      sdSide(pos)==='DC'?'dc':'coach'
    ])
  ].filter(Boolean);
}

function sdBonus(t,e,pos){
  let total=sdStaffFor(t,pos).reduce(
    (v,x)=>v+sdEffect(x,e,pos),0
  );
  return Math.min(.55,total*.72);
}

/* Coaching abilities affect game strength. */

const sdBaseExpected=expected;

expected=function(t){
  let base=sdBaseExpected(t);

  let offense=[
    'QB','HB','WR','TE','OT','OG','C'
  ].reduce(
    (v,p)=>v+
      sdBonus(t,'scheme',p)+
      sdBonus(t,'matchup',p),0
  )/7;

  let defense=[
    'DE','DT','OLB','MLB','CB','FS','SS'
  ].reduce(
    (v,p)=>v+
      sdBonus(t,'scheme',p)+
      sdBonus(t,'matchup',p),0
  )/7;

  return base+Math.min(5,(offense+defense)*5);
};

/* Recruiting abilities affect prospect interest. */

const sdBaseInfluence=influence;

influence=function(r,t){
  let value=sdBaseInfluence(r,t);

  if(!r.sdBoosted)r.sdBoosted={};

  if(!r.sdBoosted[t.id]){
    let bump=Math.round(
      sdBonus(t,'initial',r.pos)*16+
      sdBonus(t,'pipeline',r.pos)*12
    );

    r.interest[t.id]=value+bump;
    r.sdBoosted[t.id]=true;

    return value+bump;
  }

  return value;
};

const sdBaseRecruitAction2=recruitAction;

recruitAction=function(id,action){
  let r=S.recruits.find(x=>x.id===id);
  if(!r)return;

  let t=team();

  if(action==='Scout'){
    return sdBaseRecruitAction2(id,action);
  }

  let before=influence(r,t);

  sdBaseRecruitAction2(id,action);

  if(['Contact','Pitch'].includes(action)){
    let after=influence(r,t);

    r.interest[t.id]=after+Math.round(
      Math.max(0,after-before)*
      sdBonus(t,'influence',r.pos)
    );
  }
};

/* Scholarship offer limits. */

const sdBaseOffer=offer;

offer=function(id){
  let r=S.recruits.find(x=>x.id===id);
  if(!r)return;

  let outstanding=S.recruits.filter(
    z=>z.offer&&z.committed===null
  ).length;

  if(!r.offer&&outstanding>=35){
    return alert(
      'Maximum 35 outstanding scholarship offers.'
    );
  }

  sdBaseOffer(id);
};

/* AI recruiting uses positional roster needs. */

function sdAIRecruitPlan(){
  for(let t of S.teams){
    if(
      t.id===team().id&&
      sdRecruitStrategy().mode!=='delegated'
    )continue;

    let needs=sdNeeds(t)
      .filter(n=>n.need>0)
      .sort((a,b)=>b.need-a.need);

    let signed=S.recruits.filter(
      r=>r.committed===t.id
    ).length;

    if(signed>=25)continue;

    let available=25-signed;

    for(let need of needs.slice(0,3)){
      if(available<=0)break;

      let candidates=S.recruits
        .filter(r=>
          r.committed===null&&
          sdPosition(r.pos)===need.pos
        )
        .sort((a,b)=>{
          let first=influence(a,t)+a.stars*4;
          let second=influence(b,t)+b.stars*4;
          return second-first;
        });

      for(let r of candidates.slice(
        0,Math.min(need.need,1,available)
      )){
        let side=sdSide(r.pos);

        let staff=c(t[
          side==='OC'?'oc':
          side==='DC'?'dc':'coach'
        ]);

        let delta=Math.max(
          1,
          Math.round(
            (staff?.recruit||55)/20*
            (1+sdBonus(t,'influence',r.pos))
          )
        );

        r.interest[t.id]=influence(r,t)+delta;
        available--;

        if(t.id===team().id){
          r.target=true;
          r.offer=true;
          r.assigned=side.toLowerCase();
        }
      }
    }
  }
}

/* Replace the earlier assistant recruiting routine. */

sdAssistedRecruit=sdAIRecruitPlan;

/* Award-related coaching development. */

function sdCoachAward(t,p,kind){
  for(let x of sdStaffFor(t,p.pos)){
    if(
      x.role==='HC'||
      sdSide(p.pos)===x.role
    ){
      sdAwardXP(
        x,
        kind==='heisman'?200:90,
        kind+' award'
      );

      x.prestigePoints=
        (x.prestigePoints||0)+25;

      x.awardsCoached=
        (x.awardsCoached||0)+1;
    }
  }
}

const sdBaseHonors=sdHonors;

sdHonors=function(year){
  let before=sdInit().awards.length;

  sdBaseHonors(year);

  if(sdInit().awards.length>before){
    let award=sdInit().awards.at(-1);

    let t=S.teams.find(
      t=>t.name===award.school
    );

    if(t){
      sdCoachAward(
        t,
        {pos:award.pos},
        'heisman'
      );
    }
  }
};

/* Offseason player development. */

function sdDevelopment(t,old){
  let lookup=new Map(
    old.map(p=>[p.id,p])
  );

  for(let p of t.roster){
    let previous=lookup.get(p.id);
    if(!previous)continue;

    let growth=Math.max(
      0,p.ovr-previous.ovr
    );

    let coachBonus=
      sdBonus(t,'training',p.pos)+
      sdBonus(t,'potential',p.pos);

    let extra=Math.min(
      3,
      Math.floor(coachBonus*7)
    );

    p.ovr=Math.min(
      p.pot,p.ovr+extra
    );

    p.growthYear=S.year-1;

    p.growthAmount=
      growth+
      (p.ovr-(previous.ovr+growth));

    if(p.growthAmount>=4){
      for(let x of sdStaffFor(t,p.pos)){
        if(
          x.role==='HC'||
          sdSide(p.pos)===x.role
        ){
          sdAwardXP(
            x,12,'Player development'
          );
        }
      }
    }
  }
}

/* Athletic director expectations and approval. */

function sdADState(t){
  if(!t.ad){
    t.ad={
      approval:65,
      history:[],
      expectation:Math.max(
        3,
        Math.min(
          11,
          Math.round(t.prestige*1.6+1)
        )
      )
    };
  }

  return t.ad;
}

function sdEvaluateAD(t,record,year){
  let ad=sdADState(t);
  let hc=c(t.coach);
  let target=ad.expectation;

  let delta=
    (record.w-target)*5+
    (record.w>=6?4:0)+
    (record.w>=10?6:0);

  ad.approval=Math.max(
    0,
    Math.min(100,ad.approval+delta)
  );

  ad.history.push({
    year,
    wins:record.w,
    target,
    change:delta,
    approval:ad.approval
  });

  ad.expectation=Math.max(
    3,
    Math.min(
      11,
      Math.round(
        (target*2+record.w)/3
      )
    )
  );

  if(hc){
    hc.adApproval=ad.approval;

    hc.prestigePoints=
      (hc.prestigePoints||0)+
      Math.max(0,record.w-target)*12;
  }
}

/* Wrap the offseason without replacing prior systems. */

const sdBaseEndSeasonFinal=endSeason;

endSeason=function(){
  let year=S.year;

  let old=S.teams.map(
    t=>t.roster.map(
      p=>({id:p.id,ovr:p.ovr})
    )
  );

  sdBaseEndSeasonFinal();

  if(!S.seasonHistory.some(
    y=>y.year===year
  ))return;

  for(let t of S.teams){
    sdDevelopment(t,old[t.id]);

    let record=t.history.find(
      h=>h.year===year
    );

    if(record){
      sdEvaluateAD(t,record,year);
    }
  }

  for(let x of S.coaches){
    if(x.retired||x.teamId==null)continue;

    sdCheckGoals(x);

    if(x.role!=='HC'){
      x.simSeasons=(x.simSeasons||0)+1;
      x.age=(x.age||40)+1;

      if(x.simSeasons>=35){
        x.retired=true;
        x.retirementReason=
          '35-season career limit';

        let t=S.teams[x.teamId];

        if(t){
          let key=
            t.oc===x.id?'oc':
            t.dc===x.id?'dc':null;

          if(key){
            let replacement=coach(
              nm(),
              key.toUpperCase(),
              t.id
            );

            S.coaches.push(replacement);
            t[key]=replacement.id;
          }

          x.teamId=null;
        }
      }
    }
  }
};

/* Coaching carousel and AD dismissals. */

const sdBaseCarouselFinal=carousel;

carousel=function(){
  sdBaseCarouselFinal();

  for(let t of S.teams){
    let hc=c(t.coach);
    let ad=sdADState(t);

    if(
      !hc||
      hc.id===S.user||
      hc.retired||
      ad.approval>=20
    )continue;

    hc.retired=true;
    hc.retirementReason=
      'Dismissed by athletic director';
    hc.teamId=null;

    let candidates=S.coaches.filter(
      x=>
        !x.retired&&
        x.role!=='HC'&&
        x.teamId!==t.id&&
        x.simSeasons<35
    ).sort(
      (a,b)=>
        (b.prestigePoints||0)-
        (a.prestigePoints||0)||
        b.skill-a.skill
    );

    let hire=candidates[0];

    if(hire){
      let previous=S.teams[hire.teamId];

      let key=
        previous?.oc===hire.id?'oc':
        previous?.dc===hire.id?'dc':null;

      if(key){
        let replacement=coach(
          nm(),
          key.toUpperCase(),
          previous.id
        );

        S.coaches.push(replacement);
        previous[key]=replacement.id;
      }

      hire.role='HC';
      hire.teamId=t.id;

      hire.mentorId=
        hire.mentorId||previous?.coach;
    }else{
      hire=coach(nm(),'HC',t.id);
      S.coaches.push(hire);
    }

    t.coach=hire.id;
    ad.approval=65;

    addNews(
      `${t.name} athletic director hired ${hire.name}`
    );
  }
};

/* Show AD approval in the coaching goals panel. */

const sdBaseGoalsPanelFinal=sdGoalsPanel;

sdGoalsPanel=function(){
  let t=team();
  let ad=sdADState(t);

  return `
    <div class="card">
      <h2>Athletic Director</h2>

      <p>
        Job approval:
        <b>${ad.approval}/100</b>
        · Current win expectation:
        <b>${ad.expectation}</b>
      </p>

      <p class="muted">
        Approval responds to wins versus program
        expectations. Approval below 20 may lead
        to dismissal during the coaching carousel.
      </p>
    </div>
  `+sdBaseGoalsPanelFinal();
};
