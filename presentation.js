
const oldRender=render;
render=function(){
  oldRender();
  if(tab==='Hall of Fame'){
    let p=document.querySelector('#main .muted');
    if(p)p.textContent='Historical coach records are provisional unless explicitly verified. Missing pre-2026 bowl, conference, recruiting and playoff records are unverified; the current scoring engine treats these as zero, so historical legacy totals are not yet fair comparisons. Simulated records accumulate separately.';
  }
  if(tab==='Office'){
    let a=audit();
    document.getElementById('main').insertAdjacentHTML('beforeend',`<div class="card"><b>Simulation Integrity</b><p>${a.schools} schools · ${a.realHeadCoaches} real-name HC seeds · ${a.seasons} completed seasons · ${a.passed?'PASS':'CHECK ISSUES'}</p><button onclick="runAudit()">Run Audit</button></div>`);
  }
}

function spotlight(type,eyebrow,headline,detail){
  let el=document.getElementById('spotlight');
  if(!el)return;
  let trophy=type==='sign'?'✦':type==='career'?'★':'🏆';
  el.className='spotlight';
  el.innerHTML=`<div class="trophy">${trophy}</div><div class="eyebrow">${esc(eyebrow)}</div><div class="hero">${esc(headline)}</div><div class="detail">${esc(detail)}</div><button onclick="document.getElementById('spotlight').close()">Continue Dynasty</button>`;
  if(!el.open)el.showModal();
}

function startNewDynasty(){
  let choice=prompt('Choose dynasty mode: type SIM for traditional simulation, or ARCADE for custom coaches and players. Existing progress will be replaced.','SIM');
  if(choice===null)return;
  choice=choice.trim().toUpperCase();
  if(!['SIM','ARCADE'].includes(choice))return alert('Enter SIM or ARCADE.');
  if(!confirm('Replace your current dynasty? Export your save first if you want to keep it.'))return;
  S=create();
  S.mode=choice==='ARCADE'?'arcade':'simulation';
  S.ended=false;
  S.yearLimit=35;
  tab='Office';
  save();
  if(S.mode==='arcade')setTimeout(showCreator,50);
}

function showCreator(){
  if(S.mode!=='arcade')return;
  let el=document.getElementById('modal');
  el.innerHTML=`<div class="creator"><div class="row"><h2>Arcade Creator</h2><button onclick="document.getElementById('modal').close()">Close</button></div><p>Create a coach or add a custom player to your roster. These are fictional arcade entries.</p><h3>Create a Coach</h3><label>Name<input id="customCoach" maxlength="48" placeholder="Coach name"></label><label>Coaching ability (50–99)<input id="coachAbility" type="number" min="50" max="99" value="85"></label><button onclick="makeCustomCoach()">Replace My Coach Identity</button><hr><h3>Create a Player</h3><label>Name<input id="customPlayer" maxlength="48" placeholder="Player name"></label><label>Position<select id="customPosition">${[...new Set(positions)].map(p=>`<option>${p}</option>`).join('')}</select></label><label>Overall (40–99)<input id="customOvr" type="number" min="40" max="99" value="90"></label><label>Year (1–4)<input id="customYear" type="number" min="1" max="4" value="1"></label><button onclick="makeCustomPlayer()">Add Custom Player</button></div>`;
  el.showModal();
}

function makeCustomCoach(){
  let name=document.getElementById('customCoach').value.trim();
  let rating=Number(document.getElementById('coachAbility').value);
  if(!name||!Number.isInteger(rating)||rating<50||rating>99)return alert('Enter a name and ability between 50 and 99.');
  let u=user();
  u.name=name;
  u.skill=rating;
  u.custom=true;
  u.realName=false;
  u.source='Arcade created coach';
  save();
  alert('Created coach: '+name);
}

