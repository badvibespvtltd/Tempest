(function(){
const $=s=>document.querySelector(s);
const VIEWS=["home","dex","quiz","prices"];
let cur="";
const bits=m=>{let c=0;while(m){c+=m&1;m=Math.floor(m/2)}return c};
function jget(k){try{return JSON.parse(localStorage.getItem(k)||"null")}catch(e){return null}}
const ADMIN_KEY="vortexdex.admin";
(function(){
  try{
    const q=new URLSearchParams(location.search);
    if(q.has("admin")){
      const v=q.get("admin");
      localStorage.setItem(ADMIN_KEY,v==="off"||v==="0"?"0":"1");
      q.delete("admin");
      const rest=q.toString();
      history.replaceState(null,"",location.pathname+(rest?"?"+rest:"")+location.hash);
    }
  }catch(e){}
})();
function isOwner(){
  let f=null;
  try{f=localStorage.getItem(ADMIN_KEY)}catch(e){}
  if(f==="1")return true;
  if(f==="0")return false;
  return location.protocol==="file:"||location.hostname==="localhost"||location.hostname==="127.0.0.1";
}
window.isOwner=isOwner;
function stats(){
  let v=0;
  const clan=window.VORTEX_CLAN;
  if(clan&&clan.owned){for(const k in clan.owned)v+=(clan.owned[k]||[]).length}
  else{const o=jget("vortexdex.owned.v1")||{};for(const k in o)v+=bits(o[k])}
  $("#statDex").textContent=v?v.toLocaleString()+" variants registered":"Nothing registered yet";
  $("#statPrices").textContent=window.VP&&VP.count()?VP.count().toLocaleString()+" prices listed":"No price data yet";
}
function show(){
  let v=(location.hash||"#home").slice(1);
  if(!VIEWS.includes(v))v="home";
  if(v===cur)return;
  const ready=$("#app").dataset.ready==="1";
  $("#home").hidden=v!=="home";
  $("#app").hidden=!(v==="dex"&&ready);
  $("#loader").hidden=!(v==="dex"&&!ready);
  $("#dexTools").hidden=!(v==="dex"&&isOwner());
  $("#btnHome").hidden=v==="home";
  $("#prices").hidden=v!=="prices";
  $("#crumb").textContent=v==="dex"?"ClanDex":v==="quiz"?"Quiz Practice":v==="prices"?"Pricelist":"";
  document.title=v==="home"?"Tempest":"Tempest · "+(v==="dex"?"ClanDex":v==="quiz"?"Quiz Practice":"Pricelist");
  if(v==="quiz"){if(window.VQ)VQ.open()}else if(cur==="quiz"&&window.VQ)VQ.close();
  if(v==="prices"&&window.VP)VP.open();
  if(v==="home")stats();
  cur=v;
  document.documentElement.setAttribute("data-page",v);
  window.scrollTo(0,0);
}
window.addEventListener("hashchange",show);
show();
})();
