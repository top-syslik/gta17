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
const first=cars[0],second=cars[1];
const reset=(car,values={})=>Object.assign(car,{x:100,y:100,angle:0,speed:0,steering:0,driftAngle:0,rebound:null,parked:true,wheelTravel:0},values);
const bounce=speed=>{reset(first,{speed});resolveVehicleImpact(first,{normal:{x:-1,y:0},other:null});return -first.rebound.x;};
assert(bounce(250)>bounce(50)*5,'stronger impact must rebound farther');
reset(first,{speed:200});resolveVehicleImpact(first,{normal:{x:-1,y:0},other:null});
assert(first.speed<0,'wall impact did not reverse velocity');const before=first.x;updateVehicleRebounds(.05);assert(first.x<before,'rebound has no displacement');
const frozen=first.x;setPaused(true);update(.05);assert(first.x===frozen,'rebound moved during pause');setPaused(false);
for(let i=0;i<100;i++)updateVehicleRebounds(.05);assert(!first.rebound,'rebound never settles');
// Equal masses, head-on: both cars must move away from the contact.
reset(first,{x:100,speed:150});reset(second,{x:150,angle:Math.PI,speed:150});
const normal=collisionNormal(carCorners({...first,x:110}),carCorners(second));
resolveVehicleImpact(first,{normal,other:second});
assert(first.rebound.x<0&&second.rebound.x>0,'head-on impact did not rebound both cars');
const x1=first.x,x2=second.x;updateVehicleRebounds(.05);assert(first.x<x1&&second.x>x2,'both cars must move after collision');
// A broadside impact carries the parked car sideways, independent of its heading.
reset(first,{speed:200});reset(second,{x:150,angle:Math.PI/2});resolveVehicleImpact(first,{normal:{x:-1,y:0},other:second});
assert(second.rebound.x>0&&Math.abs(second.rebound.y)<.001,'broadside impulse lost');
const victimX=second.x;updateVehicleRebounds(.05);assert(second.x>victimX,'parked vehicle did not move sideways');
const displaced=second.x;updateActors(.05);assert(second.x===displaced,'traffic snapped back to its route');
// Heavier vehicles receive less velocity from the same impact.
const launch=name=>{reset(first,{speed:200});reset(second,{x:150,name});resolveVehicleImpact(first,{normal:{x:-1,y:0},other:second});return second.rebound.x;};
assert(launch('Ford Transit')<launch('Volkswagen Golf'),'vehicle mass has no effect');
// Full movement path: transfer an impact through a row of parked cars.
const third=cars[2];reset(first,{x:100,speed:650});reset(second,{x:158});reset(third,{x:215});drivenCar=first;
updateDriving(.1);assert(first.rebound&&second.rebound,'driving collision did not create both impulses');
for(let i=0;i<8;i++)updateVehicleRebounds(.05);
assert(third.x>215||third.rebound,'chain collision did not reach third car');
assert(!polygonsOverlap(carCorners(first),carCorners(second))&&!polygonsOverlap(carCorners(second),carCorners(third)),'collision allowed overlapping cars');
reset(third,{x:700,y:100});reset(second,{x:500,y:100});drivenCar=first;
for(const [x,y,angle] of [[50,100,Math.PI],[world.width-50,100,0],[100,50,-Math.PI/2],[100,world.height-50,Math.PI/2]]){
 reset(first,{x,y,angle,speed:300});keys.clear();updateDriving(.1);
 assert(first.rebound&&first.speed<0,'map edge did not reflect car');
 for(let i=0;i<4;i++)updateVehicleRebounds(.05);
 assert(carCorners(first).every(p=>p[0]>=18&&p[0]<=world.width-18&&p[1]>=18&&p[1]<=world.height-18),'escaped map during rebound');
}
// Throttle restores control during both backward and sideways recoil.
for(const [gas,velocity] of [['w',{x:-100,y:0}],['s',{x:100,y:0}],['w',{x:0,y:100}]]){
 reset(first);drivenCar=first;setVehicleRebound(first,velocity);keys.clear();keys.add(gas);
 const x=first.x;updateDriving(.05);
 assert(!first.rebound,'throttle did not restore control during recoil');
 assert(gas==='w'?first.speed>0&&first.x>x:first.speed<0&&first.x<x,'cannot accelerate immediately after collision');
}
keys.clear();reset(first);setVehicleRebound(first,{x:0,y:100});interactCar();
assert(!drivenCar&&first.parked&&!first.rebound&&first.speed===0,'exit during sideways recoil failed');
assert(!blocked(player.x,player.y),'recoil exit placed player in an obstacle');
const parkedX=first.x,parkedY=first.y;updateVehicleRebounds(.1);
assert(first.x===parkedX&&first.y===parkedY,'exited vehicle kept recoiling');
}
`;
new Function('document','innerWidth','innerHeight','devicePixelRatio','addEventListener','requestAnimationFrame',source+checks)(document,1280,720,1,noop,noop);
console.log('Rebound checks passed: impact strength, walls, car pairs, sideways motion, mass, map edges, pause, damping and safe exit.');
