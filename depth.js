
/* Saturday Dynasty — depth charts, eligibility, staff and awards */
const SD_POS=['QB','HB','WR','TE','OT','OG','C','DE','DT','OLB','MLB','CB','FS','SS','K','P'];

function sdInit(){
  if(!S.management)S.management={
    awards:[],transfers:[],staffMoves:[],records:[],
    depth:{},redshirts:[],injuries:[],portalYear:0
  };
  return S.management;
}

function sdDepth(){
  let m=sdInit(),t=team();
  let cards=SD_POS.map(pos=>{
    let ps=t.roster.filter(p=>p.pos===pos).sort((a,b)=>b.ovr-a.ovr);
    let pinned=m.depth[t.id+':'+pos];
    if(pinned){
      let k=ps.findIndex(p=>p.id===pinned);
      if(k>0)ps.unshift(...ps.splice(k,1));
    }
    return `<div class="card">
      <h3>${pos} · ${ps.length} players</h3>
      ${ps.slice(0,5).map((p,i)=>`<div class="row">
        <span>${i===0?'★ ':''}${esc(p.name)} · ${p.ovr} OVR · Y${p.yr}${p.redshirt?' · RS':''}${p.injury?' · INJ':''}</span>
        <button onclick="sdPin('${pos}','${p.id}')">Start</button>
        <button onclick="sdRedshirt('${p.id}')">${p.redshirt?'Undo RS':'Redshirt'}</button>
      </div>`).join('')}
    </div>`;
  }).join('');
  return `<h2>Depth Chart & Eligibility</h2>
    <p class="muted">Choose starters and redshirt eligible players. Redshirts preserve a season of eligibility when unused.</p>
    <div class="grid">${cards}</div>`;
}

function sdPin(pos,pid){
  let p=team().roster.find(p=>p.id===pid&&p.pos===pos);
  if(!p)return;
  sdInit().depth[team().id+':'+pos]=pid;
  save();
}

function sdRedshirt(pid){
  let p=team().roster.find(p=>p.id===pid);
  if(!p)return;
  if(!p.redshirt&&p.used)return alert('This player has already used a redshirt season.');
  p.redshirt=!p.redshirt;
  save();
}

function sdStaff(){
  let t=team(),m=sdInit();
  let available=S.coaches.filter(x=>!x.retired&&x.role!=='HC'&&x.teamId!==t.id)
    .sort((a,b)=>b.skill-a.skill).slice(0,12);
  return `<h2>Staff Hiring & Development</h2>
    <div class="grid">${['oc','dc'].map(role=>{
      let x=c(t[role]);
      return `<div class="card">
        <h3>${role.toUpperCase()}: ${esc(x?.name||'Vacant')}</h3>
        <p>Ability ${x?.skill||0} · Recruiting ${x?.recruit||0} · Development ${x?.develop||0}</p>
        <p>Scheme ${esc(x?.scheme||'Multiple')} · Pipeline ${esc(x?.pipeline||'—')}</p>
      </div>`;
    }).join('')}</div>
    <h3>Assistant Coach Market</h3>
    <p class="muted">Hiring a coordinator fills the former vacancy with a generated assistant. Existing coaches can be promoted by AI in the carousel.</p>
    <section><table>
      <tr><th>Coach</th><th>Rating</th><th>Role</th><th>Hire</th></tr>
      ${available.map(x=>`<tr>
        <td>${esc(x.name)}</td><td>${x.skill}</td><td>${x.role}</td>
        <td><button onclick="sdHire('${x.id}','oc')">OC</button>
        <button onclick="sdHire('${x.id}','dc')">DC</button></td>
      </tr>`).join('')}
    </table></section>
    <h3>Recent Staff Moves</h3>
    ${m.staffMoves.slice(-15).reverse().map(x=>`<p>${esc(x)}</p>`).join('')||'<p>None yet.</p>'}`;
}

function sdHire(cid,role){
  let x=c(cid),t=team();
  if(!x||x.retired||x.role==='HC'||x.teamId===t.id)return;
  let oldTeam=S.teams.find(z=>z.oc===x.id||z.dc===x.id);
  if(oldTeam){
    let oldRole=oldTeam.oc===x.id?'oc':'dc';
    let replacement=coach(nm(),oldRole.toUpperCase(),oldTeam.id);
    S.coaches.push(replacement);
    oldTeam[oldRole]=replacement.id;
  }
  let previous=c(t[role]);
  if(previous){
    previous.retired=true;
    previous.teamId=null;
  }
  x.role=role.toUpperCase();
  x.teamId=t.id;
  t[role]=x.id;
  sdInit().staffMoves.push(`${S.year}: ${t.name} hired ${x.name} as ${role.toUpperCase()}`);
  addNews(`${t.name} hired ${x.name} as ${role.toUpperCase()}`);
  save();
}

