'use strict';
// Shop, owned equipment and arcade vehicle upgrades share the existing world.
const shopCatalog = [
  {id:'pistol',name:'Pistole',group:'Zbraně',price:1200,ammo:24,damage:25,interval:.3,range:360},
  {id:'rifle',name:'Rifle',group:'Zbraně',price:3500,ammo:30,damage:55,interval:.65,range:700},
  {id:'ak',name:'AK',group:'Zbraně',price:6500,ammo:60,damage:32,interval:.12,range:500},
  {id:'minigun',name:'Rotačák',group:'Zbraně',price:18000,ammo:200,damage:18,interval:.055,range:420},
  ...[['pistol','Pistolové náboje',24,150],['rifle','Náboje do rifle',30,300],['ak','Náboje do AK',60,450],['minigun','Pás do rotačáku',200,900]].map(([weapon,name,amount,price])=>({id:weapon+'-ammo',name,group:'Náboje',weapon,amount,price})),
  {id:'gt280',name:'Apex GT',group:'Auta',price:28000,top:280,acceleration:110,base:2,color:'#e4b95e'},
  {id:'gt320',name:'Vortex R',group:'Auta',price:65000,top:320,acceleration:130,base:5,color:'#688bec'},
  {id:'gt360',name:'Tempest X',group:'Auta',price:120000,top:360,acceleration:150,base:2,color:'#cd4b63'},
  {id:'yamaha',name:'Yamaha R1',group:'Motorky',price:15000,top:285,acceleration:115,bike:true,color:'#4c73d9'},
  {id:'kawasaki',name:'Kawasaki Ninja',group:'Motorky',price:24000,top:310,acceleration:130,bike:true,color:'#80ce4d'},
  {id:'ducati',name:'Ducati Panigale',group:'Motorky',price:35000,top:330,acceleration:145,bike:true,color:'#dd5045'},
  {id:'sandwich',name:'Sendvič',group:'Jídlo a pití',price:80,heal:30},
  {id:'meal',name:'Teplé jídlo',group:'Jídlo a pití',price:180,heal:65},
  {id:'water',name:'Voda',group:'Jídlo a pití',price:35,heal:15},
  {id:'energy',name:'Energetický drink',group:'Jídlo a pití',price:100,heal:40}
];
const shopState={open:false,basket:[],outside:null,health:100,weapons:{},selected:null,vehicles:[],cooldown:0,flash:0};
const shopEntry=buildings.find(b=>b.kind==='shop').entrance;
function saveShop(){
  try{
    localStorage.setItem('asfalt-cash',String(wallet.cash));
    localStorage.setItem('asfalt-shop',JSON.stringify({health:shopState.health,weapons:shopState.weapons,selected:shopState.selected,vehicles:shopState.vehicles}));
  }catch{}
}
try{
  const data=JSON.parse(localStorage.getItem('asfalt-shop')||'null');
  if(data){
    if(Number.isFinite(data.health))shopState.health=Math.max(1,Math.min(100,data.health));
    for(const item of shopCatalog.filter(i=>i.group==='Zbraně'))if(Number.isSafeInteger(data.weapons?.[item.id])&&data.weapons[item.id]>=0)shopState.weapons[item.id]=Math.min(99999,data.weapons[item.id]);
    if(Object.hasOwn(shopState.weapons,data.selected))shopState.selected=data.selected;
    if(Array.isArray(data.vehicles))shopState.vehicles=[...new Set(data.vehicles.filter(id=>shopCatalog.some(i=>i.id===id&&i.top)))];
  }
}catch{}
function nearShop(){
  if(shopState.open||drivenCar||takeover)return false;
  if(Math.hypot(player.x-shopEntry.x,player.y-shopEntry.y)>58)return false;
  for(let t=0;t<1;t+=.1)if(buildings.some(b=>b.kind!=='shop'&&insideBuilding(player.x+(shopEntry.x-player.x)*t,player.y+(shopEntry.y-player.y)*t,b,2)))return false;
  return true;
}
function shopMessage(message){document.getElementById('shop-message').textContent=message;}
const shopRoom={width:330,depth:370,exit:{x:165,y:351},counter:{x:165,y:88},jobs:{x:105,y:79},shelves:[],scene:[],clerk:null};
function buildShopInterior(){
  const start=faces.length;
  ground(0,0,330,370,'#69776c');
  for(let x=0;x<330;x+=30)for(let y=0;y<370;y+=30)ground(x,y,29.5,29.5,(x/30+y/30)%2?'#788378':'#879183',.05);
  box(-5,-5,340,5,65,'#a4b3a3');box(-5,0,5,375,65,'#71877a');box(330,0,5,375,65,'#71877a');
  box(0,370,142,5,65,'#a4b3a3');box(188,370,142,5,65,'#a4b3a3');box(142,370,46,3,43,'#243f3d');
  ground(0,0,330,370,'#c2c7ad',65);
  for(const x of [85,235])for(const y of [85,190,290])ground(x-22,y-4,44,8,'#f2efc7',64.8);
  // Broad aisles leave room to approach each shelf and carry the goods out.
  const layout=[['Zbraně',false,90],['Náboje',false,195],['Jídlo a pití',false,300],['Auta',true,90],['Motorky',true,195]];
  for(const [group,right,center] of layout){
    const items=shopCatalog.filter(i=>i.group===group),length=Math.max(46,items.length*21+8),x=right?288:12,y=center-length/2;
    box(x,y,30,length,3,'#394a41',0);box(x,y,30,2,36,'#46594c');box(x,y+length-2,30,2,36,'#46594c');
    for(const z of [9,29])box(x,y,30,length,1.4,'#c1aa78',z);
    box(right?316:12,y,2,length,36,'#526655');
    const shelf={group,right,x,y,w:30,d:length,center,items:[]};
    items.forEach((item,index)=>{
      const slot={id:item.id,x:right?302:29,y:center+(index-(items.length-1)/2)*21,z:10.4,frontX:right?282:48,scene:[]};
      const itemStart=faces.length;
      if(item.top){
        box(slot.x-5,slot.y-7,10,14,1,item.color,11);
        box(slot.x-4,slot.y-6,8,12,10,'#e0dfbd',12);
        box(slot.x-4.2,slot.y-4,8.4,8,3,item.color,15);
      }else if(item.group==='Zbraně'){
        const barrel=item.id==='pistol'?8:15;
        box(slot.x-2,slot.y-barrel/2,4,barrel,3,'#2d383b',12);
        box(slot.x-3,slot.y+2,6,4,6,item.id==='ak'?'#a57850':'#5e7374',10.5);
        if(item.id==='minigun')for(const offset of [-2,2])box(slot.x+offset-1,slot.y-8,2,11,2,'#9fabad',16);
      }else if(item.weapon){
        box(slot.x-6,slot.y-6,12,12,7,'#7e9061',10.5);box(slot.x-6.2,slot.y-2,12.4,3,5,'#d9c376',12);
      }else if(item.id==='water'||item.id==='energy'){
        box(slot.x-3,slot.y-3,6,6,12,item.id==='water'?'#79bed0':'#b5d768',10.5);box(slot.x-2,slot.y-2,4,4,2,'#d9e5ca',22.5);
      }else{
        box(slot.x-6,slot.y-6,12,12,5,item.id==='sandwich'?'#dcb574':'#b8654d',10.5);box(slot.x-5,slot.y-5,10,10,1,'#e8d4a1',15.5);
      }
      slot.scene=faces.splice(itemStart);shelf.items.push(slot);
    });
    shopRoom.shelves.push(shelf);
  }
  box(118,45,94,27,14,'#805f42');box(115,43,100,31,2,'#ccb987',14);
  box(143,49,16,14,3,'#293e3d',16);box(145,50,12,3,9,'#24383b',19);box(147,49.8,8,1,5,'#a6d58e',21);
  box(93,62,14,15,3,'#40594e',0);box(98,68,4,4,27,'#6a7c69');box(91,67,18,3,14,'#d5bd76',23);
  shopRoom.scene=faces.splice(start);
  const clerkStart=faces.length;person('#567b59','#c29c79');
  box(-2.5,-2.6,5,.4,6,'#e1cf9f',14);box(-1.8,-2.95,1,.3,.7,'#253532',24);box(.8,-2.95,1,.3,.7,'#253532',24);
  box(-.8,-2.8,1.6,.3,.3,'#765344',22.7);
  shopRoom.clerk={x:170,y:29,angle:Math.PI/2,walking:false};attachMesh(shopRoom.clerk,clerkStart);poseMesh(shopRoom.clerk);
}
function openShop(){
  if(paused||shopState.open||!nearShop())return false;
  shopState.outside={x:player.x,y:player.y,angle:player.angle,pitch:player.pitch};
  globalThis.cityWeapons?.cancel();
  shopState.open=true;shopState.basket=[];keys.clear();resetJump();
  Object.assign(player,{x:165,y:329,angle:-Math.PI/2,pitch:0});
  document.body?.classList?.add('shopping');document.getElementById('shop').hidden=false;
  globalThis.cityAudio?.setPaused(true);
  renderShop();shopMessage('Prodavač: Dobrý den! Vyberte si z polic a přineste zboží ke mně na pokladnu.');
  updateShopInterior(0);return true;
}
function atShopExit(){return Math.hypot(player.x-shopRoom.exit.x,player.y-shopRoom.exit.y)<34;}
function closeShop(){
  if(!shopState.open||paused||!atShopExit())return false;
  if(shopState.basket.length){shopMessage('Nejdřív zaplať u pokladny, nebo vrať zboží do polic pomocí R.');return false;}
  shopState.open=false;resetJump();Object.assign(player,shopState.outside);shopState.outside=null;
  document.getElementById('shop').hidden=true;document.body?.classList?.remove('shopping');
  keys.clear();saveShop();globalThis.cityAudio?.setPaused(false);updateShopHud();return true;
}
function itemDescription(item){
  if(item.top)return item.top+' km/h · '+(item.bike?'motorka':'automat')+' · prodejní kartička';
  if(item.heal)return '+'+item.heal+' zdraví · použiješ po zaplacení';
  if(item.weapon)return item.amount+' nábojů · '+shopCatalog.find(i=>i.id===item.weapon).name;
  return 'Včetně '+item.ammo+' nábojů';
}
function shopItemCost(item){
  return (item.top?shopState.vehicles.includes(item.id):Object.hasOwn(shopState.weapons,item.id))?0:item.price;
}
function renderShop(){
  const basket=shopState.basket.map(id=>shopCatalog.find(i=>i.id===id));
  document.getElementById('shop-money').textContent=wallet.cash.toLocaleString('cs-CZ')+' Kč · zdraví '+Math.ceil(shopState.health)+'/100';
  document.getElementById('shop-basket').innerHTML=basket.length?basket.map(i=>'<li>'+i.name+' <span>'+shopItemCost(i).toLocaleString('cs-CZ')+' Kč</span></li>').join(''):'<li>Prázdný · vezmi zboží z police</li>';
  document.getElementById('shop-total').textContent='U pokladny: '+basket.reduce((sum,i)=>sum+shopItemCost(i),0).toLocaleString('cs-CZ')+' Kč';
  document.getElementById('shop-return').disabled=!basket.length;
}
function shopTarget(){
  if(!shopState.open)return null;
  const targets=[{kind:'checkout',...shopRoom.counter,reach:42},{kind:'exit',...shopRoom.exit,reach:34},{kind:'job',...shopRoom.jobs,reach:29}];
  for(const shelf of shopRoom.shelves)for(const slot of shelf.items)targets.push({kind:'item',id:slot.id,x:slot.frontX,y:slot.y,reach:38});
  return targets.map(target=>{
    const dx=target.x-player.x,dy=target.y-player.y,distance=Math.hypot(dx,dy),angle=Math.abs(angleDelta(player.angle,Math.atan2(dy,dx)));
    return {...target,distance,angle,score:distance+angle*24};
  }).filter(t=>t.distance<t.reach&&(t.distance<8||t.angle<.8)).sort((a,b)=>a.score-b.score)[0]||null;
}
function pickShopItem(id){
  const target=shopTarget();
  if(paused||target?.kind!=='item'||target.id!==id)return false;
  if(shopState.basket.includes(id)){shopMessage('Tento kus už neseš. Další si můžeš vzít po zaplacení.');return false;}
  shopState.basket.push(id);renderShop();
  const item=shopCatalog.find(i=>i.id===id);
  shopMessage((item.top?'Neseš prodejní kartičku: ':'Neseš: ')+item.name+'. Přines ji ke pokladně.');return true;
}
function returnShopItem(){
  if(!shopState.open||paused||!shopState.basket.length)return false;
  const id=shopState.basket.pop(),item=shopCatalog.find(i=>i.id===id);renderShop();shopMessage(item.name+' vráceno do police.');return true;
}
function interactShop(){
  if(paused)return;
  const target=shopTarget();if(!target)return;
  if(target.kind==='item')pickShopItem(target.id);
  else if(target.kind==='checkout')checkoutShop();
  else if(target.kind==='exit')closeShop();
  else if(target.kind==='job')takeJob();
}
function shopWalkBlocked(x,y){
  const r=player.radius;
  if(x<r||y<r||x>shopRoom.width-r||y>shopRoom.depth-r)return true;
  const obstacles=[...shopRoom.shelves,{x:115,y:43,w:100,d:31},{x:93,y:62,w:14,d:15},{x:161,y:20,w:18,d:18}];
  return obstacles.some(o=>x>o.x-r&&x<o.x+o.w+r&&y>o.y-r&&y<o.y+o.d+r);
}
function updateShopInterior(dt){
  if(paused)return;
  player.angle+=(Number(keys.has('arrowright'))-Number(keys.has('arrowleft')))*dt*1.8;
  const forward=Number(keys.has('w')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown')),side=Number(keys.has('d'))-Number(keys.has('a'));
  const length=Math.hypot(forward,side);
  if(length){
    const step=(keys.has('shift')?95:65)*dt/length,dx=(Math.cos(player.angle)*forward-Math.sin(player.angle)*side)*step,dy=(Math.sin(player.angle)*forward+Math.cos(player.angle)*side)*step;
    const count=Math.max(1,Math.ceil(Math.hypot(dx,dy)/3));
    for(let i=0;i<count;i++){if(!shopWalkBlocked(player.x+dx/count,player.y))player.x+=dx/count;if(!shopWalkBlocked(player.x,player.y+dy/count))player.y+=dy/count;}
  }
  const target=shopTarget(),interact=document.getElementById('interact');
  interact.hidden=!target;
  const item=target?.kind==='item'?shopCatalog.find(i=>i.id===target.id):null;
  interact.textContent=item?(shopState.basket.includes(item.id)?'Už neseš · R: vrátit':'E · Vzít '+item.name):target?.kind==='checkout'?'E · Zaplatit prodavači':target?.kind==='exit'?'E · Vyjít ven':'E · Práce pokladního';
  document.getElementById('shop-focus').textContent=item?item.name+' · '+shopItemCost(item).toLocaleString('cs-CZ')+' Kč · '+itemDescription(item):target?.kind==='checkout'?'POKLADNA · Přines vybrané zboží a stiskni E':target?.kind==='exit'?'VÝCHOD · E: zpátky do města':target?.kind==='job'?'PRÁCE POKLADNÍHO · E: nastoupit na směnu':'WASD: chůze · mezerník: skok · E: vzít / zaplatit · R: vrátit';
}
function shopLabel(text,x,y,z,color='#f1eed9',selected=false){
  const dx=x-player.x,dy=y-player.y,c=Math.cos(player.angle),s=Math.sin(player.angle),depth=dx*c+dy*s;
  if(depth<6)return;
  const focal=width*.72,sx=width/2+(-dx*s+dy*c)*focal/depth,sy=height*.48+player.pitch*height*.65-(z-17-player.jumpHeight)*focal/depth;
  if(sx<0||sx>width||sy<0||sy>height)return;
  const size=selected?15:Math.max(9,Math.min(17,650/depth)),w=Math.min(width-24,text.length*size*.55+14);
  ctx.fillStyle=selected?'#1a3229ee':'#1b2e2bdc';ctx.fillRect(sx-w/2,sy-size,w,size+8);ctx.fillStyle=color;ctx.font=(selected?'bold ':'')+size+'px Arial';ctx.textAlign='center';ctx.fillText(text,sx,sy+1,w-8);ctx.textAlign='start';
}
function drawShopInterior(){
  const stock=shopRoom.shelves.flatMap(s=>s.items).filter(slot=>!shopState.basket.includes(slot.id)).flatMap(slot=>slot.scene);
  drawWorld({...player,eye:17+player.jumpHeight},width,height,shopRoom.scene.concat(stock,shopRoom.clerk.renderMesh));
  const target=shopTarget();
  shopLabel('POKLADNA · PRODAVAČ',165,39,39,'#e5ef95');shopLabel('VÝCHOD',165,369,37,'#e5ef95');shopLabel('PRÁCE',100,68,38,'#f1d083');
  for(const shelf of shopRoom.shelves){
    shopLabel(shelf.group.toUpperCase(),shelf.right?288:42,shelf.center,39);
    for(const slot of shelf.items){
      const item=shopCatalog.find(i=>i.id===slot.id),selected=target?.id===slot.id;
      if(Math.hypot(slot.x-player.x,slot.y-player.y)<105||selected)shopLabel(item.name+' · '+shopItemCost(item).toLocaleString('cs-CZ')+' Kč',slot.frontX,slot.y,21,selected?'#e5ef95':'#f1eed9',selected);
    }
  }
  ctx.fillStyle='#f4f2d4';ctx.beginPath();ctx.arc(width/2,height*.48+player.pitch*height*.65,2,0,Math.PI*2);ctx.fill();
  if(shopState.basket.length){
    const x=width*.65,y=height*.86,w=Math.min(200,width*.3);
    ctx.fillStyle='#a47b47';ctx.fillRect(x,y,w,height*.14);ctx.strokeStyle='#dabd7d';ctx.lineWidth=5;ctx.strokeRect(x-4,y-5,w+8,Math.min(65,height*.1));
    shopState.basket.slice(-5).forEach((id,i)=>{const item=shopCatalog.find(p=>p.id===id);ctx.fillStyle=item.color||(item.weapon?'#91a765':item.heal?'#d0b772':'#405452');ctx.fillRect(x+9+i*w/6,y-15-(i%2)*10,w/7,30);});
    ctx.fillStyle='#ebd1ab';ctx.fillRect(x-13,y+23,16,35);
  }
}
buildShopInterior();
function vehicleSpot(item,reserved=[]){
  const pose={length:item.bike?30:carModels[item.base].length,width:item.bike?10:carModels[item.base].width,angle:0};
  const road=shopEntry.road;
  for(let radius=0;radius<=180;radius+=30)for(let i=0;i<16;i++){
    const angle=i*Math.PI/8,x=road[0]+Math.cos(angle)*radius,y=road[1]+Math.sin(angle)*radius;
    const candidate={...pose,x,y};
    const outside=shopState.open?shopState.outside:player;
    if(!drivingBlocked(candidate,null)&&!reserved.some(other=>polygonsOverlap(carCorners(candidate),carCorners(other)))&&Math.hypot(x-outside.x,y-outside.y)>pose.length/2+player.radius+5)return candidate;
  }
  return null;
}
function makeBike(item,spot){
  const start=faces.length;
  box(-3,-10,8,17,10,item.color,7);box(-4,0,8,11,3,'#293238',15);box(-7,-12,14,2,2,'#a8b7ba',20);
  for(const y of [-11,11]){
    // Two slim wheels in the longitudinal plane, with visible hubs.
    for(const x of [-2,2]){
      face(Array.from({length:12},(_,i)=>[x,y+Math.cos(i*Math.PI/6)*6,6+Math.sin(i*Math.PI/6)*6]),'#202629');
      face(Array.from({length:8},(_,i)=>[x*1.01,y+Math.cos(i*Math.PI/4)*2.5,6+Math.sin(i*Math.PI/4)*2.5]),'#abb5b6');
    }
    box(-2,y-1,5,2,11,'#7c8b92',5);
  }
  box(-2,-15,4,1,3,'#f6ecc3',13);
  const vehicle={...spot,name:item.name,bike:true,bodyColor:item.color};attachMesh(vehicle,start);cars.push(vehicle);return vehicle;
}
function spawnPurchase(item,spot){
  let vehicle;
  if(item.bike)vehicle=makeBike(item,spot);
  else{
    const model={...carModels[item.base],name:item.name,color:item.color};
    const start=faces.length;car(-model.width/2,-model.length/2,model);vehicle=cars[cars.length-1];
    attachMesh(vehicle,start);Object.assign(vehicle,spot);
  }
  Object.assign(vehicle,{purchaseId:item.id,performance:{topSpeed:item.top,acceleration:item.acceleration,gears:[.18,.32,.48,.65,.82,1].map(n=>Math.round(item.top*n))},altitude:0,parked:true,unlocked:true,driverOccupied:false,speed:0,rebound:null,steering:0,wheelTravel:0,gear:1,doorOpen:0});
  poseMesh(vehicle);return vehicle;
}
function checkoutShop(){
  if(paused||!shopState.open||shopTarget()?.kind!=='checkout')return false;
  if(!shopState.basket.length){shopMessage('Prodavač: Nejdřív si něco vyberte z polic.');return false;}
  const items=shopState.basket.map(id=>shopCatalog.find(i=>i.id===id));
  const cost=items.reduce((sum,item)=>sum+shopItemCost(item),0);
  if(cost>0&&wallet.cash<cost){shopMessage('Prodavač: Celkem '+cost.toLocaleString('cs-CZ')+' Kč. Chybí vám '+(cost-wallet.cash).toLocaleString('cs-CZ')+' Kč. Můžete něco vrátit pomocí R.');return false;}
  for(const item of items){
    if(item.weapon&&!Object.hasOwn(shopState.weapons,item.weapon)&&!shopState.basket.includes(item.weapon)){shopMessage('Prodavač: K těmto nábojům potřebujete také '+shopCatalog.find(i=>i.id===item.weapon).name+'.');return false;}
  }
  const healing=items.filter(i=>i.heal);
  if(healing.length&&shopState.health>=100){shopMessage('Prodavač: Máte plné zdraví. Jídlo a pití můžete vrátit pomocí R.');return false;}
  // Reserve all delivery positions before charging for any part of the basket.
  const placements=[];
  for(const item of items.filter(i=>i.top)){
    const spot=vehicleSpot(item,placements.map(p=>p.spot));
    if(!spot){shopMessage('Prodavač: Před obchodem není místo pro všechna vozidla. Nic neúčtuji.');return false;}
    placements.push({item,spot});
  }
  for(const item of items.filter(i=>i.group==='Zbraně')){
    if(!Object.hasOwn(shopState.weapons,item.id))shopState.weapons[item.id]=item.ammo;
    shopState.selected=item.id;
  }
  for(const item of items.filter(i=>i.weapon))shopState.weapons[item.weapon]=Math.min(99999,shopState.weapons[item.weapon]+item.amount);
  for(const item of healing)shopState.health=Math.min(100,shopState.health+item.heal);
  for(const {item,spot} of placements){
    const existing=cars.find(c=>c.purchaseId===item.id);
    if(existing){Object.assign(existing,spot,{speed:0,rebound:null,parked:true,altitude:0});poseMesh(existing);}
    else spawnPurchase(item,spot);
    if(!shopState.vehicles.includes(item.id))shopState.vehicles.push(item.id);
  }
  wallet.cash-=cost;shopState.basket=[];saveShop();renderShop();updateShopHud();
  shopMessage('Prodavač: Zaplaceno '+cost.toLocaleString('cs-CZ')+' Kč. Děkuji za nákup!'+(placements.length?' Vozidla čekají před obchodem.':' Zboží je vaše.'));return true;
}
function cycleWeapon(){
  globalThis.cityWeapons?.cancel();
  const owned=Object.keys(shopState.weapons);if(!owned.length){notice('Zbraň koupíš v obchodě označeném O.');return;}
  shopState.selected=owned[(owned.indexOf(shopState.selected)+1)%owned.length];saveShop();updateShopHud();
}
function fireWeapon(){
  if(paused||shopState.open||(typeof workState!=='undefined'&&workState.open)||drivenCar||takeover||shopState.cooldown>0)return false;
  const item=shopCatalog.find(i=>i.id===shopState.selected);if(!item)return false;
  if(!shopState.weapons[item.id]){notice('Došly náboje · doplň je v obchodě');shopState.cooldown=.5;return false;}
  shopState.weapons[item.id]--;shopState.cooldown=item.interval;shopState.flash=.07;globalThis.cityWeapons?.shoot();
  // Ray marches stop at buildings and cars before considering a pedestrian.
  let hit=false;
  const slope=player.pitch*.9;
  for(let distance=6;distance<item.range;distance+=3){
    const x=player.x+Math.cos(player.angle)*distance,y=player.y+Math.sin(player.angle)*distance,z=17+player.jumpHeight+slope*distance;
    if(z<0||buildings.some(b=>z<b.height&&insideBuilding(x,y,b)))break;
    if(cars.some(c=>z>(c.altitude||0)&&z<(c.altitude||0)+28&&vehicleContains(c,x,y,0)))break;
    const target=pedestrians.find(p=>!p.hit&&z>0&&z<29&&Math.hypot(p.x-x,p.y-y)<7);
    if(target){
      target.health=(target.health??100)-item.damage;target.fleeTime=6;target.fleeFrom={x:player.x,y:player.y};target.angle=player.angle;
      if(target.health<=0){target.hit={time:0,travel:0,angle:player.angle,car:{x:player.x,y:player.y}};target.hitCooldown=5;target.health=100;}
      hit=true;break;
    }
  }
  globalThis.cityAudio?.gunshot?.(item.id);
  if(hit)notice('Zásah');saveShop();updateShopHud();return true;
}
function hurtPlayer(amount){
  if(amount<=0)return;
  shopState.health=Math.max(0,shopState.health-amount);
  if(shopState.health===0){
    if(drivenCar){
      drivenCar.speed=0;drivenCar.rebound=null;drivenCar.parked=true;
      const item=shopCatalog.find(i=>i.id===drivenCar.purchaseId);
      if(drivenCar.altitude>0&&item){const spot=vehicleSpot(item);if(spot)Object.assign(drivenCar,spot,{altitude:0});}
      poseMesh(drivenCar);drivenCar=null;
    }
    const e=buildings.find(b=>b.kind==='hospital').entrance;
    player.x=e.road[0];player.y=e.road[1];resetJump();shopState.health=100;wallet.cash=Math.max(0,wallet.cash-250);keys.clear();
    notice('Ošetření v nemocnici · 250 Kč');
  }
  saveShop();updateShopHud();
}
function inspectWeapon(){
  if(paused||shopState.open||drivenCar||takeover||!shopState.selected)return false;
  globalThis.cityWeapons?.update(0,{id:shopState.selected,active:true});
  return globalThis.cityWeapons?.inspect()||false;
}
function nearbyWorkplace(){
  if(shopState.open||drivenCar||takeover)return null;
  return buildings.find(b=>b.kind!=='residential'&&b.kind!=='shop'&&Math.hypot(player.x-b.entrance.x,player.y-b.entrance.y)<58
    &&!buildings.some(other=>other!==b&&Array.from({length:10},(_,i)=>i/10).some(t=>insideBuilding(player.x+(b.entrance.x-player.x)*t,player.y+(b.entrance.y-player.y)*t,other,2))))||null;
}
function startWork(source){
  return typeof startProfession==='function'&&startProfession(source);
}
function interactWork(){
  const source=nearbyWorkplace();if(!source||paused)return false;
  startWork(source);return true;
}
function takeJob(){
  if(paused||!shopState.open||shopTarget()?.kind!=='job')return;
  startWork(buildings.find(b=>b.kind==='shop'));
}
function updateShopHud(){
  const weapon=shopCatalog.find(i=>i.id===shopState.selected);
  document.getElementById('equipment').textContent='♥ '+Math.ceil(shopState.health)+'/100 · '+(weapon?weapon.name+' · '+shopState.weapons[weapon.id]+' nábojů':'Beze zbraně');
  document.getElementById('weapon-fire').hidden=shopState.open||!weapon||!!drivenCar;
  document.getElementById('weapon-inspect').hidden=shopState.open||!weapon||!!drivenCar;
  document.getElementById('delivery-hint').textContent='';
}
function updateShop(dt){
  globalThis.cityWeapons?.update(dt,{id:shopState.selected,active:!!shopState.selected&&!drivenCar&&!takeover&&!shopState.open,walking:['w','a','s','d','arrowup','arrowdown'].some(k=>keys.has(k))});
  shopState.cooldown=Math.max(0,shopState.cooldown-dt);shopState.flash=Math.max(0,shopState.flash-dt);
  const gun=shopCatalog.find(i=>i.id===shopState.selected);
  if(keys.has('fire')&&gun?.interval<.2)fireWeapon();
  if(!drivenCar&&nearShop()){
    document.getElementById('interact').hidden=false;document.getElementById('interact').textContent='E · Vstoupit do obchodu';
  }
  else if(nearbyWorkplace()){
    document.getElementById('interact').hidden=false;document.getElementById('interact').textContent='E · Nastoupit na směnu';
  }
  updateShopHud();
}
function drawShopExtras(){
  if(!thirdPerson&&drivenCar?.bike){
    ctx.strokeStyle='#899da3';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(width*.32,height*.91);ctx.lineTo(width*.42,height*.85);ctx.lineTo(width*.58,height*.85);ctx.lineTo(width*.68,height*.91);ctx.stroke();
    ctx.fillStyle='#142629';ctx.fillRect(width*.45,height*.81,width*.1,height*.07);ctx.fillStyle='#e5ef95';ctx.font='18px Arial';ctx.textAlign='center';ctx.fillText(Math.round(Math.abs(drivenCar.speed)*.36)+' km/h',width*.5,height*.855);ctx.textAlign='start';
  }
  const gun=shopCatalog.find(i=>i.id===shopState.selected);
  if(!thirdPerson&&gun&&!drivenCar&&!takeover&&!shopState.open){
    globalThis.cityWeapons?.draw(ctx,width,height,{id:gun.id,flash:shopState.flash});
  }
}
document.getElementById('shop-return').onclick=returnShopItem;
document.getElementById('weapon-cycle').onclick=cycleWeapon;
document.getElementById('weapon-inspect').onclick=inspectWeapon;
document.getElementById('weapon-fire').onpointerdown=()=>{keys.add('fire');fireWeapon();};
for(const type of ['pointerup','pointercancel','pointerleave'])document.getElementById('weapon-fire').addEventListener(type,()=>keys.delete('fire'));
canvas.addEventListener('pointerdown',e=>{if(e.button===0&&document.pointerLockElement===canvas){keys.add('fire');fireWeapon();}});
addEventListener('pointerup',()=>keys.delete('fire'));
updateShopHud();
