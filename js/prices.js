(function(){
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fold=s=>String(s).normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"");
const BASE=window.VORTEX_PRICES||null;
const KEY="vortexdex.pricelist.v1";
let vc=null;
let D=BASE,meta={exported:"",n:0},resolved=false,rendering=false;
const undo=[];
const GROUPS=[["Pokémon",["All Pokémon"]],["Items",["All Items"]],["Events",["Obtainable Events","Unobtainable Events"]],["Fossils",["Fossils"]],["Quiz / Exclusive",["Quiz / Exclusive"]],["Valuable",["Valuable Pokémon"]],["Exchange & Avatars",["Exchange Rates","Avatars"]],["Defaults",["Default Prices"]]];
const st={q:"",sec:"Events",coll:{},def:null,sort:{},edit:false,msg:""};
const MULT={k:1e3,m:1e6,mil:1e6,b:1e9};
function admin(){return typeof window.isOwner==="function"&&window.isOwner()&&!!BASE}
function ensure(){
  if(resolved)return;
  resolved=true;
  vc=null;
  D=BASE;
  if(!BASE||!admin())return;
  let o=null;
  try{o=JSON.parse(localStorage.getItem(KEY)||"null")}catch(e){}
  if(!o||!o.data||!Array.isArray(o.data.sections))return;
  if((o.n>0)||String(o.data.generated)>String(BASE.generated)){
    D=o.data;meta={exported:o.exported||"",n:o.n||0};
    if(!D.shop&&BASE.shop)D.shop=JSON.parse(JSON.stringify(BASE.shop));
    if(!D.auto&&BASE.auto)D.auto=JSON.parse(JSON.stringify(BASE.auto));
    if(BASE.rares){D.rares=BASE.rares.slice();D.rp=JSON.parse(JSON.stringify(BASE.rp||{}))}
    const dp=BASE.sections.find(x=>x.name==="Default Prices");
    if(dp&&!D.sections.some(x=>x.name==="Default Prices"))D.sections.push(JSON.parse(JSON.stringify(dp)));
  }
  else{try{localStorage.removeItem(KEY)}catch(e){}}
}
function persist(){
  D.generated=new Date().toISOString();
  try{localStorage.setItem(KEY,JSON.stringify({data:D,exported:meta.exported,n:meta.n}))}catch(e){st.msg="Could not keep these edits in this browser. Export now so nothing is lost."}
}
function mutate(fn,msg){
  vc=null;
  const before=JSON.stringify(D),prev=D;
  if(D===BASE)D=JSON.parse(before);
  fn();
  if(JSON.stringify(D)===before){D=prev;return false}
  undo.push(before);
  if(undo.length>40)undo.shift();
  meta.n++;
  st.msg=msg||"";
  persist();
  return true;
}
function parsePrice(text){
  const t=text.toLowerCase().replace(/pds/g," ").replace(/pd/g," ").replace(/,/g,"").replace(/[+~]/g," ");
  const re=/(\d+(?:\.\d+)?)\s*(mil|k|m|b)?(?![a-z])/g,toks=[];
  let m;
  while((m=re.exec(t)))toks.push([m[1],m[2]||""]);
  if(!toks.length)return null;
  const suff=toks.map(x=>x[1]);
  const vals=toks.map(([n,sf],i)=>{
    let u=sf;
    if(!u){
      const nx=suff.slice(i+1).filter(Boolean),pv=suff.slice(0,i).filter(Boolean);
      u=nx.length?nx[0]:(pv.length?pv[pv.length-1]:"");
    }
    return parseFloat(n)*(MULT[u]||1);
  });
  return {lo:Math.trunc(Math.min(...vals)),hi:Math.trunc(Math.max(...vals))};
}
function download(text,type,name){
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([text],{type}));
  a.download=name;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);
}
const ALIAS={"Urshifu RS/SS":"Urshifu (Single Strike)","Urshifu RS/SS Gmax":"Urshifu (SS Gigantamax)","Melmetal (Gmax)":"Melmetal (Gigantamax)"};
let pmap=null,imap=null;
function maps(){
  pmap=new Map();imap=new Map();
  const P=(window.VORTEX_DATA&&window.VORTEX_DATA.pokemon)||{};
  Object.values(P).forEach(r=>{if(r.iconData||r.icon_file)pmap.set(fold(r.name),r)});
  (window.VORTEX_QUIZ_ITEMS||[]).forEach(x=>imap.set(fold(x.name),x.file));
}
function iconFor(sec,title,name){
  if(sec==="Avatars"||sec==="Exchange Rates")return "";
  if(!pmap)maps();
  const n=ALIAS[name]||name;
  if(sec==="Items"||sec==="All Items"||title==="Fossil"){
    let k=n.replace(/\s*\(.*?\)\s*$/,"").replace(/^\d+x\s+/i,"");
    if(title==="Fossil"&&!/fossil/i.test(k)&&k!=="Old Amber")k+=" Fossil";
    const f=imap.get(fold(k))||imap.get(fold(k).replace(/s$/,""))||imap.get(fold(k)+"s");
    return f?"data/quiz/items/"+encodeURIComponent(f):"";
  }
  const r=pmap.get(fold(n))||pmap.get(fold(n.replace(/\s*\(.*\)\s*$/,"")));
  if(!r)return "";
  return r.iconData||"data/icons/"+encodeURIComponent(r.icon_file);
}
function fmt(v){
  for(const [d,s] of [[1e9,"b"],[1e6,"m"],[1e3,"k"]]){
    if(v>=d){const x=Math.round(v/d*100)/100;return x+s}
  }
  return String(v);
}
function cell(e){
  if(!e)return `<td class="pr-na">–</td>`;
  if(e.raw)return `<td class="pr-raw">${esc(e.t)}</td>`;
  if(e.lo==null)return `<td class="pr-tbc" title="${esc(e.t)}">${esc(e.t.replace(/pds/ig,"").trim()||e.t)}</td>`;
  const plus=/\+/.test(e.t)?"+":"";
  const txt=(e.est?"~":"")+(e.lo===e.hi?fmt(e.lo):fmt(e.lo)+" – "+fmt(e.hi))+plus;
  const tier=e.hi>=2e8?4:e.hi>=5e7?3:e.hi>=1e7?2:e.hi>=1e6?1:0;
  return `<td class="pr-v t${tier}${e.est?" pr-est":""}" title="${esc(e.est?"Estimate: "+e.t:e.t)}">${txt}</td>`;
}
const VCLS=["Regular","Rares","Starter","Premium","Legendary","Mega","Gmax","Fossil","Event","Special","Paradox","Ultra Beast","Side"];
const VVAR=["Normal","Dark","Metallic","Mystic","Shadow","Shiny"];
const NOPK=["Exchange Rates","Items","Avatars","Default Prices"];
const ik=n=>fold(String(n).replace(/\s*\(.*?\)\s*$/,"").replace(/^\d+x\s+/i,"")).replace(/s$/,"");
function defs(){
  const s=D.sections.find(x=>x.name==="Default Prices");
  if(!s)return null;
  const o={mon:{},item:{}};
  if(s.blocks[0])s.blocks[0].items.forEach(i=>{o.mon[i.name]=i.prices});
  if(s.blocks[1])s.blocks[1].items.forEach(i=>{o.item[i.name]=i.prices});
  return o;
}
function priced(e){return !!e&&(e.lo!=null||!!e.raw)}
function virtMon(df){
  const idx=new Map();
  D.sections.forEach((sec,si)=>{
    if(NOPK.includes(sec.name))return;
    sec.blocks.forEach((b,bi)=>{
      if(b.title==="Fossil")return;
      b.items.forEach((it,ii)=>{
        const k=fold(ALIAS[it.name]||it.name);
        if(!idx.has(k))idx.set(k,[]);
        idx.get(k).push([si,bi,ii]);
      });
    });
  });
  const ov=D.overrides||{};
  const P=(window.VORTEX_DATA&&window.VORTEX_DATA.pokemon)||{};
  const by={};
  const RR=new Set(D.rares||[]);
  Object.values(P).forEach(r=>{let c=!r.class||r.class==="N/A"?"Regular":r.class;if(c==="Regular"&&RR.has(r.name))c="Rares";(by[c]=by[c]||[]).push(r)});
  const blocks=VCLS.concat(Object.keys(by).filter(c=>!VCLS.includes(c))).filter(c=>by[c]).map(c=>{
    const rows=by[c].slice().sort((a,b)=>String(a.dex).localeCompare(String(b.dex))||a.name.localeCompare(b.name));
    const cls=c==="Rares"?"Regular":c;
    return {title:c,rows:VVAR,items:rows.map(r=>{
      const locs=idx.get(fold(r.name))||[];
      const key="mon:"+r.name,o=ov[key]||{};
      const prices={},vloc={};
      VVAR.forEach(v=>{
        const vl=r.variants&&r.variants.length?r.variants:(cls==="Side"?["Normal"]:null);
        if(v!=="Normal"&&vl&&!vl.includes(v))return;
        let e=null,tbc=null;
        for(const l of locs){
          const x=D.sections[l[0]].blocks[l[1]].items[l[2]].prices[v];
          if(priced(x)){e=x;vloc[v]=l;break}
          if(x&&!tbc)tbc=x;
        }
        if(!e&&o[v])e=o[v];
        if(!e&&tbc)e=tbc;
        if(!e&&cls==="Side")e={t:"TBC"};
        if(!e&&c==="Rares"&&D.rp&&D.rp[v]){const [lo,hi]=D.rp[v];e={t:fmt(lo)+"-"+fmt(hi)+" pds",lo,hi,est:1}}
        if(!e&&cls==="Regular"&&D.auto&&D.auto[r.name]!=null){const a=D.auto[r.name];e={t:fmt(a)+" pds",lo:a,hi:a,est:1}}
        if(!e&&cls==="Starter"&&v!=="Normal"&&(r.types||[]).some(t=>String(t).toLowerCase()==="fire")){const FS={Dark:[300000,500000],Metallic:[300000,500000],Mystic:[300000,500000],Shadow:[1000000,1500000],Shiny:[2000000,3000000]}[v];const k=n=>n>=1000000?(n/1000000)+"m":(n/1000)+"k";e={t:k(FS[0])+"-"+k(FS[1])+" pds",lo:FS[0],hi:FS[1],est:1}}
        if(!e&&df.mon[cls]&&df.mon[cls][v])e=df.mon[cls][v];
        if(e)prices[v]=e;
      });
      return {name:r.name,prices,vkey:key,vloc,hasCur:locs.length>0};
    })};
  });
  return {name:"All Pokémon",virtual:1,note:"Every Pokémon in the game. A leading ~ marks an estimate from the Default Prices; anything else comes from the sheet.",blocks};
}
function shopKey(n){
  const sh=D.shop||{};
  const k=fold(n);
  return Object.keys(sh).find(x=>fold(x)===k)||n;
}
function virtItem(df){
  const idx=new Map();
  D.sections.forEach((sec,si)=>{
    sec.blocks.forEach((b,bi)=>{
      const fos=sec.name==="Fossils"&&b.title==="Fossil";
      if(sec.name!=="Items"&&!fos)return;
      b.items.forEach((it,ii)=>{
        let k=ik(it.name);
        if(fos&&!/fossil/i.test(it.name)&&it.name!=="Old Amber")k=ik(it.name+" Fossil");
        if(!idx.has(k))idx.set(k,[si,bi,ii]);
      });
    });
  });
  const ov=D.overrides||{},shop=D.shop||{};
  const sf=new Map(Object.keys(shop).map(n=>[fold(n),shop[n]]));
  const by={};
  (window.VORTEX_QUIZ_ITEMS||[]).forEach(x=>{(by[x.category]=by[x.category]||[]).push(x.name)});
  const mk=(v,est)=>{const o={t:fmt(v)+" pds",lo:v,hi:v};if(est)o.est=1;return o};
  const blocks=Object.keys(by).map(cat=>({title:cat,rows:["Value","PokéMart"],items:by[cat].map(n=>{
    const key="item:"+n,l=idx.get(ik(n));
    const sp=sf.get(fold(n));
    const prices={},vloc={};
    let e=null;
    if(l){
      const b=D.sections[l[0]].blocks[l[1]],x=b.items[l[2]].prices[b.rows[0]];
      if(priced(x)){e=x;vloc.Value=l}
    }
    if(!e&&ov[key]&&ov[key].Value)e=ov[key].Value;
    if(!e&&sp)e=mk(sp,1);
    if(!e&&df.item[cat]&&df.item[cat].Value)e=df.item[cat].Value;
    if(e)prices.Value=e;
    if(sp)prices["PokéMart"]=mk(sp);
    else if(cat!=="Battle Items")prices["PokéMart"]={t:"Cannot be bought",raw:1};
    return {name:n,prices,vkey:key,vloc,hasCur:!!l};
  })}));
  return {name:"All Items",virtual:1,note:"Every item in the quiz. Value is the sheet price when there is one, otherwise the PokéMart price, otherwise the Default Prices estimate (marked ~).",blocks};
}
function sections(){
  if(!D)return [];
  if(vc&&vc.d===D)return vc.s;
  const df=defs();
  const s=D.sections.slice();
  if(df){s.push(virtMon(df));s.push(virtItem(df))}
  vc={d:D,s};
  return s;
}
function totalCount(){
  return sections().reduce((a,s)=>a+(s.name==="Default Prices"?0:s.virtual?0:s.blocks.reduce((b,x)=>b+x.items.length,0)),0)+sections().filter(s=>s.virtual).reduce((a,s)=>a+s.blocks.reduce((b,x)=>b+x.items.filter(i=>!i.hasCur).length,0),0);
}
function blockHTML(sec,b,bi,secIdx){
  const key=secIdx+"-"+bi;
  const q=fold(st.q);
  let items=b.items.map((it,i)=>({it,i}));
  if(q)items=items.filter(x=>fold(x.it.name).includes(q)&&!(sec.name==="All Pokémon"&&x.it.hasCur));
  if(!items.length&&!(st.edit&&!q))return "";
  const coll=!q&&(key in st.coll?st.coll[key]:(st.def!=null?st.def:!!sec.virtual));
  const so=st.sort[key];
  if(so){
    items.sort((a,b2)=>{
      const va=a.it.prices[so.col],vb=b2.it.prices[so.col];
      const ka=va&&va.lo!=null?va.lo:(so.dir>0?Infinity:-1),kb=vb&&vb.lo!=null?vb.lo:(so.dir>0?Infinity:-1);
      return (ka-kb)*so.dir||a.i-b2.i;
    });
  }
  const head=b.rows.map(r=>{
    const on=so&&so.col===r;
    return `<th><button type="button" class="pr-sort${on?" on":""}" data-sort="${esc(key)}" data-col="${esc(r)}">${esc(r)}${on?(so.dir>0?" ▲":" ▼"):""}</button></th>`;
  }).join("");
  const icons=items.map(x=>iconFor(sec.name,b.title,x.it.name));
  const anyIcon=icons.some(Boolean);
  const body=items.map((x,ix)=>{
    const at=`data-s="${secIdx}" data-b="${bi}" data-i="${x.i}"`;
    const nm=st.edit&&!sec.virtual?`<button type="button" class="pr-ename" data-act="eitem" ${at} title="Rename or delete">${esc(x.it.name)}</button>`:esc(x.it.name);
    const cells=b.rows.map(r=>{
      let h=cell(x.it.prices[r]);
      if(st.edit&&!(b.noedit&&b.noedit.includes(r)))h=h.replace('class="','class="pr-ed ').replace("<td",`<td tabindex="0" ${at} data-c="${esc(r)}"`);
      return h;
    }).join("");
    return `<tr><th scope="row"><span class="pr-name">${anyIcon?(icons[ix]?`<img class="pr-ico" loading="lazy" alt="" src="${esc(icons[ix])}">`:`<span class="pr-ico"></span>`):""}${nm}</span></th>${cells}</tr>`;
  }).join("");
  const notes=(b.notes||[]).map(n=>`<p class="pr-note">${esc(n.replace(" | ",": "))}</p>`).join("")+(b.pokemon&&b.pokemon.length&&!q?`<div class="pr-strip"><span>Includes</span>${b.pokemon.map(n=>{const ic=iconFor("Pokémon",b.title,n);return ic?`<img class="pr-sico" alt="${esc(n)}" title="${esc(n)}" src="${esc(ic)}">`:`<span class="pr-stxt">${esc(n)}</span>`}).join("")}</div>`:"");
  const tools=st.edit&&!sec.virtual?`<span class="pr-bt"><button type="button" class="btn ghost small" data-act="aitem" data-s="${secIdx}" data-b="${bi}">Add item</button><button type="button" class="btn ghost small" data-act="eblock" data-s="${secIdx}" data-b="${bi}">Edit block</button></span>`:"";
  return `<div class="pr-block${b.rows.length<=2?" narrow":""}"><h4><button type="button" class="pr-fold" data-act="fold" data-s="${secIdx}" data-b="${bi}" aria-expanded="${!coll}"><span class="pr-caret">${coll?"▸":"▾"}</span>${q&&sec.name!==b.title?esc(sec.name)+" · ":""}${esc(b.title)}<small>${items.length} item${items.length===1?"":"s"}</small></button>${tools}</h4>${coll?"":notes+`<div class="pr-scroll"><table class="pr-table"><thead><tr><th>Item</th>${head}</tr></thead><tbody>${body}</tbody></table></div>`}</div>`;
}
function toolbar(){
  if(!admin())return "";
  const pend=meta.n>0?`${meta.n} change${meta.n>1?"s":""} not exported yet`:(D!==BASE?"Showing your edited copy (already exported)":"");
  const hint=st.edit?"Click a price to edit it. Enter saves, Tab moves on, Esc cancels, empty clears.":"";
  const status=[st.msg,hint,pend].filter(Boolean).join(" · ");
  return `<div class="pr-admin"><button type="button" class="btn small" data-act="toggle" aria-pressed="${st.edit}">Edit prices: ${st.edit?"On":"Off"}</button><button type="button" class="btn ghost small" data-act="undo"${undo.length?"":" disabled"}>Undo</button><button type="button" class="btn small" data-act="export"${D!==BASE?"":" disabled"}>Export pricelist.js</button><button type="button" class="btn ghost small" data-act="reset"${D!==BASE?"":" disabled"}>Reset to published</button><span class="pr-state" role="status">${esc(status)}</span></div>`;
}
function render(){
  ensure();
  rendering=true;
  const box=$("#prBody");
  const sy=window.scrollY,sl=[...box.querySelectorAll(".pr-scroll")].map(x=>x.scrollLeft);
  if(!admin())st.edit=false;
  if(!D){box.innerHTML=`<div class="qmsg">No price data found. Put <code>pricelist.js</code> in the <code>data</code> folder (make it with <code>convert_pricelist.py</code>).</div>`;rendering=false;return}
  const q=fold(st.q);
  const S=sections();
  const names=S.map(s=>s.name);
  const used=new Set();
  const chips=GROUPS.map(([l,m])=>[l,m.filter(x=>names.includes(x))]).filter(g=>g[1].length);
  chips.forEach(g=>g[1].forEach(x=>used.add(x)));
  names.filter(x=>!used.has(x)&&x!=="Items").forEach(x=>chips.push([x,[x]]));
  if(!chips.some(g=>g[0]===st.sec))st.sec=chips[0][0];
  const cur=chips.find(g=>g[0]===st.sec)[1];
  const chipsHTML=chips.map(([l,m])=>{
    const n=S.filter(s=>m.includes(s.name)).reduce((a,s)=>a+s.blocks.reduce((b,x)=>b+x.items.length,0),0);
    return `<button type="button" class="pr-chip" aria-pressed="${st.sec===l&&!q}" data-sec="${esc(l)}">${esc(l)} <small>${n}</small></button>`;
  }).join("");
  let html="";
  let shown=0;
  S.forEach((s,si)=>{
    if(!q&&!cur.includes(s.name))return;
    if(q&&(s.name==="Items"||s.name==="Default Prices"))return;
    const bl=s.blocks.map((b,bi)=>blockHTML(s,b,bi,si)).join("");
    if(!bl)return;
    shown+=(bl.match(/<tr><th scope/g)||[]).length;
    html+=`<section class="pr-sec">${q?"":`<h3>${esc(s.name)}</h3>`}${!q&&s.note?`<p class="pr-note warn">${esc(s.note)}</p>`:""}${bl}</section>`;
  });
  if(!html)html=`<div class="qmsg">Nothing matches "${esc(st.q)}".</div>`;
  box.innerHTML=`
  ${toolbar()}
  <div class="pr-tools"><input type="search" id="prSearch" placeholder="Search a Pokémon or item" aria-label="Search the pricelist" value="${esc(st.q)}"><span class="pr-count">${q?shown+" match"+(shown===1?"":"es"):""}</span><span class="pr-fa"><button type="button" class="btn ghost small" data-act="foldall" data-v="0">Expand all</button><button type="button" class="btn ghost small" data-act="foldall" data-v="1">Collapse all</button></span></div>
  <div class="pr-chips">${chipsHTML}</div>
  <div class="pr-key"><span>Value:</span><i class="pr-v t0">under 1m</i><i class="pr-v t1">1m+</i><i class="pr-v t2">10m+</i><i class="pr-v t3">50m+</i><i class="pr-v t4">200m+</i><i class="pr-v t1 pr-est">~ estimate</i><span class="pr-hint">Click a column heading to sort.</span></div>
  ${html}`;
  const now=[...box.querySelectorAll(".pr-scroll")];
  if(now.length===sl.length)now.forEach((x,k)=>{x.scrollLeft=sl[k]});
  window.scrollTo(0,sy);
  rendering=false;
  if(q){const i=$("#prSearch");i.focus();i.setSelectionRange(i.value.length,i.value.length)}
}

