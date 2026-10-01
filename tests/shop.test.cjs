const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8')+'\n'+fs.readFileSync(path.join(__dirname,'../shop.js'),'utf8');
const noop=()=>{};
const context=new Proxy({createLinearGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});
const elements={};
const document={getElementById:id=>elements[id]??={getContext:()=>context,addEventListener:noop,setAttribute:noop,focus:noop,dataset:{},querySelectorAll:()=>[]},addEventListener:noop,querySelectorAll:()=>[],pointerLockElement:null};
const saved={'asfalt-shop':JSON.stringify({vehicles:['skycar']})};const storage={getItem:k=>saved[k]??null,setItem:(k,v)=>saved[k]=v};
const checks=`
const assert=(ok,msg)=>{if(!ok)throw Error(msg);};
player.x=100;player.y=100;openShop();assert(!shopState.open,'shop opened remotely');
const ex=shopEntry.road[0]-shopEntry.x,ey=shopEntry.road[1]-shopEntry.y,len=Math.hypot(ex,ey);
player.x=shopEntry.x+ex/len*22;player.y=shopEntry.y+ey/len*22;
interactCar();assert(shopState.open&&!paused&&!document.getElementById('shop').hidden,'entrance failed');
assert(shopRoom.shelves.flatMap(s=>s.items).length===shopCatalog.length&&shopRoom.clerk.renderMesh.length,'shelves or seller missing');
const approach=id=>{const slot=shopRoom.shelves.flatMap(s=>s.items).find(i=>i.id===id);player.x=slot.frontX+(slot.frontX<100?20:-20);player.y=slot.y;player.angle=slot.frontX<100?Math.PI:0;};
const counter=()=>Object.assign(player,{x:165,y:108,angle:-Math.PI/2});
const exitShop=()=>{Object.assign(player,{x:165,y:330,angle:Math.PI/2});return closeShop();};
const purchase=id=>{approach(id);if(!pickShopItem(id))throw Error('cannot pick '+id);counter();const bought=checkoutShop();if(!bought)returnShopItem();return bought;};
const worldBefore=cars.map(c=>[c.x,c.y]);const startY=player.y;keys.add('w');update(.1);keys.clear();
assert(player.y<startY&&cars.every((c,i)=>c.x===worldBefore[i][0]&&c.y===worldBefore[i][1]),'interior movement or frozen exterior failed');
setPaused(true);const frozen=player.y;keys.add('w');update(.1);assert(player.y===frozen,'interior moved during pause');setPaused(false);
keys.add(' ');update(.05);assert(player.jumpHeight>0,'cannot jump inside shop');keys.clear();for(let i=0;i<25;i++)update(.05);assert(player.jumpHeight===0,'shop jump did not land');
assert(shopWalkBlocked(20,90)&&shopWalkBlocked(165,60)&&shopWalkBlocked(1,100),'shelves, counter or walls lack collision');
approach('pistol');const startingCash=wallet.cash;assert(pickShopItem('pistol'),'cannot pick shelf item');
assert(wallet.cash===startingCash&&!shopState.weapons.pistol,'charged or granted before checkout');
assert(!checkoutShop(),'remote checkout succeeded');
assert(!exitShop()&&shopState.open,'unpaid goods left the shop');returnShopItem();
assert(!shopState.basket.length&&wallet.cash===startingCash,'return charged money');

wallet.cash=5000;
assert(!purchase('ak-ammo')&&wallet.cash===5000,'ammo bought without weapon');
assert(purchase('pistol')&&wallet.cash===3800&&shopState.weapons.pistol===24,'weapon purchase failed');
assert(purchase('pistol')&&wallet.cash===3800&&shopState.weapons.pistol===24,'duplicate charged or ammo duplicated');
assert(purchase('pistol-ammo')&&shopState.weapons.pistol===48&&wallet.cash===3650,'ammo purchase failed');
assert(!purchase('gt360')&&wallet.cash===3650,'insufficient funds charged');
assert(!purchase('water')&&wallet.cash===3650,'full health purchase charged');
shopState.health=70;assert(purchase('meal')&&shopState.health===100,'healing or health cap failed');
// Failed whole-basket checkout must not grant even its affordable items.
approach('pistol-ammo');pickShopItem('pistol-ammo');approach('gt360');pickShopItem('gt360');counter();
const failedCash=wallet.cash,failedAmmo=shopState.weapons.pistol;
assert(!checkoutShop()&&wallet.cash===failedCash&&shopState.weapons.pistol===failedAmmo&&shopState.basket.length===2,'failed checkout partially committed');
returnShopItem();returnShopItem();
wallet.cash=1000000;
approach('gt280');pickShopItem('gt280');counter();const savedSpot=vehicleSpot;vehicleSpot=()=>null;
assert(!checkoutShop()&&wallet.cash===1000000&&!shopState.vehicles.includes('gt280'),'blocked delivery charged');vehicleSpot=savedSpot;returnShopItem();
// Two vehicle orders reserve separate spaces before payment.
approach('gt280');pickShopItem('gt280');approach('gt320');pickShopItem('gt320');counter();assert(checkoutShop(),'multi-vehicle checkout failed');
const firstCar=cars.find(c=>c.purchaseId==='gt280'),secondCar=cars.find(c=>c.purchaseId==='gt320');
assert(!polygonsOverlap(carCorners(firstCar),carCorners(secondCar)),'deliveries overlap');

for(const id of ['gt280','gt320','gt360','yamaha','kawasaki','ducati']){
 assert(purchase(id),'vehicle purchase failed: '+id);
 const vehicle=cars.find(c=>c.purchaseId===id);assert(vehicle?.renderMesh.length&&vehicle.unlocked&&!vehicle.driverOccupied,'vehicle not usable');
}
// A weapon and its ammunition can be checked out together regardless of pickup order.
approach('ak-ammo');pickShopItem('ak-ammo');approach('ak');pickShopItem('ak');counter();const bundleCash=wallet.cash;
assert(checkoutShop()&&shopState.weapons.ak===120&&wallet.cash===bundleCash-6950,'bundled weapon and ammo failed');
assert(!checkoutShop()&&wallet.cash===bundleCash-6950,'repeat checkout charged');
const count=cars.length,cash=wallet.cash;assert(purchase('yamaha')&&cars.length===count&&wallet.cash===cash,'recall duplicated or charged vehicle');
assert(!shopCatalog.some(i=>i.id==='skycar'||i.flight),'flying car still offered');
assert(!shopState.vehicles.includes('skycar'),'removed vehicle restored from save');
assert(exitShop()&&!paused&&!shopState.open,'exit failed');
const outsideCash=wallet.cash;assert(!pickShopItem('water')&&!checkoutShop()&&wallet.cash===outsideCash,'purchase outside shop');
drivenCar=null;player.x=100;player.y=100;player.angle=0;player.pitch=0;shopState.selected='pistol';
const npc=pedestrians[0];Object.assign(npc,{x:160,y:100,hit:null,health:100});
const ammo=shopState.weapons.pistol;assert(fireWeapon(),'shoot failed');assert(shopState.weapons.pistol===ammo-1&&npc.health===75,'shot did not hit');
assert(!fireWeapon()&&shopState.weapons.pistol===ammo-1,'cooldown failed');
for(let i=0;i<3;i++){shopState.cooldown=0;fireWeapon();}
assert(npc.hit,'NPC reaction missing');for(let i=0;i<60;i++)updatePedestrianReaction(npc,.05);
assert(!npc.hit&&npc.fleeTime>0,'NPC recovery failed');
const wall=buildings[0];player.x=wall.x-35;player.y=wall.y+wall.d/2;player.angle=0;
Object.assign(npc,{x:wall.x+wall.w+35,y:player.y,health:100,hit:null});shopState.cooldown=0;fireWeapon();
assert(npc.health===100,'bullet passed through building');
shopState.cooldown=0;shopState.weapons.pistol=0;assert(!fireWeapon(),'empty weapon fired');
setPaused(true);shopState.weapons.pistol=5;assert(!fireWeapon(),'fired while paused');setPaused(false);
hurtPlayer(25);assert(shopState.health===75,'health damage failed');
// Run the integrated update/render path with every delivered vehicle.
for(const vehicle of cars.filter(c=>c.purchaseId)){
 drivenCar=vehicle;vehicle.parked=false;syncDriver();update(.05);draw();vehicle.parked=true;
}
drivenCar=null;
saveShop();draw();
`;
function run(checks){new Function('document','innerWidth','innerHeight','devicePixelRatio','addEventListener','requestAnimationFrame','localStorage',source+'\n'+checks)(document,1280,720,1,noop,noop,storage);}
run(checks);
run(`if(shopState.weapons.pistol!==5||shopState.vehicles.length!==6||shopState.health!==75)throw Error('inventory did not survive reload');`);
console.log('Shop checks passed: entrance, purchases, funds, carrying, checkout, walking, seller, ammo, healing, vehicle delivery, motorcycles, removed flying car, weapons, recovery, jobs and persistence.');
