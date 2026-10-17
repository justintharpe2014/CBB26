
const RIVALRY_PAIRS=`Alabama|Auburn|Iron Bowl
Alabama|Tennessee|Third Saturday in October
Alabama|LSU|Alabama–LSU
Alabama|Mississippi State|Battle for Highway 82
Arkansas|LSU|Battle for the Golden Boot
Arkansas|Texas A&M|Southwest Classic
Arkansas|Missouri|Battle Line Rivalry
Arkansas|Texas|Arkansas–Texas
Auburn|Georgia|Deep South's Oldest Rivalry
Auburn|LSU|Tiger Bowl
Florida|Georgia|Florida–Georgia
Florida|Florida State|Sunshine Showdown
Florida|Tennessee|Florida–Tennessee
Florida|LSU|Florida–LSU
Georgia|Georgia Tech|Clean, Old-Fashioned Hate
Georgia|South Carolina|Georgia–South Carolina
Georgia|Tennessee|Georgia–Tennessee
Kentucky|Louisville|Governor's Cup
Kentucky|Tennessee|Kentucky–Tennessee
LSU|Ole Miss|Magnolia Bowl
Mississippi State|Ole Miss|Egg Bowl
Mississippi State|Southern Miss|Mississippi rivalry
Missouri|Kansas|Border War
Oklahoma|Texas|Red River Rivalry
Oklahoma|Oklahoma State|Bedlam
Oklahoma|Nebraska|Oklahoma–Nebraska
South Carolina|Clemson|Palmetto Bowl
Tennessee|Vanderbilt|Tennessee–Vanderbilt
Texas|Texas A&M|Lone Star Showdown
Texas|Texas Tech|Texas–Texas Tech
Baylor|TCU|Revivalry
Baylor|Texas Tech|Texas Farm Bureau Shootout
BYU|Utah|Holy War
BYU|Utah State|Old Wagon Wheel
Arizona|Arizona State|Territorial Cup
Arizona|New Mexico|Kit Carson Rifle
Colorado|Colorado State|Rocky Mountain Showdown
Colorado|Nebraska|Colorado–Nebraska
Colorado|Utah|Rumble in the Rockies
Houston|Rice|Bayou Bucket Classic
Iowa State|Iowa|Cy-Hawk
Kansas|Kansas State|Sunflower Showdown
Kansas State|Iowa State|Farmageddon
Oklahoma State|Tulsa|Turnpike Classic
TCU|SMU|Battle for the Iron Skillet
UCF|South Florida|War on I-4
West Virginia|Pittsburgh|Backyard Brawl
West Virginia|Maryland|West Virginia–Maryland
West Virginia|Virginia Tech|Black Diamond Trophy
Cincinnati|Miami (OH)|Victory Bell
Illinois|Northwestern|Land of Lincoln Trophy
Illinois|Purdue|Purdue Cannon
Indiana|Purdue|Old Oaken Bucket
Iowa|Minnesota|Floyd of Rosedale
Iowa|Nebraska|Heroes Game
Iowa|Wisconsin|Heartland Trophy
Maryland|Rutgers|Maryland–Rutgers
Michigan|Ohio State|The Game
Michigan|Michigan State|Paul Bunyan Trophy
Michigan|Minnesota|Little Brown Jug
Michigan State|Penn State|Land Grant Trophy
Minnesota|Wisconsin|Paul Bunyan's Axe
Nebraska|Wisconsin|Freedom Trophy
Northwestern|Notre Dame|Northwestern–Notre Dame
Ohio State|Penn State|Ohio State–Penn State
Oregon|Oregon State|Oregon–Oregon State
Oregon|Washington|Border War
Penn State|Pittsburgh|Penn State–Pittsburgh
UCLA|USC|Victory Bell
USC|Notre Dame|Jeweled Shillelagh
USC|Stanford|USC–Stanford
Washington|Washington State|Apple Cup
Boston College|Syracuse|Boston College–Syracuse
Boston College|Virginia Tech|Boston College–Virginia Tech
Clemson|Florida State|Clemson–Florida State
Duke|North Carolina|Victory Bell
Duke|Wake Forest|Duke–Wake Forest
Florida State|Miami (FL)|Florida State–Miami
Georgia Tech|Virginia Tech|Techmo Bowl
Louisville|Cincinnati|Keg of Nails
Louisville|Memphis|Louisville–Memphis
NC State|North Carolina|NC State–North Carolina
NC State|Wake Forest|NC State–Wake Forest
North Carolina|Virginia|South's Oldest Rivalry
Pittsburgh|Syracuse|Pittsburgh–Syracuse
Stanford|California|Big Game
Virginia|Virginia Tech|Commonwealth Cup
Army|Navy|Army–Navy Game
Army|Air Force|Commander-in-Chief's Trophy
Navy|Air Force|Commander-in-Chief's Trophy
East Carolina|NC State|East Carolina–NC State
East Carolina|Marshall|East Carolina–Marshall
Memphis|UAB|Battle for the Bones
North Texas|SMU|Safeway Bowl
Rice|Tulane|Rice–Tulane
Tulane|Southern Miss|Battle for the Bell
Tulsa|Houston|Tulsa–Houston
Appalachian State|Georgia Southern|Deeper Than Hate
Appalachian State|Marshall|Old Mountain Feud
Arkansas State|Memphis|Paint Bucket Bowl
Arkansas State|Louisiana-Monroe|Arkansas State–ULM
Coastal Carolina|Appalachian State|Coastal–App State
Georgia Southern|Georgia State|Modern Day Hate
Louisiana|Louisiana-Monroe|Battle on the Bayou
Louisiana|South Alabama|Louisiana–South Alabama
Louisiana Tech|Southern Miss|Rivalry in Dixie
Marshall|Ohio|Battle for the Bell
South Alabama|Troy|Battle for the Belt
Troy|Middle Tennessee|Battle for the Palladium
Akron|Kent State|Wagon Wheel
Bowling Green|Toledo|Battle of I-75
Central Michigan|Western Michigan|Victory Cannon
Central Michigan|Eastern Michigan|Michigan MAC Trophy
Eastern Michigan|Western Michigan|Michigan MAC Trophy
Miami (OH)|Ohio|Battle of the Bricks
Ohio|Marshall|Battle for the Bell
Ball State|Northern Illinois|Bronze Stalk
Boise State|Fresno State|Milk Can
Boise State|Nevada|Boise State–Nevada
Colorado State|Wyoming|Border War
Fresno State|San Diego State|Battle for the Oil Can
Hawaii|UNLV|Ninth Island Showdown
Nevada|UNLV|Battle for Nevada
New Mexico|New Mexico State|Rio Grande Rivalry
San Diego State|San Jose State|SDSU–SJSU
Utah State|Wyoming|Bridger's Battle
Oregon State|Washington State|Oregon State–Washington State
FIU|FAU|Shula Bowl
Middle Tennessee|Western Kentucky|100 Miles of Hate
Liberty|New Mexico State|Liberty–NMSU`.split('\n').map(line=>line.split('|'));

