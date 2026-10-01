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
const target=cars[0];Object.assign(target,{x:100,y:100,angle:0,speed:30,parked:false,driverOccupied:true});poseMesh(target);
player.x=100;player.y=70;
const count=pedestrians.length;
interactCar();assert(takeover?.car===target&&!drivenCar,'occupied car must start takeover');
assert(target.speed===0,'car must stop during takeover');
interactCar();assert(pedestrians.length===count,'repeated E duplicated driver');
keys.add('w');for(let i=0;i<12;i++)update(.05);
assert(!target.windowBroken&&!drivenCar&&target.x===100,'occupied car glass or input lock failed');
assert(target.driverOccupied,'driver removed before pulling stage');
assert(glassShards.length===0,'occupied car must not shatter glass');
setPaused(true);const time=takeover.time;update(.5);assert(takeover.time===time,'pause did not freeze takeover');setPaused(false);
for(let i=0;i<10;i++)update(.05);
assert(!target.driverOccupied&&pedestrians.length===count+1,'driver was not ejected');
const driver=takeover.driver;assert(driver.displaced,'ejected driver is not an NPC');
assert(target.doorOpen>0&&driver.extractionPose&&driver.bodyTilt>0,'door must open while driver leans out');
assert(target.renderMesh.some(f=>f.doorOpening&&f.openCutout),'fixed body must expose open doorway');
const rectangles=[],oldFill=ctx.fillRect;ctx.fillRect=(...args)=>rectangles.push(args);drawTakeover();ctx.fillRect=oldFill;
assert(rectangles.length===1&&rectangles[0][3]===3,'large hand blobs must not cover extraction');
draw();for(let i=0;i<20;i++)update(.05);
assert(target.doorOpen>0&&!drivenCar,'door must open before driving');
assert(!driver.extractionPose&&driver.bodyTilt===0&&driver.bodyLift===0,'driver must stand upright after extraction');
assert(target.renderMesh.some(f=>f.driverDoor&&!f.hidden),'opened door must be rendered');
for(let i=0;i<24;i++)update(.05);
assert(!takeover&&drivenCar===target&&!target.driverOccupied,'control transfer failed');
assert(!target.windowBroken&&target.unlocked&&target.doorOpen===0,'window or door state lost');
assert(!keys.size,'held input must not accelerate immediately after animation');
assert(pedestrians.length===count+1,'duplicate driver');
const driverBefore=[driver.x,driver.y];for(let i=0;i<90;i++)update(.05);
assert(glassShards.length===0,'glass particles never expire');
assert(driver.x!==driverBefore[0]||driver.y!==driverBefore[1],'ejected driver never walks away');
keys.add('w');for(let i=0;i<10;i++)update(.05);assert(target.speed>0,'driving does not unlock');
keys.clear();keys.add(' ');for(let i=0;i<20;i++)update(.05);keys.clear();interactCar();
assert(!drivenCar,'cannot exit taken car');interactCar();assert(drivenCar===target&&!takeover,'unlocked car must not replay takeover');
interactCar();
Object.assign(target,{x:100,y:100,angle:0,speed:0,parked:true,driverOccupied:false,unlocked:false,windowBroken:false});poseMesh(target);
player.x=100;player.y=70;
const emptyCount=pedestrians.length;
interactCar();assert(takeover?.breakWindow&&!drivenCar,'empty locked car must start break-in');
for(let i=0;i<12;i++)update(.05);
assert(target.windowBroken&&!drivenCar,'empty car must break glass before entry');
assert(glassShards.length===24,'glass must shatter into particles');
assert(target.renderMesh.flatMap(f=>f.details).filter(d=>d.driverWindow).every(d=>d.hidden),'broken glass remains opaque');
const windowWall=target.renderMesh.find(f=>f.cutout&&f.details.some(d=>d.driverWindow)&&!f.driverDoor);
assert(windowWall,'window needs a geometric opening');
const glass=windowWall.details.find(d=>d.driverWindow);
const center=glass.points.reduce((s,p)=>[s[0]+p[0]/4,s[1]+p[2]/4],[0,0]);
assert(windowWall.cutout.every(poly=>!insideBuilding(center[0],center[1],{outline:poly.map(p=>[p[0],p[2]])})),'window frame covers the hole');

setPaused(true);const shardLife=glassShards[0].life;update(.5);assert(glassShards[0].life===shardLife,'glass moves during pause');setPaused(false);
for(let i=0;i<52;i++)update(.05);
assert(drivenCar===target&&!takeover&&target.unlocked,'empty car entry failed');
assert(pedestrians.length===emptyCount,'empty car spawned a driver');
interactCar();interactCar();assert(drivenCar===target&&!takeover,'broken into car must allow immediate re-entry');

}
`;
new Function('document','innerWidth','innerHeight','devicePixelRatio','addEventListener','requestAnimationFrame',source+checks)(document,1280,720,1,noop,noop);
console.log('Takeover checks passed: ordered stages, driver NPC, pause, input lock, door, persistent damage, re-entry.');
