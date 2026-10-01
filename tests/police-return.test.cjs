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
assert(policeParkingBays.length===10,'ten police bays required');
const initialPatrols=cars.filter(c=>c.police);
assert(initialPatrols.length===10&&initialPatrols.every(c=>c.parked),'all ten patrols must start parked');
assert(new Set(initialPatrols.map(c=>c.home.x+','+c.home.y)).size===10,'parking assignments overlap');
for(const unit of initialPatrols){
 assert(!drivingBlocked(unit,unit,true),'parking bay overlaps an obstacle');
 assert(carCorners(unit).every(p=>!onRoad(p[0],p[1])),'police parked on the road');
}
wanted.level=3;
for(let i=0;i<3;i++){
 assert(dispatchPolice(),'dispatch failed');
 const unit=cars.filter(c=>c.police&&!c.parked).at(-1);
 Object.assign(unit,{x:650,y:1110+i*100,angle:0});
}
issuePoliceFine();
assert(fineScreenTime===3&&!document.getElementById('fine-screen').hidden,'fine screen must appear immediately');
updateFineScreen(2.99);assert(!document.getElementById('fine-screen').hidden,'fine disappeared early');
updateFineScreen(.01);assert(document.getElementById('fine-screen').hidden,'fine did not disappear after three seconds');
for(let i=0;i<2400;i++)updatePolice(.05);
const patrols=cars.filter(c=>c.police);
for(const unit of patrols){
 assert(unit.parked,'patrol did not park: '+JSON.stringify({x:unit.x,y:unit.y,home:unit.home}));
 assert(Math.hypot(unit.x-unit.home.x,unit.y-unit.home.y)<1,'patrol missed assigned bay');
 assert(!unit.siren&&unit.speed===0,'parked patrol not stopped');
 assert(!drivingBlocked(unit,unit,true),'parked car overlaps obstacle');
}
const count=cars.length,positions=patrols.map(c=>[c.x,c.y]);wanted.level=1;
assert(dispatchPolice(),'parked patrol could not dispatch');
assert(cars.length===count,'dispatch should reuse parked patrol');
assert(patrols.some((c,i)=>!c.parked&&c.x===positions[i][0]&&c.y===positions[i][1]),'dispatch teleported patrol');
for(let i=0;i<60;i++)updatePolice(.05);
wanted.level=0;const fines=wallet.fines;
for(let i=0;i<2400;i++)updatePolice(.05);
assert(patrols.every(c=>c.parked),'patrol must return after escape too');
assert(wallet.fines===fines&&document.getElementById('fine-screen').hidden,'escape must not show a fine');
}
`;
new Function('document','innerWidth','innerHeight','devicePixelRatio','addEventListener','requestAnimationFrame',source+checks)(document,1280,720,1,noop,noop);
console.log('Police return checks passed: three separate bays, reuse without teleport and three-second fine screen.');
