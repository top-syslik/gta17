/* Depth-tested city geometry. The Canvas renderer remains the compatibility fallback. */
(() => {
  let canvas, gl, program, buffer, locations, unavailable=false;
  let data=new Float32Array(262144), used=0;
  const colors=new Map();
  const vertex=`attribute vec3 position; attribute vec4 color; attribute float bias;
    uniform vec3 camera; uniform vec2 heading; uniform vec4 view;
    varying vec4 tint; varying float distance;
    void main(){
      vec2 delta=position.xy-camera.xy;
      float depth=dot(delta,heading);
      float side=dot(delta,vec2(-heading.y,heading.x));
      float elevation=position.z-camera.z;
      gl_Position=vec4(side*view.x,elevation*view.y+view.z*depth,1.0010005*depth-2.0010005,depth);
      gl_Position.z-=2.0010005*bias/max(depth,1.0);
      tint=color;distance=depth;
    }`;
  const fragment=`precision mediump float; varying vec4 tint; varying float distance;
    void main(){float fog=clamp((distance-450.0)/1800.0,0.0,0.6);
      gl_FragColor=vec4(mix(tint.rgb,vec3(.749,.8,.757),fog),tint.a);}`;
  function init(){
    if(unavailable)return false;
    if(gl)return !gl.isContextLost();
    try{
      if(!globalThis.document?.createElement)return false;
      canvas=document.createElement('canvas');
      gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false});
      if(!gl){unavailable=true;return false;}
      canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();unavailable=true;gl=null;});
      const compile=(type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader;};
      program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
      buffer=gl.createBuffer();locations={};
      for(const name of ['camera','heading','view'])locations[name]=gl.getUniformLocation(program,name);
      gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      for(const [name,size,offset] of [['position',3,0],['color',4,12],['bias',1,28]]){
        const at=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(at);gl.vertexAttribPointer(at,size,gl.FLOAT,false,32,offset);
      }
      gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
      return true;
    }catch(error){unavailable=true;gl=null;return false;}
  }
  function rgba(color){
    if(colors.has(color))return colors.get(color);
    if(color.startsWith('hsl')){
      const [h,s,l]=color.match(/[\d.]+/g).map(Number),sat=s/100,light=l/100;
      const a=sat*Math.min(light,1-light),channel=n=>{const k=(n+h/30)%12;return light-a*Math.max(-1,Math.min(k-3,9-k,1));};
      const value=[channel(0),channel(8),channel(4),1];colors.set(color,value);return value;
    }
    let hex=color.slice(1);if(hex.length===3||hex.length===4)hex=[...hex].map(c=>c+c).join('');
    const value=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255);value.push(hex.length===8?parseInt(hex.slice(6,8),16)/255:1);colors.set(color,value);return value;
  }
  function polygon(points,color,bias){
    if(points.length<3)return;
    const a=points[1].map((n,i)=>n-points[0][i]),b=points[2].map((n,i)=>n-points[0][i]);
    const nx=a[1]*b[2]-a[2]*b[1],ny=a[2]*b[0]-a[0]*b[2];
    const shade=points.some(p=>p[2]!==points[0][2])?.035+.11*Math.abs(nx)/(Math.hypot(nx,ny)||1):0;
    const tint=rgba(color),rgb=tint.slice(0,3).map((c,i)=>c*(1-shade)+[23,41,52][i]/255*shade);
    const needed=(points.length-2)*24;
    if(used+needed>data.length){const next=new Float32Array(Math.max(data.length*2,used+needed));next.set(data);data=next;}
    for(let i=1;i<points.length-1;i++)for(const p of [points[0],points[i],points[i+1]]){data.set([p[0],p[1],p[2],...rgb,tint[3],bias],used);used+=8;}
  }
  function draw(ctx,camera,width,height,scene,mirror=false){
    if(!init())return false;
    const ratio=Math.min(globalThis.devicePixelRatio||1,1.5),w=Math.ceil(width*ratio),h=Math.ceil(height*ratio);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.depthMask(true);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);
    const horizon=height*.48+(camera.pitch||0)*height*.65,cos=Math.cos(camera.angle),sin=Math.sin(camera.angle);
    gl.uniform3f(locations.camera,camera.x,camera.y,camera.eye||17);gl.uniform2f(locations.heading,cos,sin);gl.uniform4f(locations.view,1.44,width*1.44/height,1-2*horizon/height,0);
    used=0;const transparent=[];
    const emit=(points,color,bias,depth)=>{if(rgba(color)[3]<1)transparent.push({points,color,bias,depth});else polygon(points,color,bias);};
    for(const f of scene){
      if(f.hidden)continue;
      const dx=f.center[0]-camera.x,dy=f.center[1]-camera.y,depth=dx*cos+dy*sin;
      if(mirror&&Math.hypot(dx,dy)>600)continue;
      const terrain=f.points.every(p=>p[2]<1);
      if(!terrain&&(depth< -240||depth>1550||Math.abs(-dx*sin+dy*cos)>depth*1.1+350))continue;
      for(const points of (f.doorOpening?f.openCutout:f.cutout)||[f.points])emit(points,f.color,0,depth);
      if(!mirror)f.details.forEach((d,i)=>{if(!d.hidden)emit(d.points,d.color,.12+i*.04,depth);});
    }
    const opaque=used/8;transparent.sort((a,b)=>b.depth-a.depth);for(const p of transparent)polygon(p.points,p.color,p.bias);
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data.subarray(0,used),gl.DYNAMIC_DRAW);
    gl.disable(gl.BLEND);gl.drawArrays(gl.TRIANGLES,0,opaque);
    if(used/8>opaque){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);gl.drawArrays(gl.TRIANGLES,opaque,used/8-opaque);gl.depthMask(true);}
    const sky=ctx.createLinearGradient(0,0,0,height);sky.addColorStop(0,'#718e9b');sky.addColorStop(.65,'#d7d5bb');sky.addColorStop(1,'#e6d9b7');ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);ctx.fillStyle='#819174';ctx.fillRect(0,Math.max(0,horizon),width,height);ctx.drawImage(canvas,0,0,width,height);
    return true;
  }
  globalThis.cityRenderer={draw};
})();