const RIVALRIES=new Map(
  RIVALRY_PAIRS.map(([a,b,name])=>[
    [a,b].sort().join('::'),
    name
  ])
);

function rivalryName(a,b){
  return RIVALRIES.get([a,b].sort().join('::'))||null;
}

function shuffle(a){
  for(let i=a.length-1;i>0;i--){
    let j=rnd(0,i);
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function schedule(s){
  s.games=[];
  const all=s.teams;
  const played=new Set();

  for(let w=1;w<=12;w++){
    const pending=new Set(all.map(t=>t.id));
    const pairs=[];

    if(w<=8){
      for(const conf of Object.keys(groups)){
        const ts=shuffle(all.filter(t=>t.conf===conf));

        while(ts.length>1){
          const a=ts.pop();
          const available=ts.filter(b=>
            !played.has(
              [a.id,b.id].sort((x,y)=>x-y).join(':')
            )
          );
          const b=one(available.length?available:ts);

          ts.splice(ts.indexOf(b),1);
          pairs.push([a,b]);
          pending.delete(a.id);
          pending.delete(b.id);
        }
      }
    }

    const pool=shuffle([...pending].map(i=>all[i]));

    while(pool.length>1){
      const a=pool.pop();
      let options=pool.filter(b=>
        w<=8
          ? a.conf!==b.conf
          : a.conf!==b.conf &&
            !played.has(
              [a.id,b.id].sort((x,y)=>x-y).join(':')
            )
      );

      if(!options.length){
        options=pool.filter(b=>
          !played.has(
            [a.id,b.id].sort((x,y)=>x-y).join(':')
          )
        );
      }

      const b=one(options.length?options:pool);
      pool.splice(pool.indexOf(b),1);
      pairs.push([a,b]);
    }

    for(const [a,b] of pairs){
      const k=[a.id,b.id].sort((x,y)=>x-y).join(':');
      played.add(k);

      s.games.push({
        week:w,
        a:a.id,
        b:b.id,
        played:false,
        conference:a.conf===b.conf,
        phase:'regular',
        rivalry:rivalryName(a.name,b.name)
      });
    }
  }

  // Reserve the final week for traditional rivalry games.
  const last=12;
  const ids=new Map(all.map(t=>[t.name,t.id]));
  const chosen=[];
  const busy=new Set();

  for(const [a,b,name] of RIVALRY_PAIRS){
    const ia=ids.get(a);
    const ib=ids.get(b);

    if(
      ia===undefined ||
      ib===undefined ||
      busy.has(ia) ||
      busy.has(ib)
    ) continue;

    chosen.push({a:ia,b:ib,name});
    busy.add(ia);
    busy.add(ib);
  }

  const leftover=all.filter(t=>!busy.has(t.id));
  const finalGames=chosen.map(x=>({
    week:last,
    a:x.a,
    b:x.b,
    played:false,
    conference:all[x.a].conf===all[x.b].conf,
    phase:'regular',
    rivalry:x.name
  }));

  for(let i=0;i+1<leftover.length;i+=2){
    const a=leftover[i];
    const b=leftover[i+1];

    finalGames.push({
      week:last,
      a:a.id,
      b:b.id,
      played:false,
      conference:a.conf===b.conf,
      phase:'regular',
      rivalry:rivalryName(a.name,b.name)
    });
  }

  s.games=s.games.filter(g=>g.week!==last).concat(finalGames);
  s.rivalryWeekCount=chosen.length;
}
