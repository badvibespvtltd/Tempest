(function(){
const $=s=>document.querySelector(s);
const VIEWS=["home","dex","mydex","quiz","prices"];
const BUNDLES={
  dex:["data/pokemon.js","js/clandex.js"],
  mydex:["data/pokemon.js","js/clandex.js"],
  quiz:["?data/quiz-data.js","data/pokemon.js","data/quiz-moves.js","data/quiz-badges.js","data/quiz-footprints.js","data/quiz-items.js","js/quiz.js","js/study.js"],
  prices:["data/pokemon.js","data/quiz-items.js","data/pricelist.js","data/avatars.js","js/prices.js"]
};
const loaded={};
function loadScript(raw){
  const opt=raw[0]==="?";
  const src=opt?raw.slice(1):raw;
  if(loaded[src])return loaded[src];
  loaded[src]=new Promise((res,rej)=>{
    const el=document.createElement("script");
    el.src=src;
    el.async=false;
    el.onload=()=>res();
    el.onerror=()=>{if(opt){res();return}delete loaded[src];rej(new Error(src))};
    document.body.appendChild(el);
  });
  return loaded[src];
}
function loadView(v){
  const list=BUNDLES[v];
  if(!list)return Promise.resolve();
  return Promise.all(list.map(loadScript));
}
let cur="";
let want="";
const bits=m=>{let c=0;while(m){c+=m&1;m=Math.floor(m/2)}return c};
function jget(k){try{return JSON.parse(localStorage.getItem(k)||"null")}catch(e){return null}}
const isOwner=()=>window.isOwner();
function stats(){
  let v=0;
  const clan=window.VORTEX_CLAN;
  if(clan&&clan.owned){for(const k in clan.owned)v+=(clan.owned[k]||[]).length}
  else{const o=jget("vortexdex.owned.v1")||{};for(const k in o)v+=bits(o[k])}
  $("#statDex").textContent=v?v.toLocaleString()+" variants registered":"Nothing registered yet";
  const mine=jget("vortexdex.mine.v1")||{};let mv=0;for(const k in mine)mv+=bits(mine[k]);
  $("#statMine").textContent=mv?mv.toLocaleString()+" variants registered":"Nothing registered yet";
  const pc=window.VP?VP.count():(window.VORTEX_STATS&&VORTEX_STATS.prices)||0;
  $("#statPrices").textContent=pc?pc.toLocaleString()+" prices listed":"No price data yet";
}
function route(){
  let v=(location.hash||"#home").slice(1);
  if(!VIEWS.includes(v)||(v==="dex"&&!isOwner()))v="home";
  return v;
}
function show(){
  const v=route();
  const adm=isOwner();
  $("#tileClan").hidden=!adm;
  document.querySelector(".tiles").classList.toggle("three",!adm);
  if(v===cur)return;
  const prev=cur;
  cur=v;
  want=v;
  document.title=v==="home"?"Tempest":"Tempest · "+(v==="dex"?"ClanDex":v==="mydex"?"My Dex":v==="quiz"?"Quiz Practice":"Pricelist");
  document.documentElement.setAttribute("data-page",v);
  $("#crumb").textContent=v==="dex"?"ClanDex":v==="mydex"?"My Dex":v==="quiz"?"Quiz Practice":v==="prices"?"Pricelist":"";
  $("#btnHome").hidden=v==="home";
  $("#home").hidden=v!=="home";
  $("#app").hidden=true;
  $("#loader").hidden=true;
  $("#prices").hidden=true;
  $("#quiz").hidden=true;
  $("#dexTools").hidden=true;
  $("#viewLoad").hidden=true;
  if(prev==="quiz"&&window.VQ)VQ.close();
  window.scrollTo(0,0);
  if(v==="home"){stats();return}
  $("#viewLoad").textContent="Loading…";
  $("#viewLoad").hidden=false;
  loadView(v).then(()=>{
    if(want!==v){if(want!=="dex"&&want!=="mydex")$("#app").hidden=true;return}
    $("#viewLoad").hidden=true;
    reveal(v);
  }).catch(()=>{
    if(want!==v)return;
    $("#viewLoad").textContent="Could not load this page. Check your connection and reload.";
  });
}
function reveal(v){
  const ready=$("#app").dataset.ready==="1";
  const isDex=v==="dex"||v==="mydex";
  if(isDex&&window.ClanDexApp)ClanDexApp.setProfile(v==="mydex"?"mine":"clan");
  $("#app").hidden=!(isDex&&ready);
  $("#loader").hidden=!(isDex&&!ready);
  $("#dexTools").hidden=!(isDex&&(v==="mydex"||isOwner()));
  $("#btnManage").hidden=!(v==="mydex"||isOwner());
  $("#prices").hidden=v!=="prices";
  $("#quiz").hidden=v!=="quiz";
  if(v==="quiz"&&window.VQ)VQ.open();
  if(v==="prices"&&window.VP)VP.open();
}
const menu=$("#setMenu"),gear=$("#btnSettings");
let wipeTimer=0;
function wipeReset(){clearTimeout(wipeTimer);const w=$("#btnWipe");w.textContent="Clear all saved data";w.dataset.arm=""}
function setMenu(open){
  if(open)$("#btnWipe").hidden=!isOwner();
  menu.hidden=!open;
  gear.setAttribute("aria-expanded",String(open));
  if(!open)wipeReset();
}
gear.addEventListener("click",e=>{e.stopPropagation();setMenu(menu.hidden)});
document.addEventListener("click",e=>{if(!menu.hidden&&!e.target.closest(".setwrap"))setMenu(false)});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!menu.hidden){setMenu(false);gear.focus()}});
$("#btnWipe").addEventListener("click",e=>{
  e.stopPropagation();
  const w=e.currentTarget;
  if(!isOwner())return;
  if(!w.dataset.arm){w.dataset.arm="1";w.textContent="Click again to confirm";wipeTimer=setTimeout(wipeReset,4000);return}
  const keep=["vortexdex.admin","vortexdex.theme","tempest.fx"];
  try{
    const dead=[];
    for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(/^(vortexdex|tempest)\./.test(k)&&!keep.includes(k))dead.push(k)}
    dead.forEach(k=>localStorage.removeItem(k));
  }catch(err){}
  location.reload();
});
window.addEventListener("hashchange",()=>setMenu(false));
window.addEventListener("hashchange",show);
show();
})();
