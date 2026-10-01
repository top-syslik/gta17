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
const make=()=>({x:0,y:0,angle:0,length:42,speed:200,steering:steeringLimit(200),driftAngle:0});
const normal=make(),drift=make();
for(let i=0;i<20;i++){
 Object.assign(normal,driftMotion(normal,normal.speed*.05,.05,false,1));
 Object.assign(drift,driftMotion(drift,drift.speed*.05,.05,true,1));
}
assert(normal.driftAngle===0,'normal driving should retain grip');
assert(drift.driftAngle<-.1&&drift.angle>normal.angle,'handbrake must create oversteer and slip');
const slip=Math.abs(drift.driftAngle);drift.steering=0;
for(let i=0;i<20;i++)Object.assign(drift,driftMotion(drift,10,.05,false,0));
assert(Math.abs(drift.driftAngle)<slip*.05,'grip must recover after releasing handbrake');
for(const speed of [0,30,-100]){
 const car={...make(),speed};Object.assign(car,driftMotion(car,speed*.05,.05,true,1));
 assert(car.driftAngle===0,'no drift at low speed or in reverse');
}
const car=cars[2],wall=buildings[0];
Object.assign(car,{x:wall.x-car.length,y:wall.y+wall.d/2,angle:0,speed:500,steering:0,driftAngle:.1});
drivenCar=car;keys.clear();updateDriving(.1);
assert(car.rebound&&car.driftAngle===0,'collision must replace drift with rebound');
}
`;
new Function('document','innerWidth','innerHeight','devicePixelRatio','addEventListener','requestAnimationFrame',source+checks)(document,1280,720,1,noop,noop);
console.log('Drift checks passed: oversteer, grip recovery, low speed, reverse and collision.');
