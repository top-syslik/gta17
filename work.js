'use strict';
// Walkable workplaces with profession-specific tools, decisions and timed actions.
const workState={open:false,source:null,outside:null,scene:[],obstacles:[],stations:[],steps:[],stage:0,progress:0,busy:false,menu:false,paid:false,message:'',reward:5000};
const workNames={hospital:'Ošetřovatel',restaurant:'Kuchař',police:'Policejní služba',fire:'Hasič',shop:'Pokladní'};
function makeWorkSteps(kind){
  const step=(station,label,duration,choices=[],correct=0)=>({station,label,duration,choices,correct});
  if(kind==='hospital')return [step(0,'Změř pacientovi teplotu a zkontroluj poranění',3),step(1,'Pacient má odřené předloktí. Vyber pomůcku.',1,['Dezinfekce a sterilní obvaz','Sádra na nohu','Lék na kašel']),step(0,'Vyčisti ránu a přilož obvaz',4),step(2,'Zapiš ošetření do karty pacienta',2)];
  if(kind==='restaurant'){
    const soup=Math.random()<.5;
    return [step(0,soup?'Objednávka: zeleninová polévka. Vyber suroviny.':'Objednávka: sýrový sendvič. Vyber suroviny.',1,soup?['Zelenina, vývar a sůl','Chléb, sýr a máslo','Ovoce a cukr']:['Chléb, sýr a máslo','Zelenina, vývar a sůl','Ovoce a cukr']),step(1,soup?'Vař polévku a míchej ji':'Opeč sendvič na pánvi',5),step(2,'Připrav porci na talíř',2),step(3,'Vydej hotovou objednávku zákazníkovi',1)];
  }
  if(kind==='police'){
    const plate=['SP 142','SP 385','SP 726'][Math.floor(Math.random()*3)];
    return [step(0,'Převezmi hlášení a služební vysílačku',2),step(1,'Vyslechni svědka: odcizené auto mělo značku '+plate,3),step(2,'Porovnej kamerový záznam. Které auto odpovídá svědkovi?',2,['SP 142','SP 385','SP 726'],['SP 142','SP 385','SP 726'].indexOf(plate)),step(3,'Zapiš identifikaci a předej hlídce hlášení vysílačkou',3)];
  }
  if(kind==='fire')return [step(0,'Nasaď helmu a ochranné rukavice',2),step(1,'Připoj hadici k hydrantu',2),step(2,'Hoří dřevěná paleta. Vyber způsob hašení.',1,['Vodní proud na základnu plamenů','Proud nad plameny','Odpojit hadici']),step(2,'Miř na hořící paletu a uhas ji vodním proudem',7),step(3,'Zkontroluj místo a sbal hadici',3)];
  const prices=[80,35,180],total=prices.reduce((a,b)=>a+b,0),payment=500,change=payment-total;
  return [step(0,'Převezmi nákup: sendvič 80 Kč, voda 35 Kč, jídlo 180 Kč',1),step(1,'Naskenuj postupně tři položky',3),step(2,'Zákazník platí 500 Kč. Kolik vrátíš?',1,[change+' Kč',(change+50)+' Kč',(change-35)+' Kč']),step(3,'Vydej účtenku a předej zákazníkovi nákup',2)];
}
function buildWorkplace(kind){
  const start=faces.length;
  workState.obstacles=[];
  const colors={hospital:'#b9d9d3',restaurant:'#d6bd8d',police:'#9fb9ce',fire:'#cfb8a2',shop:'#bed0ae'};
  ground(0,0,330,370,kind==='fire'?'#777c73':'#c7c3b1');
  box(0,0,330,4,70,colors[kind]);box(0,0,4,370,70,colors[kind]);box(326,0,4,370,70,colors[kind]);
  box(0,366,135,4,70,colors[kind]);box(195,366,135,4,70,colors[kind]);
  const positions=[[68,78],[262,78],[68,207],[262,207]];
  const labels={hospital:['Pacient','Zdravotní pomůcky','Karta pacienta','Recepce'],restaurant:['Suroviny','Sporák','Talíře','Výdej jídla'],police:['Vysílačka','Svědek','Kamerový záznam','Hlášení'],fire:['Ochranná výbava','Hydrant','Hořící paleta','Kontrola místa'],shop:['Košík zákazníka','Skener','Pokladna','Výdej nákupu']}[kind];
  workState.stations=positions.map(([x,y],i)=>({x,y,label:labels[i],frontX:x<165?x+34:x-34}));
  for(let i=0;i<4;i++){
    const [x,y]=positions[i];
    box(x-19,y-17,38,34,14,kind==='police'?'#536e88':'#8f806c');
    workState.obstacles.push({x:x-22,y:y-20,w:44,d:40});
    if(kind==='hospital'&&i===0){box(x-15,y-26,30,52,3,'#e1eeee',14);box(x-8,y-14,16,30,5,'#77aabb',17);box(x-5,y-23,10,9,7,'#d4a57f',17);}
    else if(kind==='fire'&&i===2){box(x-16,y-14,32,28,2,'#805537',14);}
    else if(kind==='restaurant'&&i===1){box(x-15,y-13,30,26,2,'#34424a',14);ringsMesh([[x,y,16,8,8],[x,y,24,8,8]],'#a2afb0',10);}
    else if(kind==='police'&&i===2){box(x-13,y-6,26,3,17,'#253b46',14);box(x-11,y-7,22,1,13,'#72a0a2',16);}
    else{
      for(let n=0;n<3;n++)box(x-12+n*9,y-8,7,14,4,['#e4dbc0','#789aaf','#a47a5b'][n],14);
    }
  }
  if(kind==='fire'){box(positions[1][0]-4,positions[1][1]-6,8,12,22,'#b73f36',14);}
  workState.scene=faces.splice(start);
  const actorStart=faces.length;person(kind==='hospital'?'#e1eeee':'#8eaa73','#d4a57f');
  const actor={x:262,y:kind==='police'?113:242,angle:Math.PI,walking:false};attachMesh(actor,actorStart);poseMesh(actor);workState.scene.push(...actor.renderMesh);
}
function startProfession(source){
  if(paused||drivenCar||takeover||workState.open||!workNames[source?.kind])return false;
  if(typeof shopState!=='undefined'&&shopState.open){
    if(shopState.basket.length){shopMessage('Nejdřív zaplať nebo vrať zboží, potom můžeš nastoupit na směnu.');return false;}
    Object.assign(player,shopState.outside);shopState.open=false;document.getElementById('shop').hidden=true;document.body?.classList?.remove('shopping');
  }
  Object.assign(workState,{open:true,source,outside:{x:player.x,y:player.y,angle:player.angle,pitch:player.pitch},stage:0,progress:0,busy:false,menu:false,paid:false,steps:makeWorkSteps(source.kind),message:'Dojdi k označenému pracovišti a stiskni E.'});
  buildWorkplace(source.kind);Object.assign(player,{x:165,y:328,angle:-Math.PI/2,pitch:0});resetJump();keys.clear();
  globalThis.cityWeapons?.cancel();globalThis.cityAudio?.setPaused(true);updateWorkHud();return true;
}
function workTarget(){
  if(Math.hypot(player.x-165,player.y-351)<27)return 'exit';
  const index=workState.stations.findIndex(s=>{
    const dx=s.x-player.x,dy=s.y-player.y,d=Math.hypot(dx,dy);
    return d<55&&(dx*Math.cos(player.angle)+dy*Math.sin(player.angle))/Math.max(1,d)>.65;
  });
  return index<0?null:index;
}
function exitProfession(){
  if(!workState.open)return false;
  Object.assign(player,workState.outside);resetJump();keys.clear();workState.open=false;workState.busy=false;workState.menu=false;
  document.getElementById('work-panel').hidden=true;globalThis.cityAudio?.setPaused(paused);updateShopHud();notice(workState.paid?'Směna dokončena · +5 000 Kč':'Směna ukončena bez odměny');return true;
}
function interactProfession(){
  if(!workState.open||paused)return false;
  const target=workTarget();
  if(target==='exit')return exitProfession();
  const step=workState.steps[workState.stage];
  if(!step){workState.message='Směna dokončena. Dveře za tebou vedou ven.';updateWorkHud();return true;}
  if(target!==step.station){workState.message='Nejdřív: '+step.label;updateWorkHud();return true;}
  if(workState.busy)return true;
  workState.menu=!!step.choices.length;
  if(!workState.menu)workState.busy=true;
  workState.message=step.label;updateWorkHud();return true;
}
function chooseWorkAction(index){
  if(!workState.open||paused||!workState.menu)return false;
  const step=workState.steps[workState.stage];
  if(workTarget()!==step.station)return false;
  if(index!==step.correct){workState.message='Zkus to znovu. '+step.label;updateWorkHud();return false;}
  workState.menu=false;workState.busy=true;workState.message=step.label;updateWorkHud();return true;
}
function workBlocked(x,y){return x<13||y<13||x>317||y>353||workState.obstacles.some(b=>x>b.x-player.radius&&x<b.x+b.w+player.radius&&y>b.y-player.radius&&y<b.y+b.d+player.radius);}
function updateProfession(dt){
  if(!workState.open||paused)return;
  player.angle+=(Number(keys.has('arrowright'))-Number(keys.has('arrowleft')))*dt*1.8;
  const forward=Number(keys.has('w')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown')),side=Number(keys.has('d'))-Number(keys.has('a')),length=Math.hypot(forward,side);
  if(length){
    const distance=65*dt/length,dx=(Math.cos(player.angle)*forward-Math.sin(player.angle)*side)*distance,dy=(Math.sin(player.angle)*forward+Math.cos(player.angle)*side)*distance,count=Math.max(1,Math.ceil(Math.hypot(dx,dy)/3));
    for(let i=0;i<count;i++){if(!workBlocked(player.x+dx/count,player.y))player.x+=dx/count;if(!workBlocked(player.x,player.y+dy/count))player.y+=dy/count;}
  }
  const step=workState.steps[workState.stage],target=workTarget();
  if(workState.busy&&step){
    if(target!==step.station){workState.busy=false;workState.message='Práce přerušena. Vrať se k pracovišti a stiskni E.';}
    else{
      workState.progress=Math.min(step.duration,workState.progress+dt);
      if(workState.progress>=step.duration){
        workState.stage++;workState.progress=0;workState.busy=false;workState.menu=false;
        if(workState.stage===workState.steps.length&&!workState.paid){workState.paid=true;wallet.cash+=workState.reward;saveShop();workState.message='Směna hotová! Vydělal jsi 5 000 Kč. Vyjdi dveřmi ven.';}
        else workState.message=workState.steps[workState.stage].label;
      }
    }
  }
  if(workState.menu&&target!==step?.station)workState.menu=false;
  const interact=document.getElementById('interact');interact.hidden=target===null;
  interact.textContent=target==='exit'?'E · Vyjít ven':workState.paid?'Směna dokončena':target===step?.station?(workState.busy?'Pracuji…':'E · '+workState.stations[target].label):'E · Zkontrolovat pracoviště';
  updateWorkHud();
}
function updateWorkHud(){
  const panel=document.getElementById('work-panel');if(!panel)return;
  panel.hidden=!workState.open;if(!workState.open)return;
  const step=workState.steps[workState.stage];
  document.getElementById('work-title').textContent=workNames[workState.source.kind]+' · '+workState.source.name;
  document.getElementById('work-instruction').textContent=workState.message;
  document.getElementById('work-progress').textContent=workState.paid?'Zaplaceno 5 000 Kč':(workState.stage+1)+' / '+workState.steps.length+' · '+(workState.busy?Math.round(workState.progress/step.duration*100)+' %':'Odměna 5 000 Kč za dokončení směny');
  for(let i=0;i<3;i++){const button=document.getElementById('work-choice-'+i);button.hidden=!workState.menu||!step?.choices[i];button.textContent=step?.choices[i]?(i+1)+' · '+step.choices[i]:'';}
  document.getElementById('equipment').textContent='Práce: '+workNames[workState.source.kind];
  document.getElementById('delivery-hint').textContent='';document.getElementById('weapon-fire').hidden=true;document.getElementById('weapon-inspect').hidden=true;
}
function drawProfession(){
  const scene=workState.scene.slice(),step=workState.steps[workState.stage];
  if(workState.source.kind==='fire'&&workState.stage<=3){
    const amount=workState.stage===3?1-workState.progress/workState.steps[3].duration:1;
    const station=workState.stations[2],start=faces.length;
    for(let i=0;i<5;i++)ringsMesh([[station.x+(i-2)*6,station.y,16,4,4],[station.x+(i-2)*6,station.y,20+25*amount,2,2],[station.x+(i-2)*6+Math.sin(lastTime*.008+i)*3,station.y,22+35*amount,0,0]],i%2?'#f4c253':'#dc6c35',5);
    if(workState.busy&&workState.stage===3)box(station.x+14,station.y-1,20,2,2,'#88cbd9',19);
    scene.push(...faces.splice(start));
  }
  const propStart=faces.length;
  if(workState.source.kind==='hospital'&&workState.stage>=3){const s=workState.stations[0];box(s.x+5,s.y-8,6,9,2,'#f1ece0',22);}
  if(workState.source.kind==='restaurant'&&workState.stage>=3){const s=workState.stations[3];ringsMesh([[s.x,s.y,15,11,11],[s.x,s.y,16,11,11]],'#eeebdc',12);box(s.x-6,s.y-5,12,10,3,'#c39d53',16);}
  if(workState.source.kind==='shop'&&workState.stage>=3){const s=workState.stations[3];box(s.x-12,s.y-8,24,16,12,'#b99765',14);box(s.x-9,s.y-9,18,1,6,'#eeeadc',26);}
  scene.push(...faces.splice(propStart));
  drawWorld({...player,eye:17+player.jumpHeight},width,height,scene);
  for(let i=0;i<workState.stations.length;i++){const s=workState.stations[i];shopLabel(s.label+(i===step?.station?' · E':''),s.x,s.y,35,i===step?.station?'#f4df7f':'#ebeadc',i===step?.station);}
  shopLabel('VÝCHOD · E',165,365,24,'#a2deb2');
  ctx.fillStyle='#ffffffbb';ctx.beginPath();ctx.arc(width/2,height*.48+player.pitch*height*.65,2,0,Math.PI*2);ctx.fill();
}
for(let i=0;i<3;i++)document.getElementById('work-choice-'+i).onclick=()=>chooseWorkAction(i);
