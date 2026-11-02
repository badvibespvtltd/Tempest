(function(){
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fold=s=>String(s).normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"");
const D=window.VORTEX_PRICES||null;
const st={q:"",sec:"all",sort:{}};
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
  if(!items.length)return "";
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
  const body=items.map((x,ix)=>`<tr><th scope="row"><span class="pr-name">${anyIcon?(icons[ix]?`<img class="pr-ico" loading="lazy" alt="" src="${esc(icons[ix])}">`:`<span class="pr-ico"></span>`):""}${esc(x.it.name)}</span></th>${b.rows.map(r=>cell(x.it.prices[r])).join("")}</tr>`).join("");
  const notes=(b.notes||[]).map(n=>`<p class="pr-note">${esc(n.replace(" | ",": "))}</p>`).join("")+(b.pokemon&&b.pokemon.length&&!q?`<div class="pr-strip"><span>Includes</span>${b.pokemon.map(n=>{const ic=iconFor("Pokémon",b.title,n);return ic?`<img class="pr-sico" alt="${esc(n)}" title="${esc(n)}" src="${esc(ic)}">`:`<span class="pr-stxt">${esc(n)}</span>`}).join("")}</div>`:"");
  return `<div class="pr-block${b.rows.length<=2?" narrow":""}"><h4>${q&&sec.name!==b.title?esc(sec.name)+" · ":""}${esc(b.title)}<small>${items.length} item${items.length>1?"s":""}</small></h4>${notes}<div class="pr-scroll"><table class="pr-table"><thead><tr><th>Item</th>${head}</tr></thead><tbody>${body}</tbody></table></div></div>`;
}
function render(){
  const box=$("#prBody");
  if(!D){box.innerHTML=`<div class="qmsg">No price data found. Put <code>pricelist.js</code> in the <code>data</code> folder (make it with <code>convert_pricelist.py</code>).</div>`;return}
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
  <div class="pr-tools"><input type="search" id="prSearch" placeholder="Search a Pokémon or item" aria-label="Search the pricelist" value="${esc(st.q)}"><span class="pr-count">${q?shown+" match"+(shown===1?"":"es"):""}</span></div>
  <div class="pr-chips">${chipsHTML}</div>
  <div class="pr-key"><span>Value:</span><i class="pr-v t0">under 1m</i><i class="pr-v t1">1m+</i><i class="pr-v t2">10m+</i><i class="pr-v t3">50m+</i><i class="pr-v t4">200m+</i><span class="pr-hint">Click a column heading to sort.</span></div>
  ${html}`;
  if(q){const i=$("#prSearch");i.focus();i.setSelectionRange(i.value.length,i.value.length)}
}
document.addEventListener("click",e=>{
  if($("#prices").hidden)return;
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
document.addEventListener("input",e=>{
  if(e.target.id==="prSearch"){st.q=e.target.value;render()}
});
window.VP={open(){render()},count(){return D?D.sections.reduce((a,s)=>a+s.blocks.reduce((b,x)=>b+x.items.length,0),0):0}};
})();