function setPrice(s,b,i,c,raw){
  const text=raw.replace(/\s+/g," ").trim();
  if(sections()[s].virtual){setVirtual(s,b,i,c,raw);return}
  const it=D.sections[s].blocks[b].items[i];
  const old=it.prices[c];
  if(!text&&!old)return;
  if(old&&old.t===text)return;
  mutate(()=>{
    const t=D.sections[s].blocks[b].items[i];
    if(!text){delete t.prices[c];return}
    t.prices[c]=entryFor(text,t.prices[c]);
  },text?`Saved ${it.name} · ${c}`:`Cleared ${it.name} · ${c}`);
}
function entryFor(text,old){
  const e={t:text};
  if(old&&old.raw)e.raw=1;
  else{const p=parsePrice(text);if(p)Object.assign(e,p)}
  if(old&&old.est)e.est=1;
  return e;
}
function setVirtual(s,b,i,c,raw){
  const text=raw.replace(/\s+/g," ").trim();
  const it=sections()[s].blocks[b].items[i];
  if(c==="PokéMart"){
    const nm=it.name,k=shopKey(nm),p=text?parsePrice(text):null;
    const cur=D.shop&&D.shop[k];
    if(p){if(cur===p.hi)return}
    else if(cur==null)return;
    mutate(()=>{
      D.shop=D.shop||{};
      if(p)D.shop[k]=p.hi;else delete D.shop[k];
    },p?`Saved ${nm} · PokéMart`:`${nm} marked as not buyable`);
    return;
  }
  const old=it.prices[c];
  const loc=it.vloc&&it.vloc[c];
  if(loc){
    if(old&&old.t===text)return;
    mutate(()=>{
      const t=D.sections[loc[0]].blocks[loc[1]].items[loc[2]];
      if(!text){delete t.prices[c];return}
      t.prices[c]=entryFor(text,t.prices[c]);
    },text?`Saved ${it.name} · ${c}`:`Cleared ${it.name} · ${c}`);
    return;
  }
  const had=D.overrides&&D.overrides[it.vkey]&&D.overrides[it.vkey][c];
  if(!text){
    if(!had)return;
    mutate(()=>{
      delete D.overrides[it.vkey][c];
      if(!Object.keys(D.overrides[it.vkey]).length)delete D.overrides[it.vkey];
    },`Cleared ${it.name} · ${c}`);
    return;
  }
  if(old&&!old.est&&old.t===text)return;
  mutate(()=>{
    D.overrides=D.overrides||{};
    D.overrides[it.vkey]=D.overrides[it.vkey]||{};
    D.overrides[it.vkey][c]=entryFor(text,null);
  },`Saved ${it.name} · ${c}`);
}
function cellSel(k){return `#prBody td.pr-ed[data-s="${k.s}"][data-b="${k.b}"][data-i="${k.i}"][data-c="${CSS.escape(k.c)}"]`}
function editCell(td){
  const {s,b,i,c}=td.dataset;
  const cur=sections()[+s].blocks[+b].items[+i].prices[c];
  const inp=document.createElement("input");
  inp.type="text";
  inp.className="pr-inp";
  inp.value=cur?cur.t:"";
  inp.setAttribute("aria-label","Price for "+sections()[+s].blocks[+b].items[+i].name+", "+c);
  td.textContent="";
  td.classList.add("editing");
  td.appendChild(inp);
  inp.focus();
  inp.select();
  let done=false;
  const finish=ok=>{
    if(done||rendering)return;
    done=true;
    if(ok)setPrice(+s,+b,+i,c,inp.value);
    render();
  };
  inp.addEventListener("keydown",ev=>{
    if(ev.key==="Enter"){ev.preventDefault();finish(true)}
    else if(ev.key==="Escape"){ev.preventDefault();finish(false)}
    else if(ev.key==="Tab"){
      ev.preventDefault();
      const all=[...document.querySelectorAll("#prBody td.pr-ed")];
      const nx=all[all.indexOf(td)+(ev.shiftKey?-1:1)];
      const k=nx?Object.assign({},nx.dataset):null;
      finish(true);
      if(k){const el=document.querySelector(cellSel(k));if(el){el.scrollIntoView({block:"nearest",inline:"nearest"});editCell(el)}}
    }
  });
  inp.addEventListener("blur",()=>finish(true));
}
function dlg(){
  let d=$("#prDialog");
  if(!d){d=document.createElement("dialog");d.id="prDialog";document.body.appendChild(d)}
  return d;
}
function openItem(s,b,i){
  const blk=D.sections[s].blocks[b];
  const it=i==null?null:blk.items[i];
  const d=dlg();
  d.innerHTML=`<form autocomplete="off"><h3>${it?"Edit item":"Add item to "+esc(blk.title)}</h3><div class="fgrid"><label class="wide">Name<input type="text" id="prName" required value="${esc(it?it.name:"")}"></label></div><p class="pr-derr" id="prErr" role="alert"></p><div class="row">${it?'<button class="btn danger" type="button" data-d="del">Delete</button>':""}<span class="sp"></span><button class="btn ghost" type="button" data-d="cancel">Cancel</button><button class="btn" type="submit">Save</button></div></form>`;
  d.querySelector("[data-d=cancel]").onclick=()=>d.close();
  const del=d.querySelector("[data-d=del]");
  if(del)del.onclick=()=>{
    d.close();
    mutate(()=>{D.sections[s].blocks[b].items.splice(i,1)},"Deleted "+it.name);
    render();
  };
  d.querySelector("form").onsubmit=ev=>{
    ev.preventDefault();
    const name=d.querySelector("#prName").value.replace(/\s+/g," ").trim();
    if(!name)return;
    if(blk.items.some((x,k)=>k!==i&&x.name.toLowerCase()===name.toLowerCase())){d.querySelector("#prErr").textContent="That name is already in this block.";return}
    d.close();
    if(it)mutate(()=>{D.sections[s].blocks[b].items[i].name=name},"Renamed to "+name);
    else mutate(()=>{D.sections[s].blocks[b].items.push({name,prices:{}})},"Added "+name+". Click its cells to set prices.");
    render();
  };
  d.showModal();
  d.querySelector("#prName").focus();
}
function openBlock(s,b){
  const blk=D.sections[s].blocks[b];
  const d=dlg();
  d.innerHTML=`<form autocomplete="off"><h3>Edit block</h3><div class="fgrid"><label class="wide">Title<input type="text" id="prTitle" required value="${esc(blk.title)}"></label><label class="wide">Notes (one per line)<textarea id="prNotes">${esc((blk.notes||[]).join("\n"))}</textarea></label><label class="wide">Includes: Pokémon shown under the notes (comma separated)<textarea id="prInc">${esc((blk.pokemon||[]).join(", "))}</textarea></label></div><div class="row"><span class="sp"></span><button class="btn ghost" type="button" data-d="cancel">Cancel</button><button class="btn" type="submit">Save</button></div></form>`;
  d.querySelector("[data-d=cancel]").onclick=()=>d.close();
  d.querySelector("form").onsubmit=ev=>{
    ev.preventDefault();
    const title=d.querySelector("#prTitle").value.replace(/\s+/g," ").trim();
    if(!title)return;
    const notes=d.querySelector("#prNotes").value.split("\n").map(x=>x.trim()).filter(Boolean);
    const inc=d.querySelector("#prInc").value.split(",").map(x=>x.trim()).filter(Boolean);
    d.close();
    mutate(()=>{
      const t=D.sections[s].blocks[b];
      t.title=title;
      if(notes.length)t.notes=notes;else delete t.notes;
      if(inc.length)t.pokemon=inc;else delete t.pokemon;
    },"Saved block "+title);
    render();
  };
  d.showModal();
  d.querySelector("#prTitle").focus();
}
function act(a){
  const k=a.dataset.act,s=+a.dataset.s,b=+a.dataset.b,i=a.dataset.i==null?null:+a.dataset.i;
  if(k==="fold"){
    const key=s+"-"+b,sec=sections()[s];
    const cur=key in st.coll?st.coll[key]:(st.def!=null?st.def:!!sec.virtual);
    st.coll[key]=!cur;
    render();
  }
  else if(k==="foldall"){st.coll={};st.def=a.dataset.v==="1";render()}
  else if(k==="toggle"){st.edit=!st.edit;st.msg="";render()}
  else if(k==="undo"){
    if(!undo.length)return;
    D=JSON.parse(undo.pop());
    meta.n=Math.max(0,meta.n-1);
    st.msg="Undone";
    persist();
    render();
  }
  else if(k==="export"){
    if(D===BASE)return;
    D.generated=new Date().toISOString();
    meta.exported=D.generated;
    meta.n=0;
    try{localStorage.setItem(KEY,JSON.stringify({data:D,exported:meta.exported,n:0}))}catch(e){}
    download("window.VORTEX_PRICES = "+JSON.stringify(D)+";\n","text/javascript","pricelist.js");
    st.msg="Saved pricelist.js. Put it in the data folder and publish";
    render();
  }
  else if(k==="reset"){
    if(D===BASE)return;
    if(!confirm("Discard all your edits and go back to the published pricelist?"))return;
    try{localStorage.removeItem(KEY)}catch(e){}
    D=BASE;meta={exported:"",n:0};undo.length=0;
    st.msg="Back to the published pricelist";
    render();
  }
  else if(k==="eitem")openItem(s,b,i);
  else if(k==="aitem")openItem(s,b,null);
  else if(k==="eblock")openBlock(s,b);
}
document.addEventListener("click",e=>{
  if($("#prices").hidden)return;
  const ac=e.target.closest("[data-act]");
  if(ac&&$("#prBody").contains(ac)){act(ac);return}
  if(st.edit){
    const td=e.target.closest("td.pr-ed");
    if(td&&!td.classList.contains("editing")&&$("#prBody").contains(td)){editCell(td);return}
  }
  const c=e.target.closest("[data-sec]");
  if(c){st.sec=c.dataset.sec;st.q="";render();return}
  const s=e.target.closest("[data-sort]");
  if(s){
    const k=s.dataset.sort,col=s.dataset.col,cur=st.sort[k];
    if(!cur||cur.col!==col)st.sort[k]={col,dir:-1};
    else if(cur.dir<0)st.sort[k]={col,dir:1};
    else delete st.sort[k];
    render();
  }
});
document.addEventListener("keydown",e=>{
  if(e.key==="Enter"&&st.edit&&e.target.matches&&e.target.matches("td.pr-ed:not(.editing)")){e.preventDefault();editCell(e.target)}
});
document.addEventListener("input",e=>{
  if(e.target.id==="prSearch"){st.q=e.target.value;render()}
});
window.VP={open(){render()},count(){ensure();return D?totalCount():0}};
})();
