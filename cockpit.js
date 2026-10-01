'use strict';
// Stylized model-specific dashboards. Mirrors use the same 3D scene as the windshield.
globalThis.cityCockpit = (() => {
  const profiles = {
    'Škoda Octavia': {dash:'#303936',trim:'#819b79',seat:'#575f55',layout:'wide',badge:'ŠKODA',dials:2},
    'Volkswagen Golf': {dash:'#292f35',trim:'#a9b5c1',seat:'#454b56',layout:'compact',badge:'VW',dials:2},
    'Porsche 911': {dash:'#302a29',trim:'#b46b50',seat:'#774e3d',layout:'sport',badge:'PORSCHE',dials:5},
    'Land Rover Defender': {dash:'#454b40',trim:'#a4ae91',seat:'#68705d',layout:'utility',badge:'DEFENDER',dials:2},
    'Ford Transit': {dash:'#39404a',trim:'#929da9',seat:'#4c5661',layout:'van',badge:'FORD',dials:2},
    'BMW 3': {dash:'#242c35',trim:'#af8654',seat:'#665345',layout:'driver',badge:'BMW',dials:2}
  };
  function draw(ctx,width,height,car,renderMirror,opacity=1){
    const p=profiles[car.name]||profiles['Škoda Octavia'];
    ctx.save();ctx.globalAlpha=opacity;
    const polygon=(points,color)=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x*width,y*height):ctx.moveTo(x*width,y*height));ctx.closePath();ctx.fillStyle=color;ctx.fill();};
    const box=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x*width,y*height,w*width,h*height);};
    const dashTop=p.layout==='van'?.69:p.layout==='sport'?.77:.73;
    // Glass is translucent; the world stays visible through the windshield.
    polygon([[.12,.07],[.88,.07],[.95,dashTop],[.05,dashTop]],'#b4d8df0b');
    if(!car.windowBroken)polygon([[0,.18],[.065,.23],[.095,.66],[0,.72]],'#b2d4dd18');
    polygon([[0,0],[.13,0],[.075,.58],[.13,dashTop+.04],[.07,dashTop+.08],[.03,.57]],p.dash);
    polygon([[1,0],[.87,0],[.925,.58],[.87,dashTop+.04],[.93,dashTop+.08],[.97,.57]],p.dash);
    box(0,0,1,.055,p.dash);
    polygon([[.15,dashTop-.065],[.85,dashTop-.065],[.94,dashTop],[.06,dashTop]],car.bodyColor||'#637779');
    polygon([[.06,dashTop],[.94,dashTop],[1,dashTop+.12],[1,1],[0,1],[0,dashTop+.12]],p.dash);
    box(.07,dashTop+.055,.86,.013,p.trim);
    // Door cards and grab handles are also visible while getting in.
    polygon([[0,.7],[.085,.76],[.13,1],[0,1]],p.seat);
    polygon([[1,.7],[.915,.76],[.87,1],[1,1]],p.seat);
    box(.018,.81,.04,.015,p.trim);box(.942,.81,.04,.015,p.trim);
    const wheelX=.34*width,wheelY=.9*height,wheelR=Math.min(width*.105,height*.16);
    const dialY=(dashTop+.075)*height,dialR=Math.min(width*.028,height*.041);
    const dialCount=p.dials;
    for(let i=0;i<dialCount;i++){
      const x=wheelX+(i-(dialCount-1)/2)*dialR*2.25;
      const r=p.layout==='sport'&&i===2?dialR*1.2:dialR;
      ctx.fillStyle='#0c161a';ctx.beginPath();ctx.arc(x,dialY,r,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=p.trim;ctx.lineWidth=1.5;ctx.stroke();
      for(let tick=0;tick<9;tick++){
        const a=Math.PI*.75+tick*Math.PI*1.5/8;
        ctx.strokeStyle='#dbe3d4';ctx.beginPath();ctx.moveTo(x+Math.cos(a)*r*.76,dialY+Math.sin(a)*r*.76);ctx.lineTo(x+Math.cos(a)*r*.9,dialY+Math.sin(a)*r*.9);ctx.stroke();
      }
      const needle=Math.PI*.75+Math.min(1,(i===1?(car.rpm||850)/6500:Math.abs(car.speed)*.36/(car.performance?.topSpeed||210)))*Math.PI*1.5;
      ctx.strokeStyle='#e98758';ctx.beginPath();ctx.moveTo(x,dialY);ctx.lineTo(x+Math.cos(needle)*r*.72,dialY+Math.sin(needle)*r*.72);ctx.stroke();
    }
    const screenX=p.layout==='driver'?.5:p.layout==='compact'?.57:.58;
    const screenY=p.layout==='van'?dashTop+.035:dashTop+.08;
    const screenW=p.layout==='wide'?.23:p.layout==='sport'?.13:.18;
    box(screenX-.01,screenY-.012,screenW+.02,.113,'#131a20');
    box(screenX,screenY,screenW,.083,'#203c45');
    ctx.fillStyle='#c4ddd2';ctx.font=`600 ${Math.max(9,width*.011)}px Arial`;ctx.textAlign='center';
    ctx.fillText(p.badge,(screenX+screenW/2)*width,(screenY+.03)*height);
    ctx.font=`${Math.max(8,width*.009)}px Arial`;ctx.fillText(Math.round(Math.abs(car.speed)*.36)+' km/h · '+(car.speed<0?'R':'D'+(car.gear||1)),(screenX+screenW/2)*width,(screenY+.061)*height);
    for(let i=0;i<4;i++)box(screenX,screenY+.12+i*.009,screenW,.003,'#111b20');
    if(p.layout==='utility'){
      for(let i=0;i<4;i++)box(.52+i*.055,.93,.033,.025,i%2?p.trim:'#202d2e');
      box(.78,.84,.11,.02,p.trim);
    }else if(p.layout==='van'){
      box(.73,.94,.13,.04,'#18222b');box(.51,.86,.025,.11,'#101820');
    }else if(p.layout==='sport')box(.535,.9,.035,.1,p.trim);
    else if(p.layout==='wide')box(.51,.91,.04,.065,'#111c20');
    // Steering wheel and hands turn with the front wheels.
    ctx.save();ctx.translate(wheelX,wheelY);ctx.rotate((car.steering||0)*1.8);
    ctx.strokeStyle='#11191c';ctx.lineWidth=wheelR*.18;ctx.beginPath();ctx.arc(0,0,wheelR,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle=p.trim;ctx.lineWidth=wheelR*.085;
    for(const a of [0,Math.PI,Math.PI/2]){ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*wheelR*.86,Math.sin(a)*wheelR*.86);ctx.stroke();}
    ctx.fillStyle='#28343b';ctx.beginPath();ctx.arc(0,0,wheelR*.38,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#e1e5db';ctx.font=`bold ${Math.max(8,wheelR*.12)}px Arial`;ctx.fillText(p.badge,0,4);
    ctx.fillStyle='#bf9473';for(const side of [-1,1]){ctx.beginPath();ctx.arc(side*wheelR*.96,-wheelR*.08,wheelR*.14,0,Math.PI*2);ctx.fill();}ctx.restore();
    const mirrors=[{x:.025,y:.5,w:.15,h:.12,angle:car.angle+Math.PI+.45},{x:.825,y:.5,w:.15,h:.12,angle:car.angle+Math.PI-.45},{x:.44,y:.085,w:.2,h:.09,angle:car.angle+Math.PI}];
    for(const [index,m] of mirrors.entries()){
      box(m.x-.006,m.y-.008,m.w+.012,m.h+.016,'#161f24');
      ctx.save();ctx.beginPath();ctx.rect(m.x*width,m.y*height,m.w*width,m.h*height);ctx.clip();
      ctx.translate((m.x+m.w)*width,m.y*height);ctx.scale(-1,1);
      renderMirror(m.w*width,m.h*height,m.angle,index);ctx.restore();
      box(m.x,m.y,m.w,.003,p.trim);
    }
    ctx.textAlign='start';ctx.restore();
  }
  return {profiles,draw};
})();