function makeCustomPlayer(){
  let name=document.getElementById('customPlayer').value.trim();
  let ovr=Number(document.getElementById('customOvr').value);
  let yr=Number(document.getElementById('customYear').value);
  let pos=document.getElementById('customPosition').value;
  if(!name||!Number.isInteger(ovr)||ovr<40||ovr>99||!Number.isInteger(yr)||yr<1||yr>4)return alert('Check the name, rating and class year.');
  let p=player(pos,yr,ovr);
  p.name=name;
  p.ovr=ovr;
  p.pot=99;
  p.dev='Elite';
  p.custom=true;
  team().roster.push(p);
  if(team().roster.length>95){
    let idx=team().roster.findIndex(x=>!x.custom);
    if(idx>=0)team().roster.splice(idx,1);
  }
  save();
  alert(name+' added to '+team().name);
}

const beforeRenderV7=render;
render=function(){
  beforeRenderV7();
  let el=document.getElementById('main');
  if(tab==='Office'){
    el.insertAdjacentHTML('afterbegin',`<div class="card ${S.mode==='arcade'?'arcade':'mode'}"><div class="row"><div><b>${S.mode==='arcade'?'ARCADE DYNASTY':'SIMULATION DYNASTY'}</b><p class="muted">Career season ${Math.min(35,(user().simSeasons||0)+1)} of 35 ${S.ended?'· RETIRED':''}</p></div>${S.mode==='arcade'?'<button onclick="showCreator()">Create Coach / Player</button>':''}</div></div>`);
    if(S.ended){
      let b=el.querySelector('button[onclick="advance()"]');
      if(b)b.disabled=true;
    }
  }
  if(tab==='Hall of Fame'){
    let h=el.querySelector('h2');
    if(h)h.insertAdjacentHTML('afterend','<p class="muted">Simulated head coaches retire after 35 completed seasons. Historical careers are preserved without retroactively shortening them. Missing historical statistics remain unverified.</p>');
  }
}

function arcadeSettings(){
  if(S.mode!=='arcade')return;
  let a=S.arcade||{recruiting:2,development:2,gameBoost:0};
  let el=document.getElementById('modal');
  el.innerHTML=`<h2>Arcade Rules</h2><p class="muted">These modifiers affect your team only and do not alter historical coaching records.</p><label>Recruiting power (0–5)<input id="arcRecruit" type="number" min="0" max="5" value="${a.recruiting}"></label><label>Offseason development boost (0–5)<input id="arcDevelop" type="number" min="0" max="5" value="${a.development}"></label><label>Game-day strength bonus (0–20)<input id="arcGame" type="number" min="0" max="20" value="${a.gameBoost}"></label><div class="row"><button onclick="saveArcadeSettings()">Apply Rules</button><button onclick="document.getElementById('modal').close()">Close</button></div>`;
  if(!el.open)el.showModal();
}

function saveArcadeSettings(){
  let read=(id,max)=>Math.max(0,Math.min(max,Math.round(Number(document.getElementById(id).value)||0)));
  S.arcade={
    recruiting:read('arcRecruit',5),
    development:read('arcDevelop',5),
    gameBoost:read('arcGame',20)
  };
  document.getElementById('modal').close();
  save();
}

const baselineExpected=expected;
expected=function(t){
  return baselineExpected(t)+(S?.mode==='arcade'&&t.id===team().id?(S.arcade?.gameBoost||0):0);
};

const baselineInfluence=influence;
influence=function(r,t){
  return baselineInfluence(r,t)+(S?.mode==='arcade'&&t.id===team().id?(S.arcade?.recruiting||0)*5:0);
};

const baselineEndSeason=endSeason;
endSeason=function(){
  let previous=S.year;
  baselineEndSeason();
  if(S.mode==='arcade'&&S.year!==previous){
    let bonus=S.arcade?.development||0;
    if(bonus){
      for(const p of team().roster){
        p.ovr=Math.min(p.pot,p.ovr+bonus);
      }
    }
  }
};

const renderArcade=render;
render=function(){
  renderArcade();
  if(tab==='Office'&&S.mode==='arcade'){
    document.getElementById('main').insertAdjacentHTML('afterbegin','<div class="card arcade"><b>ARCADE CONTROL ROOM</b><p class="muted">Create a coach, create players, or tune your dynasty power level.</p><div class="row"><button onclick="showCreator()">Create Coach / Player</button><button onclick="arcadeSettings()">Arcade Rules</button></div></div>');
  }
};
