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
const results=[];
for(const model of carModels){
 const car={performance:model.performance,speed:0,gear:1};
 const seen=new Set([1]);let shifts=0;
 for(let i=0;i<2400;i++){
  const gear=car.gear,rpm=car.rpm;
  updatePowertrain(car,1,false,.05);seen.add(car.gear);
  if(car.gear>gear){assert(car.rpm<rpm,'upshift must drop revs');shifts++;}
  assert(car.speed*.36<=model.performance.topSpeed+.001,'exceeded speed cap');
  if(i===99)results.push({name:model.name,speed:car.speed});
 }
 assert(seen.size===6&&shifts===5,'must shift through all six gears');
 assert(Math.abs(car.speed*.36-model.performance.topSpeed)<.01,'cannot reach top speed');
 const gear=car.gear;
 for(let i=0;i<40;i++)updatePowertrain(car,0,true,.05);
 assert(car.gear<gear,'braking must downshift');
 for(let i=0;i<200;i++)updatePowertrain(car,0,true,.05);
 assert(car.speed===0&&car.gear===1,'brakes must stop and reset gear');
 for(let i=0;i<100;i++)updatePowertrain(car,-1,false,.05);
 assert(car.speed<0&&Math.abs(car.speed)*.36<=20.001,'reverse cap failed');
 updatePowertrain(car,1,false,.05);assert(car.speed<0,'direction changed before stopping');
}
assert(results[2].speed>results[4].speed*1.5,'Porsche must accelerate much faster than Transit');
// A maximum-speed step must still detect a wall rather than jump through it.
const car=cars[2],wall=buildings[0];
Object.assign(car,{x:wall.x-car.length,y:wall.y+wall.d/2,angle:0,speed:car.performance.topSpeed/.36,steering:0});
drivenCar=car;keys.clear();updateDriving(.1);
assert(car.rebound&&car.speed<0,'high-speed wall must reflect the car');
}
`;
new Function('document','innerWidth','innerHeight','devicePixelRatio','addEventListener','requestAnimationFrame',source+checks)(document,1280,720,1,noop,noop);
console.log('Powertrain checks passed: model performance, six gears, RPM, downshifts, braking, reverse, high-speed collision.');
