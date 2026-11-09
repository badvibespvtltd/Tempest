(function(){
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fold=s=>String(s).normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"");
const BASE=window.VORTEX_PRICES||null;
const KEY="vortexdex.pricelist.v1";
let D=BASE,meta={exported:"",n:0},resolved=false,rendering=false;
const undo=[];
const st={q:"",sec:"all",sort:{},edit:false,msg:""};
const MULT={k:1e3,m:1e6,mil:1e6,b:1e9};
function admin(){return typeof window.isOwner==="function"&&window.isOwner()&&!!BASE}
function ensure(){
  if(resolved)return;
  resolved=true;
  D=BASE;
  if(!BASE||!admin())return;
  let o=null;
  try{o=JSON.parse(localStorage.getItem(KEY)||"null")}catch(e){}
  if(!o||!o.data||!Array.isArray(o.data.sections))return;
  if((o.n>0)||String(o.data.generated)>String(BASE.generated)){D=o.data;meta={exported:o.exported||"",n:o.n||0}}
  else{try{localStorage.removeItem(KEY)}catch(e){}}
}
function persist(){
  D.generated=new Date().toISOString();
  try{localStorage.setItem(KEY,JSON.stringify({data:D,exported:meta.exported,n:meta.n}))}catch(e){st.msg="Could not keep these edits in this browser. Export now so nothing is lost."}
}
function mutate(fn,msg){
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
    if(!u)u=parseFloat(n)<1000?"m":"";
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
  if(sec==="Items"||title==="Fossil"){
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
  const txt=(e.lo===e.hi?fmt(e.lo):fmt(e.lo)+" – "+fmt(e.hi))+plus;
  const tier=e.hi>=2e8?4:e.hi>=5e7?3:e.hi>=1e7?2:e.hi>=1e6?1:0;
  return `<td class="pr-v t${tier}" title="${esc(e.t)}">${txt}</td>`;
}
function blockHTML(sec,b,bi,secIdx){
  const key=secIdx+"-"+bi;
  const q=fold(st.q);
  let items=b.items.map((it,i)=>({it,i}));
  if(q)items=items.filter(x=>fold(x.it.name).includes(q));
  if(!items.length&&!(st.edit&&!q))return "";
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
    const nm=st.edit?`<button type="button" class="pr-ename" data-act="eitem" ${at} title="Rename or delete">${esc(x.it.name)}</button>`:esc(x.it.name);
    const cells=b.rows.map(r=>{
      let h=cell(x.it.prices[r]);
      if(st.edit)h=h.replace('class="','class="pr-ed ').replace("<td",`<td tabindex="0" ${at} data-c="${esc(r)}"`);
      return h;
    }).join("");
    return `<tr><th scope="row"><span class="pr-name">${anyIcon?(icons[ix]?`<img class="pr-ico" loading="lazy" alt="" src="${esc(icons[ix])}">`:`<span class="pr-ico"></span>`):""}${nm}</span></th>${cells}</tr>`;
  }).join("");
  const notes=(b.notes||[]).map(n=>`<p class="pr-note">${esc(n.replace(" | ",": "))}</p>`).join("")+(b.pokemon&&b.pokemon.length&&!q?`<div class="pr-strip"><span>Includes</span>${b.pokemon.map(n=>{const ic=iconFor("Pokémon",b.title,n);return ic?`<img class="pr-sico" alt="${esc(n)}" title="${esc(n)}" src="${esc(ic)}">`:`<span class="pr-stxt">${esc(n)}</span>`}).join("")}</div>`:"");
  const tools=st.edit?`<span class="pr-bt"><button type="button" class="btn ghost small" data-act="aitem" data-s="${secIdx}" data-b="${bi}">Add item</button><button type="button" class="btn ghost small" data-act="eblock" data-s="${secIdx}" data-b="${bi}">Edit block</button></span>`:"";
  return `<div class="pr-block${b.rows.length<=2?" narrow":""}"><h4>${q&&sec.name!==b.title?esc(sec.name)+" · ":""}${esc(b.title)}<small>${items.length} item${items.length===1?"":"s"}</small>${tools}</h4>${notes}<div class="pr-scroll"><table class="pr-table"><thead><tr><th>Item</th>${head}</tr></thead><tbody>${body}</tbody></table></div></div>`;
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
  const chips=[["all","All"]].concat(D.sections.map(s=>[s.name,s.name]));
  const chipsHTML=chips.map(([id,l])=>{
    const n=id==="all"?D.sections.reduce((a,s)=>a+s.blocks.reduce((b,x)=>b+x.items.length,0),0):D.sections.find(s=>s.name===id).blocks.reduce((b,x)=>b+x.items.length,0);
    return `<button type="button" class="pr-chip" aria-pressed="${st.sec===id&&!q}" data-sec="${esc(id)}">${esc(l)} <small>${n}</small></button>`;
  }).join("");
  let html="";
  let shown=0;
  D.sections.forEach((s,si)=>{
    if(!q&&st.sec!=="all"&&s.name!==st.sec)return;
    const bl=s.blocks.map((b,bi)=>blockHTML(s,b,bi,si)).join("");
    if(!bl)return;
    shown+=(bl.match(/<tr><th scope/g)||[]).length;
    html+=`<section class="pr-sec">${q?"":`<h3>${esc(s.name)}</h3>`}${!q&&s.note?`<p class="pr-note warn">${esc(s.note)}</p>`:""}${bl}</section>`;
  });
  if(!html)html=`<div class="qmsg">Nothing matches "${esc(st.q)}".</div>`;
  box.innerHTML=`
  ${toolbar()}
  <div class="pr-tools"><input type="search" id="prSearch" placeholder="Search a Pokémon or item" aria-label="Search the pricelist" value="${esc(st.q)}"><span class="pr-count">${q?shown+" match"+(shown===1?"":"es"):""}</span></div>
  <div class="pr-chips">${chipsHTML}</div>
  <div class="pr-key"><span>Value:</span><i class="pr-v t0">under 1m</i><i class="pr-v t1">1m+</i><i class="pr-v t2">10m+</i><i class="pr-v t3">50m+</i><i class="pr-v t4">200m+</i><span class="pr-hint">Click a column heading to sort.</span></div>
  ${html}`;
  const now=[...box.querySelectorAll(".pr-scroll")];
  if(now.length===sl.length)now.forEach((x,k)=>{x.scrollLeft=sl[k]});
  window.scrollTo(0,sy);
  rendering=false;
  if(q){const i=$("#prSearch");i.focus();i.setSelectionRange(i.value.length,i.value.length)}
}