function sdPortal(){
  let m=sdInit(),t=team();
  let options=m.transfers.filter(x=>x.year===S.year&&x.to===null&&x.from!==t.id)
    .sort((a,b)=>b.ovr-a.ovr).slice(0,60);
  return `<h2>Transfer Portal · ${S.year}</h2>
    <div class="grid">
      ${box('Portal Players',options.length)}
      ${box('Your Roster',t.roster.length)}
      ${box('NIL Budget','$'+(t.nil||0)+'k')}
    </div>
    <p class="muted">The portal opens each offseason. Transfers require NIL budget and available roster space.</p>
    <section><table>
      <tr><th>Player</th><th>Position</th><th>OVR</th><th>Former School</th><th>NIL</th><th>Action</th></tr>
      ${options.map(x=>`<tr>
        <td>${esc(x.name)}</td><td>${x.pos}</td><td>${x.ovr}</td>
        <td>${esc(S.teams[x.from]?.name||'Unknown')}</td>
        <td>$${x.cost}k</td>
        <td><button onclick="sdTakeTransfer('${x.id}')">Recruit</button></td>
      </tr>`).join('')}
    </table></section>`;
}

function sdTakeTransfer(id){
  let m=sdInit();
  let x=m.transfers.find(x=>x.id===id&&x.year===S.year&&x.to===null);
  if(!x)return;
  let t=team();
  if(t.roster.length>=95)return alert('Roster full.');
  if((t.nil||0)<x.cost)return alert('Not enough NIL budget.');
  let from=S.teams[x.from];
  let idx=from.roster.findIndex(p=>p.id===id);
  if(idx<0)return alert('Player no longer available.');
  let p=from.roster.splice(idx,1)[0];
  t.roster.push(p);
  t.nil-=x.cost;
  x.to=t.id;
  addNews(`TRANSFER: ${p.name} joins ${t.name} from ${from.name}`);
  save();
}

function sdMakePortal(){
  let m=sdInit();
  if(m.portalYear===S.year)return;
  m.portalYear=S.year;
  m.transfers=[];
  for(let t of S.teams){
    let eligible=t.roster.filter(p=>p.yr<=3&&!p.custom)
      .sort((a,b)=>b.ovr-a.ovr);
    let count=Math.min(3,Math.max(0,Math.floor(eligible.length/30)));
    for(let p of eligible.slice(0,count)){
      if(Math.random()<.68){
        m.transfers.push({
          id:p.id,name:p.name,pos:p.pos,ovr:p.ovr,
          from:t.id,to:null,year:S.year,
          cost:Math.max(25,Math.round(p.ovr*2+rnd(-30,80)))
        });
      }
    }
  }
}

function sdHonors(year){
  let m=sdInit(),last=S.seasonHistory.at(-1);
  if(!last||m.awards.some(x=>x.year===year))return;
  let candidates=S.teams.flatMap(t=>t.roster.map(p=>({
    p,t,score:p.ovr*1.7+(p.stats?.yards||0)*.03+(p.stats?.td||0)*3
  })));
  candidates.sort((a,b)=>b.score-a.score);
  let winner=candidates[0];
  if(!winner)return;
  let award={
    year,name:winner.p.name,school:winner.t.name,
    pos:winner.p.pos,ovr:winner.p.ovr,coach:winner.t.coach
  };
  m.awards.push(award);
  let hc=c(winner.t.coach);
  if(hc)hc.career.heisman=(hc.career.heisman||0)+1;
  addNews(`${year} Player of the Year: ${award.name} (${award.school})`);
  if(winner.t.id===team().id){
    spotlight('sign','PLAYER OF THE YEAR',award.name,`${award.school} · ${award.pos}`);
  }
  m.records.push({
    year,champion:last.champion,heisman:award.name
  });
}

const sdOriginalEnd=endSeason;
endSeason=function(){
  let year=S.year;
  sdInit();
  sdOriginalEnd();
  if(S.seasonHistory.some(x=>x.year===year)){
    sdHonors(year);
    sdMakePortal();
    for(let t of S.teams){
      t.nil=Math.min(4000,(t.nil||0)+t.prestige*100);
      for(let p of t.roster){
        if(p.redshirt){
          p.yr=Math.max(1,p.yr-1);
          p.used=true;
          p.redshirt=false;
        }
      }
    }
  }
};

const sdOriginalNav=nav;
nav=function(){
  sdOriginalNav();
  const n=document.getElementById('nav');
  n.insertAdjacentHTML('beforeend',
    ['Depth Chart','Transfer Portal','Staff Market','Awards']
      .map(x=>`<button class="${tab===x?'active':''}" onclick="tab='${x}';render()">${x}</button>`)
      .join('')
  );
};

const sdOriginalRender=render;
render=function(){
  sdInit();
  sdOriginalRender();
  let main=document.getElementById('main');
  if(tab==='Depth Chart')main.innerHTML=sdDepth();
  if(tab==='Transfer Portal')main.innerHTML=sdPortal();
  if(tab==='Staff Market')main.innerHTML=sdStaff();
  if(tab==='Awards'){
    main.innerHTML=`<h2>National Awards & Coaching Legacy</h2>
      <section><table>
        <tr><th>Season</th><th>Player of the Year</th><th>School</th><th>Position</th></tr>
        ${sdInit().awards.slice().reverse().map(x=>`<tr>
          <td>${x.year}</td><td>${esc(x.name)}</td>
          <td>${esc(x.school)}</td><td>${x.pos}</td>
        </tr>`).join('')}
      </table></section>
      <p class="muted">Award selections are simulation-generated, not actual historical awards.</p>`;
  }
};
