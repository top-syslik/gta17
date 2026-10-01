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
const originalPose={...player};
Object.assign(player,{x:120,y:100,angle:0,pitch:0,jumpHeight:0});
thirdPerson=false;assert(gameplayCamera(null).x===player.x,'first-person camera moved');
thirdPerson=true;
const chase=gameplayCamera(null);
assert(chase.x<player.x&&chase.eye>17,'third-person camera must follow behind and above');
assert(player.x===120&&player.y===100,'camera changed player position');
player.jumpHeight=12;assert(gameplayCamera(null).eye>chase.eye,'camera does not follow jumping');
player.x=20;assert(gameplayCamera(null).x>=4,'camera escaped map');
thirdPerson=false;Object.assign(player,originalPose);
const car=cars[3];Object.assign(car,{x:100,y:100,angle:0,speed:0,parked:true,unlocked:true});poseMesh(car);
player.x=100;player.y=130;
assert(nearbyCar()===car,'nearby car not found');
interactCar();assert(drivenCar===car&&!car.parked,'boarding failed');
assert(player.x===car.x&&player.angle===car.angle,'driver camera missing');
thirdPerson=true;
const carCamera=gameplayCamera(car);assert(carCamera.x<car.x&&carCamera.eye>21,'vehicle chase camera missing');
draw();thirdPerson=false;
keys.add('w');for(let i=0;i<20;i++)update(.05);
assert(car.x>110&&car.speed>0&&car.wheelTravel>0,'accelerating failed');
const beforeTurn=car.angle;keys.add('d');for(let i=0;i<8;i++)update(.05);
assert(car.angle>beforeTurn&&car.steering>0,'steering failed');
interactCar();assert(!drivenCar&&car.parked&&car.speed===0,'exit at speed failed');
assert(!blocked(player.x,player.y),'unsafe moving exit');
interactCar();assert(drivenCar===car,'reentry after moving exit failed');
setPaused(true);const frozen=[car.x,car.y,car.wheelTravel];update(.05);
assert(car.x===frozen[0]&&car.y===frozen[1]&&car.wheelTravel===frozen[2],'driving during pause');
setPaused(false);keys.add(' ');for(let i=0;i<30;i++)update(.05);
assert(car.speed===0,'brake failed');keys.clear();
keys.add('s');for(let i=0;i<10;i++)update(.05);
assert(car.speed<0,'reverse failed');keys.clear();keys.add(' ');
for(let i=0;i<20;i++)update(.05);keys.clear();
const b=buildings[0];assert(drivingBlocked({...car,x:b.x+10,y:b.y+10},car),'building collision missing');
const other=cars[0];assert(drivingBlocked({...car,x:other.x,y:other.y},car),'vehicle collision missing');
const npc=pedestrians[0];assert(drivingBlocked({...car,x:npc.x,y:npc.y},car),'pedestrian collision missing');
assert(drivingBlocked({...car,x:0,y:0},car),'world boundary missing');
draw();interactCar();assert(drivenCar===null&&car.parked,'exit failed');
assert(!blocked(player.x,player.y),'unsafe exit');
const parkedX=car.x,parkedY=car.y;for(let i=0;i<10;i++)update(.05);
assert(car.x===parkedX&&car.y===parkedY,'abandoned car snapped to traffic route');
// Every possible exit occupied: the player must remain in the car.
player.x=100;player.y=130;Object.assign(car,{x:100,y:100,angle:0,speed:0});interactCar();
const blockers=[];
for(const side of [-1,1])for(const forward of [0,-car.length*.3,car.length*.3])blockers.push({x:car.x+forward,y:car.y+side*(car.width/2+player.radius+5)});
pedestrians.push(...blockers);interactCar();assert(drivenCar===car,'exited into occupied space');
pedestrians.splice(pedestrians.length-blockers.length);interactCar();assert(!drivenCar,'exit should recover when space clears');
}
`;
new Function('document','innerWidth','innerHeight','devicePixelRatio','addEventListener','requestAnimationFrame',source+checks)(document,1280,720,1,noop,noop);
console.log('Driving checks passed: entry, movement, steering, reverse, brakes, collision, pause, safe exit.');
