
'use strict';

const KEY = 'saturday_dynasty_v7';

const groups = {
  SEC: 'Alabama,Arkansas,Auburn,Florida,Georgia,Kentucky,LSU,Mississippi State,Missouri,Oklahoma,Ole Miss,South Carolina,Tennessee,Texas,Texas A&M,Vanderbilt',
  'Big Ten': 'Illinois,Indiana,Iowa,Maryland,Michigan,Michigan State,Minnesota,Nebraska,Northwestern,Ohio State,Oregon,Penn State,Purdue,Rutgers,UCLA,USC,Washington,Wisconsin',
  'Big 12': 'Arizona,Arizona State,Baylor,BYU,Cincinnati,Colorado,Houston,Iowa State,Kansas,Kansas State,Oklahoma State,TCU,Texas Tech,UCF,Utah,West Virginia',
  ACC: 'Boston College,California,Clemson,Duke,Florida State,Georgia Tech,Louisville,Miami (FL),NC State,North Carolina,Pittsburgh,SMU,Stanford,Syracuse,Virginia,Virginia Tech,Wake Forest',
  American: 'Army,Charlotte,East Carolina,FAU,Memphis,Navy,North Texas,Rice,South Florida,Temple,Tulane,Tulsa,UAB,UTSA',
  'Sun Belt': 'Appalachian State,Arkansas State,Coastal Carolina,Georgia Southern,Georgia State,James Madison,Louisiana,Louisiana Tech,Louisiana-Monroe,Marshall,Old Dominion,South Alabama,Southern Miss,Troy',
  MAC: 'Akron,Ball State,Bowling Green,Buffalo,Central Michigan,Eastern Michigan,Kent State,Miami (OH),Ohio,Sacramento State,Toledo,UMass,Western Michigan',
  'Mountain West': 'Air Force,Hawaii,Nevada,New Mexico,North Dakota State,Northern Illinois,San Jose State,UNLV,UTEP,Wyoming',
  'Pac-12': 'Boise State,Colorado State,Fresno State,Oregon State,San Diego State,Texas State,Utah State,Washington State',
  CUSA: 'Delaware,FIU,Jacksonville State,Kennesaw State,Liberty,Middle Tennessee,Missouri State,New Mexico State,Sam Houston,Western Kentucky',
  Independent: 'Notre Dame,UConn'
};

const real = {
  Alabama: 'Kalen DeBoer',
  Arkansas: 'Ryan Silverfield',
  'Arkansas State': 'Butch Jones',
  Auburn: 'Alex Golesh',
  Georgia: 'Kirby Smart',
  Clemson: 'Dabo Swinney',
  'Ohio State': 'Ryan Day',
  Indiana: 'Curt Cignetti',
  LSU: 'Lane Kiffin',
  Michigan: 'Kyle Whittingham',
  Florida: 'Jon Sumrall',
  'Penn State': 'Matt Campbell',
  'Notre Dame': 'Marcus Freeman',
  Texas: 'Steve Sarkisian',
  'Texas A&M': 'Mike Elko',
  'Ole Miss': 'Pete Golding',
  Memphis: 'Charles Huff',
  'Iowa State': 'Jimmy Rogers',
  'Kansas State': 'Collin Klein',
  Kentucky: 'Will Stein',
  'Colorado State': 'Jim Mora',
  UConn: 'Jason Candle',
  'James Madison': 'Billy Napier',
  California: 'Tosh Lupoi',
  'Coastal Carolina': 'Ryan Beard',
  'Virginia Tech': 'James Franklin',
  'Oklahoma State': 'Eric Morris',
  Utah: 'Morgan Scalley',
  Stanford: 'Tavita Pritchard',
  'Miami (FL)': 'Mario Cristobal'
};

