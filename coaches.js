
// ENGINE V5: deterministic seeded starting identities, real pre-2026 FBS records,
// complete weekly matchups, conferences, postseason, career continuity and self-audits.
const HISTORIC_TITLES={'Kirby Smart':2,'Dabo Swinney':2,'Ryan Day':1,'Curt Cignetti':1,'Kalen DeBoer':0,'Lincoln Riley':0};
function seedCoaches(s){let seen=new Set;for(const d of COACH_SEEDS){let t=s.teams.find(x=>x.name===d.school);if(!t)continue;seen.add(d.school);let h=cSeed(s,t.coach),o=cSeed(s,t.oc),v=cSeed(s,t.dc);if(!h)continue;h.name=d.name;h.realName=true;h.source='2026 preseason: Wikipedia 2026 FBS coach table; career FBS W-L minus 2026-to-date W-L';h.career.wins=d.w;h.career.losses=d.l;h.career.titles=HISTORIC_TITLES[d.name]||0;h.baseline={wins:d.w,losses:d.l,titles:h.career.titles};h.verification={wins:'provisional',losses:'provisional',titles:HISTORIC_TITLES[d.name]!==undefined?'verified':'unverified',conferenceTitles:'unverified',bowlWins:'unverified',playoffWins:'unverified',top5:'unverified',no1:'unverified',fiveStars:'unverified'};if(o){o.name=d.oc;o.realName=true;o.source='2026 coordinator listing';}if(v){v.name=d.dc;v.realName=true;v.source='2026 coordinator listing';}}
 s.coachCoverage=seen.size;s.coachSource='https://en.wikipedia.org/wiki/List_of_current_NCAA_Division_I_FBS_football_coaches';
}
function cSeed(s,id){return s.coaches.find(x=>x.id===id)}
function migrate(s){if(!s||![4,5].includes(s.version)||!Array.isArray(s.teams))return create();if(s.version===4){s.version=5;s.coachCoverage=0;seedCoaches(s);s.news.unshift('Imported v4 dynasty: coaching seeds updated; older game results retained.');}s.postseason=s.postseason||[];s.seasonHistory=s.seasonHistory||[];s.games=s.games||[];return s}
const baseCreate=create;
create=function(){let s=baseCreate();seedCoaches(s);s.postseason=[];s.seasonHistory=[];schedule(s);return s};
// Curated established FBS rivalries; this is a rivalry registry, not a claim that every game is on the official 2026 schedule.
