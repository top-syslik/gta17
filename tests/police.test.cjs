// Run with: node tests/simulation.test.cjs
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../game.js'), 'utf8');
const noop = () => {};
const context = new Proxy({createLinearGradient: () => ({addColorStop: noop})}, {
  get: (object, key) => key in object ? object[key] : noop,
  set: (object, key, value) => (object[key] = value, true)
});
const elements = {};
const document = {
  getElementById: id => elements[id] ??= {
    getContext: () => context, addEventListener: noop, setAttribute: noop, dataset: {}
  },
  addEventListener: noop, querySelectorAll: () => [], pointerLockElement: null
};
const checks = `
{
const assert=(ok,msg)=>{if(!ok)throw Error(msg);};
assert(onRoad(1190,1010),'intersection not recognized as road');
assert(!onRoad(100,100),'offroad area recognized as street');
const count=cars.length;
reportImpact();assert(wanted.level===0,'one hit must not start chase');
reportImpact();assert(wanted.hits.length===1,'continuous collision counted twice');
wanted.time+=2;wanted.impactCooldown=0;reportImpact();assert(wanted.level===0,'two hits must not start chase');
wanted.time+=2;wanted.impactCooldown=0;reportImpact();assert(wanted.level===1,'third hit should add a star');
updateWanted(.05);
const unit=cars.find(c=>c.police&&!c.parked);
assert(unit&&cars.length===count,'police did not dispatch');
const station=buildings.find(b=>b.kind==='police');
assert(Math.hypot(unit.x-unit.home.x,unit.y-unit.home.y)<1,'police must originate in its assigned bay');
assert(!buildings.some(b=>insideBuilding(unit.x,unit.y,b,22)),'police spawned inside building');
const origin={x:unit.x,y:unit.y},initialDistance=Math.hypot(unit.x-player.x,unit.y-player.y);
const finesBefore=wallet.fines;
for(let i=0;i<320&&wanted.level;i++){updateActors(.05);updateWanted(.05);if(wanted.level)assert(unit.siren,'pursuit siren inactive');}
assert(Math.hypot(unit.x-origin.x,unit.y-origin.y)>50,'police did not leave station');
assert(Math.hypot(unit.x-player.x,unit.y-player.y)<initialDistance,'police did not approach player');
assert(unit.wheelTravel>0,'police wheels inactive');
assert(wanted.level>0||wallet.fines===finesBefore+1,'pursuit ended without contact fine');
assert(!buildings.some(b=>polygonsOverlap(carCorners(unit),b.outline)),'police drove through a building');
setPaused(true);const time=wanted.time,position=unit.x;update(.5);assert(wanted.time===time&&unit.x===position,'wanted system changes during pause');setPaused(false);
// Driving on open ground causes escalation only after sustained movement.
const own=cars[3];drivenCar=own;Object.assign(own,{x:100,y:100,speed:20,parked:false});syncDriver();
wanted.level=0;wanted.offroad=0;wanted.quiet=0;
for(let i=0;i<70;i++)updateWanted(.1);
assert(wanted.level===0,'offroad warning too short');
for(let i=0;i<12;i++)updateWanted(.1);
assert(wanted.level===1,'sustained offroad driving not detected');
const offroad=wanted.offroad;own.speed=0;updateWanted(.1);assert(wanted.offroad<=offroad,'standing still counts as reckless driving');
for(let i=0;i<8;i++)raiseWanted('test');assert(wanted.level===5,'stars exceed maximum');
// Losing distant patrols reduces the wanted level.
player.x=2200;player.y=1850;drivenCar=null;wanted.quiet=30;wanted.unseen=20.1;wanted.level=1;
for(const patrol of cars.filter(c=>c.police)){patrol.x=100;patrol.y=100;patrol.siren=true;}
updateWanted(.1);assert(wanted.level===0,'search never ends after escape');
assert(cars.filter(c=>c.police).every(c=>!c.siren),'sirens remain after search ends');
draw();
// Dispatch targets scale by two patrols per star, including levels above the old cap.
const originalCars=cars.slice(),originalDispatch=dispatchPolice,originalUpdatePolice=updatePolice;
drivenCar=null;takeover=null;updatePolice=()=>{};
dispatchPolice=()=>{cars.push({police:true,parked:false,driverOccupied:true,x:player.x+100,y:player.y,siren:true});return true;};
for(let level=1;level<=5;level++){
 cars.splice(0,cars.length);wanted.level=level;wanted.quiet=0;wanted.unseen=0;
 for(let i=0;i<level*2+1;i++){wanted.dispatchTimer=0;updateWanted(.01);}
 assert(cars.length===level*2,'wrong patrol count for '+level+' stars');
}
cars.splice(0,cars.length,...originalCars);dispatchPolice=originalDispatch;updatePolice=originalUpdatePolice;
wanted.level=0;
}
`;
new Function('document','innerWidth','innerHeight','devicePixelRatio','addEventListener','requestAnimationFrame',source+checks)(document,1280,720,1,noop,noop);
console.log('Police checks passed: warnings, repeated hits, station dispatch, pursuit, collisions, pause, offroad timing and escape.');