const COACH_SEEDS = `
Army|Jeff Monken|92|65|3|2|Cody Worley|Daryl Dixon
Charlotte|Tim Albin|34|36|0|6|Todd Fitch|Nate Faanes
East Carolina|Blake Harrell|17|8|4|2|Jordan Davis|Jordan Hankins
FAU|Zach Kittley|8|9|3|3|Zach Kittley|Brett Dewhurst
Memphis|Charles Huff|44|26|5|1|Kevin Decker|Lance Guidry
Navy|Brian Newberry|28|15|4|2|Drew Cronic|Ricky Brown
North Texas|Neal Brown|76|53|4|2|Mike Bloesch|Bradley Dale Peveto
Rice|Scott Abell|6|13|2|4|Vince Munch|Jon Kay
South Florida|Brian Hartline|4|2|4|2|Tim Beck|Josh Aldridge
Temple|K. C. Keeler|19|23|2|3|Tyler Walker|Brian Smith
Tulane|Will Hall|16|33|2|3|Russ Callaway|Nate Fuqua
Tulsa|Tre Lamb|7|11|3|3|Kevin Barbay|Mike Gray
UAB|Alex Mortensen|6|7|3|3|Alex Mortensen|Todd Grantham
UTSA|Jeff Traylor|58|27|3|3|Rick Bowie|Jess Loepp
Boston College|Bill O'Brien|26|28|1|5|Bill O'Brien|Ted Roof
California|Tosh Lupoi|3|3|3|3|Jordan Somerville|Da'Von Brown
Clemson|Dabo Swinney|189|55|3|2|Chad Morris|Tom Allen
Duke|Manny Diaz|43|25|3|3|Jonathan Brewer|Jonathan Patke
Florida State|Mike Norvell|79|52|2|4|Tim Harris Jr.|Tony White
Georgia Tech|Brent Key|29|23|4|2|George Godsey|Jason Semore
Louisville|Jeff Brohm|97|59|2|3|Brian Brohm|Steve Ellis
Miami (FL)|Mario Cristobal|102|79|5|0|Shannon Dawson|Corey Hetherman
North Carolina|Bill Belichick|7|10|2|4|Bobby Petrino|Stephen Belichick
NC State|Dave Doeren|121|77|3|3|Kurt Roper|D. J. Eliot
Pittsburgh|Pat Narduzzi|85|62|3|3|Kade Bell|Cory Sanders
SMU|Rhett Lashlee|42|18|4|2|Garin Justice|Maurice Crum Jr.
Stanford|Tavita Pritchard|2|4|2|4|Terry Heffernan|Kris Richard
Syracuse|Fran Brown|15|15|2|4|Mike Johnson|Vince Kehres
Virginia|Tony Elliott|26|28|4|2|Desmond Kitchings|John Rudzinski
Virginia Tech|James Franklin|132|62|4|2|Ty Howle|Brent Pry
Wake Forest|Jake Dickert|37|25|4|2|Rob Ezell|Scottie Hazelton
Arizona|Brent Brennan|52|61|3|3|Seth Doege|Danny Gonzales
Arizona State|Kenny Dillingham|25|18|4|2|Marcus Arroyo|Brian Ward
Baylor|Dave Aranda|40|38|2|4|Jake Spavital|Joe Klanderman
BYU|Kalani Sitake|89|45|5|0|Aaron Roderick|Kelly Poppinga
Cincinnati|Scott Satterfield|91|63|3|3|Nic Cardwell|Nate Woody
Colorado|Deion Sanders|18|24|2|4|Brennan Marion|Chris Marve
Houston|Willie Fritz|90|66|4|2|Slade Nagle|Austin Armstrong
Iowa State|Jimmy Rogers|9|9|3|3|Tyler Roehl|Jesse Bobbit
Kansas|Lance Leipold|66|71|3|3|Andy Kotelnicki|D.K. McDonald
Kansas State|Collin Klein|3|2|3|2|Sean Gleeson|Jordan Peterson
Oklahoma State|Eric Morris|26|17|4|1|Sean Brophy|Skyler Cassity
TCU|Sonny Dykes|109|83|4|2|A. J. Ricker|Andy Avalos
Texas Tech|Joey McGuire|40|18|5|0|Mack Leftwich|Rob Greene
UCF|Scott Frost|43|48|4|2|Steve Cooper|Alex Grinch
Utah|Morgan Scalley|6|0|6|0|Kevin McGiven|Colton Swan
West Virginia|Rich Rodriguez|143|102|3|3|Rich Rodriguez|Zac Alley
Illinois|Bret Bielema|137|87|4|2|Barry Lunney Jr.|Chris Hurd
Indiana|Curt Cignetti|52|6|6|0|Mike Shanahan|Bryant Haines
Iowa|Kirk Ferentz|218|129|4|1|Tim Lester|Phil Parker
Maryland|Mike Locksley|41|79|2|4|Clint Trickett|Aazaar Abdul-Rahim
Michigan|Kyle Whittingham|180|90|3|2|Jason Beck|Jay Hill
Michigan State|Pat Fitzgerald|112|105|2|4|Nick Sheridan|Joe Rossi
Minnesota|P. J. Fleck|100|68|4|1|Greg Harbaugh Jr.|Danny Collins
Nebraska|Matt Rhule|71|63|5|1|Dana Holgorsen|Rob Aurich
Northwestern|David Braun|23|20|4|2|Chip Kelly|Tim McGarigle
Ohio State|Ryan Day|87|13|5|0|Keenan Bailey|Matt Patricia
Oregon|Dan Lanning|51|10|5|1|Drew Mehringer|Chris Hampton
Penn State|Matt Campbell|110|73|3|3|Taylor Mouser|D'Anton Lynn
Purdue|Barry Odom|49|46|2|4|Josh Henson|Kevin Kane
Rutgers|Greg Schiano|100|112|3|3|Kirk Ciarrocca|Travis Johansen
UCLA|Bob Chesney|26|6|5|0|Dean Kennedy|Colin Hitschler
USC|Lincoln Riley|97|28|6|1|Luke Huard|Gary Patterson
Washington|Jedd Fisch|35|36|4|2|Jedd Fisch|Ryan Walters
Wisconsin|Luke Fickell|84|47|2|4|Jeff Grimes|Mike Tressel
Delaware|Ryan Carty|9|10|3|3|Terence Archer|Manny Rojas
FIU|Willie Simmons|10|9|3|3|Nick Coleman|Jovan Dewitt
Jacksonville State|Charles Kelly|14|7|4|2|Taylor Housewright|Brian Williams
Kennesaw State|Jerry Mack|11|9|3|3|Mitch Militello|Marc Mattioli
Liberty|Jamey Chadwell|69|36|3|3|Newland Isaac|Skylor Magee
Middle Tennessee|Derek Mason|36|76|2|4|Anthony Scelfo|Brian Stewart
Missouri State|Casey Woods|2|4|2|4|Mark Cala|Jack Curtis
New Mexico State|Tony Sanchez|29|61|2|4|David Yost|Joe Morris
Sam Houston|Phil Longo|3|15|2|4|Zack Patterson|Freddie Aughtry-Lindsay
Western Kentucky|Tyson Helton|61|39|4|2|Joe Bernardi|Davis Merritt
Notre Dame|Marcus Freeman|49|12|6|0|Mike Denbrock|Chris Ash
UConn|Jason Candle|84|47|3|3|Marquel Blackwell|Ryan Manalac
Akron|Joe Moorhead|28|52|1|5|Joe Moorhead|Tim Tibesar
Ball State|Mike Uremovich|5|13|1|5|Mike Uremovich|Jeff Knowles
Bowling Green|Eddie George|6|12|2|4|Greg Nosal|Joe Bowden
Buffalo|Pete Lembo|50|43|2|4|Tony Tokarz|Brian Dougherty
Central Michigan|Matt Drinkall|10|9|3|3|Jim Chapin|Sean Cronin
Eastern Michigan|Chris Creighton|65|86|2|4|Mike Piatkowski|Tate Omli
Kent State|Mark Carney|7|11|2|4|Clay Patterson|Cherokee Valeria
Miami (OH)|Chuck Martin|75|77|4|2|Gus Ragland|Bill Brechin
Ohio|John Hauser|5|2|5|2|Scott Isophording|Kurt Mattix
Sacramento State|Alonzo Carter|1|5|1|5|Eric Kiesau|Adam Clark
Toledo|Mike Jacobs|4|2|4|2|Cris Reisert|Jahmal Brown
UMass|Joe Harasymiak|4|14|1|5|Max Warner|Jared Keyte
Western Michigan|Lance Taylor|24|21|3|3|Walt Bell|Greer Martini
Air Force|Troy Calhoun|143|98|1|5|Mike Thiessen|Steve Russ
Hawaii|Timmy Chang|23|34|2|4|Anthony Arceneaux|Dennis Thurman
Nevada|Jeff Choate|8|22|2|4|Bret Bartalone|Kane Ioane
New Mexico|Jason Eck|13|5|4|2|Luke Schleusner|Spence Nowinsky
North Dakota State|Tim Polasek|5|1|5|1|Dan Larson|Grant Olson
Northern Illinois|Rob Harley|0|5|0|5|Tony Petersen|D. J. Bland
San Jose State|Ken Niumatalolo|122|101|2|4|Craig Stutzmann|Bojay Filimoeatu
UNLV|Dan Mullen|117|67|4|2|Corey Dennis|Paul Guenther
UTEP|Scotty Walden|7|27|1|5|Joe Pappalardo|Kyle Beyer
Wyoming|Jay Sawvel|10|20|2|4|Christian Taylor|Aaron Bohl
Boise State|Spencer Danielson|29|9|4|2|Nate Potter|Erik Chinander
Colorado State|Jim Mora|75|57|2|4|Pryce Tracy|Tyson Summers
Fresno State|Matt Entz|13|6|4|2|Josh Davis|Nick Benedetto
Oregon State|JaMarcus Shephard|4|2|4|2|Mitch Dahlen|Mike MacIntyre
San Diego State|Sean Lewis|38|48|4|2|Sean Lewis|Demetrius Sumler
Texas State|G. J. Kinne|26|19|3|3|Landon Keopple|Will Windham
Utah State|Bronco Mendenhall|148|99|3|3|Robert Anae|Nick Howell
Washington State|Kirby Moore|1|5|1|5|Matt Miller|Trent Bray
Alabama|Kalen DeBoer|62|18|5|1|Ryan Grubb|Kane Wommack
Arkansas|Ryan Silverfield|52|29|2|4|Tim Cramsey|Ron Roberts
Auburn|Alex Golesh|26|17|3|2|Kodi Burns|D.J. Durkin
Florida|Jon Sumrall|47|14|4|2|Buster Faulkner|Brad White
Georgia|Kirby Smart|123|21|6|0|Mike Bobo|Glenn Schumann
Kentucky|Will Stein|5|1|5|1|Joe Sloan|Jay Bateman
LSU|Lane Kiffin|120|54|4|2|Charlie Weis Jr.|Blake Baker
Mississippi State|Jeff Lebby|11|19|3|3|Jeff Lebby|Zach Arnett
Missouri|Eli Drinkwitz|63|31|5|1|Chip Lindsey|Corey Batoon
Oklahoma|Brent Venables|35|22|4|2|Ben Arbuckle|Todd Bates
Ole Miss|Pete Golding|6|2|4|2|John David Baker|Bryan Brown
South Carolina|Shane Beamer|36|33|3|3|Kendal Briles|Clayton White
Tennessee|Josh Heupel|78|29|5|1|Joey Halzle|Jim Knowles
Texas|Steve Sarkisian|96|56|5|1|Kyle Flood|Will Muschamp
Texas A&M|Mike Elko|38|19|5|1|Holmon Wiggins|Elijah Robinson
Vanderbilt|Clark Lea|29|39|4|2|Tim Beck|Steve Gregory
Appalachian State|Dowell Loggains|8|10|2|4|Mike Anthony|D. J. Smith
Arkansas State|Butch Jones|112|95|3|3|Garrett Altman|Griffin McCarley
Coastal Carolina|Ryan Beard|9|9|2|4|Nick Petrino|LD Scott
Georgia Southern|Clay Helton|76|53|3|3|Ryan Aplin|Mike Mutz
Georgia State|Dell McGee|8|21|2|4|Hue Jackson|Cam Clark
James Madison|Billy Napier|68|35|6|0|Cam Aiken|Robert Bala
Louisiana|Michael Desormeaux|33|27|3|3|Tim Leger|Jim Salgado
Louisiana-Monroe|Bryant Vincent|15|27|0|5|Jesse Montalto|Troy Reffett
Louisiana Tech|Sonny Cumbie|24|36|3|3|Nathan Young|Luke Olson
Marshall|Tony Gibson|8|10|3|3|Rod Smith|Brad Lambert
Old Dominion|Ricky Rahne|32|37|4|2|Kody Cook|Blake Seiler
South Alabama|Major Applewhite|30|27|3|3|Major Applewhite|Todd Orlando
Southern Miss|Blake Anderson|75|59|1|5|Kyle Cefalo|Joe Bolden
Troy|Gerad Parker|15|22|3|3|Adam Austin|Dontae Wright
`.trim().split('\n').map(line => {
  const [school, name, w, l, w26, l26, oc, dc] = line.split('|');
  return {
    school,
    name,
    w: Math.max(0, +w - +w26),
    l: Math.max(0, +l - +l26),
    oc,
    dc
  };
});

