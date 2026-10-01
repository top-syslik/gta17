'use strict';
// Original chunky, colorful first-person models, projected independently of the city.
globalThis.cityWeapons=(()=>{
  const models={},state={id:null,inspect:-1,time:0,kick:0,spin:0,walking:0};
  const duration=2.8;
  function model(id){
    if(models[id])return models[id];
    const faces=[];
    const add=(points,color,part='body')=>faces.push({points,color,part});
    const block=(x,y,z,w,h,d,color,part='body')=>{
      const bevel=Math.min(.09,w*.18,h*.18),ring=[[-w/2+bevel,-h/2],[w/2-bevel,-h/2],[w/2,-h/2+bevel],[w/2,h/2-bevel],[w/2-bevel,h/2],[-w/2+bevel,h/2],[-w/2,h/2-bevel],[-w/2,-h/2+bevel]];
      const a=ring.map(p=>[x+p[0],y+p[1],z-d/2]),b=ring.map(p=>[x+p[0],y+p[1],z+d/2]);
      add(a,color,part);add(b.slice().reverse(),color,part);
      for(let i=0;i<8;i++)add([a[i],a[(i+1)%8],b[(i+1)%8],b[i]],color,part);
    };
    const tube=(a,b,r1,r2,color,part='body',sides=8)=>{
      const v=b.map((n,i)=>n-a[i]),length=Math.hypot(...v),n=v.map(x=>x/length);
      const tangent=Math.abs(n[1])<.9?[0,1,0]:[1,0,0];
      let u=[n[1]*tangent[2]-n[2]*tangent[1],n[2]*tangent[0]-n[0]*tangent[2],n[0]*tangent[1]-n[1]*tangent[0]];
      const norm=Math.hypot(...u);u=u.map(x=>x/norm);const w=[n[1]*u[2]-n[2]*u[1],n[2]*u[0]-n[0]*u[2],n[0]*u[1]-n[1]*u[0]];
      const ring=(p,r)=>Array.from({length:sides},(_,i)=>p.map((x,j)=>x+r*(u[j]*Math.cos(i*Math.PI*2/sides)+w[j]*Math.sin(i*Math.PI*2/sides))));
      const first=ring(a,r1),last=ring(b,r2);add(first,color,part);add(last.slice().reverse(),color,part);
      for(let i=0;i<sides;i++)add([first[i],first[(i+1)%sides],last[(i+1)%sides],last[i]],color,part);
    };
    const dark='#253646',steel='#839da9',blue='#4295b4',gold='#f4c559',wood='#bf7750';
    let muzzle=[0,.55,2.8],support=[-.38,-.12,1.25];
    // Grip and trigger guard are visible from both sides during inspection.
    block(0,-.65,-.45,.48,1.15,.55,dark);
    for(let i=0;i<3;i++)block(.25,-.45-i*.23,-.45,.04,.06,.4,steel);
    block(0,-.45,.1,.12,.08,.64,steel);block(0,-.62,.34,.46,.1,.12,dark);
    if(id==='pistol'){
      block(0,.13,.3,.67,.35,1.85,dark);block(0,.46,.38,.7,.44,2.05,blue,'slide');
      block(0,.43,1.46,.44,.25,.14,dark);tube([0,.44,1.53],[0,.44,1.55],.13,.13,'#101e29');
      block(0,.76,-.45,.3,.12,.2,dark);block(0,.76,1.18,.08,.13,.1,gold);
      for(const x of [-.36,.36])for(let i=0;i<4;i++)block(x,.47,-.36+i*.15,.025,.27,.055,steel,'slide');
      block(.36,.34,.55,.025,.12,.45,gold,'slide');muzzle=[0,.44,1.59];support=[-.42,-.65,-.4];
    }else if(id==='rifle'){
      block(0,.2,-1.45,.65,.8,1.25,blue);block(0,.1,-.66,.35,.37,.5,dark);
      block(0,.4,.7,.65,.65,2.3,blue);block(0,.12,1.7,.6,.32,1.2,dark);
      tube([0,.52,1.8],[0,.52,3.7],.15,.11,steel);tube([0,.52,3.55],[0,.52,3.93],.2,.2,dark);
      block(0,1.02,.3,.24,.28,1.15,dark);tube([0,1.25,-.32],[0,1.25,1.03],.25,.2,dark);
      tube([0,1.25,-.34],[0,1.25,-.36],.19,.19,'#65d2d4');
      block(0,-.25,.45,.42,.7,.58,dark);block(.34,.45,.6,.045,.22,.7,gold);muzzle=[0,.52,3.97];
    }else if(id==='ak'){
      block(0,.12,-1.5,.7,.8,1.15,wood);block(0,.12,-.8,.3,.35,.35,steel);
      block(0,.38,.45,.75,.65,1.75,dark);block(0,.35,1.6,.65,.62,.8,wood);
      tube([0,.52,1.75],[0,.52,3.2],.13,.13,steel);tube([0,.79,1.65],[0,.79,2.65],.08,.08,dark);
      block(0,.86,2.9,.13,.42,.16,dark);block(0,.85,.1,.18,.14,.3,steel);
      for(let i=0;i<4;i++)block(0,-.1-i*.3,.5+i*i*.045,.46,.36,.53,blue);
      for(const x of [-.39,.39])block(x,.41,.55,.035,.2,.55,gold);
      muzzle=[0,.52,3.25];support=[-.38,-.05,1.65];
    }else{
      block(0,.35,-.3,1.2,1.15,1.65,blue);block(0,1.04,-.3,.9,.16,.85,gold);
      tube([-.95,-.15,-.2],[.95,-.15,-.2],.55,.55,dark);
      tube([0,.35,.4],[0,.35,.9],.6,.6,steel);
      for(let i=0;i<6;i++){
        const angle=i*Math.PI/3,x=Math.cos(angle)*.36,y=.35+Math.sin(angle)*.36;
        tube([x,y,.85],[x,y,3.2],.115,.115,steel,'rotor');
        tube([x,y,3.21],[x,y,3.24],.07,.07,'#122333','rotor');
      }
      tube([0,.35,2.5],[0,.35,2.7],.57,.57,dark);
      block(-.8,.5,.8,.2,.9,.23,dark);block(-.5,.89,.8,.8,.2,.23,gold);
      for(let i=0;i<5;i++)block(.7,-.35-i*.16,.1+i*.17,.22,.2,.32,gold);
      muzzle=[0,.35,3.3];support=[-.8,.42,.8];
    }
    // Two forearms, fingerless gloves, palms and individual fingers.
    const hand=(wrist,palm,right)=>{
      const elbow=[right?1.65:-1.55,-3,-1.85];
      tube(elbow,wrist,.42,.29,right?'#368492':'#36717f','hands');
      tube(wrist,palm,.29,.27,'#d39772','hands');
      block(...palm,.55,.48,.6,dark,'hands');
      for(let i=0;i<4;i++)block(palm[0]+(right?-.25:.25),palm[1]-.14+i*.11,palm[2]+.22,.2,.095,.24,'#e0ac82','hands');
      block(palm[0]+(right?-.3:.3),palm[1]+.22,palm[2],.23,.2,.4,'#e0ac82','hands');
      block(palm[0],palm[1]+.26,palm[2]-.1,.35,.06,.22,gold,'hands');
    };
    hand([.7,-1.25,-.9],[.28,-.72,-.45],true);
    hand([-.95,-1.25,.05],support,false);
    return models[id]={faces,muzzle};
  }
  function cancel(){state.inspect=-1;}
  function inspect(){if(!state.id||state.inspect>=0)return false;state.inspect=0;state.kick=0;return true;}
  function shoot(){cancel();state.kick=1;}
  function update(dt,{id,active,walking=false}){
    if(!active){state.id=null;cancel();state.kick=0;state.walking=0;return;}
    if(id!==state.id){state.id=id;cancel();state.kick=0;}
    state.time+=dt;state.walking+=(Number(walking)-state.walking)*(1-Math.exp(-dt*8));
    state.kick*=Math.exp(-dt*13);state.spin+=dt*(1+state.kick*32);
    if(state.inspect>=0){state.inspect+=dt;if(state.inspect>=duration)cancel();}
  }
  function draw(ctx,width,height,{id,flash=0}){
    if(!id)return;
    const mesh=model(id),t=state.inspect<0?0:state.inspect/duration;
    const ease=x=>x*x*(3-2*x),lift=state.inspect<0?0:t<.24?ease(t/.24):t>.8?ease((1-t)/.2):1;
    const turn=lift*(.3+1.05*Math.sin(t*Math.PI*2));
    const yaw=-.5+turn,pitch=.52-lift*.37+state.kick*.08,roll=lift*(.17+.22*Math.sin(t*Math.PI*2));
    const originX=width*(.66-.14*lift),originY=height*(.79-.14*lift)+Math.sin(state.time*9)*state.walking*3+state.kick*height*.022;
    const scale=Math.min(height*.94,width*.75)*(1-.06*lift);
    const transform=(p,part)=>{
      let [x,y,z]=p;
      if(part==='rotor'){const cy=y-.35,a=state.spin;x=p[0]*Math.cos(a)-cy*Math.sin(a);y=.35+p[0]*Math.sin(a)+cy*Math.cos(a);}
      if(part==='slide')z-=state.kick*.2;
      const xx=x*Math.cos(yaw)+z*Math.sin(yaw),zz=-x*Math.sin(yaw)+z*Math.cos(yaw);
      const yy=y*Math.cos(pitch)+zz*Math.sin(pitch),depth=-y*Math.sin(pitch)+zz*Math.cos(pitch);
      return [xx*Math.cos(roll)-yy*Math.sin(roll),xx*Math.sin(roll)+yy*Math.cos(roll),depth];
    };
    const project=p=>[originX+p[0]*scale/(6+p[2]),originY-p[1]*scale/(6+p[2])];
    const polygons=mesh.faces.map(f=>{const points=f.points.map(p=>transform(p,f.part));return {...f,points,depth:points.reduce((s,p)=>s+p[2],0)/points.length};}).sort((a,b)=>b.depth-a.depth);
    ctx.save();ctx.lineJoin='round';ctx.lineWidth=.65;
    for(const f of polygons){
      const screen=f.points.map(project);ctx.beginPath();screen.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();
      const a=f.points[0],b=f.points[1],c=f.points[2],u=b.map((n,i)=>n-a[i]),v=c.map((n,i)=>n-a[i]);
      const nx=u[1]*v[2]-u[2]*v[1],ny=u[2]*v[0]-u[0]*v[2],nz=u[0]*v[1]-u[1]*v[0];
      const light=.62+.38*Math.abs((nx*.35+ny*.8-nz*.48)/(Math.hypot(nx,ny,nz)||1));
      const rgb=[1,3,5].map(i=>Math.round(parseInt(f.color.slice(i,i+2),16)*light));
      ctx.fillStyle='rgb('+rgb.join(',')+')';ctx.fill();ctx.strokeStyle=ctx.fillStyle;ctx.stroke();
    }
    if(flash>0){
      const [x,y]=project(transform(mesh.muzzle,'body')),radius=Math.min(width,height)*.035;
      ctx.beginPath();for(let i=0;i<12;i++){const a=i*Math.PI/6,r=i%2?radius*.33:radius;const p=[x+Math.cos(a)*r,y+Math.sin(a)*r];i?ctx.lineTo(...p):ctx.moveTo(...p);}ctx.closePath();ctx.fillStyle='#ffd665';ctx.fill();
      ctx.beginPath();ctx.arc(x,y,radius*.3,0,Math.PI*2);ctx.fillStyle='#fff5c4';ctx.fill();
    }
    ctx.restore();
  }
  return {update,draw,inspect,cancel,shoot,getState:()=>({...state}),model};
})();
