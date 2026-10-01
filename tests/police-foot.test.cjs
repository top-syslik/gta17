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
const unit=cars[0];
Object.assign(unit,{x:100,y:100,angle:0,speed:0,police:true,driverOccupied:true,parked:false,path:[],repath:0,home:{x:190,y:210}});
Object.assign(player,{x:100+unit.length/2+player.radius+1,y:100});
const money=wallet.cash;
wanted.level=1;updatePoliceStop(.01);
assert(wallet.cash===money,'proximity alone must not charge');
walkingBlocked(player.x-2,player.y);
assert(wallet.cash===money-500&&wanted.level===0,'walking into police must fine immediately');
updatePoliceStop(20);walkingBlocked(player.x-2,player.y);
assert(wallet.cash===money-500,'contact without wanted level must not charge again');
wanted.level=1;unit.speed=20;
updatePolice(.1);
assert(wallet.cash===money-1000&&wanted.level===0,'police approaching on foot must reach contact and fine');
Object.assign(player,{x:unit.x,y:unit.y-unit.width/2-player.radius});
for(const parked of [false,true]){
 unit.parked=parked;
 assert(nearbyCar()!==unit,'police must not be offered for boarding');
 interactCar();assert(!drivenCar&&!takeover,'police boarding allowed');
 startTakeover(unit);assert(!takeover,'police takeover allowed');
}
unit.parked=false;wanted.level=1;unit.recovery={time:1,elapsed:0,steer:0};
Object.assign(player,{x:unit.x-unit.length/2-player.radius-1,y:unit.y});
reversePolice(unit,.1);
assert(wallet.cash===money-1500&&wanted.level===0,'reversing police contact must fine');
}
`;
new Function('document','innerWidth','innerHeight','devicePixelRatio','addEventListener','requestAnimationFrame',source+checks)(document,1280,720,1,noop,noop);
console.log('Police foot checks passed: contact fine, no repeat, pursuit contact, reverse contact and boarding blocked.');
