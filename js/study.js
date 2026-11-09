(function(){
const $=s=>document.querySelector(s);
let C=null,M=null;
const V={kind:null,q:"",hide:true,sort:"mon"};
const REG=[[151,"Kanto"],[251,"Johto"],[386,"Hoenn"],[493,"Sinnoh"],[649,"Unova"],[721,"Kalos"],[809,"Alola"],[905,"Galar"],[1025,"Paldea"],[99999,"Other"]];
const regionOf=n=>REG.find(r=>n<=r[0])[1];
const dnum=d=>parseInt(d,10)||99999;
const cmp=(a,b)=>String(a).localeCompare(String(b));
const tp=it=>{const o=Object.keys(C.TC);return [it.a,it.b].sort((x,y)=>o.indexOf(x)-o.indexOf(y))};
const letters=s=>C.norm(s).split("").sort().join("");

function core(){
  if(!C){
    C=VQ.core();
    M={fp:new Map(),bd:new Map(),mon:new Map(),lv:new Map(),it:new Map(),fpk:new Map(),bdk:new Map()};
    (C.P.footprint||[]).forEach(it=>{
      M.fpk.set(it.key,it);
      it.names.forEach(n=>{M.fp.set(C.norm(n),it);M.fp.set(C.norm(C.baseName(n)),it)});
    });
    (C.P.badge||[]).forEach(it=>{M.bdk.set(it.key,it);M.bd.set(C.norm(it.name),it);M.bd.set(C.norm(it.name+" badge"),it)});
    Object.values(C.DEX()).forEach(r=>C.nameAccept(r.name).forEach(a=>{if(!M.mon.has(a))M.mon.set(a,r)}));
    (C.P.evolevel||[]).forEach(it=>{if(!M.lv.has(it.level))M.lv.set(it.level,[]);M.lv.get(it.level).push(it)});
    (C.P.evoitem||[]).forEach(it=>{const k=C.norm(it.item);if(!M.it.has(k))M.it.set(k,[]);M.it.get(k).push(it)});
  }
  return C;
}
const E=s=>C.esc(s);

function pill(t){return `<span class="qpill" style="--tc:${C.TC[t]||"#777"}">${E(t.toUpperCase())}</span>`}
function fpImg(it){return `<div class="vs-circle"><img class="vs-fp" alt="" loading="lazy" src="${E(C.Q.footprintDir+it.file)}" onload="vfp(this)"></div>`}
function bdImg(it){return `<div class="vs-circle bd"><img alt="" loading="lazy" src="${E(C.Q.badgeDir+it.file)}"></div>`}
function sprImg(r,cls){const s=r&&C.icon(r);return s?`<img class="${cls||"vs-spr"}" alt="" loading="lazy" decoding="async" src="${E(s)}">`:`<span class="${cls||"vs-spr"}"></span>`}
function monByName(n){return C.DEX()[n]||M.mon.get(C.norm(n))}
function itemIcon(name){
  const f=C.ITEMFILE.get(C.norm(name));
  return f?`<img class="vs-ii" alt="" loading="lazy" src="${E(C.itemDir+f)}">`:"";
}
function fpNames(it){return it.names.slice(0,3).join(" · ")+(it.names.length>3?" +"+(it.names.length-3):"")}

function evoMini(it,tail){
  return `<span class="vs-evo">${sprImg(it.from,"vs-spr")}<i>→</i>${sprImg(it.to,"vs-spr")}</span><span class="vs-cap">${E(it.from.name)} → ${E(it.to.name)}${tail||""}</span>`;
}

function tile(kind,it){
  if(kind==="footprint")return `<figure class="vs-t" data-d="${E(it.key)}">${fpImg(it)}<figcaption><small>#${E(it.dex)}</small><b class="vs-a">${E(fpNames(it))}</b></figcaption></figure>`;
  if(kind==="badge")return `<figure class="vs-t" data-d="${E(it.key)}">${bdImg(it)}<figcaption><b class="vs-a">${E(it.name)}</b><small>${E(it.region)}</small></figcaption></figure>`;
  if(kind==="whos")return `<figure class="vs-t vs-s" data-d="${E(it.key)}">${sprImg(it.rec,"vs-big")}<figcaption><b class="vs-a">${E(it.rec.name)}</b></figcaption></figure>`;
  if(kind==="evolevel")return `<figure class="vs-t wide">${evoMini(it,`<b class="vs-a vs-lv">Level ${it.level}</b>`)}</figure>`;
  if(kind==="evoitem")return `<figure class="vs-t wide">${evoMini(it,`<b class="vs-a vs-lv">${itemIcon(it.item)}${E(it.item)}</b>`)}</figure>`;
  if(kind==="types")return `<div class="vs-row"><div class="vs-pills">${tp(it).map(pill).join("")}</div><div class="vs-list vs-a">${it.names.map(n=>`<span class="vs-chip">${sprImg(monByName(n),"vs-sm")}${E(n)}</span>`).join("")}</div></div>`;
  if(kind==="scramblemon")return `<span class="vs-chip vs-a2">${sprImg(monByName(it.name),"vs-sm")}<span class="vs-a">${E(it.name)}</span></span>`;
  return `<span class="vs-chip"><span class="vs-a">${E(it.name)}</span></span>`;
}
const GRIDCLS={footprint:"vs-grid",badge:"vs-grid",whos:"vs-grid big",evolevel:"vs-grid wideg",evoitem:"vs-grid wideg",types:"vs-rows",scramblemon:"vs-chips",scramblemove:"vs-chips"};

function matchText(kind,it,q,raw){
  if(!q)return true;
  const has=s=>C.norm(s).includes(q);
  if(kind==="footprint")return has(it.dex)||it.names.some(has);
  if(kind==="badge")return has(it.name)||has(it.region);
  if(kind==="whos")return has(it.rec.name);
  if(kind==="evolevel")return has(it.from.name)||has(it.to.name)||q===String(it.level);
  if(kind==="evoitem")return has(it.from.name)||has(it.to.name)||has(it.item);
  if(kind==="types")return has(it.a)||has(it.b)||it.names.some(has);
  if(kind==="scramblemon"||kind==="scramblemove")return has(it.name)||(q.length>=3&&letters(raw)===letters(it.name));
  return true;
}
function nameOf(kind,it){
  return kind==="whos"?it.rec.name:kind==="evolevel"||kind==="evoitem"?it.to.name:kind==="footprint"?it.names[0]:kind==="badge"?it.name:kind==="types"?it.key:it.name;
}
function groupKey(kind,it){
  if(kind==="footprint")return regionOf(dnum(it.dex));
  if(kind==="whos")return regionOf(dnum(it.rec.dex));
  if(kind==="badge")return it.region;
  if(kind==="evolevel")return "Level "+String(it.level).padStart(3,"0");
  if(kind==="evoitem")return it.item;
  if(kind==="types")return tp(it)[0];
  if(kind==="scramblemon"||kind==="scramblemove")return String(it.name.replace(/[^A-Za-z0-9]/g,"").length).padStart(2,"0")+" letters";
  return "";
}
function headLabel(kind,k,n){
  if(kind==="evolevel")return `Level ${+k.slice(6)}`;
  if(kind==="evoitem")return `${itemIcon(k)}${E(k)}`;
  if(kind==="scramblemon"||kind==="scramblemove")return `${+k.slice(0,2)} letters`;
  if(kind==="types")return pill(k)+" and…";
  return E(k);
}
function sortList(kind,list){
  const D=C.DEX();
  const dn=it=>kind==="whos"?dnum(it.rec.dex):kind==="footprint"?dnum(it.dex):0;
  if(kind==="footprint"||kind==="whos")return list.sort((a,b)=>dn(a)-dn(b)||cmp(nameOf(kind,a),nameOf(kind,b)));
  if(kind==="evolevel"){
    if(V.sort==="answer")return list.sort((a,b)=>a.level-b.level||cmp(a.to.name,b.to.name));
    return list.sort((a,b)=>dnum((D[a.to.name]||{}).dex)-dnum((D[b.to.name]||{}).dex)||cmp(a.to.name,b.to.name));
  }
  if(kind==="evoitem"){
    if(V.sort==="answer")return list.sort((a,b)=>cmp(a.item,b.item)||cmp(a.from.name,b.from.name));
    return list.sort((a,b)=>dnum((D[a.to.name]||{}).dex)-dnum((D[b.to.name]||{}).dex)||cmp(a.to.name,b.to.name));
  }
  if(kind==="types"){const o=Object.keys(C.TC);return list.sort((a,b)=>{const x=tp(a),y=tp(b);return o.indexOf(x[0])-o.indexOf(y[0])||o.indexOf(x[1])-o.indexOf(y[1])})}
  if(kind==="badge")return list;
  return list.sort((a,b)=>a.name.length-b.name.length||cmp(a.name,b.name));
}
function grouped(kind){
  if(kind==="evolevel"||kind==="evoitem")return V.sort==="answer";
  if(kind==="types")return false;
  return true;
}

function body(){
  const kind=V.kind,q=C.norm(V.q),raw=V.q;
  const list=sortList(kind,(C.P[kind]||[]).filter(it=>matchText(kind,it,q,raw)));
  const cnt=$("#vscount");
  if(cnt)cnt.textContent=list.length+" shown";
  if(!list.length)return `<div class="qmsg">Nothing matches "${E(V.q)}".</div>`;
  const cls=GRIDCLS[kind];
  if(!grouped(kind))return `<div class="${cls}">${list.map(it=>tile(kind,it)).join("")}</div>`;
  const groups=new Map();
  list.forEach(it=>{const k=groupKey(kind,it);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(it)});
  let keys=[...groups.keys()];
  if(kind==="types"){const o=Object.keys(C.TC);keys.sort((a,b)=>o.indexOf(a)-o.indexOf(b))}
  return keys.map(k=>`<section class="vs-grp"><h4>${headLabel(kind,k)}<small>${groups.get(k).length}</small></h4><div class="${cls}">${groups.get(k).map(it=>tile(kind,it)).join("")}</div></section>`).join("");
}
function paint(){
  const b=$("#vsbody");
  if(!b)return;
  b.innerHTML=body();
  b.classList.toggle("vs-hidden",V.hide);
}
function open(kind){
  core();
  V.kind=kind;V.q="";V.hide=true;V.sort="mon";
  const hasSort=kind==="evolevel"||kind==="evoitem";
  const tip={footprint:"Click a footprint to reveal its Pokémon, click again to hide it.",badge:"Click a badge to reveal its name, click again to hide it.",whos:"Silhouettes until you click one. Click again to hide it.",types:"Click a type pair to reveal its Pokémon, click again to hide them.",evolevel:"Click an evolution to reveal its level. Sorting by level shows the groups.",evoitem:"Click an evolution to reveal its item. Sorting by item shows the groups.",scramblemon:"Names are hidden until clicked. Type scrambled letters in any order to find a name.",scramblemove:"Names are hidden until clicked. Type scrambled letters in any order to find a name."}[kind]||"";
  $("#qbody").innerHTML=`<div class="vs">
  <div class="vs-head"><button class="btn ghost small" id="qhome" type="button">← Back</button><h3>${C.kBadge(kind)}<span>Study sheet</span></h3></div>
  <div class="vs-tools"><input type="search" id="vsq" placeholder="Search" aria-label="Search this sheet"><label class="vs-chk"><input type="checkbox" id="vsshow"> Show answers</label>${hasSort?`<label class="vs-chk">Sort <select id="vssort"><option value="mon">By Pokémon</option><option value="answer">${kind==="evolevel"?"By level":"By item"}</option></select></label>`:""}<span id="vscount"></span></div>
  <p class="qnote">${E(tip)}</p>
  <div id="vsbody"></div></div>`;
  paint();
  window.scrollTo(0,0);
}

function miniFor(kind,it,label,extra){
  let inner="",name="";
  if(kind==="footprint"){inner=fpImg(it);name=fpNames(it)}
  else if(kind==="badge"){inner=bdImg(it);name=it.name}
  else if(kind==="whos"){inner=sprImg(it.rec,"vs-big");name=it.rec.name}
  return `<figure class="vs-t sm${kind==="whos"?" vs-sprt":""}">${inner}<figcaption>${label?`<small>${E(label)}</small>`:""}<b>${E(name)}</b>${extra||""}</figcaption></figure>`;
}
function guessItem(kind,g){
  if(!g)return null;
  if(kind==="footprint")return M.fp.get(g)||null;
  if(kind==="badge")return M.bd.get(g)||null;
  if(kind==="whos"){const r=M.mon.get(g);return r?{key:r.name,rec:r}:null}
  return null;
}
function panel(q,given){
  core();
  const kind=q.kind,it=q.item,g=C.norm(given||"");
  if(!it)return "";
  let html="";
  if(kind==="footprint"||kind==="badge"||kind==="whos"){
    const y=guessItem(kind,g);
    if(!y||y.key===it.key)return "";
    html=`<div class="vs-tiles">${miniFor(kind,it,"Correct")}${miniFor(kind,y,"You said")}</div>`;
  }else if(kind==="types"){
    const r=monByName(given||"")||M.mon.get(g);
    if(!r||!r.types)return "";
    html=`<div class="vs-line">${sprImg(r,"vs-sm")}<b>${E(r.name)}</b> is ${r.types.map(pill).join(" ")}</div><div class="vs-line">This question needed ${pill(it.a)}${pill(it.b)}</div>`;
  }else if(kind==="evolevel"){
    const n=parseInt(String(given||"").replace(/\D+/g,""),10);
    const other=(M.lv.get(it.level)||[]).filter(x=>x.key!==it.key).slice(0,5);
    const said=n&&n!==it.level?(M.lv.get(n)||[]).slice(0,4):[];
    html=`${said.length?`<div class="vs-sub">At level ${n} (what you said)</div><div class="vs-tiles">${said.map(x=>`<figure class="vs-t sm wide">${evoMini(x)}</figure>`).join("")}</div>`:""}${other.length?`<div class="vs-sub">Also at level ${it.level}</div><div class="vs-tiles">${other.map(x=>`<figure class="vs-t sm wide">${evoMini(x)}</figure>`).join("")}</div>`:""}`;
  }else if(kind==="evoitem"){
    const gk=C.norm(given||"");
    const said=gk&&gk!==C.norm(it.item)?(M.it.get(gk)||[]).slice(0,4):[];
    const other=(M.it.get(C.norm(it.item))||[]).filter(x=>x.key!==it.key).slice(0,5);
    html=`${said.length?`<div class="vs-sub">What ${E(given.trim())} evolves (what you said)</div><div class="vs-tiles">${said.map(x=>`<figure class="vs-t sm wide">${evoMini(x)}</figure>`).join("")}</div>`:""}${other.length?`<div class="vs-sub">Also evolve with ${E(it.item)}</div><div class="vs-tiles">${other.map(x=>`<figure class="vs-t sm wide">${evoMini(x)}</figure>`).join("")}</div>`:""}`;
  }
  return html?`<div class="vs-mix"><h4>Compare</h4>${html}</div>`:"";
}

document.addEventListener("click",e=>{
  const b=$("#vsbody");
  if(!b||!b.contains(e.target)||!V.hide)return;
  const t=e.target.closest(V.kind==="types"?".vs-row":".vs-t,.vs-chip");
  if(t)t.classList.toggle("rv");
});
document.addEventListener("input",e=>{
  if(e.target.id==="vsq"){V.q=e.target.value;paint()}
});
document.addEventListener("change",e=>{
  if(e.target.id==="vsshow"){V.hide=!e.target.checked;paint()}
  else if(e.target.id==="vssort"){V.sort=e.target.value;paint()}
});
window.VS={open,tiles(kind,items){core();return `<div class="${GRIDCLS[kind]} vs-learn">${items.map(it=>tile(kind,it)).join("")}</div>`},mix:panel};
})();
