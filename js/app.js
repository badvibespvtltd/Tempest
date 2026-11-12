(function(){
const $=s=>document.querySelector(s);
const VIEWS=["home","dex","quiz","prices"];
const BUNDLES={
  dex:["data/pokemon.js","js/clandex.js"],
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
  const pc=window.VP?VP.count():(window.VORTEX_STATS&&VORTEX_STATS.prices)||0;
  $("#statPrices").textContent=pc?pc.toLocaleString()+" prices listed":"No price data yet";
}
function route(){
  let v=(location.hash||"#home").slice(1);
  if(!VIEWS.includes(v))v="home";
  return v;
}
function show(){
  const v=route();
  if(v===cur)return;
  const prev=cur;
  cur=v;
  want=v;
  document.title=v==="home"?"Tempest":"Tempest · "+(v==="dex"?"ClanDex":v==="quiz"?"Quiz Practice":"Pricelist");
  document.documentElement.setAttribute("data-page",v);
  $("#crumb").textContent=v==="dex"?"ClanDex":v==="quiz"?"Quiz Practice":v==="prices"?"Pricelist":"";
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
    if(want!==v){if(want!=="dex")$("#app").hidden=true;return}
    $("#viewLoad").hidden=true;
    reveal(v);
  }).catch(()=>{
    if(want!==v)return;
    $("#viewLoad").textContent="Could not load this page. Check your connection and reload.";
  });
}
function reveal(v){
  const ready=$("#app").dataset.ready==="1";
  $("#app").hidden=!(v==="dex"&&ready);
  $("#loader").hidden=!(v==="dex"&&!ready);
  $("#dexTools").hidden=!(v==="dex"&&isOwner());
  $("#prices").hidden=v!=="prices";
  $("#quiz").hidden=v!=="quiz";
  if(v==="quiz"&&window.VQ)VQ.open();
  if(v==="prices"&&window.VP)VP.open();
}
window.addEventListener("hashchange",show);
show();
})();
