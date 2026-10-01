const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../weapons.js'),'utf8')+'\n'+fs.readFileSync(path.join(__dirname,'../game.js'),'utf8')+'\n'+fs.readFileSync(path.join(__dirname,'../shop.js'),'utf8');
const noop=()=>{};
const context=new Proxy({createLinearGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});
const elements={};
const document={getElementById:id=>elements[id]??={getContext:()=>context,addEventListener:noop,setAttribute:noop,focus:noop,dataset:{},querySelectorAll:()=>[]},addEventListener:noop,querySelectorAll:()=>[],pointerLockElement:null};
const saved={};const storage={getItem:k=>saved[k]??null,setItem:(k,v)=>saved[k]=v};
const checks=`
const noop=()=>{};
const assert=(ok,msg)=>{if(!ok)throw Error(msg);};
const view=globalThis.cityWeapons;
for(const id of ['pistol','rifle','ak','minigun']){
 const model=view.model(id);
 assert(model.faces.some(f=>f.part==='hands')&&model.faces.length>80,'weapon or hands missing');
 view.update(.05,{id,active:true});assert(view.inspect(),'inspection did not start');
 const ammo=shopState.weapons[id]??0;
 for(const [w,h] of [[1280,720],[390,844]]){
  let vertices=0;const ctx=new Proxy({moveTo:(x,y)=>{assert(Number.isFinite(x)&&Number.isFinite(y),'invalid projection');vertices++;},lineTo:(x,y)=>{assert(Number.isFinite(x)&&Number.isFinite(y),'invalid projection');vertices++;}},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});
  view.draw(ctx,w,h,{id});assert(vertices>100,'weapon not drawn');
 }
 view.update(1.4,{id,active:true});assert(view.getState().inspect>1,'inspection timer stalled');
 assert(shopState.weapons[id]===undefined||shopState.weapons[id]===ammo,'inspection consumed ammo');
 view.update(1.5,{id,active:true});assert(view.getState().inspect===-1,'inspection never ends');
}
assert(new Set(['pistol','rifle','ak','minigun'].map(id=>JSON.stringify(view.model(id)))).size===4,'models are identical');
shopState.weapons.pistol=12;shopState.selected='pistol';drivenCar=null;shopState.open=false;
assert(inspectWeapon(),'F action did not start inspection');
const inspected=view.getState().inspect;setPaused(true);update(.1);assert(view.getState().inspect===inspected,'inspection advances while paused');setPaused(false);
player.x=100;player.y=100;shopState.cooldown=0;
assert(fireWeapon()&&view.getState().inspect===-1&&view.getState().kick===1,'shooting must interrupt inspect and recoil');
assert(shopState.weapons.pistol===11,'shot ammo changed');
inspectWeapon();shopState.weapons.ak=30;cycleWeapon();assert(view.getState().inspect===-1,'weapon switch did not cancel');
view.update(.1,{id:'ak',active:false});assert(view.getState().id===null&&view.getState().inspect===-1,'inactive model persisted');
drivenCar=cars[0];assert(!inspectWeapon(),'can inspect while driving');drivenCar=null;
shopState.open=true;assert(!inspectWeapon(),'can inspect while shopping');shopState.open=false;
`;
function run(checks){new Function('document','innerWidth','innerHeight','devicePixelRatio','addEventListener','requestAnimationFrame','localStorage',source+'\n'+checks)(document,1280,720,1,noop,noop,storage);}
run(checks);
console.log('Weapon checks passed: four models, two hands, projection, inspection timing, pause, recoil, ammo and context.');
