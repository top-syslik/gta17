const assert=require('node:assert/strict');
const noop=()=>{},state={uniforms:{},draws:[],enabled:[]};
const gl=new Proxy({
  DEPTH_TEST:2929,BLEND:3042,ARRAY_BUFFER:34962,TRIANGLES:4,
  isContextLost:()=>false,createShader:()=>({}),shaderSource:noop,compileShader:noop,getShaderParameter:()=>true,
  createProgram:()=>({}),getProgramParameter:()=>true,createBuffer:()=>({}),
  getUniformLocation:(_,name)=>name,getAttribLocation:(_,name)=>({position:0,color:1,bias:2})[name],
  uniform3f:(name,...v)=>state.uniforms[name]=v,uniform2f:(name,...v)=>state.uniforms[name]=v,uniform4f:(name,...v)=>state.uniforms[name]=v,
  bufferData:(_,data)=>state.data=new Float32Array(data),enable:flag=>state.enabled.push(flag),drawArrays:(...args)=>state.draws.push(args)
},{get:(o,k)=>k in o?o[k]:noop});
const context=new Proxy({createLinearGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});
global.document={createElement:()=>({getContext:()=>gl,addEventListener:noop})};
require('../renderer.js');
const face={points:[[10,-5,0],[10,5,0],[10,5,20],[10,-5,20]],center:[10,0,10],color:'hsl(90, 40%, 60%)',details:[{points:[[10,-2,5],[10,2,5],[10,2,10],[10,-2,10]],color:'#abcdef'}]};
assert(global.cityRenderer.draw(context,{x:0,y:0,angle:0},1280,720,[face]));
assert(state.enabled.includes(gl.DEPTH_TEST),'renderer must use depth testing');
assert(state.data.every(Number.isFinite),'invalid color or vertex upload');
assert(state.data.some((n,i)=>i%8===7&&n>0),'coplanar details require depth bias');
assert.equal(state.draws[0][2],12,'base and window must both render');
state.draws=[];face.details[0].hidden=true;
global.cityRenderer.draw(context,{x:0,y:0,angle:0},1280,720,[face]);
assert.equal(state.draws[0][2],6,'hidden broken window still renders');
const old=state.data.length;face.openCutout=[];face.doorOpening=true;state.draws=[];
global.cityRenderer.draw(context,{x:0,y:0,angle:0},1280,720,[face]);
assert.equal(state.data.length,0,'door opening still covered');
assert(old>0);
const vm=require('node:vm'),fs=require('node:fs'),fallback=vm.createContext({document:{createElement:()=>({getContext:()=>null})}});
vm.runInContext(fs.readFileSync(require.resolve('../renderer.js'),'utf8'),fallback);
assert.equal(fallback.cityRenderer.draw(context,{x:0,y:0,angle:0},1280,720,[]),false,'missing WebGL must allow Canvas fallback');
console.log('Renderer checks passed: depth test, finite HSL colors, detail bias, broken window and door opening.');
module.exports={state,context};
