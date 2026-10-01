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
const own=cars[3],unit=cars[0];drivenCar=own;
Object.assign(own,{x:100,y:100,angle:0,speed:0,parked:false});syncDriver();
Object.assign(unit,{x:100+(own.length+unit.length)/2+1,y:100,angle:Math.PI,speed:0,police:true,driverOccupied:true,parked:false,path:[],repath:0,home:{x:190,y:210}});
wanted.level=1;const money=wallet.cash;
assert(policeBlocksPlayer(unit),'bumper blockade not detected');
updatePoliceStop(9.9);assert(wallet.cash===money&&wanted.stopTime>9,'charged before ten seconds');
setPaused(true);const frozen=wanted.stopTime;update(.5);assert(wanted.stopTime===frozen,'stop countdown continues while paused');setPaused(false);
keys.add('s');updateDriving(.1);const policeX=unit.x;updatePolice(.1);updatePoliceStop(.1);
assert(wanted.stopTime===0&&wallet.cash===money,'reversing must cancel the fine countdown');
assert(wanted.level===1&&unit.x<policeX,'police must resume pursuit after reverse escape');
keys.clear();Object.assign(own,{x:100,y:100,angle:0,speed:0});syncDriver();
Object.assign(unit,{x:100+(own.length+unit.length)/2+1,y:100,angle:Math.PI,speed:0,recovery:null});
for(let i=0;i<99;i++)updatePoliceStop(.1);assert(wallet.cash===money,'fine charged early');
updatePoliceStop(.1);assert(wallet.cash===money-500&&wallet.fines===1,'ten-second stop must charge exactly 500');
assert(wanted.level===0&&!unit.siren,'fine must end this stop and release player');
updatePoliceStop(30);assert(wallet.cash===money-500,'one stop charged repeatedly');
wanted.level=1;unit.x=100;unit.y=165;updatePoliceStop(5);assert(wanted.stopTime===0,'mere proximity must not count as a blockade');
// Force a police collision with a wall, then verify reverse and a new pursuit path.
const b=buildings[0];own.x=1190;own.y=1010;syncDriver();
Object.assign(unit,{x:b.x-unit.length/2-.5,y:b.y+b.d/2,angle:0,speed:40,parked:false,holding:false,recovery:null,path:[],repath:0});
const before=unit.x;updatePolice(.05);assert(unit.recovery,'collision must start recovery');
for(let i=0;i<28;i++)updatePolice(.05);
assert(unit.x<before-10,'police did not reverse away from wall');
assert(!unit.recovery,'reverse recovery never finishes');
assert(!buildings.some(b=>polygonsOverlap(carCorners(unit),b.outline)),'reverse passed through building');
updatePolice(.05);assert(unit.speed>=0&&unit.path.length>0,'police did not replan pursuit after reversing');
// With another car directly behind, use a clear forward escape instead.
Object.assign(unit,{x:100,y:100,angle:0,speed:0,recovery:null});
const blocker=cars[1];Object.assign(blocker,{x:100-(unit.length+blocker.length)/2-.5,y:100,angle:0,parked:true});
beginPoliceRecovery(unit,1);
assert(unit.recovery.direction===1,'blocked reverse must choose forward escape');
const escapeX=unit.x;
for(let i=0;i<24;i++)reversePoliceOrUpdate();
function reversePoliceOrUpdate(){if(unit.recovery)reversePolice(unit,.05);}
assert(unit.x>escapeX+10&&!unit.recovery,'forward escape did not finish');
assert(!drivingBlocked(unit,unit,true),'escape crossed obstacle');
}
`;
new Function('document','innerWidth','innerHeight','devicePixelRatio','addEventListener','requestAnimationFrame',source+checks)(document,1280,720,1,noop,noop);
console.log('Police stop checks passed: reverse recovery, continued chase, escape reset, uninterrupted ten-second fine, pause and no duplicate charge.');