function setPrice(s,b,i,c,raw){
  const text=raw.replace(/\s+/g," ").trim();
  const it=D.sections[s].blocks[b].items[i];
  const old=it.prices[c];
  if(!text&&!old)return;
  if(old&&old.t===text)return;
  mutate(()=>{
    const t=D.sections[s].blocks[b].items[i];
    if(!text){delete t.prices[c];return}
    const e={t:text};
    if(t.prices[c]&&t.prices[c].raw)e.raw=1;
    else{const p=parsePrice(text);if(p)Object.assign(e,p)}
    t.prices[c]=e;
  },text?`Saved ${it.name} · ${c}`:`Cleared ${it.name} · ${c}`);
}
function cellSel(k){return `#prBody td.pr-ed[data-s="${k.s}"][data-b="${k.b}"][data-i="${k.i}"][data-c="${CSS.escape(k.c)}"]`}
function editCell(td){
  const {s,b,i,c}=td.dataset;
  const cur=D.sections[+s].blocks[+b].items[+i].prices[c];
  const inp=document.createElement("input");
  inp.type="text";
  inp.className="pr-inp";
  inp.value=cur?cur.t:"";
  inp.setAttribute("aria-label","Price for "+D.sections[+s].blocks[+b].items[+i].name+", "+c);
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
  if(k==="toggle"){st.edit=!st.edit;st.msg="";render()}
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
window.VP={open(){render()},count(){ensure();return D?D.sections.reduce((a,s)=>a+s.blocks.reduce((b,x)=>b+x.items.length,0),0):0}};
})();
