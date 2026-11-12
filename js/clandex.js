(function(){
const VARS=["Normal","Shiny","Dark","Mystic","Metallic","Shadow"];
const TYPE_COLORS={normal:"#A8A77A",fire:"#EE8130",water:"#6390F0",electric:"#F7D02C",grass:"#7AC74C",ice:"#96D9D6",fighting:"#C22E28",poison:"#A33EA1",ground:"#E2BF65",flying:"#A98FF3",psychic:"#F95587",bug:"#A6B91A",rock:"#B6A136",ghost:"#735797",dragon:"#6F35FC",dark:"#705746",steel:"#B7B7CE",fairy:"#D685AD"};
const REGIONS=[["Kanto",0,151],["Johto",152,251],["Hoenn",252,386],["Sinnoh",387,493],["Unova",494,649],["Kalos",650,721],["Alola",722,809],["Galar",810,905],["Paldea",906,1025],["Vortex",1026,Infinity]];
const COLLECTIONS=[["Legendaries","Legendary"],["Ultra Beasts","Ultra Beast"],["Events","Event"],["Megas","Mega"],["Starters","Starter"],["Gigantamax","Gmax"],["Specials","Special"],["Fossils","Fossil"],["Paradox","Paradox"],["Premium","Premium"]];
const LS_OWNED="vortexdex.owned.v1";
const LS_PREFS="vortexdex.prefs.v1";
const LS_CUSTOM="vortexdex.custom.v1";
const LS_STAMP="vortexdex.clanstamp.v1";
const LS_MINE="vortexdex.mine.v1";
const LS_MISSING="vortexdex.mine.missing.v1";

let profile="clan",manage=false,RAW=null,custom={},undoCustom=null,editing=null,iconPending=undefined,ALL=[],BYNAME=new Map(),LISTS={},owned={},prefs={region:"all",group:"all",mode:"table",map:"all",rar:"all",enc:"all",tm:"all",onlyMissing:false};
let storageOK=true,selected=-1,dataStamp="",undoSnapshot=null,toastTimer=0,pendingImport=null;

const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fold=s=>String(s).normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const bits=m=>{let c=0;while(m){c+=m&1;m>>=1}return c};

function lsGet(k){try{return localStorage.getItem(k)}catch(e){storageOK=false;return null}}
function lsSet(k,v){try{localStorage.setItem(k,v);return true}catch(e){storageOK=false;return false}}

function loadState(){
  try{const o=JSON.parse(lsGet(LS_OWNED)||"{}");if(o&&typeof o==="object")owned=o}catch(e){owned={}}
  try{Object.assign(prefs,JSON.parse(lsGet(LS_PREFS)||"{}"))}catch(e){}
  try{const c=JSON.parse(lsGet(LS_CUSTOM)||"{}");if(c&&typeof c==="object")custom=c}catch(e){custom={}}
  const clan=window.VORTEX_CLAN;
  if(clan&&clan.owned){
    const sig=JSON.stringify(clan.owned)+JSON.stringify(clan.custom||{});
    let h=5381;
    for(let i=0;i<sig.length;i++)h=((h<<5)+h+sig.charCodeAt(i))|0;
    const stamp=String(clan.exported||"")+"|"+(clan.count||0)+"|"+sig.length+"|"+(h>>>0).toString(36);
    if(lsGet(LS_STAMP)!==stamp){
      const o={};
      for(const [n,list] of Object.entries(clan.owned)){
        let m=0;
        (list||[]).forEach(v=>{const i=VARS.indexOf(v);if(i>=0)m|=(1<<i)});
        if(m)o[n]=m;
      }
      owned=o;
      if(clan.custom&&typeof clan.custom==="object")custom=clan.custom;
      lsSet(LS_OWNED,JSON.stringify(owned));
      lsSet(LS_CUSTOM,JSON.stringify(custom));
      lsSet(LS_STAMP,stamp);
    }
  }
  profile=location.hash==="#mydex"?"mine":"clan";
  if(profile==="mine")owned=loadOwned("mine");
}
const adminOn=()=>typeof window.isOwner==="function"&&window.isOwner();
function loadOwned(p){
  try{const o=JSON.parse(lsGet(p==="mine"?LS_MINE:LS_OWNED)||"{}");return o&&typeof o==="object"?o:{}}catch(e){return {}}
}
function persist(){
  const ok=lsSet(profile==="mine"?LS_MINE:LS_OWNED,JSON.stringify(owned));
  setSaveState(ok);
}
function persistCustom(){setSaveState(lsSet(LS_CUSTOM,JSON.stringify(custom)))}
function persistPrefs(){lsSet(LS_PREFS,JSON.stringify(prefs))}
function setSaveState(ok){
  const el=$("#saveState");
  el.textContent=ok&&storageOK?"Saved in this browser":"Not saved automatically: use Export";
  el.style.color=ok&&storageOK?"#9fd6a8":"#ffb35c";
}

function regionOf(rec){
  const n=parseInt(rec.dex,10);
  if(isNaN(n))return "Vortex";
  for(const [name,lo,hi] of REGIONS)if(n>=lo&&n<=hi)return name;
  return "Vortex";
}
function rankOf(rec){
  const n=rec.name;
  if(/^clone /i.test(n)||rec.class==="Side")return 4;
  if(/\(mega/i.test(n))return 1;
  if(/\(gigantamax\)/i.test(n))return 2;
  if(/\(/.test(n))return 3;
  return 0;
}
function prepare(r){
  const vs=[];
  for(let i=0;i<VARS.length;i++)if((r.variants||[]).includes(VARS[i]))vs.push(i);
  r.side=/^side$/i.test(String(r.class||"").trim());
  if(!vs.length){if(r.side)vs.push(0);else for(let i=0;i<VARS.length;i++)vs.push(i)}
  r.vs=vs;
  r.vmask=vs.reduce((m,i)=>m|(1<<i),0);
  r.fold=fold(r.name);
  r.region=regionOf(r);
  r.rank=rankOf(r);
  let cl=String(r.class||"").trim().toLowerCase();
  if(cl==="unreleased")cl="event";
  const hit=COLLECTIONS.find(c=>c[1].toLowerCase()===cl);
  r.coll=hit?hit[0]:null;
  r.dexNum=parseInt(r.dex,10);
  const t=(r.types||[]).map(x=>String(x).toLowerCase()).filter(x=>TYPE_COLORS[x]);
  const c1=TYPE_COLORS[t[0]]||"#999",c2=TYPE_COLORS[t[1]]||c1;
  r.bg=t.length>1?`linear-gradient(90deg,${c1} 0,${c1} 44%,${c2} 62%,${c2} 100%)`:c1;
  return r;
}
const EXTRA_EVO={
  "Kubfu":[
    {to:"Urshifu (Single Strike)",requirement:"Scroll of Darkness"},
    {to:"Urshifu (Rapid Strike)",requirement:"Scroll of Waters"}
  ]
};
function reindex(){
  const pk={};
  for(const [n,r] of Object.entries(RAW.pokemon||RAW))pk[n]=Object.assign({},r);
  for(const [n,c] of Object.entries(custom)){
    const rec=Object.assign({},pk[n]||{},c,{name:n,custom:true,fromWiki:!!pk[n]});
    rec.evolves_into=(c.evolves_into||[]).map(e=>({from:n,to:e.to,requirement:e.requirement||"",items:[]}));
    pk[n]=rec;
  }
  for(const [n,list] of Object.entries(EXTRA_EVO)){
    const r=pk[n];
    if(!r||r.custom||(r.evolves_into&&r.evolves_into.length))continue;
    const to=list.filter(e=>pk[e.to]);
    if(to.length)r.evolves_into=to.map(e=>({from:n,to:e.to,requirement:e.requirement,items:[]}));
  }
  BYNAME=new Map();
  ALL=Object.values(pk).map(prepare);
  ALL.sort((a,b)=>(isNaN(a.dexNum)?1e9:a.dexNum)-(isNaN(b.dexNum)?1e9:b.dexNum)||a.rank-b.rank||a.name.localeCompare(b.name));
  ALL.forEach((r,i)=>{r.idx=i;BYNAME.set(r.name,r)});
  buildLists();
  validatePrefs();
  buildMaps();
  renderTabs();
  renderGrid();
  applyMode();
}
function init(data){
  RAW=data;
  dataStamp=data.generated||"";
  for(const [n,c] of Object.entries(custom)){
    const r=data.pokemon&&data.pokemon[n];
    if(r&&c&&c.iconData&&!r.icon_file&&!r.iconData)r.iconData=c.iconData;
  }
  reindex();
  $("#loader").hidden=true;
  $("#app").hidden=false;
  $("#app").dataset.ready="1";
  $("#filter").value="";
  $("#onlyMissing").checked=!!prefs.onlyMissing;
  updateProfileUI();
  setSaveState(true);
}

const getMask=name=>owned[name]||0;
const isOwned=(rec,vi)=>((getMask(rec.name)>>vi)&1)===1;
function setOwned(rec,vi,on){
  const m=getMask(rec.name);
  const nm=on?(m|(1<<vi)):(m&~(1<<vi));
  if(nm)owned[rec.name]=nm;else delete owned[rec.name];
}
function toggle(rec,vi){
  if(!((rec.vmask>>vi)&1))return;
  setOwned(rec,vi,!isOwned(rec,vi));
  persist();
  afterChange();
}
function toggleRow(rec){
  const all=rec.vs.every(v=>isOwned(rec,v));
  rec.vs.forEach(v=>setOwned(rec,v,!all));
  persist();
  afterChange();
}
function afterChange(){
  syncBalls();
  syncLineBadges();
  updateStats();
  renderResult();
}

function stats(list){
  let total=0,have=0;
  for(const r of list){total+=r.vs.length;have+=bits(getMask(r.name)&r.vmask)}
  return {total,have,pct:total?Math.round(have*1000/total)/10:0};
}
function rowComplete(r){return bits(getMask(r.name)&r.vmask)===r.vs.length}

const viewLabel=k=>k==="main"?"Main Pokédex":k==="side"?"Side Pokédex":k.startsWith("region:")?k.slice(7)+" Pokédex":k.slice(5);
const hasList=k=>!!(LISTS[k]&&LISTS[k].length);
function buildLists(){
  LISTS={all:[],main:[],side:[]};
  REGIONS.forEach(([n])=>{LISTS["region:"+n]=[]});
  COLLECTIONS.forEach(([n])=>{LISTS["coll:"+n]=[]});
  for(const r of ALL){
    LISTS.all.push(r);
    (r.side?LISTS.side:LISTS.main).push(r);
    LISTS["region:"+r.region].push(r);
    if(r.coll)LISTS["coll:"+r.coll].push(r);
  }
}
const regionLabel=r=>r==="all"?"Full Pokédex":r+" Pokédex";
const groupLabel=g=>g==="main"?"Main":g==="side"?"Side":g.slice(5);
function validatePrefs(){
  if(prefs.region!=="all"&&!hasList("region:"+prefs.region))prefs.region="all";
  if(prefs.group!=="all"&&!hasList(prefs.group))prefs.group="all";
}
function listFor(region,group){
  const base=group==="all"?(LISTS.all||[]):(LISTS[group]||[]);
  return region==="all"?base:base.filter(r=>r.region===region);
}
function tabBtn(r,label){
  return `<button type="button" class="tab" role="tab" data-region="${r}" aria-selected="${r===prefs.region}">${esc(label)}<small data-rpct="${r}"></small></button>`;
}
function sideBtn(g,label){
  return `<button type="button" class="sidebtn" data-group="${g}" aria-pressed="${g===prefs.group}"><span>${esc(label)}</span><small data-gpct="${g}"></small></button>`;
}
function renderTabs(){
  $("#tabs").innerHTML=tabBtn("all","All")+REGIONS.map(([n])=>n).filter(n=>hasList("region:"+n)).map(n=>tabBtn(n,n)).join("");
  $("#side").innerHTML=
    `<div class="sidehead">Pokédex</div>`+sideBtn("all","Full dex")+["main","side"].filter(hasList).map(g=>sideBtn(g,groupLabel(g))).join("")+
    `<div class="sidehead">Collections</div>`+COLLECTIONS.map(([n])=>"coll:"+n).filter(hasList).map(g=>sideBtn(g,groupLabel(g))).join("");
  updateStats();
}
function ringHTML(k,label,big){
  const s=stats(LISTS[k]||[]);
  return `<button type="button" class="ring${big?" big":""}" data-view="${k}" title="${esc(label)}: ${s.have} / ${s.total}"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="trk" cx="50" cy="50" r="44"/><circle class="arc" cx="50" cy="50" r="44" pathLength="100" stroke-dasharray="${s.pct} 100"/></svg><span class="rl">${esc(label)}<small>${Math.round(s.pct)}%</small></span></button>`;
}
function renderOverview(){
  const sec=(title,html)=>html?`<div class="bar">${title}</div><div class="rings">${html}</div>`:"";
  $("#overview").innerHTML=
    sec("Pokédex",["main","side"].filter(hasList).map(k=>ringHTML(k,viewLabel(k),true)).join(""))+
    sec("Regions",REGIONS.map(([n])=>"region:"+n).filter(hasList).map(k=>ringHTML(k,k.slice(7))).join(""))+
    sec("Collections",COLLECTIONS.map(([n])=>"coll:"+n).filter(hasList).map(k=>ringHTML(k,k.slice(5))).join(""));
}
function applyMode(){
  if(!["table","overview","breakdown"].includes(prefs.mode))prefs.mode="table";
  const ov=prefs.mode==="overview",bd=prefs.mode==="breakdown";
  $("#overview").hidden=!ov;
  $("#breakdown").hidden=!bd;
  $("#tableView").hidden=ov||bd;
  document.querySelectorAll(".mode").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.mode===prefs.mode)));
  if(ov)renderOverview();
  if(bd)renderBreakdown();
}
const VAR_COLORS=["#a30000","#d6dc00","#444444","#80d8f2","#aaaaaa","#3d0a60"];
const VAR_INK=["#fff","#111","#fff","#111","#111","#fff"];
const TYPE_ORDER=["normal","fire","water","electric","grass","ice","fighting","poison","ground","flying","psychic","bug","rock","ghost","dragon","dark","steel","fairy","unknown"];
const TYPE_FILL=Object.assign({},TYPE_COLORS,{unknown:"#68A090"});
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
const fmtPct=v=>(Math.round(v*10)/10)+"%";
function breakdownCounts(){
  const vc=VARS.map(()=>0),tc={};
  TYPE_ORDER.forEach(x=>tc[x]=0);
  for(const r of LISTS.all||[]){
    const m=getMask(r.name)&r.vmask;
    if(!m)continue;
    let ty=String((r.types||[])[0]||"").toLowerCase();
    if(!(ty in tc))ty="unknown";
    for(const v of r.vs)if((m>>v)&1){vc[v]++;tc[ty]++}
  }
  return {vc,tc,total:vc.reduce((a,b)=>a+b,0)};
}
function pieSVG(vc,total){
  const R=110,C=120;
  if(!total)return `<svg viewBox="0 0 240 240"><circle cx="${C}" cy="${C}" r="${R}" fill="#ccc"/></svg>`;
  let a0=-Math.PI/2,out="";
  vc.forEach((n,i)=>{
    if(!n)return;
    const frac=n/total,a1=a0+frac*2*Math.PI,tip=`${VARS[i]}: ${n.toLocaleString()} (${fmtPct(frac*100)})`;
    if(frac>=0.9999)out+=`<circle cx="${C}" cy="${C}" r="${R}" fill="${VAR_COLORS[i]}"><title>${tip}</title></circle>`;
    else{
      const p=a=>`${(C+R*Math.cos(a)).toFixed(2)} ${(C+R*Math.sin(a)).toFixed(2)}`;
      out+=`<path d="M${C} ${C}L${p(a0)}A${R} ${R} 0 ${frac>0.5?1:0} 1 ${p(a1)}Z" fill="${VAR_COLORS[i]}"><title>${tip}</title></path>`;
    }
    if(frac>=0.04){
      const am=(a0+a1)/2,lr=frac>=0.9999?0:R*0.62;
      out+=`<text x="${(C+lr*Math.cos(am)).toFixed(1)}" y="${(C+lr*Math.sin(am)).toFixed(1)}" fill="${VAR_INK[i]}" text-anchor="middle" dominant-baseline="central">${fmtPct(frac*100)}</text>`;
    }
    a0=a1;
  });
  return `<svg viewBox="0 0 240 240" role="img" aria-label="Caught variants by variant">${out}</svg>`;
}
function niceStep(max){
  const raw=max/4,mag=Math.pow(10,Math.floor(Math.log10(raw||1))),f=raw/mag;
  return (f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*mag;
}
function typesSVG(tc){
  const W=1000,H=260,L=56,Rm=12,T=14,B=56,pw=W-L-Rm,ph=H-T-B;
  const vals=TYPE_ORDER.map(k=>tc[k]),mx=Math.max(1,...vals),step=niceStep(mx),top=Math.ceil(mx/step)*step;
  const y=v=>T+ph-(v/top)*ph,slot=pw/TYPE_ORDER.length,bw=slot*0.82;
  let g="";
  for(let v=0;v<=top+1e-9;v+=step/2){
    const major=Math.abs(v/step-Math.round(v/step))<1e-6;
    g+=`<line class="gl${major?"":" minor"}" x1="${L}" x2="${W-Rm}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/>`;
    if(major)g+=`<text x="${L-10}" y="${y(v).toFixed(1)}" text-anchor="end" dominant-baseline="central">${Math.round(v).toLocaleString()}</text>`;
  }
  let bars="";
  TYPE_ORDER.forEach((k,i)=>{
    const x=L+i*slot+(slot-bw)/2,v=tc[k],h=Math.max(v?2:1,ph*v/top);
    bars+=`<rect x="${x.toFixed(1)}" y="${(T+ph-h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" fill="${TYPE_FILL[k]}"><title>${cap(k)}: ${v.toLocaleString()}</title></rect>`;
    bars+=`<text x="${(x+bw/2).toFixed(1)}" y="${T+ph+(i%2?40:20)}" text-anchor="middle">${cap(k)}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Caught variants by first type">${g}${bars}<line x1="${L}" x2="${W-Rm}" y1="${T+ph}" y2="${T+ph}" stroke="#a30000"/></svg>`;
}
function renderBreakdown(){
  const {vc,tc,total}=breakdownCounts();
  const legend=VARS.map((v,i)=>`<li><i style="background:${VAR_COLORS[i]}"></i>${v}<span>${vc[i].toLocaleString()}${total?" · "+fmtPct(vc[i]*100/total):""}</span></li>`).join("");
  $("#breakdown").innerHTML=`<div class="bar">Pokédex Breakdown</div><div class="bdwrap"><div class="bdpie">${pieSVG(vc,total)}<ul class="legend">${legend}</ul></div><p class="bdnote">${total.toLocaleString()} caught variants</p></div>`+
    `<div class="bar">Type Breakdown</div><div class="bdwrap"><div class="bdtypes">${typesSVG(tc)}</div><p class="bdnote">Dual-type Pokémon count under their first type. Hover a bar for its number.</p></div>`;
}
function afterNav(){
  prefs.mode="table";
  persistPrefs();
  $("#filter").value="";
  renderTabs();
  applyMode();
  renderGrid();
}
function syncSpawnSel(){
  $("#rarFilter").value=prefs.rar;
  $("#encFilter").value=prefs.enc;
  $("#tmFilter").value=prefs.tm;
}
function goToMap(m){
  prefs.map=m;
  prefs.rar=prefs.enc=prefs.tm="all";
  syncSpawnSel();
  prefs.region="all";
  prefs.group="all";
  $("#filter").value="";
  closeDetail();
  validatePrefs();
  buildMaps();
  afterNav();
  const sc=document.querySelector(".scroller");
  if(sc)sc.scrollTop=0;
  $("#dex").scrollIntoView({block:"start"});
}
function setRegion(r){prefs.region=r;afterNav()}
function setGroup(g){prefs.group=g;afterNav()}
function setView(k){
  if(k.startsWith("region:")){prefs.region=k.slice(7);prefs.group="all"}
  else{prefs.group=k;prefs.region="all"}
  prefs.map="all";
  prefs.rar=prefs.enc=prefs.tm="all";
  syncSpawnSel();
  afterNav();
}
function updateStats(){
  const t=stats(LISTS.all||[]);
  $("#totalBar").textContent=`${profile==="mine"?"My Pokédex":"Total Pokédex"} Completion: ${Math.round(t.pct)}%  (${t.have} / ${t.total})`;
  document.querySelectorAll("[data-rpct]").forEach(el=>{
    const l=listFor(el.dataset.rpct,prefs.group),st=stats(l);
    el.textContent=`${st.have}/${st.total}`;
    el.title=Math.round(st.pct)+"%";
    el.closest(".tab").classList.toggle("dim",!l.length);
  });
  document.querySelectorAll("[data-gpct]").forEach(el=>{
    const l=listFor(prefs.region,el.dataset.gpct),st=stats(l);
    el.textContent=`${st.have}/${st.total}`;
    el.title=Math.round(st.pct)+"%";
    el.closest(".sidebtn").classList.toggle("dim",!l.length);
  });
  const rb=$("#regionBar");
  rb.hidden=$("#filter").value.trim()===""&&prefs.region==="all"&&prefs.group==="all"&&!mapActive();
  if($("#filter").value.trim()!==""){
    $("#regionBar").textContent=!mapActive()?"Search results from every region and group":`Search results on ${mapLabel()}`;
  }else{
    const base=listFor(prefs.region,prefs.group);
    const s=stats(!mapActive()?base:base.filter(onMap));
    const name=[regionLabel(prefs.region)].concat(prefs.group==="all"?[]:[groupLabel(prefs.group)],!mapActive()?[]:[mapLabel()]).join(" · ");
    $("#regionBar").textContent=`${name} Completion: ${Math.round(s.pct)}%  (${s.have} / ${s.total})`;
  }
  if(prefs.mode==="overview")renderOverview();
  if(prefs.mode==="breakdown")renderBreakdown();
}

function ballBtn(rec,vi,extra){
  const on=isOwned(rec,vi);
  return `<button type="button" class="ball" data-i="${rec.idx}" data-v="${vi}" aria-pressed="${on}" aria-label="${VARS[vi]} ${esc(rec.name)}" title="${VARS[vi]} ${esc(rec.name)}"><svg aria-hidden="true"><use href="#ball"/></svg></button>`;
}
function iconTag(rec,cls){
  return rec.iconData?`<img alt="" src="${rec.iconData}">`:rec.icon_file?`<img loading="lazy" alt="" src="data/icons/${encodeURIComponent(rec.icon_file)}">`:"";
}
function lineMissing(rec){
  const out=[];
  for(const n of lineOf(rec.name).slice(1)){
    if(!n.rec)continue;
    const miss=n.rec.vs.filter(v=>!isOwned(n.rec,v));
    if(miss.length)out.push({name:n.name,miss});
  }
  return out;
}
function lineBadgeInner(rec){
  const m=lineMissing(rec);
  if(!m.length)return {text:"",tip:""};
  const n=m.reduce((s,x)=>s+x.miss.length,0);
  return {text:`${n} missing in line`,tip:"Missing further down this line:\n"+m.map(x=>`${x.name}: ${x.miss.map(v=>VARS[v]).join(", ")}`).join("\n")};
}
function lineBadge(rec){
  const b=lineBadgeInner(rec);
  return `<span class="lb" data-lb="${rec.idx}" title="${esc(b.tip)}">${esc(b.text)}</span>`;
}
function syncLineBadges(){
  document.querySelectorAll("#grid .lb").forEach(el=>{
    const rec=ALL[+el.dataset.lb];
    if(!rec)return;
    const b=lineBadgeInner(rec);
    el.textContent=b.text;
    el.title=b.tip;
  });
}
function rowHTML(rec){
  let cells="";
  for(let v=0;v<VARS.length;v++){
    cells+=`<div class="cell" role="cell">${(rec.vmask>>v)&1?ballBtn(rec,v):""}</div>`;
  }
  const num=isNaN(rec.dexNum)?esc(rec.dex||"?"):"#"+String(rec.dexNum).padStart(4,"0");
  return `<div class="drow" role="row" data-idx="${rec.idx}" style="background:${rec.bg}"><button type="button" class="num" data-row="${rec.idx}" title="Register or clear every variant of ${esc(rec.name)}">${num}</button><div class="ico" role="cell">${iconTag(rec)}</div><div class="nmc" role="cell"><button type="button" class="nm" data-name="${rec.idx}" title="Show details for ${esc(rec.name)}">${esc(rec.name)}</button>${lineBadge(rec)}</div>${cells}</div>`;
}
let MAPS=[];
const natural=(a,b)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:"base"});
function buildMaps(){
  const set=new Set();
  for(const r of ALL){
    const l=r.location||{};
    if(l.kind==="map")for(const m of l.maps||[])set.add(m);
  }
  MAPS=[...set].sort(natural);
  const cat={};
  for(const r of ALL)for(const sp of r.spawns||[])if(sp.cat&&!cat[sp.map])cat[sp.map]=sp.cat;
  if(prefs.map!=="all"&&prefs.map!=="@roaming"&&prefs.map!=="@rotm"&&!set.has(prefs.map))prefs.map="all";
  const sel=$("#mapFilter");
  const opt=m=>`<option value="${esc(m)}">${esc(m)}</option>`;
  const groups=["Routes","Caves/Indoor Areas","Towns/Outdoor Areas"];
  const grouped=groups.map(g=>{const ms=MAPS.filter(m=>cat[m]===g);return ms.length?`<optgroup label="${g}">${ms.map(opt).join("")}</optgroup>`:""}).join("");
  const rest=MAPS.filter(m=>!groups.includes(cat[m]));
  sel.innerHTML=`<option value="all">All maps</option>`+grouped+(rest.length?(grouped?`<optgroup label="Other">`:"")+rest.map(opt).join("")+(grouped?`</optgroup>`:""):"")+`<option value="@roaming">Roaming (changes hourly)</option><option value="@rotm">Roamer of the Month</option>`;
  sel.value=prefs.map;
  if(!(prefs.rar in RARLAB))prefs.rar="all";
  if(!(prefs.enc in ENCLAB))prefs.enc="all";
  if(prefs.tm!=="day"&&prefs.tm!=="night")prefs.tm="all";
  syncSpawnSel();
}
const PLANT=m=>/power plant/i.test(m);
const spawnFiltered=()=>prefs.rar!=="all"||prefs.enc!=="all"||prefs.tm!=="all";
function spawnOK(r){
  const m=prefs.map;
  return (r.spawns||[]).some(s=>(m==="all"||s.map===m)&&(prefs.rar==="all"||s.rarity===prefs.rar)&&(prefs.tm==="all"||s.time===prefs.tm)&&(prefs.enc==="all"||(prefs.enc==="plant"?PLANT(s.map):(s.method||[]).includes(prefs.enc))));
}
function onMap(r){
  const v=prefs.map,l=r.location||{};
  if(spawnFiltered()&&v!=="@roaming"&&v!=="@rotm")return spawnOK(r);
  if(v==="all")return true;
  if(v==="@roaming")return l.kind==="roaming";
  if(v==="@rotm")return l.kind==="rotm";
  return l.kind==="map"&&(l.maps||[]).includes(v);
}
const RARLAB={common:"Common",rare:"Rare",legendary:"Legendary","ultra beast":"Ultra Beast",paradox:"Paradox"};
const ENCLAB={grass:"Grass",water:"Water",cave:"Cave",land:"Land",floor:"Floor",plant:"Power Plant"};
const RARICO={common:"⚪",rare:"⭐",legendary:"👑","ultra beast":"🌀",paradox:"⏳"};
const ENCICO={grass:"🌿",water:"💧",cave:"⛰️",land:"🏞️",floor:"🪜",plant:"⚡"};
const TMICO={day:"☀️",night:"🌙"};
const mapLabel=()=>prefs.map==="@roaming"?"Roaming":prefs.map==="@rotm"?"Roamer of the Month":[prefs.map==="all"?"":prefs.map,prefs.rar==="all"?"":RARLAB[prefs.rar],prefs.enc==="all"?"":ENCLAB[prefs.enc],prefs.tm==="all"?"":prefs.tm==="day"?"Day":"Night"].filter(Boolean).join(" · ");
const mapActive=()=>prefs.map!=="all"||spawnFiltered();
function currentList(){
  const q=fold($("#filter").value);
  let list=q?(LISTS.all||[]).filter(r=>r.fold.includes(q)):listFor(prefs.region,prefs.group);
  if(mapActive())list=list.filter(onMap);
  if(prefs.onlyMissing)list=list.filter(r=>!rowComplete(r)||lineMissing(r).length>0);
  return list;
}
const GRID_CHUNK=120,GRID_STEP=200;
let gridLim=GRID_CHUNK,gridKey="";
function moreHTML(total){
  const left=total-gridLim;
  return left>0?`<div class="empty" id="gridMore"><button type="button" class="btn ghost small" data-gridmore>Show ${Math.min(GRID_STEP,left)} more (${left} left)</button></div>`:"";
}
function moreRows(){
  const list=currentList(),from=gridLim;
  gridLim+=GRID_STEP;
  const b=$("#gridMore");
  if(b){
    b.insertAdjacentHTML("beforebegin",list.slice(from,gridLim).map(rowHTML).join(""));
    b.outerHTML=moreHTML(list.length);
  }
  syncBalls();
  syncLineBadges();
}
function ensureRow(idx){
  if(rowEl(idx))return true;
  const pos=currentList().findIndex(r=>r.idx===idx);
  if(pos<0)return false;
  gridLim=Math.max(gridLim,pos+1);
  renderGrid();
  return !!rowEl(idx);
}
function renderGrid(){
  const list=currentList();
  const key=[profile,prefs.region,prefs.group,prefs.map,prefs.rar,prefs.enc,prefs.tm,prefs.onlyMissing,$("#filter").value].join("|");
  if(key!==gridKey){gridKey=key;gridLim=GRID_CHUNK}
  const head=`<div class="hrow" role="row"><div role="columnheader">#</div><div role="columnheader"></div><div class="l" role="columnheader">Pokémon</div>${VARS.map(v=>`<div role="columnheader">${v}</div>`).join("")}</div>`;
  $("#grid").innerHTML=head+(list.length?list.slice(0,gridLim).map(rowHTML).join("")+moreHTML(list.length):`<div class="empty">Nothing to show here.</div>`);
  updateStats();
  if(selected>=0){
    const row=rowEl(selected);
    if(row)attachDetail(row);else selected=-1;
  }
}
function syncBalls(){
  document.querySelectorAll(".ball").forEach(b=>{
    const rec=ALL[+b.dataset.i];
    if(rec)b.setAttribute("aria-pressed",String(isOwned(rec,+b.dataset.v)));
  });
}

const rowEl=idx=>document.querySelector(`#grid .drow[data-idx="${idx}"]`);
function closeDetail(){
  const d=document.getElementById("detail");
  if(d)d.remove();
  document.querySelectorAll(".drow.open").forEach(r=>r.classList.remove("open"));
  selected=-1;
}
function attachDetail(row){
  const old=document.getElementById("detail");
  if(old)old.remove();
  document.querySelectorAll(".drow.open").forEach(r=>r.classList.remove("open"));
  const el=document.createElement("div");
  el.id="detail";
  el.className="detail";
  el.setAttribute("role","region");
  row.after(el);
  row.classList.add("open");
  selected=+row.dataset.idx;
  renderResult();
  return el;
}
function openDetail(idx){
  ensureRow(idx);
  let row=rowEl(idx);
  if(!row){
    prefs.region="all";
    prefs.group="all";
    prefs.onlyMissing=false;
    prefs.map="all";
    prefs.rar=prefs.enc=prefs.tm="all";
    syncSpawnSel();
    $("#mapFilter").value="all";
    $("#onlyMissing").checked=false;
    $("#filter").value="";
    prefs.mode="table";
    persistPrefs();
    renderTabs();
    applyMode();
    renderGrid();
    ensureRow(idx);
    row=rowEl(idx);
  }
  if(!row){toast("That one is not part of the dex.");return}
  const el=attachDetail(row);
  const sc=document.querySelector(".scroller"),hh=sc.querySelector(".hrow").offsetHeight;
  const top=el.getBoundingClientRect().top-sc.getBoundingClientRect().top;
  const bottom=document.getElementById("detail").getBoundingClientRect().bottom-sc.getBoundingClientRect().top;
  if(top<hh||bottom>sc.clientHeight)sc.scrollTop+=top-hh-4;
}
function toggleDetail(idx){
  if(selected===idx)closeDetail();else openDetail(idx);
}

function lineOf(name){
  const out=[],seen=new Set();
  (function walk(n,depth,via,from){
    if(seen.has(n))return;
    seen.add(n);
    const rec=BYNAME.get(n)||null;
    out.push({name:n,rec,depth,via,from});
    if(rec)for(const e of rec.evolves_into||[])if(e.to)walk(e.to,depth+1,e,n);
  })(name,0,null,null);
  return out;
}
function whereHTML(rec){
  const loc=rec.location||{};
  const parts=[];
  if(loc.kind==="map"&&loc.maps&&loc.maps.length){
    parts.push(`<div><b>Found at:</b> ${loc.maps.map(m=>`<button type="button" class="tag hot" data-mapgo="${esc(m)}" title="Show every Pokémon on ${esc(m)}">${esc(m)}</button>`).join("")}</div>`);
  }else if(loc.kind==="roaming"){
    parts.push(`<div><b>Roaming:</b> no fixed map, the route changes every hour (XX:00 UTC). <button type="button" class="tag hot" data-mapgo="@roaming" title="Show every roaming Pokémon">All roaming</button></div>`);
  }else if(loc.kind==="rotm"){
    parts.push(`<div><b>Roamer of the Month:</b> no fixed map, appears only in its month (Normal only). <button type="button" class="tag hot" data-mapgo="@rotm" title="Show every Roamer of the Month">All Roamers of the Month</button></div>`);
  }else if(loc.kind==="none"){
    parts.push(`<div><b>Not found in the wild.</b></div>`);
  }else if(loc.text){
    parts.push(`<div>${esc(loc.text)}</div>`);
  }else{
    parts.push(`<div><b>No map listed</b> on the wiki for this one.</div>`);
  }
  const sp=rec.spawns||[];
  if(sp.length){
    const by=new Map();
    for(const x of sp){
      const k=x.map+"|"+x.rarity+"|"+(x.method||[]).join("/");
      if(!by.has(k))by.set(k,{map:x.map,rar:x.rarity,m:(x.method||[]).join("/"),t:new Set()});
      if(x.time)by.get(k).t.add(x.time);
    }
    const rows=[...by.values()].map(v=>{
      const enc=v.m.split("/").map(m=>`<span class="sp-chip" title="${esc(ENCLAB[m]||m)}">${ENCICO[m]||""} ${esc(ENCLAB[m]||m)}</span>`).join("");
      const tm=[...v.t].sort().map(t=>`<span class="sp-chip" title="${t==="day"?"Day":"Night"}">${TMICO[t]}</span>`).join("");
      return `<div class="sprow"><span class="sp-map">${esc(v.map)}</span><span class="sp-chip sp-${v.rar.replace(" ","")}" title="${esc(RARLAB[v.rar]||v.rar)}">${RARICO[v.rar]||""} ${esc(RARLAB[v.rar]||v.rar)}</span>${enc}${tm}</div>`;
    });
    parts.push(`<div class="spawnline"><b>Spawns:</b>${rows.join("")}</div>`);
  }
  return parts.join("");
}
function viaText(node){
  if(!node.via)return "";
  const req=node.via.requirement||"evolves";
  return `<span class="via">from ${esc(node.from)}: ${esc(req)}</span>`;
}
function renderResult(){
  const box=document.getElementById("detail");
  if(!box)return;
  if(selected<0||!ALL[selected]){box.remove();return}
  const root=ALL[selected];
  const rows=lineOf(root.name).map(n=>{
    let st="unknown",chips="",label="Not in your data";
    if(n.rec){
      const have=n.rec.vs.filter(v=>isOwned(n.rec,v)).length;
      st=have===n.rec.vs.length?"own":"miss";
      if(prefs.onlyMissing&&st==="own")return "";
      chips=n.rec.vs.map(v=>`<span class="vchip">${ballBtn(n.rec,v)}<span>${VARS[v]}</span></span>`).join("");
      label=`${have} / ${n.rec.vs.length}`;
    }
    const head=`<div class="nhead">${n.rec?iconTag(n.rec):""}<button type="button" class="nname" ${n.rec?`data-name="${n.rec.idx}"`:"disabled"}>${esc(n.name)}</button>${viaText(n)}<span class="st ${st}">${label}</span><span class="vchips">${chips}</span></div>`;
    return `<li class="node ${st}" style="margin-left:${Math.min(n.depth,4)*16}px">${head}${n.rec?`<div class="where">${whereHTML(n.rec)}</div>`:""}</li>`;
  });
  const head=`<div class="dhead"><h3>${esc(root.name)}: evolution line</h3><span class="sp"></span>${window.isOwner&&window.isOwner()&&profile==="clan"?`<button type="button" class="btn ghost small dedit">Edit</button>`:""}<button type="button" class="btn ghost small dclose">Close</button></div>`;
  box.setAttribute("aria-label",`Details for ${root.name}`);
  const note=prefs.onlyMissing?`<p style="margin:0 0 8px;font-size:12px;color:var(--muted)">Showing only the incomplete evolutions. Untick "Only incomplete" to see the whole line.</p>`:"";
  box.innerHTML=head+note+`<ul class="line">${rows.join("")}</ul>`;
}

function buildPayload(){
  const out={};
  Object.keys(owned).sort().forEach(name=>{
    const m=owned[name];
    const list=VARS.filter((v,i)=>(m>>i)&1);
    if(list.length)out[name]=list;
  });
  const payload={app:"vortex-dex",version:1,exported:new Date().toISOString(),dataGenerated:dataStamp,count:Object.keys(out).length,owned:out};
  if(Object.keys(custom).length)payload.custom=custom;
  return payload;
}
function downloadText(text,type,name){
  const blob=new Blob([text],{type});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=name;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);
}
function dateStamp(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function exportData(){
  const payload=buildPayload();
  downloadText(JSON.stringify(payload,null,1),"application/json",`vortex-${profile==="mine"?"my":"clan"}-dex-${dateStamp()}.json`);
  toast(`Exported ${payload.count} Pokémon`);
}
function exportSite(){
  const payload=buildPayload();
  downloadText("window.VORTEX_CLAN = "+JSON.stringify(payload)+";\n","text/javascript","clan-dex.js");
  toast("Saved clan-dex.js. Put it in the data folder and publish.");
}
function parseImport(text){
  const obj=JSON.parse(text);
  const src=obj&&obj.owned&&typeof obj.owned==="object"?obj.owned:obj;
  const result={},unknown=[];
  const cust=obj&&obj.custom&&typeof obj.custom==="object"?obj.custom:{};
  let entries=0;
  for(const [name,val] of Object.entries(src)){
    if(!Array.isArray(val))continue;
    let m=0;
    for(const v of val){const i=VARS.indexOf(v);if(i>=0)m|=1<<i}
    if(!m)continue;
    result[name]=m;
    entries+=bits(m);
    if(!BYNAME.has(name)&&!cust[name])unknown.push(name);
  }
  return {result,unknown,entries,cust};
}
function startImport(text){
  let parsed;
  try{parsed=parseImport(text)}catch(e){toast("That file is not a valid export");return}
  const n=Object.keys(parsed.result).length;
  const nc=Object.keys(parsed.cust).length;
  if(!n&&!nc){toast("No registered Pokémon found in that file");return}
  pendingImport=parsed;
  $("#importInfo").innerHTML=`The file has <b>${n}</b> Pokémon (${parsed.entries} registered variants)`+(nc?` and <b>${nc}</b> Pokémon you added or edited`:"")+`.`+(parsed.unknown.length?`<br>${parsed.unknown.length} are not in your current data and are kept but not shown: ${esc(parsed.unknown.slice(0,5).join(", "))}${parsed.unknown.length>5?"…":""}.`:"")+`<br><br><b>Merge</b> adds them to what you have. <b>Replace</b> discards your current ticks first.`;
  $("#importDialog").showModal();
}
function applyImport(mode){
  if(!pendingImport)return;
  undoSnapshot=JSON.stringify(owned);
  undoCustom=JSON.stringify(custom);
  if(mode==="replace"){owned={};if(Object.keys(pendingImport.cust).length)custom={}}
  for(const [name,m] of Object.entries(pendingImport.result))owned[name]=(owned[name]||0)|m;
  Object.assign(custom,pendingImport.cust);
  pendingImport=null;
  persist();
  persistCustom();
  closeDetail();
  reindex();
  toast(mode==="replace"?"Replaced your dex":"Merged into your dex",true);
}
function parseMissing(text){
  const want={},bad=[];
  let lines=String(text).split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  if(lines.length&&/missing/i.test(lines[0])&&!BYNAME.has(lines[0]))lines.shift();
  lines=lines.filter(l=>!/^[-=_]{3,}$/.test(l));
  const byFold=new Map();
  for(const r of ALL)byFold.set(r.fold,r);
  let n=0;
  for(const l of lines){
    let rec=byFold.get(fold(l)),vi=0;
    if(!rec){
      const m=l.match(/^(Normal|Shiny|Dark|Mystic|Metallic|Shadow)\s+(.+)$/i);
      if(m){
        const v=VARS.findIndex(x=>x.toLowerCase()===m[1].toLowerCase());
        const r2=byFold.get(fold(m[2]));
        if(r2){rec=r2;vi=v}
      }
    }
    if(!rec||!((rec.vmask>>vi)&1)){bad.push(l);continue}
    want[rec.name]=(want[rec.name]||0)|(1<<vi);
    n++;
  }
  return {want,bad,count:n,lines:lines.length};
}
function applyMissing(text){
  const r=parseMissing(text);
  if(!r.count)return r;
  undoSnapshot=JSON.stringify(owned);
  undoCustom=null;
  const o={};
  for(const rec of ALL){
    const m=rec.vmask&~(r.want[rec.name]||0);
    if(m)o[rec.name]=m;
  }
  owned=o;
  lsSet(LS_MISSING,String(text));
  persist();
  closeDetail();
  renderGrid();
  return r;
}
function updateProfileUI(){
  const mine=profile==="mine",can=mine||adminOn();
  $("#btnMissing").hidden=!mine;
  $("#btnSite").hidden=mine;
  $("#btnManage").hidden=!can;
  if(!can&&manage)setManage(false);
  const dt=$("#dexTools");
  if(dt&&!$("#app").hidden)dt.hidden=!can;
  const dsec=$("#dex");
  if(dsec)dsec.setAttribute("aria-label",mine?"My Pokédex":"Clan Pokédex");
}
function setProfile(p){
  if(p===profile)return;
  persist();
  if(manage)setManage(false);
  profile=p;
  owned=p==="mine"?loadOwned("mine"):loadOwned("clan");
  undoSnapshot=null;
  undoCustom=null;
  closeDetail();
  updateProfileUI();
  renderGrid();
  renderResult();
}
function toast(text,withUndo){
  $("#toastText").textContent=text;
  $("#toastUndo").hidden=!withUndo;
  $("#toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>$("#toast").classList.remove("show"),withUndo?8000:2600);
}
function undo(){
  if(undoSnapshot==null)return;
  try{owned=JSON.parse(undoSnapshot)}catch(e){}
  undoSnapshot=null;
  persist();
  if(undoCustom!=null){
    try{custom=JSON.parse(undoCustom)}catch(e){}
    undoCustom=null;
    persistCustom();
    closeDetail();
    reindex();
  }else{
    renderGrid();
    renderResult();
  }
  $("#toast").classList.remove("show");
}


const TYPE_NAMES=Object.keys(TYPE_COLORS).map(t=>t[0].toUpperCase()+t.slice(1));
function fillSelect(sel,opts,val){sel.innerHTML=opts.map(([v,l])=>`<option value="${esc(v)}">${esc(l)}</option>`).join("");sel.value=val}
function openEditor(rec,presetName){
  editing=rec||null;
  iconPending=undefined;
  const r=rec||{};
  $("#editTitle").textContent=rec?(rec.custom&&!rec.fromWiki?`Edit ${rec.name}`:`Edit ${rec.name} (your changes override the wiki data)`):"Add Pokémon";
  $("#fName").value=rec?rec.name:(presetName||"");
  $("#fName").readOnly=!!rec;
  $("#fDex").value=rec?(r.dex||""):"";
  const t=(r.types||[]).map(x=>String(x).toLowerCase());
  const typeOpts=[["","None"]].concat(TYPE_NAMES.map(n=>[n,n]));
  fillSelect($("#fT1"),typeOpts,TYPE_NAMES.find(n=>n.toLowerCase()===t[0])||"");
  fillSelect($("#fT2"),typeOpts,TYPE_NAMES.find(n=>n.toLowerCase()===t[1])||"");
  const cls=String(r.class||"").trim();
  const clsOpts=[["","None / regular"],["Side","Side Pokédex"]].concat(COLLECTIONS.map(c=>[c[1],c[0]]));
  if(cls&&!clsOpts.some(o=>o[0].toLowerCase()===cls.toLowerCase()))clsOpts.push([cls,cls]);
  fillSelect($("#fClass"),clsOpts,(clsOpts.find(o=>o[0].toLowerCase()===cls.toLowerCase())||[""])[0]);
  const loc=r.location||{};
  $("#fKind").value=["map","roaming","rotm","none","unknown"].includes(loc.kind)?loc.kind:(rec?"unknown":"map");
  $("#fMaps").value=(loc.maps||[]).join(", ");
  $("#fObtain").value=(r.obtain||[]).join(", ");
  $("#fEvo").value=(r.evolves_into||[]).map(e=>e.to+(e.requirement?" | "+e.requirement:"")).join("\n");
  const have=rec?rec.vs.map(i=>VARS[i]):VARS;
  $("#fVars").innerHTML=`<legend>Variants that exist</legend>`+VARS.map(v=>`<label><input type="checkbox" value="${v}"${have.includes(v)?" checked":""}> ${v}</label>`).join("");
  $("#fIcon").value="";
  const del=$("#fDelete");
  del.hidden=!(rec&&rec.custom);
  del.textContent=rec&&rec.fromWiki?"Reset to wiki data":"Delete";
  $("#editDialog").showModal();
  (rec?$("#fDex"):$("#fName")).focus();
}
function shrinkIcon(file){
  return new Promise(res=>{
    const url=URL.createObjectURL(file);
    const img=new Image();
    img.onload=()=>{
      const k=Math.min(1,64/Math.max(img.width,img.height));
      const c=document.createElement("canvas");
      c.width=Math.max(1,Math.round(img.width*k));
      c.height=Math.max(1,Math.round(img.height*k));
      c.getContext("2d").drawImage(img,0,0,c.width,c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL("image/png"));
    };
    img.onerror=()=>{URL.revokeObjectURL(url);res(null)};
    img.src=url;
  });
}
async function saveEditor(){
  const name=$("#fName").value.trim();
  const dex=$("#fDex").value.trim().replace(/^#/,"");
  if(!name||!dex){toast("A name and a dex number are needed");return}
  if(!editing&&BYNAME.has(name)){toast(`${name} is already in the dex. Find it and use Edit.`);return}
  const vars=[...document.querySelectorAll("#fVars input:checked")].map(i=>i.value);
  if(!vars.length){toast("Pick at least one variant");return}
  const list=t=>t.split(",").map(x=>x.trim()).filter(Boolean);
  const maps=list($("#fMaps").value);
  const kind=$("#fKind").value;
  const evo=$("#fEvo").value.split("\n").map(l=>l.trim()).filter(Boolean).map(l=>{const [to,...rq]=l.split("|");return {to:to.trim(),requirement:rq.join("|").trim()}}).filter(e=>e.to);
  const rec={
    name,dex,
    types:[$("#fT1").value,$("#fT2").value].filter(Boolean),
    class:$("#fClass").value||"N/A",
    variants:vars,
    location:{kind,maps:kind==="map"?maps:[],text:""},
    obtain:list($("#fObtain").value),
    evolves_into:evo
  };
  if(iconPending!==undefined)rec.iconData=iconPending;
  else if(editing&&editing.iconData)rec.iconData=editing.iconData;
  custom[name]=rec;
  persistCustom();
  const sc=document.querySelector(".scroller"),keep=sc?sc.scrollTop:0;
  closeDetail();
  reindex();
  $("#editDialog").close();
  if(sc)sc.scrollTop=keep;
  const saved=BYNAME.get(name);
  if(saved&&ensureRow(saved.idx)){openDetail(saved.idx);toast(`Saved ${name}`)}
  else toast(`Saved ${name}. It no longer matches the current filter, so it left this list.`);
}
function deleteEditor(){
  if(!editing||!editing.custom)return;
  const name=editing.name;
  if(!confirm(editing.fromWiki?`Drop your changes to ${name} and go back to the wiki data?`:`Delete ${name} from your dex?`))return;
  undoCustom=JSON.stringify(custom);
  undoSnapshot=JSON.stringify(owned);
  delete custom[name];
  persistCustom();
  closeDetail();
  reindex();
  $("#editDialog").close();
  toast(`Removed ${name}`,true);
}
$("#fCancel").addEventListener("click",()=>$("#editDialog").close());
$("#fDelete").addEventListener("click",deleteEditor);
$("#editForm").addEventListener("submit",e=>{e.preventDefault();saveEditor()});
$("#fIcon").addEventListener("change",async e=>{
  const f=e.target.files[0];
  iconPending=f?await shrinkIcon(f):undefined;
});

const MANAGE_HINT="vortexdex.managehint";
function setManage(on){
  manage=on;
  document.body.classList.toggle("managing",on);
  const b=$("#btnManage");
  b.setAttribute("aria-pressed",String(on));
  b.textContent="Manage entries: "+(on?"On":"Off");
}
document.addEventListener("click",e=>{
  const t=e.target;
  const ball=t.closest(".ball");
  if(ball||t.closest("[data-row]")){
    if(!manage){toast("Turn on Manage entries to change registered entries.");return}
    if(ball){const rec=ALL[+ball.dataset.i];if(rec)toggle(rec,+ball.dataset.v);return}
    toggleRow(ALL[+t.closest("[data-row]").dataset.row]);return
  }
  if(t.closest("#btnManage")){
    if(manage){setManage(false);return}
    let skip=false;
    try{skip=localStorage.getItem(MANAGE_HINT)==="1"}catch(err){}
    if(skip){setManage(true);return}
    $("#manageSkip").checked=false;
    $("#manageDialog").showModal();
    return
  }
  if(t.closest("#manageDialog [data-act=cancel]")){$("#manageDialog").close();return}
  if(t.closest("#manageDialog [data-act=ok]")){
    if($("#manageSkip").checked){try{localStorage.setItem(MANAGE_HINT,"1")}catch(err){}}
    $("#manageDialog").close();
    setManage(true);
    return
  }
  if(t.closest("#btnMissing")){
    $("#missingText").value=lsGet(LS_MISSING)||"";
    $("#missingInfo").textContent="";
    $("#missingDialog").showModal();
    return
  }
  if(t.closest("#missingDialog [data-act=close]")){$("#missingDialog").close();return}
  if(t.closest("#missingDialog [data-act=apply]")){
    const txt=$("#missingText").value;
    if(!txt.trim()){$("#missingInfo").textContent="Paste a list first.";return}
    const r=applyMissing(txt);
    $("#missingInfo").innerHTML=r.count?`Marked <b>${r.count}</b> variants as missing across <b>${Object.keys(r.want).length}</b> Pokémon. Everything else is now registered.`+(r.bad.length?`<br>${r.bad.length} lines were not recognised: ${esc(r.bad.slice(0,8).join(", "))}${r.bad.length>8?"…":""}`:""):`Nothing in that list matched a Pokémon, so nothing changed.`+(r.bad.length?`<br>${esc(r.bad.slice(0,6).join(", "))}`:"");
    if(r.count)toast("Applied your missing list",true);
    return
  }
  if(t.closest(".dclose")){closeDetail();return}
  if(t.closest(".dedit")){if(selected>=0&&ALL[selected])openEditor(ALL[selected]);return}
  const nm=t.closest("[data-name]");
  if(nm){
    const idx=+nm.dataset.name;
    if(nm.closest("#detail"))openDetail(idx);else toggleDetail(idx);
    return;
  }
  const mg=t.closest("[data-mapgo]");
  if(mg){goToMap(mg.dataset.mapgo);return}
  const rg=t.closest("[data-region]");
  if(rg){setRegion(rg.dataset.region);return}
  const gp=t.closest("[data-group]");
  if(gp){setGroup(gp.dataset.group);return}
  const view=t.closest("[data-view]");
  if(view){setView(view.dataset.view);return}
  const mode=t.closest("[data-mode]");
  if(mode){prefs.mode=mode.dataset.mode;persistPrefs();applyMode();return}
});
document.addEventListener("error",e=>{if(e.target&&e.target.tagName==="IMG")e.target.style.visibility="hidden"},true);

$("#filter").addEventListener("input",()=>renderGrid());
$("#grid").addEventListener("click",e=>{if(e.target.closest("[data-gridmore]"))moreRows()});
for(const [id,k] of [["#rarFilter","rar"],["#encFilter","enc"],["#tmFilter","tm"]])$(id).addEventListener("change",e=>{prefs[k]=e.target.value;persistPrefs();closeDetail();renderGrid()});
$("#mapFilter").addEventListener("change",e=>{prefs.map=e.target.value;persistPrefs();closeDetail();renderGrid()});
$("#onlyMissing").addEventListener("change",e=>{prefs.onlyMissing=e.target.checked;persistPrefs();renderGrid()});
document.addEventListener("keydown",e=>{
  const typing=/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName);
  if(e.key==="/"&&!typing){e.preventDefault();prefs.mode="table";applyMode();$("#filter").focus();$("#filter").select()}
  else if(e.key==="Escape"&&!typing&&selected>=0)closeDetail();
});

$("#btnExport").addEventListener("click",exportData);
$("#btnSite").addEventListener("click",exportSite);
$("#btnImport").addEventListener("click",()=>$("#fileImport").click());
$("#fileImport").addEventListener("change",e=>{
  const f=e.target.files[0];
  e.target.value="";
  if(!f)return;
  const rd=new FileReader();
  rd.onload=()=>startImport(String(rd.result));
  rd.readAsText(f);
});
$("#importDialog").addEventListener("click",e=>{
  const act=e.target.dataset&&e.target.dataset.act;
  if(!act)return;
  $("#importDialog").close();
  if(act==="cancel")pendingImport=null;
  else applyImport(act);
});
$("#btnClear").addEventListener("click",()=>{
  if(!Object.keys(owned).length){toast("Nothing is registered yet");return}
  if(!confirm("Clear every registered Pokémon? You can undo right after."))return;
  undoSnapshot=JSON.stringify(owned);
  undoCustom=null;
  owned={};
  persist();
  renderGrid();
  renderResult();
  toast("Cleared your dex",true);
});
$("#toastUndo").addEventListener("click",undo);
$("#missingFile").addEventListener("change",e=>{
  const f=e.target.files[0];
  e.target.value="";
  if(!f)return;
  const rd=new FileReader();
  rd.onload=()=>{$("#missingText").value=String(rd.result)};
  rd.readAsText(f);
});
$("#fileData").addEventListener("change",e=>{
  const f=e.target.files[0];
  if(!f)return;
  const rd=new FileReader();
  rd.onload=()=>{
    try{loadState();init(JSON.parse(String(rd.result)))}
    catch(err){alert("Could not read that file: "+err.message)}
  };
  rd.readAsText(f);
});

window.ClanDexApp={setProfile};
if(window.VORTEX_DATA&&(window.VORTEX_DATA.pokemon||Object.keys(window.VORTEX_DATA).length)){
  loadState();
  init(window.VORTEX_DATA);
}else{
  $("#loader").hidden=false;
}
})();
