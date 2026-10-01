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
const vehicle=cars[3],npc=pedestrians[0];
Object.assign(vehicle,{x:100,y:100,angle:0,speed:30,parked:false});
Object.assign(npc,{x:126,y:100,wait:0,hitCooldown:0});
drivenCar=vehicle;syncDriver();
updateDriving(.05);
assert(npc.hit,'player car impact did not knock pedestrian down');
assert(wanted.hits.length===1,'player impact not recorded for wanted level');
const start={x:npc.x,y:npc.y},hit=npc.hit;
assert(hitPedestrians(vehicle,vehicle,30)===0&&npc.hit===hit,'repeated contact restarts knockdown');
for(let i=0;i<7;i++)updatePedestrianReaction(npc,.05);
assert(Math.abs(Math.hypot(npc.x-start.x,npc.y-start.y)-10)<.1,'knockback must be about one metre');
assert(npc.bodyTilt>1.5&&npc.bodyLift===0,'pedestrian did not fall flat');
for(const f of npc.renderMesh)for(const point of f.points)assert(point.every(Number.isFinite),'invalid fallen mesh');
setPaused(true);const frozen=npc.hit.time;update(.2);assert(npc.hit.time===frozen,'reaction moves during pause');setPaused(false);
for(let i=0;i<19;i++)updatePedestrianReaction(npc,.05);
assert(npc.bodyTilt>0&&npc.bodyTilt<1.5,'standing-up animation missing');
for(let i=0;i<11;i++)updatePedestrianReaction(npc,.05);
assert(!npc.hit&&npc.fleeTime>0&&npc.bodyTilt===0,'pedestrian did not get up and flee');
const fleeStart={x:npc.x,y:npc.y};for(let i=0;i<20;i++)updatePedestrianReaction(npc,.05);
assert(Math.hypot(npc.x-fleeStart.x,npc.y-fleeStart.y)>20,'pedestrian is not running away');
for(let i=0;i<130;i++)updatePedestrianReaction(npc,.05);
assert(npc.fleeTime===0&&npc.displaced,'pedestrian must resume locally without teleporting');
// Normal traffic uses the same impact reaction and must not blame the player.
drivenCar=null;const traffic=cars[0],victim=pedestrians[1];
const pose=routePose(traffic.route,traffic.distance);Object.assign(traffic,pose,{speed:40,parked:false});
Object.assign(victim,{x:traffic.x+Math.cos(traffic.angle)*(traffic.length/2+1),y:traffic.y+Math.sin(traffic.angle)*(traffic.length/2+1),hitCooldown:0});
player.x=100;player.y=100;const hits=wanted.hits.length;
updateActors(.05);assert(victim.hit,'traffic car impact did not animate');
assert(wanted.hits.length===hits,'traffic collision blamed on player');
const third=pedestrians[2];Object.assign(third,{x:100,y:100,hitCooldown:0});
assert(hitPedestrians({police:true},{x:100,y:100,angle:0,width:22,length:46},25)>0&&third.hit,'police car cannot hit pedestrian');
// The throw is shortened at a wall instead of pushing the NPC through it.
const b=buildings[0],wallVictim=pedestrians[3];
Object.assign(wallVictim,{x:b.x-5,y:b.y+b.d/2,hitCooldown:0,hit:null});
hitPedestrians({},{x:wallVictim.x-12,y:wallVictim.y,angle:0,width:22,length:46},20);
for(let i=0;i<10;i++)updatePedestrianReaction(wallVictim,.05);
assert(!insideBuilding(wallVictim.x,wallVictim.y,b),'knockback passed through wall');
draw();
}
`;
new Function('document','innerWidth','innerHeight','devicePixelRatio','addEventListener','requestAnimationFrame',source+checks)(document,1280,720,1,noop,noop);
console.log('Pedestrian collision checks passed: player, traffic, police, knockback, fall, recovery, fleeing, cooldown, walls and pause.');
