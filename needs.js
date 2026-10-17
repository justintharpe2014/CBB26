
/* Position-based scholarship roster planning and recruiting needs. */

const SD_ROSTER_TARGETS=Object.freeze({
  QB:4,
  HB:5,
  WR:12,
  TE:5,
  OT:7,
  OG:7,
  C:3,
  DE:7,
  DT:6,
  OLB:6,
  MLB:4,
  CB:8,
  FS:4,
  SS:4,
  K:1,
  P:2
});

const SD_POSITION_NAMES={
  QB:'Quarterback',
  HB:'Running Back',
  WR:'Wide Receiver',
  TE:'Tight End',
  OT:'Offensive Tackle',
  OG:'Offensive Guard',
  C:'Center',
  DE:'Defensive End',
  DT:'Defensive Tackle',
  OLB:'Outside Linebacker',
  MLB:'Middle Linebacker',
  CB:'Cornerback',
  FS:'Free Safety',
  SS:'Strong Safety',
  K:'Kicker',
  P:'Punter'
};

const SD_ROSTER_SIZE=Object.values(SD_ROSTER_TARGETS)
  .reduce((a,b)=>a+b,0);

function sdPosition(p){
  return p==='RB'?'HB':
         p==='DB'?'CB':
         p==='OL'?'OG':p;
}

function sdRosterCount(t,pos){
  return t.roster.filter(
    p=>sdPosition(p.pos)===pos
  ).length;
}

function sdRosterNeed(t,pos){
  const current=sdRosterCount(t,pos);

  const leaving=t.roster.filter(
    p=>sdPosition(p.pos)===pos&&p.yr>=4
  ).length;

  const committed=S.recruits.filter(
    r=>r.committed===t.id&&sdPosition(r.pos)===pos
  ).length;

  return {
    pos,
    target:SD_ROSTER_TARGETS[pos],
    current,
    leaving,
    committed,
    projected:current-leaving+committed,
    need:Math.max(
      0,
      SD_ROSTER_TARGETS[pos]-
      (current-leaving+committed)
    )
  };
}

function sdNeeds(t){
  return Object.keys(SD_ROSTER_TARGETS)
    .map(pos=>sdRosterNeed(t,pos));
}

function sdRosterBalance(t){
  // Preserve recruited players where possible.
  // Remove excess players with the lowest ratings first.

  for(const [pos,desired] of Object.entries(SD_ROSTER_TARGETS)){
    const group=t.roster.filter(
      p=>sdPosition(p.pos)===pos
    ).sort(
      (a,b)=>
        Number(!!b.origin)-Number(!!a.origin)||
        b.ovr-a.ovr
    );

    const excess=group.slice(desired);
    const discard=new Set(excess.map(p=>p.id));

    if(discard.size){
      t.roster=t.roster.filter(
        p=>!discard.has(p.id)
      );
    }

    while(sdRosterCount(t,pos)<desired){
      t.roster.push(
        player(pos,rnd(1,3),52+t.prestige*5)
      );
    }
  }
}

function sdNeedsPanel(t){
  const rows=sdNeeds(t);

  const critical=rows.filter(
    x=>x.need>0
  ).sort(
    (a,b)=>b.need-a.need
  );

  return `
    <section class="sd-needs">
      <h3>🎯 Team Needs · Next Recruiting Class</h3>

      <p class="muted">
        85-player planning model. Position targets are
        guidelines, not NCAA quotas. Needs account for
        departing seniors and current commitments.
      </p>

      <div class="grid">
        ${
          critical.length
            ? critical.slice(0,4).map(x=>`
              <div class="card">
                <small>${SD_POSITION_NAMES[x.pos]}</small>
                <div class="big">Need ${x.need}</div>
                <small>
                  ${x.current} rostered ·
                  ${x.leaving} seniors ·
                  ${x.committed} committed
                </small>
                <br>
                <button onclick="sdFindPosition('${x.pos}')">
                  Find ${x.pos} recruits
                </button>
              </div>
            `).join('')
            : '<div class="card">All projected position targets covered.</div>'
        }
      </div>

      <div style="overflow-x:auto">
        <table>
          <thead>
            <tr>
              <th>Position</th>
              <th>Roster</th>
              <th>Target</th>
              <th>Seniors</th>
              <th>Commits</th>
              <th>Projected</th>
              <th>Need</th>
            </tr>
          </thead>
          <tbody>
            ${
              rows.map(x=>`
                <tr>
                  <td>${x.pos} · ${SD_POSITION_NAMES[x.pos]}</td>
                  <td>${x.current}</td>
                  <td>${x.target}</td>
                  <td>${x.leaving}</td>
                  <td>${x.committed}</td>
                  <td>${x.projected}</td>
                  <td>
                    <strong class="${x.need?'bad':'good'}">
                      ${x.need}
                    </strong>
                  </td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function sdFindPosition(pos){
  tab='Recruiting';
  board='All';
  filter=pos;
  render();
}

const sdOldCreate=create;

create=function(){
  const s=sdOldCreate();

  for(const t of s.teams){
    sdRosterBalance(t);
  }

  return s;
};

const sdOldEndSeasonNeeds=endSeason;

endSeason=function(){
  const before=S.year;

  sdOldEndSeasonNeeds();

  if(S.year!==before){
    for(const t of S.teams){
      sdRosterBalance(t);
    }
  }
};

const sdOldRenderNeeds=render;

render=function(){
  sdOldRenderNeeds();

  if(tab==='Recruiting'||tab==='Roster'){
    const root=document.getElementById('main');
    const heading=root?.querySelector('h2');

    if(heading){
      heading.insertAdjacentHTML(
        'afterend',
        sdNeedsPanel(team())
      );
    }
  }
};