const legends = [
  ['Nick Saban', 297, 71, 7],
  ['Bear Bryant', 323, 85, 6],
  ['Bobby Bowden', 357, 124, 2],
  ['Tom Osborne', 255, 49, 3]
];

const first = 'James Marcus Tyler Devin Jordan Cameron Malik Jayden Austin Trey Brandon Isaiah Darius Caleb Ethan Cole Dylan Jalen Mason Trevor Andre Bryce Keon Micah'.split(' ');

const last = 'Johnson Williams Davis Miller Brown Wilson Jackson Thomas Walker Moore Taylor Robinson Harris Young Anderson Smith Carter Mitchell Brooks Reed Parker Jones Lewis'.split(' ');

const positions = 'QB HB WR WR WR TE OT OT OG OG C DE DE DT DT OLB MLB CB CB FS SS K P'.split(' ');

const states = 'AR TX LA MS AL GA FL TN OK CA OH NC SC MI PA'.split(' ');

const rnd = (a, b) =>
  Math.floor(Math.random() * (b - a + 1)) + a;

const one = a => a[rnd(0, a.length - 1)];

const id = () =>
  Math.random().toString(36).slice(2, 10);

const nm = () =>
  one(first) + ' ' + one(last);

const esc = x =>
  String(x ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

let S;
let tab = 'Office';
let filter = '';
let board = 'All';
