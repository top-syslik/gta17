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
player.x=100;player.y=100;player.angle=0;
keys.add(' ');update(.05);assert(player.jumpHeight>0&&player.jumpVelocity>0,'jump did not start');
const y=player.jumpHeight,v=player.jumpVelocity;
setPaused(true);update(.2);assert(player.jumpHeight===y&&player.jumpVelocity===v,'jump moves during pause');setPaused(false);
keys.add(' ');update(.05);assert(player.jumpVelocity<v,'repeated jump added velocity in air');
keys.add('w');const x=player.x;update(.05);assert(player.x>x,'cannot move while jumping');keys.delete('w');
for(let i=0;i<40;i++)update(.05);
assert(player.jumpHeight===0&&player.jumpVelocity===0,'holding space bounced or failed to land');
keys.delete(' ');update(.05);keys.add(' ');update(.05);assert(player.jumpHeight>0,'second press did not jump');
const originalDraw=drawWorld;let camera;
drawWorld=(pose)=>{camera=pose;};draw();drawWorld=originalDraw;
assert(camera.eye===17+player.jumpHeight,'camera does not follow jump');
const car=cars[0];Object.assign(car,{x:100,y:100,speed:50,angle:0,steering:0});drivenCar=car;
update(.05);assert(player.jumpHeight===0&&player.jumpVelocity===0&&car.speed<50,'space must brake in car');
assert(document.getElementById('jump-brake').textContent==='Brzda','mobile brake label missing');
drivenCar=null;keys.clear();update(.05);assert(document.getElementById('jump-brake').textContent==='Skok','mobile jump label missing');
resetJump();
}
`;
new Function('document','innerWidth','innerHeight','devicePixelRatio','addEventListener','requestAnimationFrame',source+checks)(document,1280,720,1,noop,noop);
console.log('Jump checks passed: takeoff, landing, input edges, air movement, pause, camera and vehicle brake.');
