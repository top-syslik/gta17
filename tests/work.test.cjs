const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8')+'\n'+fs.readFileSync(path.join(__dirname,'../shop.js'),'utf8')+'\n'+fs.readFileSync(path.join(__dirname,'../work.js'),'utf8');
const noop=()=>{};
const context=new Proxy({createLinearGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});
const elements={};
const document={getElementById:id=>elements[id]??={getContext:()=>context,addEventListener:noop,setAttribute:noop,focus:noop,dataset:{},querySelectorAll:()=>[]},addEventListener:noop,querySelectorAll:()=>[],pointerLockElement:null};
const saved={'asfalt-shop':JSON.stringify({vehicles:['skycar']})};const storage={getItem:k=>saved[k]??null,setItem:(k,v)=>saved[k]=v};
const checks=`
const assert=(ok,msg)=>{if(!ok)throw Error(msg);};
const approach=step=>{const station=workState.stations[step.station];Object.assign(player,{x:station.frontX,y:station.y,angle:station.x<165?Math.PI:0});};
const initialFaces=faces.length;
for(const kind of ['hospital','restaurant','police','fire','shop']){
 const source=buildings.find(b=>b.kind===kind);
 if(kind!=='shop'){const e=source.entrance,dx=e.road[0]-e.x,dy=e.road[1]-e.y,length=Math.hypot(dx,dy);Object.assign(player,{x:e.x+dx/length*22,y:e.y+dy/length*22});}
 const outside={x:player.x,y:player.y},cash=wallet.cash;
 if(kind==='shop')assert(startProfession(source),'cannot start shop');else interactCar();
 assert(workState.open&&workState.steps.length>=4,'profession needs multiple real actions');
 assert(!fireWeapon(),'cannot fire while working');
 const carPositions=cars.map(c=>[c.x,c.y]);update(.2);draw();
 assert(cars.every((c,i)=>c.x===carPositions[i][0]&&c.y===carPositions[i][1]),'city moved while inside work room');
 assert(wallet.cash===cash,'arrival paid without work');
 for(let index=0;index<workState.steps.length;index++){
   const step=workState.steps[index];
   Object.assign(player,{x:165,y:300,angle:0});interactProfession();updateProfession(.1);
   assert(workState.stage===index&&!workState.busy,'work starts away from station');
   approach(step);assert(workTarget()===step.station,'station unreachable');
   interactCar();
   if(step.choices.length){
     assert(workState.menu,'decision missing');
     assert(!chooseWorkAction((step.correct+1)%step.choices.length)&&!workState.busy,'wrong choice accepted');
     assert(chooseWorkAction(step.correct),'correct decision rejected');
   }
   assert(workState.busy,'work action did not start');
   setPaused(true);const progress=workState.progress;update(.5);
   assert(workState.progress===progress,'work progresses while paused');setPaused(false);
   const stage=workState.stage;updateProfession(.1);
   assert(workState.stage===stage,'work completed without required duration');
   draw();
   for(let i=0;i<160&&workState.stage===index;i++)update(.05);
   assert(workState.stage===index+1,'action never completed: '+kind+' '+index);
   assert(wallet.cash===cash+(index===workState.steps.length-1?5000:0),'wrong payment timing');
 }
 for(let i=0;i<10;i++)update(.1);
 assert(wallet.cash===cash+5000&&workState.paid,'duplicate or missing wage');
 Object.assign(player,{x:165,y:340});interactCar();
 assert(!workState.open&&player.x===outside.x&&player.y===outside.y,'exit failed to restore city position');
 assert(faces.length===initialFaces,'work geometry leaked into city');
}
const hospital=buildings.find(b=>b.kind==='hospital');
const money=wallet.cash;startProfession(hospital);const step=workState.steps[0];approach(step);interactProfession();updateProfession(.5);
player.x=165;player.y=300;updateProfession(.1);assert(!workState.busy,'work continues after leaving station');
exitProfession();assert(wallet.cash===money,'unfinished shift was paid');
assert(!startProfession(buildings.find(b=>b.kind==='residential')),'apartments offer work');
// Cashier entry from inside the shop must close its overlay and restore the outdoor exit.
const entry=shopEntry,dx=entry.road[0]-entry.x,dy=entry.road[1]-entry.y,length=Math.hypot(dx,dy);
Object.assign(player,{x:entry.x+dx/length*22,y:entry.y+dy/length*22});
openShop();assert(shopState.open,'shop entrance failed');
Object.assign(player,{x:105,y:100,angle:-Math.PI/2});shopState.basket=['water'];takeJob();assert(!workState.open&&shopState.open,'started shift carrying unpaid items');
shopState.basket=[];const outside={...shopState.outside};takeJob();assert(workState.open&&!shopState.open,'cashier shift not opened');
exitProfession();assert(player.x===outside.x&&player.y===outside.y,'cashier exit did not return outdoors');
`;
new Function('document','innerWidth','innerHeight','devicePixelRatio','addEventListener','requestAnimationFrame','localStorage',source+'\n'+checks)(document,1280,720,1,noop,noop,storage);
console.log('Work checks passed: five professions, stations, decisions, durations, pause, city freeze, one wage, interruption, safe exits and cashier entry.');
