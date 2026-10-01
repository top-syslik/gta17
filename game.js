'use strict';
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const mini = document.getElementById('minimap').getContext('2d');
const world = {width: 2400, height: 2000};
const player = {x:1190, y:1010, radius:9, angle:-0.35, pitch:0, jumpHeight:0, jumpVelocity:0, jumpHeld:false};
const keys = new Set(), buildings = [], faces = [], streets = [], cars = [], pedestrians = [];
const roadX = [190,690,1190,1690,2190], roadY = [210,610,1010,1410,1810];
let takeover=null;
const glassShards=[];
const wanted={level:0,offroad:0,hits:[],impactCooldown:0,quiet:0,unseen:0,time:0,dispatchTimer:0,stopTime:0,stopAnchor:null};
const wallet={cash:5000,fines:0};
try{const saved=localStorage.getItem('asfalt-cash');if(saved!==null&&Number.isSafeInteger(Number(saved)))wallet.cash=Number(saved);}catch{}
let policeGrid=null;
let fineScreenTime=0;
let drivenCar=null, drivingNotice='', drivingNoticeTime=0;
let thirdPerson=false;
let width, height, paused=false, lastTime=0, seed=37;
function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
function face(points,color){const f={points,color,details:[],center:points.reduce((s,p)=>s.map((v,i)=>v+p[i]/points.length),[0,0,0])};faces.push(f);return f;}
function detail(parent,points,color){parent.details.push({points,color});}
function ground(x,y,w,d,color,z=0){face([[x,y,z],[x+w,y,z],[x+w,y+d,z],[x,y+d,z]],color);}
function box(x,y,w,d,h,color,z=0){
  face([[x,y,z],[x+w,y,z],[x+w,y,z+h],[x,y,z+h]],color);
  face([[x+w,y,z],[x+w,y+d,z],[x+w,y+d,z+h],[x+w,y,z+h]],color);
  face([[x+w,y+d,z],[x,y+d,z],[x,y+d,z+h],[x+w,y+d,z+h]],color);
  face([[x,y+d,z],[x,y,z],[x,y,z+h],[x,y+d,z+h]],color);
  ground(x,y,w,d,'#777d75',z+h);
}
// Polygon footprints are shared by rendering, collision detection and the map.
function footprint(b,type){
  const w=b.w,d=b.d,c=Math.min(w,d)*.2;
  const shapes=[[[c,0],[w-c,0],[w,c],[w,d-c],[w-c,d],[c,d],[0,d-c],[0,c]],
    [[0,0],[w,0],[w,d*.45],[w*.55,d*.45],[w*.55,d],[0,d]],
    Array.from({length:12},(_,i)=>[w/2+Math.cos(i*Math.PI/6)*w/2,d/2+Math.sin(i*Math.PI/6)*d/2]),
    [[0,0],[w,0],[w,d],[0,d]]];
  return shapes[type%4].map(([x,y])=>[b.x+x,b.y+y]);
}
const places = {
  15:{kind:'hospital',name:'NEMOCNICE',color:'#e0e6dd',accent:'#b8423e',floors:4},
  24:{kind:'police',name:'POLICIE',color:'#aebfc9',accent:'#345d8c',floors:3},
  27:{kind:'restaurant',name:'RESTAURACE',color:'#d5ad82',accent:'#9b4d3d',floors:2},
  30:{kind:'fire',name:'HASICI',color:'#cba58e',accent:'#b94232',floors:2},
  21:{kind:'shop',name:'OBCHOD',color:'#c5cbb0',accent:'#447254',floors:2}
};
// Small polygon letters stay attached to the facade and obey scene occlusion.
const signFont={
 A:['01110','10001','10001','11111','10001','10001','10001'],B:['11110','10001','10001','11110','10001','10001','11110'],
 C:['01111','10000','10000','10000','10000','10000','01111'],D:['11110','10001','10001','10001','10001','10001','11110'],
 E:['11111','10000','10000','11110','10000','10000','11111'],H:['10001','10001','10001','11111','10001','10001','10001'],
 I:['111','010','010','010','010','010','111'],L:['10000','10000','10000','10000','10000','10000','11111'],
 M:['10001','11011','10101','10101','10001','10001','10001'],N:['10001','11001','11001','10101','10011','10011','10001'],
 O:['01110','10001','10001','10001','10001','10001','01110'],P:['11110','10001','10001','11110','10000','10000','10000'],
 R:['11110','10001','10001','11110','10100','10010','10001'],S:['01111','10000','10000','01110','00001','00001','11110'],
 T:['11111','00100','00100','00100','00100','00100','00100'],U:['10001','10001','10001','10001','10001','10001','01110'],
 Y:['10001','10001','01010','00100','00100','00100','00100']
};
function facadeSign(panel,span,label,color){
  // From outside the building, screen-right runs opposite the outline edge.
  const signPanel=(u,z,w,h,tint)=>panel(span-u-w,z,w,h,tint);
  const unit=Math.min(1,(span-8)/(label.length*6)),total=label.length*6*unit;
  signPanel((span-total)/2-3,23,total+6,10,color);
  [...label].forEach((letter,i)=>signFont[letter].forEach((row,y)=>[...row].forEach((pixel,x)=>{
    if(pixel==='1')signPanel((span-total)/2+(i*6+x)*unit,25+(6-y)*unit,unit*.9,unit*.9,'#fff3d5');
  })));
}
// Choose an outward-facing facade with a clear approach to a sampled street.
function streetEntrance(b){
  let best=null;
  b.outline.forEach((a,side)=>{
    const c=b.outline[(side+1)%b.outline.length],dx=c[0]-a[0],dy=c[1]-a[1],span=Math.hypot(dx,dy);
    if(span<(b.kind==='shop'||b.kind==='restaurant'||b.kind==='fire'?36:24))return;
    const x=(a[0]+c[0])/2,y=(a[1]+c[1])/2,nx=dy/span,ny=-dx/span;
    for(const street of streets)for(let i=1;i<street.points.length;i++){
      const p=street.points[i-1],q=street.points[i],sx=q[0]-p[0],sy=q[1]-p[1];
      const t=Math.max(0,Math.min(1,((x-p[0])*sx+(y-p[1])*sy)/(sx*sx+sy*sy)));
      const road=[p[0]+sx*t,p[1]+sy*t],rx=road[0]-x,ry=road[1]-y,distance=Math.hypot(rx,ry);
      const alignment=(rx*nx+ry*ny)/distance;
      if(alignment<.7)continue;
      const score=distance/alignment;
      if(best&&score>=best.score)continue;
      let clear=true;
      for(let d=3;d<distance;d+=4){
        if(buildings.some(other=>insideBuilding(x+rx*d/distance,y+ry*d/distance,other,1))){clear=false;break;}
      }
      if(clear)best={side,x,y,road,score};
    }
  });
  return best;
}
function building(b,id){
  b.entrance=streetEntrance(b);
  for(let side=0;side<b.outline.length;side++){
    const a=b.outline[side],c=b.outline[(side+1)%b.outline.length];
    const span=Math.hypot(c[0]-a[0],c[1]-a[1]);
    const at=(u,z)=>[a[0]+(c[0]-a[0])*u/span,a[1]+(c[1]-a[1])*u/span,z];
    const wall=face([at(0,0),at(span,0),at(span,b.height),at(0,b.height)],b.color);
    const panel=(u,z,w,h,color)=>detail(wall,[at(u,z),at(u+w,z),at(u+w,z+h),at(u,z+h)],color);
    const count=Math.max(1,Math.floor(span/24)),gap=span/(count+1),ww=Math.min(12,gap*.6);
    for(let f=0;f<b.floors;f++)for(let c=1;c<=count;c++){
      const u=c*gap-ww/2;
      if(f===0&&side===b.entrance.side&&(b.kind!=='residential'||(u<span/2+9&&u+ww>span/2-9)))continue;
      if(f===1&&side===b.entrance.side&&['hospital','police'].includes(b.kind)&&u<span/2+11&&u+ww>span/2-11)continue;
      panel(u-1.5,f*25+7,ww+3,16,'#d7d0b8');
      panel(u,f*25+9,ww,12,(f+c+id)%7===0?'#e5c27e':'#344e60');
    }
    panel(0,b.height-5,span,3,'#c4c6bb');
    if(side===b.entrance.side){
      if(b.kind==='fire'){
        for(let garage=0;garage<2;garage++){
          const u=6+garage*span*.49,w=span*.43;
          panel(u,0,w,21,'#913d32');
          for(let z=3;z<21;z+=4)panel(u,z,w,1,'#d39573');
          panel(u+3,13,w-6,5,'#536e77');
        }
      }else{
        panel(span/2-6,0,12,20,b.kind==='residential'?'#614c3a':'#416572');
        if(b.kind==='shop'||b.kind==='restaurant'){
          for(const u of [4,span/2+11])panel(u,3,span/2-15,17,'#77a4aa');
          for(let u=3;u<span-3;u+=6)panel(u,20,Math.min(6,span-3-u),3,Math.floor(u/6)%2?'#f0d8ab':b.accent);
        }
      }
      facadeSign(panel,span,b.name,b.accent);
      if(b.kind==='hospital'){
        panel(span/2-3,38,6,18,b.accent);panel(span/2-9,44,18,6,b.accent);
      }
      if(b.kind==='police'){
        panel(span/2-5,39,10,12,'#dcc977');panel(span/2-2,42,4,6,b.accent);
      }
      if(b.kind==='residential'){
        panel(span/2+8,5,3,4,'#d6c7a3');
        for(let u=5;u<span-10;u+=26){panel(u,5,13,3,'#8f6248');panel(u+1,8,11,2,'#65874d');}
      }
    }
  }
  face(b.outline.map(([x,y])=>[x,y,b.height]),'#777d75');
  if(id%4===0||id%4===2){
    const apex=[b.x+b.w/2,b.y+b.d/2,b.height+(id%4===2?36:24)];
    b.outline.forEach((a,i)=>{const c=b.outline[(i+1)%b.outline.length];face([[...a,b.height],[...c,b.height],apex],i%2?'#995e48':'#b57c59');});
  }else if(id%4===3){
    const z=b.height,ridge=z+27;
    face([[b.x,b.y,z],[b.x+b.w,b.y,z],[b.x+b.w/2,b.y,ridge]],'#ab7960');
    face([[b.x,b.y+b.d,z],[b.x+b.w,b.y+b.d,z],[b.x+b.w/2,b.y+b.d,ridge]],'#ab7960');
    for(const x of [b.x,b.x+b.w])face([[x,b.y,z],[b.x+b.w/2,b.y,ridge],[b.x+b.w/2,b.y+b.d,ridge],[x,b.y+b.d,z]],'#855747');
  }else box(b.x+8,b.y+8,b.w*.32,b.d*.3,15,'#a6a99b',b.height);
}
for(let row=0;row<4;row++)for(let col=0;col<4;col++){
  if(row===1&&col===2)continue;
  for(let slot=0;slot<3;slot++){
    const id=buildings.length;
    const b={x:roadX[col]+83+(slot?195:0),y:roadY[row]+82+(slot===2?136:0),w:slot?100+random()*33:135+random()*37,d:slot?85+random()*25:213+random()*24,floors:2+Math.floor(random()*6),hue:(id*47+18)%360};
    b.kind='residential';b.name='BYTY';b.accent='#675b4b';
    b.height=b.floors*25+8;b.color=`hsl(${b.hue}, ${14+id%5*6}%, ${52+id%6*4}%)`;
    if(places[id]){Object.assign(b,places[id]);b.height=b.floors*25+8;}
    // Reserve the two residential parcels beside the station for its off-road lot.
    if(id===25||id===26){b.x=id===25?1273:1468;b.y=692;}
    b.outline=footprint(b,id);buildings.push(b);
  }
}
// Sample curved streets in short sections so intersections stay connected.
function street(points,halfWidth){
  streets.push({points,halfWidth});
  for(let i=0;i<points.length-1;i++){
    const a=points[i],b=points[i+1],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    const nx=-(b[1]-a[1])/length,ny=(b[0]-a[0])/length;
    const strip=(w,z,color)=>face([[a[0]+nx*w,a[1]+ny*w,z],[b[0]+nx*w,b[1]+ny*w,z],[b[0]-nx*w,b[1]-ny*w,z],[a[0]-nx*w,a[1]-ny*w,z]],color);
    strip(halfWidth+12,.1,'#b8b7a7');strip(halfWidth,.2,'#4c5557');
    const vertical=Math.abs(b[1]-a[1])>Math.abs(b[0]-a[0]);
    const crossing=(vertical?roadY:roadX).some(value=>Math.abs(a[vertical?1:0]-value)<65);
    if(i%3===1&&!crossing)strip(1,.3,'#dcc781');
  }
}
function bend(t,crossings,index){
  for(let i=0;i<crossings.length-1;i++)if(t>=crossings[i]&&t<=crossings[i+1]){
    const u=(t-crossings[i])/(crossings[i+1]-crossings[i]);
    const shape=index===2?0:Math.sin(Math.PI*u)**2*(index===3?Math.cos(Math.PI*u)*2:1);
    return shape*(index%2? -20:20)*(i%2?1:-1);
  }
  return 0;
}
roadX.forEach((x,i)=>street(Array.from({length:201},(_,j)=>[x+bend(j*10,roadY,i),j*10]),i%2?38:44));
roadY.forEach((y,i)=>street(Array.from({length:241},(_,j)=>[j*10,y+bend(j*10,roadX,i)]),i%2?36:44));
for(const x of roadX)for(const y of roadY){ground(x-49,y-49,98,98,'#4c5557',.4);for(let i=-3;i<=3;i++){ground(x+i*10-3,y-61,6,12,'#e5dfca',.5);ground(x+i*10-3,y+49,6,12,'#e5dfca',.5);ground(x-61,y+i*10-3,12,6,'#e5dfca',.5);ground(x+49,y+i*10-3,12,6,'#e5dfca',.5);}}
buildings.forEach((b,id)=>building(b,id));
// Rings form tapered trunks, rounded crowns and conifers without box geometry.
function ringsMesh(rings,color,sides=10){
  const layers=rings.map(([x,y,z,rx,ry])=>Array.from({length:sides},(_,i)=>[x+Math.cos(i*2*Math.PI/sides)*rx,y+Math.sin(i*2*Math.PI/sides)*ry,z]));
  for(let k=0;k<layers.length-1;k++)for(let i=0;i<sides;i++){
    const j=(i+1)%sides;
    face([layers[k][i],layers[k][j],layers[k+1][j],layers[k+1][i]],Array.isArray(color)?color[i%color.length]:color);
  }
  face(layers[layers.length-1],Array.isArray(color)?color[0]:color);
}
function tree(x,y,type){
  const h=24+random()*12;
  ringsMesh([[x,y,0,3,3],[x+1,y,h,1.5,1.5]],'#75604a',7);
  if(type===1){
    for(let i=0;i<3;i++)ringsMesh([[x,y,h-8+i*11,19-i*4,19-i*4],[x,y,h+18+i*11,0,0]],['#365e48','#467555','#527e59']);
  }else{
    const r=type===2?10:21;
    ringsMesh([[x,y,h-9,2,2],[x-2,y,h,r*.85,r*.8],[x,y,h+13,r,r],[x+2,y,h+(type===2?34:25),r*.65,r*.65],[x+2,y,h+(type===2?43:31),0,0]],type===2?['#73954b','#8aa65c','#648443']:['#507b4e','#628952','#789c60']);
  }
}
for(let i=0;i<24;i++)tree(1290+random()*270,710+random()*220,i%3);
const carModels=[
  {name:'Škoda Octavia',performance:{topSpeed:210,acceleration:80,gears:[45, 80, 120, 160, 185, 210]},length:46,width:21,height:21,front:.36,rear:.72,style:'liftback',color:'#819c87'},
  {name:'Volkswagen Golf',performance:{topSpeed:195,acceleration:72,gears:[40, 75, 110, 145, 175, 195]},length:38,width:21,height:22,front:.34,rear:.84,style:'hatch',color:'#c9b579'},
  {name:'Porsche 911',performance:{topSpeed:230,acceleration:110,gears:[45, 80, 115, 155, 195, 230]},length:42,width:23,height:17,front:.4,rear:.68,style:'coupe',color:'#be5541'},
  {name:'Land Rover Defender',performance:{topSpeed:175,acceleration:60,gears:[35, 65, 95, 125, 150, 175]},length:47,width:24,height:28,front:.33,rear:.91,style:'suv',color:'#55746d'},
  {name:'Ford Transit',performance:{topSpeed:145,acceleration:48,gears:[30, 55, 80, 105, 125, 145]},length:53,width:24,height:32,front:.29,rear:.97,style:'van',color:'#d5d6cc'},
  {name:'BMW 3',performance:{topSpeed:250,acceleration:115,gears:[50, 90, 135, 175, 215, 250]},length:45,width:22,height:21,front:.34,rear:.69,style:'sedan',color:'#658caa'}
];
function car(x,y,model,reverse=false){
  const w=model.width,l=model.length,h=model.height,belt=model.style==='coupe'?9:model.style==='suv'?14:12;
  const style=model.style,square=style==='suv'||style==='van',corner=square?1:style==='coupe'?4:2.5;
  const at=(u,v,z)=>[x+(reverse?w-u:u),y+(reverse?l-v:v),z];
  const surface=(points,color)=>face(points.map(p=>at(...p)),color);
  // Chamfered nose and tail, sloping bonnet, windscreen and rear glass.
  const outline=[[corner,0],[w-corner,0],[w,4],[w,l-4],[w-corner,l],[corner,l],[0,l-4],[0,4]];
  const body=[];
  for(let i=0;i<8;i++){
    const a=outline[i],b=outline[(i+1)%8];
    body.push(surface([[...a,4],[...b,4],[...b,belt],[...a,belt]],model.color));
  }
  // The bonnet and boot stop at the cabin; no opaque slab crosses the seats.
  const deck=(low,high)=>{
    let points=outline;
    for(const [limit,sign] of [[low,1],[high,-1]]){
      const clipped=[];
      for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],inside=(a[1]-limit)*sign>=0,next=(b[1]-limit)*sign>=0;
        if(inside)clipped.push(a);if(inside!==next){const t=(limit-a[1])/(b[1]-a[1]);clipped.push([a[0]+(b[0]-a[0])*t,limit]);}}
      points=clipped;
    }
    surface(points.map(p=>[...p,belt]),model.color);
  };
  const front=l*model.front,rear=l*model.rear,doorEnd=Math.min(front+l*.24,rear);
  const outsideDoor=points=>{
    const clipAt=(points,limit,sign)=>{const out=[],value=p=>(reverse?l-(p[1]-y):p[1]-y);
      for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],va=value(a),vb=value(b),inside=(va-limit)*sign>=0,next=(vb-limit)*sign>=0;
        if(inside)out.push(a);if(inside!==next){const t=(limit-va)/(vb-va);out.push(a.map((v,j)=>v+(b[j]-v)*t));}}
      return out;};
    return [clipAt(points,front-2,-1),clipAt(points,doorEnd,1)].filter(p=>p.length>=3);
  };
  body[6].openCutout=outsideDoor(body[6].points);
  // Longitudinal roof profiles give each body type its own silhouette.
  const inset=square?1.2:style==='coupe'?4:2.6;
  const profile=style==='coupe'
    ?[[front-7,belt,1],[front,h-3,inset],[front+4,h,inset],[rear-3,h-1,inset],[rear+4,h-4,3],[l-3,belt,1]]
    :[[front-(square?3:7),belt,1],[front,h,inset],[rear,h,inset],[Math.min(l-1,rear+(square?1:style==='hatch'?3:7)),belt,1]];
  deck(0,profile[0][0]);deck(profile.at(-1)[0],l);
  const sections=profile.map(([v,z,edge])=>({v,z,edge}));
  for(let k=0;k<sections.length-1;k++){
    const a=sections[k],b=sections[k+1];
    const roof=surface([[a.edge,a.v,a.z],[w-a.edge,a.v,a.z],[w-b.edge,b.v,b.z],[b.edge,b.v,b.z]],model.color);
    const windshield=k===0,rearGlass=k===sections.length-2;
    if(windshield||rearGlass&&style!=='van'){
      const atRoof=(t,u)=>{
        const edge=a.edge+(b.edge-a.edge)*t;
        return at(edge+(w-2*edge)*u,a.v+(b.v-a.v)*t,a.z+(b.z-a.z)*t);
      };
      detail(roof,[atRoof(.12,.08),atRoof(.12,.92),atRoof(.88,.92),atRoof(.88,.08)],'#496c7d');
    }
    for(const right of [false,true]){
      const base=right?w-1:1,topA=right?w-a.edge:a.edge,topB=right?w-b.edge:b.edge;
      const wall=surface([[base,a.v,belt],[base,b.v,belt],[topB,b.v,b.z],[topA,a.v,a.z]],model.color);
      if(b.z<=belt&&a.z<=belt)continue;
      // Transit has a short glazed cab and a solid cargo compartment.
      const maxV=style==='van'?l*.43:b.v;
      const end=Math.min(b.v,maxV);
      if(end<=a.v)continue;
      const count=style==='coupe'?1:Math.max(1,Math.round((end-a.v)/(l*.21)));
      for(let pane=0;pane<count;pane++){
        const u0=(end-a.v)/ (b.v-a.v)*pane/count+.045,u1=(end-a.v)/(b.v-a.v)*(pane+1)/count-.045;
        if(u1<=u0)continue;
        const point=(u,t)=>at(base+(topA+(topB-topA)*u-base)*t,a.v+(b.v-a.v)*u,belt+(a.z+(b.z-a.z)*u-belt)*t);
        detail(wall,[point(u0,.18),point(u1,.18),point(u1,.86),point(u0,.86)],'#486877');
        if(!right&&k===1&&pane===0){
          wall.details[wall.details.length-1].driverWindow=true;
          const frame=(left,right,bottom,top)=>[point(left,bottom),point(right,bottom),point(right,top),point(left,top)];
          wall.cutout=[frame(0,1,0,.18),frame(0,1,.86,1),frame(0,u0,.18,.86),frame(u1,1,.18,.86)];
          const middle=(u0+u1)/2,half=(u1-u0)*.18;
          detail(wall,[point(middle-half,.35),point(middle+half,.35),point(middle+half,.72),point(middle-half,.72)],'#c29c79');
          wall.details[wall.details.length-1].seatedDriver=true;
        }
      }
      if(!right){
        wall.openCutout=(wall.cutout||[wall.points]).flatMap(outsideDoor);
        for(const d of wall.details)if(d.driverWindow)d.fixedWindow=true;
      }
    }
  }
  const rearSection=sections[sections.length-1];
  surface([[1,rearSection.v,belt],[w-1,rearSection.v,belt],[w-rearSection.edge,rearSection.v,rearSection.z],[rearSection.edge,rearSection.v,rearSection.z]],model.color);
  // Circular tires and alloy hubs, with their axis across the car.
  for(const sx of [-.7,w+.7])for(const sy of [l*.2,l*.78]){
    const start=faces.length, radius=model.style==='suv'?5.3:4.2;
    const wheel={pivot:at(sx,sy,5),radius,front:sy===l*.2};
    const circle=(xx,r)=>Array.from({length:12},(_,i)=>at(xx,sy+Math.cos(i*Math.PI/6)*r,5+Math.sin(i*Math.PI/6)*r));
    const outer=circle(sx,radius),inner=circle(sx<0?sx+2:sx-2,radius);
    for(let i=0;i<12;i++)face([outer[i],inner[i],inner[(i+1)%12],outer[(i+1)%12]],'#232a2b');
    const tire=face(outer,'#202629');detail(tire,circle(sx,radius*.53),'#bdc6c6');detail(tire,circle(sx,radius*.2),'#53616a');
    for(let spoke=0;spoke<5;spoke++){
      const a=spoke*Math.PI*2/5,r=radius*.48;
      detail(tire,[at(sx,sy,5),at(sx,sy+Math.cos(a-.12)*r,5+Math.sin(a-.12)*r),at(sx,sy+Math.cos(a+.12)*r,5+Math.sin(a+.12)*r)],'#42535d');
    }
    for(let i=start;i<faces.length;i++)faces[i].wheel=wheel;
  }
  const frontWall=body[0],tailWall=body[4];
  const frontPanel=(points,color)=>detail(frontWall,points.map(([u,z])=>at(u,0,z)),color);
  const tailPanel=(points,color)=>detail(tailWall,points.map(([u,z])=>at(u,l,z)),color);
  const rect=(draw,u,z,ww,hh,color)=>draw([[u,z],[u+ww,z],[u+ww,z+hh],[u,z+hh]],color);
  const roundLamp=(draw,u,z,rx,rz,color)=>draw(Array.from({length:12},(_,i)=>[u+Math.cos(i*Math.PI/6)*rx,z+Math.sin(i*Math.PI/6)*rz]),color);
  rect(frontPanel,corner,4,w-2*corner,1.5,'#293237');
  if(style==='coupe'){
    for(const u of [4.7,w-4.7]){roundLamp(frontPanel,u,8,2,2.8,'#2c3940');roundLamp(frontPanel,u,8,1.5,2.2,'#fff1c9');}
    rect(frontPanel,w*.32,4.8,w*.36,1.7,'#263237');
    rect(tailPanel,corner,8,w-2*corner,1.1,'#f05446');
    // Broad rear deck and a small integrated spoiler.
    surface([[2,l-5,10],[w-2,l-5,10],[w-2,l-2,11],[2,l-2,11]],model.color);
  }else if(style==='suv'){
    rect(frontPanel,6,7,w-12,5,'#253134');
    for(let z=8;z<12;z+=1.3)rect(frontPanel,7,z,w-14,.4,'#728183');
    for(const u of [3.5,w-3.5])roundLamp(frontPanel,u,9.5,2,2,'#eee7c9');
    rect(tailPanel,2,6,2,5,'#ce4a37');rect(tailPanel,w-4,6,2,5,'#ce4a37');
    // Rear-mounted spare tire stays with the body, not the rolling wheels.
    const ring=(v,r)=>Array.from({length:16},(_,i)=>at(w/2+Math.cos(i*Math.PI/8)*r,v,17+Math.sin(i*Math.PI/8)*r));
    const inner=ring(l-1,5.6),outer=ring(l,5.6);
    for(let i=0;i<16;i++)face([inner[i],outer[i],outer[(i+1)%16],inner[(i+1)%16]],'#252c2d');
    const spare=face(outer,'#252c2d');detail(spare,ring(l,3),'#707c79');
    for(const u of [2,w-2])surface([[u,front, h+.7],[u+.5,front,h+.7],[u+.5,rear,h+.7],[u,rear,h+.7]],'#263436');
  }else if(style==='van'){
    frontPanel([[5,10],[w-5,10],[w-7,5],[7,5]],'#23333c');
    for(let z=6;z<10;z+=1.2)rect(frontPanel,7,z,w-14,.35,'#77898c');
    for(const u of [2,w-5])frontPanel([[u,8],[u+3,9],[u+2.5,12],[u,11]],'#f6eed4');
    // Tall rear doors and vertical lights distinguish the cargo body.
    const back=surface([[1,l-1,belt],[w-1,l-1,belt],[w-1,l-1,h],[1,l-1,h]],model.color);
    detail(back,[[w/2-.2,l-1,belt],[w/2+.2,l-1,belt],[w/2+.2,l-1,h-1],[w/2-.2,l-1,h-1]].map(p=>at(...p)),'#768486');
    for(const u of [2,w-4])surface([[u,l-1,8],[u+2,l-1,8],[u+2,l-1,18],[u,l-1,18]],'#ca4539');
  }else{
    if(style==='sedan'){
      // BMW: paired kidney grille and twin lamp elements.
      for(const u of [w/2-4,w/2+.5]){rect(frontPanel,u,7,3.5,4,'#a9b7bc');rect(frontPanel,u+.5,7.4,2.5,3.2,'#202c34');}
      for(const u of [3.5,5.5,w-5.5,w-3.5])roundLamp(frontPanel,u,9, .8,1.1,'#f5eed7');
    }else if(style==='liftback'){
      frontPanel([[6,11],[w-6,11],[w-7,7],[7,7]],'#253239');
      for(let u=7;u<w-6;u+=1.2)rect(frontPanel,u,7.5,.35,3,'#9aa9ab');
      for(const u of [2.8,w-6.2])frontPanel([[u,8],[u+3.4,8.5],[u+3.4,10.5],[u,10]],'#f5edd4');
    }else{
      rect(frontPanel,3,8,w-6,2.4,'#253237');
      rect(frontPanel,3,9.4,w-6,.4,'#aab9b9');
      roundLamp(frontPanel,w/2,9.2,1.1,1.1,'#b7c5c7');
      for(const u of [2.8,w-6.2])rect(frontPanel,u,8.5,3.4,2,'#f5eed8');
    }
    for(const u of [corner,w-corner-4])rect(tailPanel,u,8,4,2,'#d6493b');
  }
  for(const draw of [frontPanel,tailPanel])rect(draw,w*.4,5,w*.2,1.4,'#e4e7dd');
  for(const side of [2,6]){
    const sx=side===2?w:0;
    for(const sy of [front+2,rear-2])detail(body[side],[[sx,sy,10],[sx,sy+3,10],[sx,sy+3,11],[sx,sy,11]].map(p=>at(...p)),'#dce0d6');
  }
  const hinge=at(-.3,front-2,0);
  const door=surface([[-.3,front-2,4],[-.3,doorEnd,4],[-.3,doorEnd,h-1],[-.3,front-2,h-1]],model.color);
  door.driverDoor={hinge};
  const frame=(v0,v1,z0,z1)=>[at(-.3,v0,z0),at(-.3,v1,z0),at(-.3,v1,z1),at(-.3,v0,z1)];
  door.cutout=[frame(front-2,doorEnd,4,13),frame(front-2,doorEnd,h-2,h-1),frame(front-2,front,13,h-2),frame(doorEnd-1,doorEnd,13,h-2)];
  detail(door,[at(-.3,front,13),at(-.3,doorEnd-1,13),at(-.3,doorEnd-1,h-2),at(-.3,front,h-2)],'#1d3038');
  door.details[0].driverWindow=true;
  // Cabin furniture is real geometry, visible through the open window and door.
  const interior=globalThis.cityCockpit?.profiles[model.name]||{dash:'#30363b',seat:'#595b54',trim:'#969c93'};
  const cuboid=(u,v,z,ww,dd,hh,color)=>{
    const corners=[[u,v],[u+ww,v],[u+ww,v+dd],[u,v+dd]];
    for(let i=0;i<4;i++){const a=corners[i],b=corners[(i+1)%4];surface([[...a,z],[...b,z],[...b,z+hh],[...a,z+hh]],color);}
    surface(corners.map(p=>[...p,z+hh]),color);
  };
  cuboid(2,front-1,belt-1,w-4,4,2,interior.dash);
  cuboid(w*.48,front+4,6,w*.12,l*.22,4,interior.dash);
  for(const seatX of [w*.12,w*.58]){
    cuboid(seatX,front+4,6,w*.28,6,2,interior.seat);
    cuboid(seatX,front+9,8,w*.28,2,Math.max(5,h-12),interior.seat);
    cuboid(seatX+w*.06,front+9,h-4,w*.16,2,2,interior.seat);
  }
  if(style!=='van')cuboid(3,Math.min(rear-3,l*.76),7,w-6,3,Math.max(4,h-13),interior.seat);
  if(model.police){
    for(const side of [0,w])surface([[side,l*.26,6],[side,l*.88,6],[side,l*.88,10],[side,l*.26,10]],'#285488');
    for(const [u,color,phase] of [[w*.25,'#3e8eff',0],[w*.55,'#fc5555',1]]){
      const lamp=surface([[u,l*.48,h+1],[u+w*.2,l*.48,h+1],[u+w*.2,l*.48,h+3],[u,l*.48,h+3]],color);lamp.emergency=phase;
      const top=surface([[u,l*.48,h+3],[u+w*.2,l*.48,h+3],[u+w*.2,l*.56,h+3],[u,l*.56,h+3]],color);top.emergency=phase;
    }
    const label='POLICIE',unit=.27;
    [...label].forEach((letter,i)=>signFont[letter].forEach((row,y)=>[...row].forEach((pixel,x)=>{
      if(pixel==='1')surface([[w/2-5.5+(i*6+x)*unit,0,11+(6-y)*unit],[w/2-5.5+(i*6+x+1)*unit,0,11+(6-y)*unit],[w/2-5.5+(i*6+x+1)*unit,0,11+(7-y)*unit],[w/2-5.5+(i*6+x)*unit,0,11+(7-y)*unit]],'#244b7a');
    })));
  }
  cars.push({x:x+w/2,y:y+l/2,name:model.name,performance:model.performance,gear:1,shiftTime:0,police:!!model.police,bodyColor:model.color,doorOpen:0,windowBroken:false,driverOccupied:true});
}
// Closed routes follow the same bends as the street mesh; rounded corners keep turns smooth.
function cityRoute(col,row,walking=false){
  const left=roadX[col],right=roadX[col+1],top=roadY[row],bottom=roadY[row+1];
  const vx=i=>walking?(i%2?38:44)+6:18;
  const hy=i=>walking?(i%2?36:44)+6:18;
  const points=[],margin=walking?76:65;
  const add=(x,y)=>points.push([x,y]);
  const corner=(control,end)=>{
    const start=points[points.length-1];
    for(let i=1;i<=8;i++){const t=i/8,u=1-t;add(u*u*start[0]+2*u*t*control[0]+t*t*end[0],u*u*start[1]+2*u*t*control[1]+t*t*end[1]);}
  };
  for(let x=left+margin;x<=right-margin;x+=5)add(x,top+bend(x,roadX,row)+hy(row));
  corner([right-vx(col+1),top+hy(row)],[right-bend(0,roadY,col+1)-vx(col+1),top+margin]);
  for(let y=top+margin+5;y<=bottom-margin;y+=5)add(right+bend(y,roadY,col+1)-vx(col+1),y);
  corner([right-vx(col+1),bottom-hy(row+1)],[right-margin,bottom-hy(row+1)]);
  for(let x=right-margin-5;x>=left+margin;x-=5)add(x,bottom+bend(x,roadX,row+1)-hy(row+1));
  corner([left+vx(col),bottom-hy(row+1)],[left+vx(col),bottom-margin]);
  for(let y=bottom-margin-5;y>=top+margin;y-=5)add(left+bend(y,roadY,col)+vx(col),y);
  corner([left+vx(col),top+hy(row)],points[0]);
  const lengths=[0];
  for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));
  return {points,lengths,length:lengths[lengths.length-1]};
}
function routePoint(route,distance){
  const d=((distance%route.length)+route.length)%route.length;
  let lo=0,hi=route.lengths.length-1;
  while(lo+1<hi){const mid=(lo+hi)>>1;if(route.lengths[mid]<=d)lo=mid;else hi=mid;}
  const a=route.points[lo],b=route.points[lo+1],t=(d-route.lengths[lo])/(route.lengths[lo+1]-route.lengths[lo]);
  return {x:a[0]+(b[0]-a[0])*t,y:a[1]+(b[1]-a[1])*t,angle:Math.atan2(b[1]-a[1],b[0]-a[0])};
}
function angleDelta(from,to){return Math.atan2(Math.sin(to-from),Math.cos(to-from));}
function routePose(route,distance){
  const point=routePoint(route,distance),before=routePoint(route,distance-7),after=routePoint(route,distance+7);
  point.angle=Math.atan2(after.y-before.y,after.x-before.x);
  return point;
}
function attachMesh(actor,start){
  actor.mesh=faces.splice(start);
  actor.renderMesh=actor.mesh.map(f=>({...f,points:f.points.map(p=>p.slice()),center:f.center.slice(),cutout:f.cutout?.map(polygon=>polygon.map(p=>p.slice())),openCutout:f.openCutout?.map(polygon=>polygon.map(p=>p.slice())),details:f.details.map(d=>({...d,points:d.points.map(p=>p.slice())}))}));
}
function poseMesh(actor){
  const cos=Math.cos(actor.angle+Math.PI/2),sin=Math.sin(actor.angle+Math.PI/2);
  const transform=(p,out,f)=>{
    let [x,y,z]=p;
    if(f.driverDoor){
      const [cx,cy]=f.driverDoor.hinge,angle=actor.doorOpen||0,dx=x-cx,dy=y-cy;
      x=cx+dx*Math.cos(angle)-dy*Math.sin(angle);y=cy+dx*Math.sin(angle)+dy*Math.cos(angle);
    }
    if(f.wheel){
      const wheel=f.wheel,[cx,cy,cz]=wheel.pivot;
      const spin=-(actor.wheelTravel||0)/wheel.radius;
      const dy=y-cy,dz=z-cz;
      y=cy+dy*Math.cos(spin)-dz*Math.sin(spin);
      z=cz+dy*Math.sin(spin)+dz*Math.cos(spin);
      const steer=wheel.front?(actor.steering||0):0,dx=x-cx,ry=y-cy;
      x=cx+dx*Math.cos(steer)-ry*Math.sin(steer);y=cy+dx*Math.sin(steer)+ry*Math.cos(steer);
    }
    if(actor.walking){
      const amount=actor.walkBlend||0,phase=actor.gait;
      if(f.limb){
        const {side,pivot,knee}=f.limb;
        const swing=Math.sin(phase)*side*.48*amount;
        if(knee){
          const bend=Math.max(0,Math.cos(phase)*side)*.65*amount;
          const dy=y,dz=z-5;
          y=dy*Math.cos(bend)-dz*Math.sin(bend);z=5+dy*Math.sin(bend)+dz*Math.cos(bend);
        }
        const dy=y,dz=z-pivot;
        y=dy*Math.cos(swing)-dz*Math.sin(swing);z=pivot+dy*Math.sin(swing)+dz*Math.cos(swing);
      }
      z+=Math.abs(Math.sin(phase))*.45*amount;
      if(actor.hit||actor.extractionPose){
        const tilt=actor.bodyTilt||0,oldY=y,oldZ=z;
        y=oldY*Math.cos(tilt)-oldZ*Math.sin(tilt);
        z=oldY*Math.sin(tilt)+oldZ*Math.cos(tilt)+(actor.bodyLift||0)+Math.sin(tilt)*2.5;
      }
    }
    out[0]=actor.x+x*cos-y*sin;out[1]=actor.y+x*sin+y*cos;out[2]=z+(actor.altitude||0);
  };
  actor.mesh.forEach((f,i)=>{
    const out=actor.renderMesh[i];out.color=f.emergency===undefined?f.color:actor.siren&&Math.floor(wanted.time*7)%2===f.emergency?f.color:'#243b54';out.hidden=!!f.driverDoor&&!actor.doorOpen;out.doorOpening=!!f.openCutout&&actor.doorOpen>.01;
    f.details.forEach((d,k)=>{out.details[k].hidden=!!(d.seatedDriver&&!actor.driverOccupied||d.driverWindow&&actor.windowBroken||d.fixedWindow&&actor.doorOpen>.01);out.details[k].color=d.color;});
    f.points.forEach((p,j)=>transform(p,out.points[j],f));transform(f.center,out.center,f);
    f.cutout?.forEach((polygon,k)=>polygon.forEach((p,j)=>transform(p,out.cutout[k][j],f)));
    f.openCutout?.forEach((polygon,k)=>polygon.forEach((p,j)=>transform(p,out.openCutout[k][j],f)));
    f.details.forEach((d,k)=>d.points.forEach((p,j)=>transform(p,out.details[k].points[j],f)));

  });
}
for(let i=0;i<12;i++){
  const model=carModels[i%carModels.length],route=cityRoute(i%4,Math.floor(i/4));
  const start=faces.length;car(-model.width/2,-model.length/2,model);
  const actor=cars[cars.length-1];
  Object.assign(actor,{route,distance:route.length*(.12+(i%3)*.23),speed:0,wheelTravel:0,steering:0,maxSpeed:42+i%4*6,length:model.length,width:model.width});
  attachMesh(actor,start);Object.assign(actor,routePose(route,actor.distance));poseMesh(actor);
}
const parkingBuildings=[buildings[9],buildings[21],buildings[33]];
parkingBuildings.forEach((b,i)=>{
  const car=cars[i*4+3];
  car.parked=true;car.driverOccupied=false;car.speed=0;car.x=b.x+b.w*.77;car.y=b.y+b.d*.73;car.angle=-Math.PI/2;
  ground(b.x+b.w*.56,b.y+b.d*.46,b.w*.44,b.d*.54,'#727974',.21);
  for(const offset of [-car.width/2-4,car.width/2+4])ground(car.x+offset,car.y-car.length/2-5,1,car.length+10,'#e6dec4',.32);
  ground(car.x-car.width/2-4,car.y+car.length/2+5,car.width+9,1,'#e6dec4',.32);
  poseMesh(car);
});
function person(shirt,skin,style={}){
  const pants=style.pants||'#35434c',shoes=style.shoes||'#20292e',hair=style.hair||'#302b29';
  // Chunky, faceted proportions and clear clothing blocks give pedestrians a
  // late-90s low-poly look that reads well in the game's limited perspective.
  ringsMesh([[0,0,10,3.5,2],[0,0,18,4.4,2.7],[0,0,21,3.3,2.3]],shirt,5);
  ringsMesh([[0,0,20,1.9,1.9],[0,0,23.5,2.9,2.6],[0,0,26.5,2.3,2.2],[0,0,27,1.4,1.5]],skin,6);
  // Hair cap and a contrasting front patch make the head readable at a distance.
  ringsMesh([[0,0,24.5,2.8,2.5],[0,0,27,2.4,2.2],[0,0,27.2,1.8,1.8]],hair,5);
  box(-1.65,-2.1,3.3,.65,.7,style.hairAccent||hair,26.2);
  // Jacket lapels / shirt panel, facing the direction of travel.
  box(-.65,-2.8,1.3,.45,5,style.accent||shirt,15);
  for(const side of [-1,1]){
    box(side*.7,-3,0.45,.5,4,style.accent||'#d3c49a',18);
  }
  for(const side of [-1,1]){
    let start=faces.length;
    box(side*2-1,-1,2,2,5,pants,5);
    for(let i=start;i<faces.length;i++)faces[i].limb={side,pivot:10};
    start=faces.length;
    box(side*2-1,-1,2,2,4.5,pants,.5);
    box(side*2-1.2,-2,2.4,3.5,1,shoes);
    for(let i=start;i<faces.length;i++)faces[i].limb={side,pivot:10,knee:true};
    start=faces.length;
    ringsMesh([[side*4,0,12,1,1],[side*4.5,0,19,1.2,1.2]],shirt,5);
    ringsMesh([[side*4,0,11,1,1],[side*4,0,13,1,1]],skin,5);
    for(let i=start;i<faces.length;i++)faces[i].limb={side:-side,pivot:19};
  }
}
for(let i=0;i<36;i++){
  const route=cityRoute(i%4,Math.floor(i/4)%4,true),start=faces.length;
  const outfits=[
    {shirt:'#d8af60',accent:'#eee0b0',pants:'#42434a',shoes:'#262626',hair:'#302824'},
    {shirt:'#679daa',accent:'#d8c99c',pants:'#243d50',shoes:'#303238',hair:'#201c1b'},
    {shirt:'#b76555',accent:'#e5b49b',pants:'#4b3b39',shoes:'#282523',hair:'#593b2b'},
    {shirt:'#70865b',accent:'#c9d1a3',pants:'#343d33',shoes:'#282d28',hair:'#39362e'},
    {shirt:'#aa82a6',accent:'#ead7c8',pants:'#564d5c',shoes:'#302a31',hair:'#332a33'},
    {shirt:'#dedbd0',accent:'#738c98',pants:'#334e62',shoes:'#313236',hair:'#514236'}
  ];
  const outfit=outfits[i%outfits.length];
  person(outfit.shirt,['#d4a57f','#996b50','#edc6a3'][i%3],outfit);
  const actor={route,distance:route.length*((i*.381)%1),speed:12+i%5*2,walking:true,walkBlend:0,currentSpeed:0,gait:i,wait:0,direction:i%2?1:-1};
  attachMesh(actor,start);Object.assign(actor,routePose(route,actor.distance));if(actor.direction<0)actor.angle+=Math.PI;poseMesh(actor);pedestrians.push(actor);
}
const playerAvatar={walking:true,walkBlend:0,gait:0};
{const start=faces.length;person('#447b94','#d4a57f');attachMesh(playerAvatar,start);}
function vehicleContains(car,x,y,padding=0){
  if(car.altitude>35)return false;
  const dx=x-car.x,dy=y-car.y,c=Math.cos(car.angle),s=Math.sin(car.angle);
  return Math.abs(dx*c+dy*s)<car.length/2+padding&&Math.abs(-dx*s+dy*c)<car.width/2+padding;
}
function pedestrianSpace(x,y,ignoreCar=null){
  return x>8&&y>8&&x<world.width-8&&y<world.height-8
    &&!buildings.some(b=>insideBuilding(x,y,b,4))
    &&!cars.some(c=>c!==ignoreCar&&vehicleContains(c,x,y,4));
}
function hitPedestrians(car,pose,speed){
  if(Math.abs(speed)<4||pose.altitude>30)return 0;
  let count=0;
  for(const p of pedestrians){
    if(p.hit||(p.hitCooldown||0)>0||p===takeover?.driver||!vehicleContains(pose,p.x,p.y,4))continue;
    const angle=pose.angle+(speed<0?Math.PI:0);
    p.hit={time:0,travel:0,angle,car};p.hitCooldown=5;p.bodyTilt=0;p.bodyLift=0;
    p.angle=angle;p.walkBlend=0;p.currentSpeed=0;p.wait=0;p.fleeTime=0;
    poseMesh(p);count++;
  }
  if(count&&car===drivenCar&&Math.abs(speed)>8)reportImpact();
  return count;
}
function updatePedestrianReaction(p,dt){
  p.hitCooldown=Math.max(0,(p.hitCooldown||0)-dt);
  if(p.hit){
    const hit=p.hit;hit.time+=dt;
    if(hit.time<.34){
      const progress=Math.min(1,hit.time/.32),target=10*(1-(1-progress)**2);
      const distance=target-hit.travel,steps=Math.max(1,Math.ceil(distance));
      for(let i=0;i<steps;i++){
        const x=p.x+Math.cos(hit.angle)*distance/steps,y=p.y+Math.sin(hit.angle)*distance/steps;
        if(!pedestrianSpace(x,y,hit.car))break;
        p.x=x;p.y=y;
      }
      hit.travel=target;p.bodyLift=Math.sin(progress*Math.PI)*5;p.bodyTilt=progress*Math.PI/2;
    }else if(hit.time<1.1){p.bodyLift=0;p.bodyTilt=Math.PI/2;}
    else if(hit.time<1.8){
      const progress=(hit.time-1.1)/.7,ease=progress*progress*(3-2*progress);
      p.bodyLift=0;p.bodyTilt=(1-ease)*Math.PI/2;
    }else{
      p.hit=null;p.bodyLift=0;p.bodyTilt=0;p.displaced=true;p.fleeTime=6;p.fleeFrom=hit.car;p.wait=0;p.walkBlend=1.2;
    }
    poseMesh(p);return true;
  }
  if(p.fleeTime>0){
    p.fleeTime=Math.max(0,p.fleeTime-dt);
    const away=Math.atan2(p.y-p.fleeFrom.y,p.x-p.fleeFrom.x);
    const preferred=p.angle+angleDelta(p.angle,away)*(1-Math.exp(-dt*4));
    let moved=false;
    for(const offset of [0,.55,-.55,1.1,-1.1,1.8,-1.8,Math.PI]){
      const angle=preferred+offset,x=p.x+Math.cos(angle)*38*dt,y=p.y+Math.sin(angle)*38*dt;
      if(!pedestrianSpace(x,y)||(!drivenCar&&Math.hypot(x-player.x,y-player.y)<14)||pedestrians.some(other=>other!==p&&!other.hit&&Math.hypot(other.x-x,other.y-y)<7))continue;
      p.x=x;p.y=y;p.angle=angle;p.gait+=38*dt*.45;moved=true;break;
    }
    p.walkBlend=moved?1.2:0;
    if(!p.fleeTime){p.fleeFrom=null;p.wait=.5;p.walkBlend=0;}
    poseMesh(p);return true;
  }
  return false;
}
function updateActors(dt){
  for(const car of cars){
    if(car.rebound||car.parked||car.police||car===drivenCar||car===takeover?.car)continue;
    const look=car.length/2+18+car.speed*.65,c=Math.cos(car.angle),s=Math.sin(car.angle);
    const ahead=(x,y,r,lateral=r)=>{const dx=x-car.x,dy=y-car.y;return dx*c+dy*s>0&&dx*c+dy*s<look+r&&Math.abs(-dx*s+dy*c)<car.width/2+lateral;};
    const stop=ahead(player.x,player.y,player.radius)||pedestrians.some(p=>!p.hit&&ahead(p.x,p.y,4))||cars.some(other=>{if(other===car)return false;const angle=other.angle-car.angle;return ahead(other.x,other.y,Math.abs(Math.cos(angle))*other.length/2+Math.abs(Math.sin(angle))*other.width/2,Math.abs(Math.sin(angle))*other.length/2+Math.abs(Math.cos(angle))*other.width/2);});
    const aheadPose=routePose(car.route,car.distance+24);
    const curvature=angleDelta(car.angle,aheadPose.angle)/24;
    const targetSpeed=stop?0:car.maxSpeed/(1+Math.abs(curvature)*45);
    car.speed+=Math.max(-100*dt,Math.min(18*dt,targetSpeed-car.speed));
    const steer=Math.max(-.55,Math.min(.55,Math.atan(car.length*.58*curvature)));
    car.steering+=(steer-car.steering)*(1-Math.exp(-dt*8));
    const next=routePose(car.route,car.distance+car.speed*dt);
    if(!vehicleContains({...car,...next},player.x,player.y,player.radius+2)&&(!drivenCar||drivenCar.altitude>35||!polygonsOverlap(carCorners({...car,...next}),carCorners(drivenCar)))){
      car.wheelTravel+=car.speed*dt;
      car.distance=(car.distance+car.speed*dt)%car.route.length;Object.assign(car,next);
      if(hitPedestrians(car,car,car.speed))car.speed*=.65;
    }else car.speed=0;
    poseMesh(car);
  }
  for(const p of pedestrians){
    if(updatePedestrianReaction(p,dt))continue;
    if(p.displaced){
      if(takeover?.driver===p)continue;
      p.wait=Math.max(0,p.wait-dt);
      p.walkBlend=p.wait>0?0:1;
      if(!p.wait){
        const x=p.x+Math.cos(p.angle)*16*dt,y=p.y+Math.sin(p.angle)*16*dt;
        if(!blocked(x,y)&&Math.hypot(x-player.x,y-player.y)>14){p.x=x;p.y=y;p.gait+=dt*7;}
        else {p.angle+=dt*2;p.walkBlend=0;}
      }
      poseMesh(p);continue;
    }
    p.wait=Math.max(0,p.wait-dt);
    const probe=routePose(p.route,p.distance+(p.currentSpeed*dt+8)*p.direction);
    const stopped=p.wait>0||Math.hypot(probe.x-player.x,probe.y-player.y)<15||cars.some(c=>vehicleContains(c,probe.x,probe.y,7));
    const target=stopped?0:p.speed;
    p.currentSpeed+=Math.max(-60*dt,Math.min(24*dt,target-p.currentSpeed));
    const distance=p.currentSpeed*dt,next=routePose(p.route,p.distance+distance*p.direction);
    const safe=Math.hypot(next.x-player.x,next.y-player.y)>=15&&!cars.some(c=>vehicleContains(c,next.x,next.y,7));
    if(safe&&distance>0){
      p.distance=(p.distance+distance*p.direction+p.route.length)%p.route.length;
      p.x=next.x;p.y=next.y;
      const heading=next.angle+(p.direction<0?Math.PI:0);
      p.angle+=angleDelta(p.angle,heading)*(1-Math.exp(-dt*9));
      p.gait+=distance*.45;
      if(p.wait===0&&random()<dt*.025)p.wait=1+random()*3;
    }else p.currentSpeed=0;
    p.walkBlend+=(p.currentSpeed/p.speed-p.walkBlend)*(1-Math.exp(-dt*12));
    poseMesh(p);
  }
}
function resize(){width=innerWidth;height=innerHeight;const dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=width*dpr;canvas.height=height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);}
addEventListener('resize',resize);resize();
function setPaused(value){globalThis.cityAudio?.setPaused(value||(typeof shopState!=='undefined'&&shopState.open)||(typeof workState!=='undefined'&&workState.open));paused=value;keys.clear();document.getElementById('overlay').hidden=!paused;document.getElementById('pause').textContent=paused?'▷':'Ⅱ';document.getElementById('pause').setAttribute('aria-label',paused?'Pokračovat ve hře':'Pozastavit hru');if(paused&&document.pointerLockElement===canvas)document.exitPointerLock();}
function lockMouse(){if(!paused&&canvas.requestPointerLock){try{const result=canvas.requestPointerLock();if(result?.catch)result.catch(showMouseFallback);}catch{showMouseFallback();}}}
function showMouseFallback(){const hint=document.getElementById('look-hint');hint.textContent='Hra běží: pohyb WASD · rozhlížení tažením myši nebo šipkami';hint.hidden=false;}
canvas.addEventListener('click',lockMouse);
let mouseWasLocked=false;
document.addEventListener('pointerlockchange',()=>{const locked=document.pointerLockElement===canvas;document.getElementById('look-hint').hidden=locked;if(mouseWasLocked&&!locked)setPaused(true);mouseWasLocked=locked;});
document.addEventListener('pointerlockerror',showMouseFallback);
let drag=null;
canvas.addEventListener('pointerdown',e=>{if(document.pointerLockElement!==canvas){drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);}});
canvas.addEventListener('pointermove',e=>{if(drag&&!paused&&!takeover&&document.pointerLockElement!==canvas){player.angle+=(e.clientX-drag.x)*.004;player.pitch=Math.max(-.65,Math.min(.65,player.pitch-(e.clientY-drag.y)*.003));drag={x:e.clientX,y:e.clientY};}});
for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>drag=null);
document.addEventListener('mousemove',e=>{if(!paused&&!takeover&&document.pointerLockElement===canvas){player.angle+=e.movementX*.0025;player.pitch=Math.max(-.65,Math.min(.65,player.pitch-e.movementY*.0025));}});
addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' ','w','a','s','d','e'].includes(k))e.preventDefault();if(typeof workState!=='undefined'&&workState.open){if(k==='escape'&&!e.repeat)setPaused(!paused);else if(k==='e'&&!e.repeat)interactProfession();else if(['1','2','3'].includes(k)&&!e.repeat)chooseWorkAction(Number(k)-1);else if(!['q','f','r'].includes(k))keys.add(k);return;}if(typeof shopState!=='undefined'&&shopState.open){if(k==='escape'){if(!e.repeat)setPaused(!paused);}else if(k==='e'){if(!e.repeat)interactShop();}else if(k==='r'){if(!e.repeat)returnShopItem();}else keys.add(k);return;}if(k==='r'){if(!e.repeat&&!paused&&!takeover){thirdPerson=!thirdPerson;notice(thirdPerson?'Pohled z třetí osoby':'Pohled z první osoby');}return;}if(k==='q'&&!e.repeat&&typeof cycleWeapon==='function'){cycleWeapon();return;}if(k==='f'&&!e.repeat){if(typeof inspectWeapon==='function')inspectWeapon();return;}if(k==='escape'&&!e.repeat){if(document.pointerLockElement===canvas)setPaused(true);else setPaused(!paused);}else if(k==='e'){if(!e.repeat)interactCar();}else keys.add(k);});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>setPaused(true));
document.getElementById('interact').onclick=interactCar;
document.getElementById('pause').onclick=()=>setPaused(!paused);document.getElementById('resume').onclick=()=>{setPaused(false);};
for(const button of document.querySelectorAll('[data-key]')){button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);keys.add(button.dataset.key);});for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>keys.delete(button.dataset.key));}
function insideBuilding(x,y,b,radius=0){
  let inside=false;
  const points=b.outline;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const a=points[j],c=points[i];
    if((a[1]>y)!==(c[1]>y)&&x<(c[0]-a[0])*(y-a[1])/(c[1]-a[1])+a[0])inside=!inside;
    const dx=c[0]-a[0],dy=c[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));
    if(Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)<radius)return true;
  }
  return inside;
}
function carCorners(car){
  const c=Math.cos(car.angle),s=Math.sin(car.angle);
  return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([forward,side])=>[
    car.x+c*forward*car.length/2-s*side*(car.width/2+1),
    car.y+s*forward*car.length/2+c*side*(car.width/2+1)]);
}
function polygonsOverlap(a,b){
  if(a.some(([x,y])=>insideBuilding(x,y,{outline:b}))||b.some(([x,y])=>insideBuilding(x,y,{outline:a})))return true;
  for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){
    const p=a[i],q=a[(i+1)%a.length],r=b[j],s=b[(j+1)%b.length];
    const dx=q[0]-p[0],dy=q[1]-p[1],ex=s[0]-r[0],ey=s[1]-r[1],det=dx*ey-dy*ex;
    if(Math.abs(det)<1e-8)continue;
    const t=((r[0]-p[0])*ey-(r[1]-p[1])*ex)/det,u=((r[0]-p[0])*dy-(r[1]-p[1])*dx)/det;
    if(t>=0&&t<=1&&u>=0&&u<=1)return true;
  }
  return false;
}
function drivingBlocked(pose,car,ignorePedestrians=false){
  const outline=carCorners(pose);
  return outline.some(([x,y])=>x<18||y<18||x>world.width-18||y>world.height-18)
    ||buildings.some(b=>(pose.altitude||0)<b.height+3&&polygonsOverlap(outline,b.outline))
    ||cars.some(other=>other!==car&&Math.abs((pose.altitude||0)-(other.altitude||0))<35&&polygonsOverlap(outline,carCorners(other)))
    ||(pose.altitude||0)<30&&!ignorePedestrians&&pedestrians.some(p=>!p.hit&&vehicleContains(pose,p.x,p.y,5));
}
function vehicleMass(car){
  if(car.bike)return 230;
  if(/Transit/.test(car.name))return 2500;
  if(/Defender/.test(car.name))return 2200;
  return /Porsche|Apex|Tempest/.test(car.name)?1400:1600;
}
function vehicleVelocity(car){
  return car.rebound?{x:car.rebound.x,y:car.rebound.y}:{x:Math.cos(car.angle+(car.driftAngle||0))*car.speed,y:Math.sin(car.angle+(car.driftAngle||0))*car.speed};
}
function collisionNormal(a,b){
  let depth=Infinity,normal={x:1,y:0};
  const center=poly=>poly.reduce((s,p)=>({x:s.x+p[0]/poly.length,y:s.y+p[1]/poly.length}),{x:0,y:0});
  const ca=center(a),cb=center(b);
  for(const poly of [a,b])for(let i=0;i<poly.length;i++){
    const p=poly[i],q=poly[(i+1)%poly.length],length=Math.hypot(q[0]-p[0],q[1]-p[1]);if(!length)continue;
    let x=-(q[1]-p[1])/length,y=(q[0]-p[0])/length;
    const pa=a.map(p=>p[0]*x+p[1]*y),pb=b.map(p=>p[0]*x+p[1]*y);
    const overlap=Math.min(Math.max(...pa),Math.max(...pb))-Math.max(Math.min(...pa),Math.min(...pb));
    if(overlap<depth){if((ca.x-cb.x)*x+(ca.y-cb.y)*y<0){x=-x;y=-y;}normal={x,y};depth=overlap;}
  }
  return normal;
}
function vehicleContact(pose,car){
  const outline=carCorners(pose);let x=0,y=0;
  if(outline.some(p=>p[0]<18))x++;
  if(outline.some(p=>p[0]>world.width-18))x--;
  if(outline.some(p=>p[1]<18))y++;
  if(outline.some(p=>p[1]>world.height-18))y--;
  if(x||y){const length=Math.hypot(x,y);return {normal:{x:x/length,y:y/length},other:null};}
  const building=buildings.find(b=>(pose.altitude||0)<b.height+3&&polygonsOverlap(outline,b.outline));
  if(building){
    // Closest facade also handles the concave footprints used by this city.
    let distance=Infinity,normal={x:0,y:0};
    for(let i=0;i<building.outline.length;i++){
      const a=building.outline[i],b=building.outline[(i+1)%building.outline.length],dx=b[0]-a[0],dy=b[1]-a[1];
      const t=Math.max(0,Math.min(1,((car.x-a[0])*dx+(car.y-a[1])*dy)/(dx*dx+dy*dy)));
      const nx=car.x-a[0]-dx*t,ny=car.y-a[1]-dy*t,d=Math.hypot(nx,ny);
      if(d<distance&&d>0){distance=d;normal={x:nx/d,y:ny/d};}
    }
    return {normal,other:null};
  }
  const other=cars.find(c=>c!==car&&Math.abs((pose.altitude||0)-(c.altitude||0))<35&&polygonsOverlap(outline,carCorners(c)));
  return other?{normal:collisionNormal(outline,carCorners(other)),other}:null;
}
function setVehicleRebound(car,velocity){
  car.rebound={x:velocity.x,y:velocity.y};car.driftAngle=0;
  car.speed=velocity.x*Math.cos(car.angle)+velocity.y*Math.sin(car.angle);
  // Displaced traffic must not teleport back onto its precomputed route.
  if(car!==drivenCar&&!car.police)car.parked=true;
  if(car.police){car.recovery=null;car.holding=false;car.repath=0;}
}
function resolveVehicleImpact(car,contact){
  const {normal:n,other}=contact,a=vehicleVelocity(car),b=other?vehicleVelocity(other):{x:0,y:0};
  const closing=-((a.x-b.x)*n.x+(a.y-b.y)*n.y);
  if(closing<=.01)return 0;
  const restitution=.3+.3*Math.min(1,closing/250);
  const invA=1/vehicleMass(car),invB=other?1/vehicleMass(other):0;
  const impulse=(1+restitution)*closing/(invA+invB);
  setVehicleRebound(car,{x:a.x+impulse*invA*n.x,y:a.y+impulse*invA*n.y});
  if(other){
    setVehicleRebound(other,{x:b.x-impulse*invB*n.x,y:b.y-impulse*invB*n.y});
    if((car===drivenCar||other===drivenCar)&&closing>8)reportImpact();
  }
  return closing;
}
function updateVehicleRebounds(dt){
  for(const car of cars){
    if(!car.rebound)continue;
    const count=Math.max(1,Math.ceil(Math.hypot(car.rebound.x,car.rebound.y)*dt/1.5));
    for(let i=0;i<count;i++){
      const velocity=car.rebound,next={...car,x:car.x+velocity.x*dt/count,y:car.y+velocity.y*dt/count};
      const contact=vehicleContact(next,car);
      if(contact){resolveVehicleImpact(car,contact);break;}
      car.x=next.x;car.y=next.y;car.wheelTravel+=(velocity.x*Math.cos(car.angle)+velocity.y*Math.sin(car.angle))*dt/count;
      hitPedestrians(car,car,Math.hypot(velocity.x,velocity.y));
    }
    const drag=Math.exp(-dt*(car===drivenCar&&keys.has(' ')?6:2.5));
    car.rebound.x*=drag;car.rebound.y*=drag;
    car.speed=car.rebound.x*Math.cos(car.angle)+car.rebound.y*Math.sin(car.angle);
    if(Math.hypot(car.rebound.x,car.rebound.y)<2){car.rebound=null;car.speed=0;}
    poseMesh(car);if(car===drivenCar)syncDriver();
  }
}
function nearbyCar(){
  return cars.filter(c=>!c.police&&!c.rebound&&!(c.altitude>0)&&Math.abs(c.speed)<70&&Math.hypot(c.x-player.x,c.y-player.y)<c.length/2+28)
    .sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0];
}
function notice(text){drivingNotice=text;drivingNoticeTime=3;}
function interactCar(){
  if(paused||takeover)return;
  if(typeof workState!=='undefined'&&workState.open){interactProfession();return;}
  if(typeof shopState!=='undefined'&&shopState.open){interactShop();return;}
  if(typeof nearShop==='function'&&nearShop()){openShop();return;}
  if(typeof interactWork==='function'&&interactWork())return;
  if(drivenCar){
    const car=drivenCar;
    if(car.altitude>0){notice('Nejdřív přistaň · F');return;}
    const c=Math.cos(car.angle),s=Math.sin(car.angle),spots=[];
    for(const side of [-1,1])for(const forward of [0,-car.length*.3,car.length*.3]){
      const offset=side*(car.width/2+player.radius+5);
      spots.push({x:car.x+c*forward-s*offset,y:car.y+s*forward+c*offset});
    }
    const spot=spots.find(p=>!blocked(p.x,p.y)&&!pedestrians.some(n=>Math.hypot(n.x-p.x,n.y-p.y)<14));
    if(!spot){notice('Vedle auta není místo k vystoupení');return;}
    car.speed=0;car.rebound=null;car.driftAngle=0;car.parked=true;car.steering=0;poseMesh(car);
    drivenCar=null;Object.assign(player,spot);player.pitch=0;keys.clear();notice('Vystoupil jsi z auta');
  }else{
    const car=nearbyCar();
    if(!car){notice('Přijdi blíž ke stojícímu autu');return;}
    // Do not enter through a building wall.
    for(let t=.1;t<1;t+=.1)if(buildings.some(b=>insideBuilding(player.x+(car.x-player.x)*t,player.y+(car.y-player.y)*t,b,2))){notice('Přijdi ke dveřím auta');return;}
    if(car.driverOccupied||!car.unlocked&&!car.windowBroken){startTakeover(car);return;}
    drivenCar=car;resetJump();car.parked=false;car.speed=0;keys.clear();player.pitch=0;syncDriver();
    notice('W / S: plyn a zpátečka · A / D: zatáčení · mezerník: ruční brzda / drift');
  }
}
function startTakeover(car){
  if(car.police){notice('Do policejního auta nemůžeš nastoupit');return;}
  const c=Math.cos(car.angle),s=Math.sin(car.angle),side=(player.x-car.x)*(-s)+(player.y-car.y)*c;
  if(side>0){notice('Přijdi k oknu řidiče na levé straně auta');return;}
  const spots=[-.4,.4,0].map(f=>({x:car.x+c*car.length*f+s*(car.width/2+19),y:car.y+s*car.length*f-c*(car.width/2+19)}));
  const spot=spots.find(p=>!blocked(p.x,p.y)&&Math.hypot(p.x-player.x,p.y-player.y)>16&&!pedestrians.some(n=>Math.hypot(n.x-p.x,n.y-p.y)<14));
  if(!spot){notice('U řidiče není dost místa');return;}
  resetJump();
  takeover={car,time:0,driver:null,spot,start:{x:player.x,y:player.y},breakWindow:!car.driverOccupied,stage:car.driverOccupied?'Otevíráš dveře':'Rozbíjíš okno'};
  car.speed=0;keys.clear();player.pitch=0;player.angle=Math.atan2(car.y-player.y,car.x-player.x);
}
function updateTakeover(dt){
  const action=takeover,car=action.car;
  action.time+=dt;const t=action.time;
  if(t>=.55&&action.breakWindow&&!car.windowBroken){car.windowBroken=true;emitGlass(car);globalThis.cityAudio?.carAction?.('glass');}
  if(t>=.8&&car.driverOccupied&&!action.driver){
    const start=faces.length;person('#6e8095','#c29c79');
    const driver={x:car.x,y:car.y,extractionPose:true,bodyTilt:.55,bodyLift:-7,angle:car.angle-Math.PI/2,walking:true,walkBlend:0,gait:0,displaced:true,wait:2.5};
    attachMesh(driver,start);pedestrians.push(driver);action.driver=driver;car.driverOccupied=false;
  }
  if(action.driver){
    const progress=Math.min(1,Math.max(0,(t-.8)/.85)),ease=progress*progress*(3-2*progress);
    const c=Math.cos(car.angle),s=Math.sin(car.angle),seatX=car.x+c*car.length*.1+s*car.width*.24,seatY=car.y+s*car.length*.1-c*car.width*.24;
    action.driver.x=seatX+(action.spot.x-seatX)*ease;action.driver.y=seatY+(action.spot.y-seatY)*ease;
    action.driver.bodyTilt=.35*(1-ease)+Math.sin(progress*Math.PI)*.15;
    action.driver.bodyLift=-7*(1-ease);action.driver.walkBlend=Math.sin(progress*Math.PI)*.6;action.driver.gait=progress*Math.PI*2;
    if(progress===1){action.driver.extractionPose=false;action.driver.bodyTilt=0;action.driver.bodyLift=0;action.driver.walkBlend=0;}
    poseMesh(action.driver);
  }
  if(t<2.35){
    const step=Math.min(1,Math.max(0,(t-.6)/.7)),ease=step*step*(3-2*step);
    const x=action.start.x+(Math.sin(car.angle)*12+Math.cos(car.angle)*6)*ease,y=action.start.y+(-Math.cos(car.angle)*12+Math.sin(car.angle)*6)*ease;
    if(!blocked(x,y)){player.x=x;player.y=y;}
  }
  if(t>=.65&&t<2.35){
    if(!action.doorSound){globalThis.cityAudio?.carAction?.('door');action.doorSound=true;}
    const opening=Math.min(1,(t-.65)/.5);car.doorOpen=1.1*opening*opening*(3-2*opening);
  }
  if(t<.8)action.stage=action.breakWindow?'Rozbíjíš okno':'Otevíráš dveře';
  else if(t<1.65)action.stage=action.driver?'Vytahuješ řidiče':'Otevíráš dveře';
  else if(t<2.35){
    action.stage='Uvolňuješ místo u dveří';
  }else{
    action.entryStart??={x:player.x,y:player.y};
    action.stage='Nastupuješ';car.doorOpen=1.1*Math.max(0,1-(t-2.35)/.8);
    const raw=Math.min(1,(t-2.35)/.8),progress=raw*raw*(3-2*raw);
    player.angle+=angleDelta(player.angle,car.angle)*(1-Math.exp(-dt*8));
    player.x=action.entryStart.x+(car.x-action.entryStart.x)*progress;player.y=action.entryStart.y+(car.y-action.entryStart.y)*progress;
  }
  poseMesh(car);
  if(t>=3.15){
    car.doorOpen=0;car.unlocked=true;car.parked=false;drivenCar=car;takeover=null;keys.clear();player.pitch=0;syncDriver();poseMesh(car);
    globalThis.cityAudio?.carAction?.('close');notice('Řídíš · WASD / šipky · mezerník: ruční brzda / drift · E: vystoupit');
  }
}
function emitGlass(car){
  const window=car.renderMesh.flatMap(f=>f.details).find(d=>d.driverWindow);
  if(!window)return;
  const points=window.points;
  for(let i=0;i<24;i++){
    const u=Math.random(),v=Math.random(),mix=(a,b,t)=>a.map((n,j)=>n+(b[j]-n)*t);
    const p=mix(mix(points[0],points[1],u),mix(points[3],points[2],u),v);
    const push=18+Math.random()*30;
    glassShards.push({x:p[0],y:p[1],z:p[2],vx:Math.sin(car.angle)*push+(Math.random()-.5)*20,vy:-Math.cos(car.angle)*push+(Math.random()-.5)*20,vz:8+Math.random()*22,angle:Math.random()*6.28,spin:(Math.random()-.5)*14,size:.4+Math.random()*1.1,life:2.5});
  }
}
function updateGlass(dt){
  for(let i=glassShards.length-1;i>=0;i--){
    const p=glassShards[i];p.life-=dt;
    if(p.life<=0){glassShards.splice(i,1);continue;}
    p.vz-=75*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.angle+=p.spin*dt;
    if(p.z<.4){p.z=.4;p.vz=Math.abs(p.vz)*.2;p.vx*=.65;p.vy*=.65;}
  }
}
function glassMeshes(){
  return glassShards.map(p=>({center:[p.x,p.y,p.z],details:[],color:p.life<.4?'#b4e1e566':'#c5ecedae',points:Array.from({length:3},(_,i)=>{const a=p.angle+i*Math.PI*2/3;return [p.x+Math.cos(a)*p.size,p.y+Math.sin(a)*p.size,p.z+Math.sin(a+p.angle)*p.size];})}));
}
function drawTakeover(){
  if(!takeover)return;
  const t=takeover.time;
  ctx.fillStyle='#e5ef95';ctx.fillRect(width*.3,height-174,width*.4*Math.min(1,t/3.15),3);
}
function syncDriver(){player.x=drivenCar.x;player.y=drivenCar.y;player.angle=drivenCar.angle;}
// World speed converts to km/h by multiplying by .36.
// Performance values are gameplay tuning, not model-year specifications.
function updateTransmission(car){
  const profile=car.performance||carModels[0].performance;
  const speed=Math.abs(car.speed)*.36;
  let gear=Math.max(1,car.gear||1);
  if(car.speed<=0){gear=1;car.shiftTime=0;}
  else if(!(car.shiftTime>0)){
    if(gear<profile.gears.length&&speed>profile.gears[gear-1]*.9){gear++;car.shiftTime=.22;}
    else if(gear>1&&speed<profile.gears[gear-2]*.65){gear--;car.shiftTime=.16;}
  }
  car.gear=gear;
  car.rpm=850+Math.min(1,speed/(car.speed<0?20:profile.gears[gear-1]))*5650;
}
function updatePowertrain(car,gas,brake,dt){
  const profile=car.performance||carModels[0].performance;
  car.shiftTime=Math.max(0,(car.shiftTime||0)-dt);
  updateTransmission(car);
  if(brake||gas*car.speed<0){
    const braking=brake?240:190;
    car.speed=Math.sign(car.speed)*Math.max(0,Math.abs(car.speed)-braking*dt);
  }else if(gas){
    const limit=(gas>0?profile.topSpeed:20)/.36;
    const fraction=Math.min(1,Math.abs(car.speed)/limit);
    const acceleration=gas>0?profile.acceleration/(1+.16*(car.gear-1)):40;
    const torque=car.shiftTime>0?.2:1;
    car.speed=gas*Math.min(limit,Math.abs(car.speed)+acceleration*(1-.7*fraction*fraction)*torque*dt);
  }else{
    car.speed=Math.sign(car.speed)*Math.max(0,Math.abs(car.speed)-(5+Math.abs(car.speed)*.035)*dt);
  }
  if(Math.abs(car.speed)<.1)car.speed=0;
  updateTransmission(car);
}
function steeringLimit(speed){
  const kmh=Math.abs(speed)*.36;
  return .52/(1+(kmh/45)**2);
}
function driftMotion(car,distance,dt,handbrake,steer){
  const sliding=handbrake&&car.speed>25/.36&&Math.abs(steer)>.1;
  const turn=distance*Math.tan(car.steering)/(car.length*.58)
    +(sliding?steer*Math.min(.65,car.speed*.0015)*dt:0);
  // The body turns ahead of the direction of travel while the rear tires slide.
  const grip=sliding?1.2:car.speed>25/.36?3.5:12;
  const slip=sliding||Math.abs(car.driftAngle||0)>.002
    ?Math.max(-.65,Math.min(.65,((car.driftAngle||0)-(sliding?turn:0))*Math.exp(-grip*dt))):0;
  const heading=car.angle+turn/2+((car.driftAngle||0)+slip)/2;
  return {x:car.x+Math.cos(heading)*distance,y:car.y+Math.sin(heading)*distance,angle:car.angle+turn,driftAngle:slip};
}
function updateDriving(dt){
  const car=drivenCar;
  const gas=Number(keys.has('w')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown'));
  if(car.rebound){
    if(!gas){updateTransmission(car);syncDriver();return;}
    // Throttle restores tire grip immediately instead of waiting for the impulse to settle.
    const forward=car.rebound.x*Math.cos(car.angle)+car.rebound.y*Math.sin(car.angle);
    car.speed=gas*forward>0?forward:0;
    car.rebound=null;car.driftAngle=0;car.shiftTime=0;
  }
  let impactDamage=0;
  const steer=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
  const handbrake=keys.has(' ')&&!(car.altitude>0);
  const drifting=handbrake&&car.speed>25/.36&&Math.abs(steer)>.1;
  if(drifting){
    updatePowertrain(car,0,false,dt);
    car.speed=Math.max(0,car.speed-45*dt);
  }else updatePowertrain(car,gas,handbrake,dt);
  if(car.speed===0)car.driftAngle=0;
  const target=steer*steeringLimit(car.speed);
  const response=4+3/(1+(Math.abs(car.speed)*.36/60)**2);
  car.steering+=(target-car.steering)*(1-Math.exp(-dt*response));
  // Keep existing wheel lock safe as the car accelerates, too.
  const limit=steeringLimit(car.speed);
  car.steering=Math.max(-limit,Math.min(limit,car.steering));
  const steps=Math.max(1,Math.ceil(Math.abs(car.speed*dt)/2));
  for(let i=0;i<steps;i++){
    const distance=car.speed*dt/steps;
    const next={...car,...driftMotion(car,distance,dt/steps,handbrake,steer)};
    const contact=vehicleContact(next,car);
    if(contact){
      const strength=resolveVehicleImpact(car,contact);
      impactDamage=Math.min(60,Math.max(0,strength*.36-25)*.35);
      break;
    }
    car.x=next.x;car.y=next.y;car.angle=next.angle;car.driftAngle=next.driftAngle;car.wheelTravel+=distance;
    if(hitPedestrians(car,car,car.speed))car.speed*=.65;
  }
  updateTransmission(car);poseMesh(car);syncDriver();
  if(impactDamage&&typeof hurtPlayer==='function')hurtPlayer(impactDamage);
}
function onRoad(x,y){
  return streets.some(street=>street.points.some((a,i)=>{
    if(!i)return false;const b=street.points[i-1],dx=a[0]-b[0],dy=a[1]-b[1];
    const t=Math.max(0,Math.min(1,((x-b[0])*dx+(y-b[1])*dy)/(dx*dx+dy*dy)));
    return Math.hypot(x-b[0]-t*dx,y-b[1]-t*dy)<=street.halfWidth+5;
  }));
}
function raiseWanted(reason){
  wanted.level=Math.min(5,wanted.level+1);wanted.quiet=0;wanted.unseen=0;wanted.dispatchTimer=0;
  notice(reason+' · hledanost '+wanted.level+'/5');
}
function reportImpact(){
  if(wanted.impactCooldown>0)return;
  wanted.impactCooldown=1.5;
  wanted.hits=wanted.hits.filter(t=>wanted.time-t<20);wanted.hits.push(wanted.time);
  if(wanted.hits.length>=3){wanted.hits=[];raiseWanted('Opakované nárazy');}
  else notice('Náraz · varování '+wanted.hits.length+'/3');
}
function policeSpace(x,y,radius=28){
  return x>radius+18&&y>radius+18&&x<world.width-radius-18&&y<world.height-radius-18&&!buildings.some(b=>insideBuilding(x,y,b,radius));
}
function clearPoliceLine(a,b){
  const distance=Math.hypot(b.x-a.x,b.y-a.y),count=Math.max(1,Math.ceil(distance/12));
  for(let i=0;i<=count;i++)if(!policeSpace(a.x+(b.x-a.x)*i/count,a.y+(b.y-a.y)*i/count))return false;
  return true;
}
function buildPoliceGrid(){
  const cells=new Map(),nodes=[];
  for(let y=60;y<world.height-40;y+=40)for(let x=60;x<world.width-40;x+=40){
    if(!policeSpace(x,y))continue;
    const node={x,y,road:onRoad(x,y),neighbors:[]};cells.set(x+','+y,node);nodes.push(node);
  }
  for(const node of nodes)for(const [dx,dy] of [[40,0],[-40,0],[0,40],[0,-40],[40,40],[-40,40],[40,-40],[-40,-40]]){
    const other=cells.get((node.x+dx)+','+(node.y+dy));
    if(other&&clearPoliceLine(node,other))node.neighbors.push(other);
  }
  return nodes;
}
function policePath(unit,target){
  policeGrid??=buildPoliceGrid();
  const closest=p=>policeGrid.filter(n=>!cars.some(c=>c!==unit&&c!==drivenCar&&Math.hypot(c.x-n.x,c.y-n.y)<30)).reduce((best,n)=>!best||Math.hypot(n.x-p.x,n.y-p.y)<Math.hypot(best.x-p.x,best.y-p.y)?n:best,null);
  const start=closest(unit),goal=closest(target);
  if(!start||!goal)return [];
  const open=new Set([start]),cost=new Map([[start,0]]),previous=new Map(),closed=new Set();
  while(open.size){
    let current=null,best=Infinity;
    for(const n of open){const score=cost.get(n)+Math.hypot(n.x-goal.x,n.y-goal.y);if(score<best){best=score;current=n;}}
    if(current===goal){const path=[goal];while(previous.has(path[0]))path.unshift(previous.get(path[0]));return path;}
    open.delete(current);closed.add(current);
    for(const next of current.neighbors){
      if(closed.has(next)||cars.some(c=>c!==unit&&c!==drivenCar&&Math.hypot(c.x-next.x,c.y-next.y)<30)||!clearPoliceTraffic(unit,next,current))continue;
      const score=cost.get(current)+Math.hypot(next.x-current.x,next.y-current.y)*(next.road?1:2.7);
      if(score<(cost.get(next)??Infinity)){cost.set(next,score);previous.set(next,current);open.add(next);}
    }
  }
  return [];
}
const policeParkingBays=(()=>{
  const station=buildings.find(b=>b.kind==='police');
  const x=station.x+station.w+48,y=station.y+28;
  ground(x-27,y-20,174,200,'#596873',.22);
  ground(x+51,1045,18,y-1045,'#596873',.22);
  const bays=Array.from({length:10},(_,i)=>({x:x+(i<5?0:120),y:y+(i%5)*40,angle:i<5?0:Math.PI,parking:true}));
  for(const spot of bays){
    for(const side of [-14,14])ground(spot.x-25,spot.y+side,50,1,'#dce6ee',.27);
    ground(spot.x+(spot.angle===0?-25:24),spot.y-14,1,28,'#dce6ee',.27);
  }
  return bays;
})();
for(const spot of policeParkingBays){
  const model={...carModels[0],name:'Policejní Škoda',color:'#e4e9e3',police:true};
  const start=faces.length;car(-model.width/2,-model.length/2,model);
  const unit=cars[cars.length-1];attachMesh(unit,start);
  Object.assign(unit,spot,{length:model.length,width:model.width,home:{...spot},parked:true,speed:0,wheelTravel:0,steering:0,siren:false,recovery:null,holding:false,path:[],repath:0});
  poseMesh(unit);
}
function policeParkingSpot(unit){
  const reserved=cars.filter(c=>c.police&&c!==unit&&c.home?.parking).map(c=>c.home);
  for(const spot of policeParkingBays){
    if(reserved.some(p=>Math.hypot(p.x-spot.x,p.y-spot.y)<1))continue;
    if(policeSpace(spot.x,spot.y)&&!drivingBlocked({...unit,...spot},unit,true))return {...spot};
  }
  return null;
}
function updateFineScreen(dt){
  fineScreenTime=Math.max(0,fineScreenTime-dt);
  document.getElementById('fine-screen').hidden=fineScreenTime<=0;
}
function dispatchPolice(){
  const station=buildings.find(b=>b.kind==='police'),entry=station.entrance;
  const waiting=cars.find(c=>c.police&&c.parked&&c.driverOccupied);
  if(waiting){Object.assign(waiting,{parked:false,speed:0,siren:true,recovery:null,holding:false,path:[],repath:0});poseMesh(waiting);notice('Policejní hlídka vyjíždí od stanice');return true;}
  const dx=entry.road[0]-entry.x,dy=entry.road[1]-entry.y,distance=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);
  const model={...carModels[0],name:'Policejní Škoda',color:'#e4e9e3',police:true};
  let spawn=null;
  for(let d=Math.min(34,distance);d<=distance+50;d+=8){
    const pose={x:entry.x+dx*d/distance,y:entry.y+dy*d/distance,angle,length:model.length,width:model.width};
    if(policeSpace(pose.x,pose.y)&&!drivingBlocked(pose,null)&&Math.hypot(pose.x-player.x,pose.y-player.y)>35){spawn=pose;break;}
  }
  if(!spawn)return false;
  let unit=cars.find(c=>c.police&&c.parked&&c.driverOccupied&&Math.hypot(c.x-entry.road[0],c.y-entry.road[1])<100);
  if(!unit){
    if(cars.filter(c=>c.police&&c.driverOccupied&&c!==drivenCar&&c!==takeover?.car).length>=10)return false;
    const start=faces.length;car(-model.width/2,-model.length/2,model);unit=cars[cars.length-1];attachMesh(unit,start);
  }
  Object.assign(unit,spawn,{length:model.length,width:model.width,parked:false,speed:0,wheelTravel:unit.wheelTravel||0,steering:0,siren:true,recovery:null,holding:false,path:[],repath:0,home:{x:entry.road[0],y:entry.road[1]}});
  poseMesh(unit);notice('Policejní hlídka vyjíždí od stanice');return true;
}
function clearPoliceTraffic(unit,target,origin=unit){
  const distance=Math.hypot(target.x-origin.x,target.y-origin.y),steps=Math.max(1,Math.ceil(distance/10));
  for(let i=1;i<=steps;i++){
    const x=origin.x+(target.x-origin.x)*i/steps,y=origin.y+(target.y-origin.y)*i/steps;
    if(cars.some(c=>c!==unit&&c!==drivenCar&&vehicleContains(c,x,y,unit.width/2+3)))return false;
  }
  return true;
}
function beginPoliceRecovery(unit,turn){
  const preferred=-Math.sign(turn||1)*.48;
  let best=null;
  // Probe complete car poses: if reverse is blocked, try a forward escape instead.
  for(const direction of [-1,1])for(const steer of [preferred,-preferred,0]){
    let pose={...unit},travel=0;
    const duration=direction<0?1.35:1.1;
    for(let t=0;t<duration;t+=.05){
      const step=direction*22*.05,rotation=step*Math.tan(steer)/(unit.length*.58);
      const next={...pose,x:pose.x+Math.cos(pose.angle+rotation/2)*step,y:pose.y+Math.sin(pose.angle+rotation/2)*step,angle:pose.angle+rotation};
      if(drivingBlocked(next,unit,true)||!drivenCar&&vehicleContains(next,player.x,player.y,player.radius))break;
      pose=next;travel+=Math.abs(step);
    }
    const score=travel+(direction<0?4:0)+(steer===preferred?1:0);
    if(travel>2&&(!best||score>best.score))best={score,direction,steer,time:Math.min(duration,travel/22),elapsed:0};
  }
  unit.recovery=best||{time:.3,elapsed:0,direction:0,steer:0};
  unit.stuckTime=0;unit.holding=false;unit.speed=0;
}
function reversePolice(unit,dt){
  const recovery=unit.recovery;
  const movementDt=Math.min(dt,recovery.time);
  recovery.time-=dt;recovery.elapsed+=dt;unit.speed=22*(recovery.direction??-1);unit.steering=recovery.steer;
  const steps=Math.max(1,Math.ceil(22*dt/2));
  for(let i=0;i<steps;i++){
    const distance=unit.speed*movementDt/steps,turn=distance*Math.tan(unit.steering)/(unit.length*.58),angle=unit.angle+turn;
    const next={...unit,x:unit.x+Math.cos(unit.angle+turn/2)*distance,y:unit.y+Math.sin(unit.angle+turn/2)*distance,angle};
    if(policeTouchesPlayer(unit,next)){issuePoliceFine();unit.speed=0;recovery.time=0;break;}
    if(drivingBlocked(next,unit,true)||!drivenCar&&vehicleContains(next,player.x,player.y,player.radius)){unit.speed=0;recovery.time=0;break;}
    unit.x=next.x;unit.y=next.y;unit.angle=angle;unit.wheelTravel+=distance;
    hitPedestrians(unit,unit,unit.speed);
  }
  if(recovery.time<=0){unit.recovery=null;unit.speed=0;unit.repath=0;unit.path=[];}
  poseMesh(unit);
}
function policeBlocksPlayer(unit){
  if(!drivenCar||drivenCar.altitude>30||!unit.police||unit===drivenCar||unit===takeover?.car||unit.parked||!unit.driverOccupied||Math.abs(unit.speed)>2)return false;
  if(Math.hypot(unit.x-drivenCar.x,unit.y-drivenCar.y)>drivenCar.length+unit.length)return false;
  return [-4,0,4].some(distance=>polygonsOverlap(carCorners({...drivenCar,x:drivenCar.x+Math.cos(drivenCar.angle)*distance,y:drivenCar.y+Math.sin(drivenCar.angle)*distance}),carCorners(unit)));
}
function issuePoliceFine(){
  if(!wanted.level)return;
  wallet.cash-=500;wallet.fines++;
  fineScreenTime=3;updateFineScreen(0);
  try{localStorage.setItem('asfalt-cash',String(wallet.cash));}catch{}
  wanted.level=0;wanted.offroad=0;wanted.hits=[];wanted.stopTime=0;wanted.stopAnchor=null;wanted.unseen=0;wanted.quiet=0;
  for(const unit of cars.filter(c=>c.police)){unit.siren=false;unit.holding=false;unit.repath=0;poseMesh(unit);}
  notice('Pokuta 500 Kč · policie ukončila pronásledování');drivingNoticeTime=5;
}
function policeTouchesPlayer(unit,pose=unit,x=player.x,y=player.y){
  return wanted.level>0&&!drivenCar&&!takeover&&unit.police&&unit.driverOccupied&&!unit.parked&&vehicleContains(pose,x,y,player.radius);
}
function walkingBlocked(x,y){
  if(cars.some(unit=>policeTouchesPlayer(unit,unit,x,y)))issuePoliceFine();
  return blocked(x,y);
}
function updatePoliceStop(dt){
  if(cars.some(unit=>policeTouchesPlayer(unit)))issuePoliceFine();
  const stopped=wanted.level>0&&drivenCar&&!takeover&&Math.abs(drivenCar.speed)<.8&&cars.some(policeBlocksPlayer);
  if(!stopped){wanted.stopTime=0;wanted.stopAnchor=null;return;}
  if(!wanted.stopAnchor)wanted.stopAnchor={car:drivenCar,x:drivenCar.x,y:drivenCar.y};
  if(wanted.stopAnchor.car!==drivenCar||Math.hypot(drivenCar.x-wanted.stopAnchor.x,drivenCar.y-wanted.stopAnchor.y)>.5){wanted.stopTime=0;wanted.stopAnchor={car:drivenCar,x:drivenCar.x,y:drivenCar.y};return;}
  wanted.stopTime+=dt;
  if(wanted.stopTime>=10-1e-8){
    issuePoliceFine();
  }
}
function policeEncirclementTarget(unit,active){
  const index=active.indexOf(unit),count=Math.max(1,active.length);
  // Space patrol cars around the player, keeping their noses pointed inward.
  // The radius grows with the number of units so the ring does not collapse
  // into a pile when a five-star pursuit brings ten cars.
  const spacingRadius=count>2?30/Math.sin(Math.PI/count):0;
  const radius=Math.max(drivenCar?54:48,spacingRadius);
  const angle=index*Math.PI*2/count;
  const dx=unit.x-player.x,dy=unit.y-player.y;
  const currentAngle=Math.atan2(dy,dx),distance=Math.hypot(dx,dy);
  // When a patrol is still far away and approaching from the wrong sector,
  // send it to an outer staging point first. It then drives inward from its
  // assigned side instead of joining the same straight chase line.
  if(distance>radius+55&&Math.abs(angleDelta(currentAngle,angle))>.45){
    const approachRadius=radius+155;
    return {x:player.x+Math.cos(angle)*approachRadius,y:player.y+Math.sin(angle)*approachRadius};
  }
  return {x:player.x+Math.cos(angle)*radius,y:player.y+Math.sin(angle)*radius};
}
function updatePolice(dt){
  const patrols=cars.filter(c=>c.police);
  const active=patrols.filter(c=>c.driverOccupied&&!c.parked&&c!==drivenCar&&c!==takeover?.car);
  for(const unit of patrols){
    if(unit===drivenCar||unit===takeover?.car||!unit.driverOccupied){unit.siren=false;continue;}
    unit.siren=wanted.level>0&&!unit.parked;
    if(unit.parked||unit.rebound)continue;
    if(!wanted.level&&!unit.home?.parking){const spot=policeParkingSpot(unit);if(!spot){unit.speed=0;continue;}unit.home=spot;unit.repath=0;unit.recovery=null;}
    if(unit.recovery){reversePolice(unit,dt);continue;}
    let target=wanted.level?policeEncirclementTarget(unit,active):unit.home;
    if(wanted.level)unit.parkingStage=0;
    else{
      const aisleX=policeParkingBays[0].x+60;
      const approaches=[{x:aisleX,y:policeParkingBays[0].y-62},{x:aisleX,y:unit.home.y},unit.home];
      unit.parkingStage??=0;
      while(unit.parkingStage<2&&Math.hypot(unit.x-approaches[unit.parkingStage].x,unit.y-approaches[unit.parkingStage].y)<8){unit.parkingStage++;unit.repath=0;}
      target=approaches[unit.parkingStage];
    }
    const distance=Math.hypot(unit.x-target.x,unit.y-target.y);
    unit.holding=wanted.level>0&&policeBlocksPlayer(unit)&&Math.abs(drivenCar.speed)<.8;
    if(unit.holding){unit.speed=0;poseMesh(unit);continue;}
    if(distance<(wanted.level?6:4)){
      unit.speed=0;
      if(!wanted.level&&unit.parkingStage===2){
        const pose={...unit,...unit.home};
        if(!drivingBlocked(pose,unit,true)&&!vehicleContains(pose,player.x,player.y,player.radius)){unit.x=pose.x;unit.y=pose.y;unit.angle=pose.angle;unit.parked=true;unit.siren=false;unit.steering=0;}
      }
      poseMesh(unit);continue;
    }
    unit.repath-=dt;
    if(unit.repath<=0){unit.path=policePath(unit,target);unit.repath=1.8;}
    let waypoint;
    if(distance<160&&clearPoliceLine(unit,target)&&clearPoliceTraffic(unit,target))waypoint=target;
    else{
      while(unit.path.length>1&&Math.hypot(unit.path[0].x-unit.x,unit.path[0].y-unit.y)<25)unit.path.shift();
      waypoint=unit.path[0];
      // Skip grid corners only when the complete vehicle has a clear approach.
      if(unit.path.length>1&&clearPoliceLine(unit,unit.path[1])&&clearPoliceTraffic(unit,unit.path[1])){unit.path.shift();waypoint=unit.path[0];}
    }
    if(!waypoint){unit.speed=0;unit.stuckTime=(unit.stuckTime||0)+dt;if(unit.stuckTime>.8)beginPoliceRecovery(unit,angleDelta(unit.angle,Math.atan2(target.y-unit.y,target.x-unit.x)));poseMesh(unit);continue;}
    const desired=Math.atan2(waypoint.y-unit.y,waypoint.x-unit.x),delta=angleDelta(unit.angle,desired);
    const targetSpeed=(wanted.level?Math.min(85+wanted.level*8,Math.max(8,distance*1.6)):Math.min(50,Math.max(6,distance*1.5)))*Math.max(.2,1-Math.abs(delta)/2);
    unit.speed+=Math.max(-100*dt,Math.min(35*dt,targetSpeed-unit.speed));
    unit.steering=Math.max(-.55,Math.min(.55,delta));
    const startX=unit.x,startY=unit.y;
    const count=Math.max(1,Math.ceil(unit.speed*dt/2));let blockedMove=false;
    for(let i=0;i<count;i++){
      const heading=unit.angle+Math.max(-2*dt/count,Math.min(2*dt/count,angleDelta(unit.angle,desired)));
      const travel=unit.speed*dt/count,next={...unit,x:unit.x+Math.cos(heading)*travel,y:unit.y+Math.sin(heading)*travel,angle:heading};
      if(policeTouchesPlayer(unit,next)){issuePoliceFine();unit.speed=0;blockedMove=true;break;}
      if(drivingBlocked(next,unit,true)||!drivenCar&&vehicleContains(next,player.x,player.y,player.radius)){
        unit.speed=0;blockedMove=true;
        if(wanted.level&&drivenCar&&polygonsOverlap(carCorners(next),carCorners(drivenCar)))unit.holding=true;
        else beginPoliceRecovery(unit,delta);
        break;
      }
      unit.x=next.x;unit.y=next.y;unit.angle=heading;unit.wheelTravel+=travel;
      if(hitPedestrians(unit,unit,unit.speed)){beginPoliceRecovery(unit,delta);blockedMove=true;break;}
    }
    if(blockedMove)unit.repath=Math.min(unit.repath,.4);
    if(!unit.recovery&&!unit.holding){
      unit.stuckTime=Math.hypot(unit.x-startX,unit.y-startY)<dt*4?(unit.stuckTime||0)+dt:0;
      if(unit.stuckTime>.8)beginPoliceRecovery(unit,delta);
    }
    poseMesh(unit);
  }
}
function updateWanted(dt){
  wanted.time+=dt;wanted.quiet+=dt;wanted.impactCooldown=Math.max(0,wanted.impactCooldown-dt);
  wanted.hits=wanted.hits.filter(t=>wanted.time-t<20);
  if(drivenCar&&!(drivenCar.altitude>30)&&Math.abs(drivenCar.speed)>5&&!onRoad(drivenCar.x,drivenCar.y)){
    wanted.offroad+=dt;
    if(wanted.offroad>=(wanted.level?12:8)){wanted.offroad=0;raiseWanted('Dlouhá jízda mimo silnici');}
  }else wanted.offroad=Math.max(0,wanted.offroad-dt*2);
  if(wanted.level){
    wanted.dispatchTimer-=dt;
    const active=cars.filter(c=>c.police&&!c.parked&&c.driverOccupied&&c!==drivenCar&&c!==takeover?.car).length;
    if(active<wanted.level*2&&wanted.dispatchTimer<=0){dispatchPolice();wanted.dispatchTimer=4;}
    const seen=cars.some(c=>c.police&&c.siren&&Math.hypot(c.x-player.x,c.y-player.y)<300);
    wanted.unseen=seen?0:wanted.unseen+dt;
    if(wanted.quiet>15&&wanted.unseen>20){wanted.level--;wanted.unseen=0;notice(wanted.level?'Hledanost klesá':'Policie pátrání ukončila');}
  }
  updatePolice(dt);updatePoliceStop(dt);
  document.getElementById('money').textContent=wallet.cash.toLocaleString('cs-CZ')+' Kč';
  const meter=document.getElementById('stop-meter');meter.hidden=wanted.stopTime<=0;meter.value=wanted.stopTime;
  const stars=document.getElementById('wanted-stars'),status=document.getElementById('wanted-status');
  stars.textContent='★'.repeat(wanted.level)+'☆'.repeat(5-wanted.level);
  stars.setAttribute('aria-label','Hledanost '+wanted.level+' z 5');
  status.textContent=wanted.stopTime>0?'Zastaven policií · '+Math.min(10,Math.floor(wanted.stopTime))+'/10 s':wanted.level?(wanted.unseen>3?'Unikáš policii':'Policie tě hledá'):wanted.offroad>2?'Mimo silnici · varování':wanted.hits.length?'Nárazy: '+wanted.hits.length+'/3':'Bez pátrání';
}
function blocked(x,y){return x<18||y<18||x>world.width-18||y>world.height-18||buildings.some(b=>insideBuilding(x,y,b,player.radius))||cars.some(c=>vehicleContains(c,x,y,player.radius));}
function resetJump(){player.jumpHeight=0;player.jumpVelocity=0;player.jumpHeld=false;}
function updateJump(dt){
  const pressed=keys.has(' '),onFoot=!drivenCar&&!takeover;
  const button=document.getElementById('jump-brake');
  if(button){button.textContent=onFoot?'Skok':'Brzda';button.setAttribute('aria-label',onFoot?'Skok':'Ruční brzda');}
  if(!onFoot){resetJump();return;}
  if(dt<=0)return;
  if(pressed&&!player.jumpHeld&&player.jumpHeight===0)player.jumpVelocity=52;
  player.jumpHeld=pressed;
  if(player.jumpHeight>0||player.jumpVelocity>0){
    const gravity=120;
    player.jumpHeight+=player.jumpVelocity*dt-gravity*dt*dt/2;
    player.jumpVelocity-=gravity*dt;
    if(player.jumpHeight<=0){player.jumpHeight=0;player.jumpVelocity=0;}
  }
}
function update(dt){updateFineScreen(dt);if(paused)return;updateJump(dt);if(typeof workState!=='undefined'&&workState.open){updateProfession(dt);return;}if(typeof shopState!=='undefined'&&shopState.open){updateShopInterior(dt);return;}updateGlass(dt);updateVehicleRebounds(dt);const startX=player.x,startY=player.y;updateActors(dt);drivingNoticeTime=Math.max(0,drivingNoticeTime-dt);let length=0;
 if(takeover)updateTakeover(dt);else if(drivenCar)updateDriving(dt);else {player.angle+=(Number(keys.has('arrowright'))-Number(keys.has('arrowleft')))*dt*1.8;const forward=Number(keys.has('w')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown')),side=Number(keys.has('d'))-Number(keys.has('a'));length=Math.hypot(forward,side);if(length){const speed=(keys.has('shift')?145:85)*dt/length;const dx=(Math.cos(player.angle)*forward-Math.sin(player.angle)*side)*speed,dy=(Math.sin(player.angle)*forward+Math.cos(player.angle)*side)*speed;const steps=Math.ceil(Math.hypot(dx,dy)/4);for(let i=0;i<steps;i++){if(!walkingBlocked(player.x+dx/steps,player.y))player.x+=dx/steps;if(!walkingBlocked(player.x,player.y+dy/steps))player.y+=dy/steps;}}
 }
 updateWanted(dt);
 const moved=drivenCar||takeover?0:Math.hypot(player.x-startX,player.y-startY);
 playerAvatar.gait+=moved*.45;playerAvatar.walkBlend+=(Number(moved>0)-playerAvatar.walkBlend)*(1-Math.exp(-dt*12));
 globalThis.cityAudio?.update(dt,player,cars,pedestrians,moved,keys.has('shift'),length>0&&moved<.01);
 document.body?.classList?.toggle('driving',!!drivenCar||!!takeover&&takeover.time>=2.35);
 const interact=document.getElementById('interact');interact.hidden=!!takeover||!drivenCar&&!nearbyCar();interact.textContent=drivenCar?'E · Vystoupit':nearbyCar()?.driverOccupied?'E · Převzít auto':'E · Nastoupit';
 document.getElementById('district').textContent=player.y<680?'NORTHSIDE':player.x>1450?'JARDÍN':'CENTRO';document.getElementById('coordinates').textContent=`${Math.round(player.x)} / ${Math.round(player.y)}`;
 if(typeof updateShop==='function')updateShop(dt);
}
// Clip geometry at the camera plane before perspective projection.
function clip(points){const out=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],inside=a[2]>=1,next=b[2]>=1;if(inside)out.push(a);if(inside!==next){const t=(1-a[2])/(b[2]-a[2]);out.push(a.map((v,j)=>v+(b[j]-v)*t));}}return out;}
function drawWorld(camera,width,height,scene,mirror=false,context=ctx){
 const ctx=context;
 if(globalThis.cityRenderer?.draw(ctx,camera,width,height,scene,mirror))return;
 const horizon=height*.48+(camera.pitch||0)*height*.65,focal=width*.72;
 const sky=ctx.createLinearGradient(0,0,0,height);sky.addColorStop(0,'#718e9b');sky.addColorStop(.65,'#d7d5bb');sky.addColorStop(1,'#e6d9b7');ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
 ctx.fillStyle='#819174';ctx.fillRect(0,Math.max(0,horizon),width,height);
 const cos=Math.cos(camera.angle),sin=Math.sin(camera.angle);
 const transform=p=>{const dx=p[0]-camera.x,dy=p[1]-camera.y;return [-dx*sin+dy*cos,p[2]-(camera.eye||17),dx*cos+dy*sin];};
 const visible=[];
 for(const f of scene){if(f.hidden)continue;if(mirror&&Math.hypot(f.center[0]-camera.x,f.center[1]-camera.y)>600)continue;const c=transform(f.center);const terrain=f.points.every(p=>p[2]<1);if(!terrain&&(c[2]<-240||c[2]>1550||Math.abs(c[0])>c[2]*1.1+350))continue;const points=clip(f.points.map(transform));if(points.length<3)continue;const projected=points.map(p=>[width/2+p[0]*focal/p[2],horizon-p[1]*focal/p[2]]);if(projected.every(p=>p[0]<0)||projected.every(p=>p[0]>width)||projected.every(p=>p[1]<0)||projected.every(p=>p[1]>height))continue;visible.push({f,projected,depth:c[2],terrain});}
 visible.sort((a,b)=>a.terrain!==b.terrain?(a.terrain?-1:1):a.terrain?a.f.center[2]-b.f.center[2]:b.depth-a.depth);
 for(const item of visible)for(const f of [...((item.f.doorOpening?item.f.openCutout:item.f.cutout)?(item.f.doorOpening?item.f.openCutout:item.f.cutout).map(points=>({...item.f,points})): [item.f]),...(mirror?[]:item.f.details)]){if(f.hidden)continue;const depth=item.depth;const clipped=clip(f.points.map(transform));if(clipped.length<3)continue;const projected=clipped.map(p=>[width/2+p[0]*focal/p[2],horizon-p[1]*focal/p[2]]);ctx.beginPath();ctx.moveTo(...projected[0]);for(let i=1;i<projected.length;i++)ctx.lineTo(...projected[i]);ctx.closePath();ctx.fillStyle=f.color;ctx.fill();const p=f.points;const vertical=p.some(v=>v[2]!==p[0][2]);if(vertical){const a=p[1].map((v,i)=>v-p[0][i]),b=p[2].map((v,i)=>v-p[0][i]),nx=a[1]*b[2]-a[2]*b[1],ny=a[2]*b[0]-a[0]*b[2];ctx.fillStyle=`rgba(23,41,52,${.035+.11*Math.abs(nx)/(Math.hypot(nx,ny)||1)})`;ctx.fill();}if(depth>450){ctx.fillStyle=`rgba(191,204,193,${Math.min(.6,(depth-450)/1800)})`;ctx.fill();}}
}
const mirrorViews=[];
function drawMirror(w,h,angle,index,car,scene){
 const camera={x:car.x,y:car.y,angle,pitch:0,eye:21+(car.altitude||0)};
 if(!document.createElement){drawWorld(camera,w,h,scene,true);return;}
 let view=mirrorViews[index];
 if(!view){const canvas=document.createElement('canvas');view=mirrorViews[index]={canvas,context:canvas.getContext('2d'),time:-Infinity};}
 const renderWidth=Math.min(256,Math.ceil(w)),renderHeight=Math.min(128,Math.ceil(h));
 const resized=view.canvas.width!==renderWidth||view.canvas.height!==renderHeight;
 if(resized){view.canvas.width=renderWidth;view.canvas.height=renderHeight;}
 if(resized||view.car!==car||lastTime-view.time>=100||Math.abs(angleDelta(view.angle||0,angle))>.03){
   drawWorld(camera,renderWidth,renderHeight,scene,true,view.context);view.time=lastTime;view.car=car;view.angle=angle;
 }
 ctx.drawImage(view.canvas,0,0,w,h);
}
function gameplayCamera(cabinCar){
 const eye=cabinCar?21+(cabinCar.altitude||0):17+player.jumpHeight;
 const camera={...player,eye};
 if(!thirdPerson)return camera;
 const distance=cabinCar?Math.max(95,cabinCar.length*1.8):65;
 const lift=cabinCar?35:22;
 // Shorten the camera arm before it crosses a wall or another vehicle.
 for(let d=2;d<=distance;d+=2){
   const x=player.x-Math.cos(player.angle)*d,y=player.y-Math.sin(player.angle)*d;
   const z=eye+lift*d/distance;
   if(x<4||y<4||x>world.width-4||y>world.height-4||buildings.some(b=>z<b.height+4&&insideBuilding(x,y,b,4))||cars.some(c=>c!==cabinCar&&z<(c.altitude||0)+32&&vehicleContains(c,x,y,4)))break;
   camera.x=x;camera.y=y;camera.eye=z;
 }
 camera.pitch=Math.max(-.65,Math.min(.65,player.pitch-.25));
 return camera;
}
function draw(){
 if(typeof workState!=='undefined'&&workState.open){drawProfession();return;}
 if(typeof shopState!=='undefined'&&shopState.open){drawShopInterior();return;}
 const cabinCar=drivenCar||(takeover&&takeover.time>=2.35?takeover.car:null);
 const scene=faces.concat(...cars.filter(c=>thirdPerson||c!==cabinCar).map(c=>c.renderMesh),...pedestrians.filter(p=>Math.hypot(p.x-player.x,p.y-player.y)<950).map(p=>p.renderMesh),glassMeshes());
 if(thirdPerson&&!cabinCar&&!takeover){Object.assign(playerAvatar,{x:player.x,y:player.y,angle:player.angle,altitude:player.jumpHeight});poseMesh(playerAvatar);scene.push(...playerAvatar.renderMesh);}
 drawWorld(gameplayCamera(cabinCar),width,height,scene);
 if(!thirdPerson&&cabinCar&&!cabinCar.bike)globalThis.cityCockpit?.draw(ctx,width,height,cabinCar,(w,h,angle,index)=>drawMirror(w,h,angle,index,cabinCar,scene),drivenCar?1:Math.min(1,(takeover.time-2.35)/.35));
 const nearby=nearbyCar();
 const info=takeover?takeover.stage+'…':drivingNoticeTime>0?drivingNotice:drivenCar?`${drivenCar.name} · ${Math.round(Math.abs(drivenCar.speed)*.36)} km/h · ${drivenCar.speed<0?'R':'D'+(drivenCar.gear||1)} · E: vystoupit`:nearby?`${nearby.name} · E: ${nearby.driverOccupied?'převzít obsazené auto':'nastoupit'}`:'';

 if(info){ctx.font='600 13px Arial';ctx.textAlign='center';ctx.fillStyle='#152428dd';ctx.fillRect((width-Math.min(600,width-24))/2,(cabinCar?height*.64:height-165),Math.min(600,width-24),32);ctx.fillStyle='#edf2db';ctx.fillText(info,width/2,cabinCar?height*.64+21:height-144,width-36);ctx.textAlign='start';}
 drawTakeover();
 const shade=ctx.createLinearGradient(0,0,0,230);shade.addColorStop(0,'#14232b99');shade.addColorStop(1,'#14232b00');ctx.fillStyle=shade;ctx.fillRect(0,0,width,230);
 if(!cabinCar){ctx.fillStyle='#ffffffbb';ctx.beginPath();ctx.arc(width/2,height/2,2,0,Math.PI*2);ctx.fill();}
 mini.fillStyle='#6e805f';mini.fillRect(0,0,200,160);mini.save();mini.scale(200/world.width,160/world.height);mini.fillStyle='#344746';mini.strokeStyle='#344746';mini.lineJoin='round';for(const street of streets){mini.lineWidth=street.halfWidth*2;mini.beginPath();street.points.forEach((p,i)=>i?mini.lineTo(...p):mini.moveTo(...p));mini.stroke();}for(const b of buildings){mini.fillStyle=b.kind==='residential'?b.color:b.accent;mini.beginPath();b.outline.forEach((p,i)=>i?mini.lineTo(...p):mini.moveTo(...p));mini.closePath();mini.fill();}for(const car of cars){mini.fillStyle=car.police?'#75b5ff':car.parked?'#cbd0c5':'#e4af62';mini.beginPath();mini.arc(car.x,car.y,13,0,Math.PI*2);mini.fill();}mini.fillStyle='#a3d8e1';for(const p of pedestrians){mini.beginPath();mini.arc(p.x,p.y,8,0,Math.PI*2);mini.fill();}mini.restore();mini.font='bold 9px Arial';mini.textAlign='center';for(const b of buildings){if(b.kind==='residential')continue;const x=(b.x+b.w/2)/world.width*200,y=(b.y+b.d/2)/world.height*160;mini.fillStyle='#182c31';mini.fillRect(x-6,y-6,12,12);mini.fillStyle='#fff3d5';mini.fillText(({hospital:'H',police:'P',restaurant:'R',fire:'F',shop:'O'})[b.kind],x,y+3);}mini.textAlign='start';mini.save();mini.translate(player.x/world.width*200,player.y/world.height*160);mini.rotate(player.angle);mini.fillStyle='#e9f6a2';mini.beginPath();mini.moveTo(6,0);mini.lineTo(-4,-4);mini.lineTo(-2,0);mini.lineTo(-4,4);mini.closePath();mini.fill();mini.restore();
 if(typeof drawShopExtras==='function')drawShopExtras();
}
function frame(time){const dt=Math.min((time-lastTime)/1000,.05);lastTime=time;update(dt);draw();requestAnimationFrame(frame);}requestAnimationFrame(frame);
