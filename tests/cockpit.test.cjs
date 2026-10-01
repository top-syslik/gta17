const assert=require('node:assert/strict');
require('../cockpit.js');
const calls=[],noop=()=>{};
const context=new Proxy({fillText:(text)=>calls.push(text)}, {get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});
const profiles=globalThis.cityCockpit.profiles;
assert.equal(Object.keys(profiles).length,6);
assert.equal(new Set(Object.values(profiles).map(p=>p.layout)).size,6,'each model needs a distinct dashboard layout');
for(const name of Object.keys(profiles))for(const [width,height] of [[1280,720],[390,844]]){
 const views=[];
 const car={name,angle:.7,speed:40,steering:.25,windowBroken:true};
 globalThis.cityCockpit.draw(context,width,height,car,(w,h,angle)=>{assert(w>0&&h>0);views.push(angle);});
 assert.equal(views.length,3,'two side mirrors and one rear-view mirror');
 assert(views.every(angle=>Math.cos(angle-car.angle)<0),'mirrors must look behind car');
 assert(calls.includes(profiles[name].badge),'model badge missing');
}
console.log('Cockpit checks passed: six layouts, mobile viewport, three rear-facing mirrors.');
