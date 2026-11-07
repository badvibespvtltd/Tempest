(function(){
const LS="vortexdex.quiz.v1";
const Q=Object.assign({moves:[],badges:[],badgeDir:"data/quiz/badges/",footprintDir:"data/quiz/footprints/"},window.VORTEX_QUIZ||{});
if(window.VORTEX_QUIZ_MOVES&&window.VORTEX_QUIZ_MOVES.length)Q.moves=window.VORTEX_QUIZ_MOVES;
if(window.VORTEX_QUIZ_BADGES&&window.VORTEX_QUIZ_BADGES.length)Q.badges=window.VORTEX_QUIZ_BADGES;
const badgeFile=b=>b.file||b.name.toLowerCase()+".png";
const GENERIC=new Set(["Rare Candy","Heart","Male","Female","Day","Night","Dusk","TM","Vortex Ball"]);
const FP=window.VORTEX_QUIZ_FOOTPRINTS||null;
const IT=window.VORTEX_QUIZ_ITEMS||null;
const itemDir="data/quiz/items/";
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm=s=>String(s==null?"":s).normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"");
const rnd=n=>Math.floor(Math.random()*n);
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
const TC={normal:"#A8A77A",fire:"#EE8130",water:"#4A90E2",electric:"#F7D02C",grass:"#7AC74C",ice:"#96D9D6",fighting:"#C22E28",poison:"#A33EA1",ground:"#E2BF65",flying:"#A98FF3",psychic:"#F95587",bug:"#A6B91A",rock:"#B6A136",ghost:"#735797",dragon:"#6F35FC",dark:"#705746",steel:"#B7B7CE",fairy:"#D685AD"};
const KINDS={
  types:"Name a Pokémon by types",
  scramblemove:"Unscramble attack",
  scramblemon:"Unscramble Pokémon",
  evolevel:"Evolution level",
  evoitem:"Evolution item",
  whos:"Who's that Pokémon",
  badge:"Gym badge",
  footprint:"Footprint"
};
const ORDER=Object.keys(KINDS);
const KC={
  types:["#9b59d0","#4a1f7a"],
  scramblemove:["#f0922b","#8f400a"],
  scramblemon:["#e8528a","#85194a"],
  evolevel:["#34b36a","#115c33"],
  evoitem:["#1fb5cc","#0a5a6c"],
  whos:["#5b6cf0","#262a96"],
  badge:["#e3b32a","#80580a"],
  footprint:["#a8795a","#44291a"]
};
const KI={
  types:'<circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/>',
  scramblemove:'<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
  scramblemon:'<circle cx="12" cy="12" r="9"/><path d="M3 12h6M15 12h6"/><circle cx="12" cy="12" r="3"/>',
  evolevel:'<path d="M3 17l6-6 4 4 8-8M14 7h7v7"/>',
  evoitem:'<path d="M6 3h12l4 6-10 12L2 9zM2 9h20M9 3l3 6 3-6M12 9v12"/>',
  whos:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.6 2.6 0 1 1 3.6 2.4c-.7.4-1.1 1-1.1 1.8M12 17.2h.01"/>',
  badge:'<circle cx="12" cy="8" r="6"/><path d="M8.5 13.5 7 22l5-3 5 3-1.5-8.5"/>',
  footprint:'<circle cx="5.5" cy="11" r="1.8"/><circle cx="9.5" cy="6.5" r="1.8"/><circle cx="14.5" cy="6.5" r="1.8"/><circle cx="18.5" cy="11" r="1.8"/><path d="M12 12.5c-3 0-5.2 2.6-5.2 4.8 0 1.5 1.2 2.5 2.7 2.5 1 0 1.6-.5 2.5-.5s1.5.5 2.5.5c1.5 0 2.7-1 2.7-2.5 0-2.2-2.2-4.8-5.2-4.8z"/>'
};
const kIcon=k=>`<svg class="kic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${KI[k]}</svg>`;
const kVars=k=>`--kc:${KC[k][0]};--kc2:${KC[k][1]}`;
const kBadge=k=>`<span class="kbadge" style="${kVars(k)}">${kIcon(k)}${esc(KINDS[k])}</span>`;
const ITEMS=["Thunder Stone","Fire Stone","Water Stone","Leaf Stone","Moon Stone","Sun Stone","Shiny Stone","Dusk Stone","Dawn Stone","Ice Stone","Kings Rock","Metal Coat","Razor Claw","Razor Fang","Dragon Scale","Up Grade","Dubious Disc","Electirizer","Magmarizer","Protector","Black Augurite","Peat Block","Prism Scale","Reaper Cloth","Deep Sea Tooth","Deep Sea Scale","Oval Stone","Sachet","Whipped Dream","Galarica Cuff","Galarica Wreath","Tart Apple","Sweet Apple","Syrupy Apple","Cracked Pot","Metal Alloy","Auspicious Armor","Malicious Armor"];
const ALIAS={"Up Grade":["Upgrade"],"Kings Rock":["King's Rock"]};
const SLOT=/[\p{L}\p{N}]/u;
const ITEMFILE=new Map((IT||[]).map(x=>[norm(x.name),x.file]));

let pick=null,adv=0,PC=null;
const LIMITS=[0,10,20,30,60];
let S={t:{},weak:{},best:null,opt:{}},P=null,run=null,timer=0,appWasHidden=true,loaderWasHidden=true;
try{const r=JSON.parse(localStorage.getItem(LS)||"null");if(r&&r.t)S=Object.assign(S,r)}catch(e){}
const opt=()=>S.opt||(S.opt={});
const saveS=()=>{try{localStorage.setItem(LS,JSON.stringify(S))}catch(e){}};

const icon=r=>r.iconData||(r.icon_file?"data/icons/"+encodeURIComponent(r.icon_file):"");
const baseName=n=>n.replace(/\s*\(.*\)\s*$/,"");
function nameAccept(n){
  const a=new Set([norm(n)]);
  const m=n.match(/^(.*?)\s*\((.*)\)\s*$/);
  if(m)a.add(norm(m[2]+m[1]));
  return [...a];
}

function prepare(){
  if(PC)return PC;
  const D=window.VORTEX_DATA&&window.VORTEX_DATA.pokemon;
  if(!D)return null;
  const recs=Object.values(D);
  const out={};
  const combos=new Map();
  recs.forEach(r=>{
    if(!r.types||r.types.length!==2)return;
    const k=r.types.slice().sort().join("|");
    if(!combos.has(k))combos.set(k,[]);
    combos.get(k).push(r.name);
  });
  out.types=[...combos].map(([k,names])=>({key:k,a:k.split("|")[0],b:k.split("|")[1],names}));
  out.scramblemon=recs.filter(r=>icon(r)&&r.name.replace(/[^A-Za-z0-9]/g,"").length>=2).map(r=>({key:r.name,name:r.name}));
  const mv=Q.moves.slice();
  mv.push(...(window.VORTEX_QUIZ_MOVES_SPECIAL||[]));
  out.scramblemove=[...new Set(mv)].filter(Boolean).map(m=>({key:m,name:m}));
  const itemSet=IT?new Set(IT.map(x=>norm(x.name))):null;
  const lv=[],it=[],seen=new Set();
  recs.forEach(r=>(r.evolves_into||[]).forEach(e=>{
    const from=D[e.from],to=D[e.to];
    if(!from||!to||!icon(from)||!icon(to))return;
    const req=String(e.requirement||"").trim();
    const k=e.from+">"+e.to;
    if(seen.has(k))return;
    const m=req.match(/^\+?\s*(?:Level\s*)?(\d+)$/i);
    if(m){seen.add(k);lv.push({key:k,from,to,level:+m[1]});return}
    const item=req.replace(/^\+\s*/,"").replace(/\s*\+.*$/,"");
    const unique=e.items&&e.items.length===1&&e.items[0]===item&&!GENERIC.has(item)&&!/^Learn|During|Happiness|\+/i.test(item);
    const okItem=itemSet?itemSet.has(norm(item)):(ITEMS.includes(item)||unique);
    if(okItem){seen.add(k);it.push({key:k,from,to,item})}
  }));
  out.evolevel=lv;
  out.evoitem=it;
  out.whos=recs.filter(r=>icon(r)).map(r=>({key:r.name,rec:r}));
  out.badge=window.VORTEX_QUIZ_BADGES?Q.badges.map(b=>({key:badgeFile(b),name:b.name,region:b.region,file:badgeFile(b)})):[];
  out.footprint=FP?Object.keys(FP).map(d=>({key:d,dex:d,file:FP[d].file,names:FP[d].names})):[];
  PC=out;
  return out;
}

const avail=()=>ORDER.filter(k=>P[k]&&P[k].length);

function pickW(list,key,used){
  let it,tries=0;
  do{
    const w=list.map(x=>1+Math.min(4,S.weak[key+":"+x.key]||0));
    let r=Math.random()*w.reduce((a,b)=>a+b,0),i=0;
    for(;i<list.length-1;i++){r-=w[i];if(r<=0)break}
    it=list[i];tries++;
  }while(used.has(key+it.key)&&tries<40);
  used.add(key+it.key);
  return it;
}

const maskOf=s=>String(s).replace(/[\p{L}\p{N}]/gu,"_");

function scrambleOf(name){
  const letters=[...name.normalize("NFD").replace(/[̀-ͯ]/g,"")].filter(c=>/[A-Za-z0-9]/.test(c));
  let s=letters.slice(),t=0;
  do{shuffle(s);t++}while(s.join("")===letters.join("")&&t<20);
  return s;
}
window.vfp=function(i){const m=Math.max(i.naturalWidth,i.naturalHeight);if(!m)return;const k=Math.max(.22,Math.min(1,m/32))*76;i.style.width=i.style.height=k.toFixed(1)+"%"};
function bubble(letters){
  const n=letters.length,R=37;
  const pts=letters.map((c,k)=>{const a=k*2.39996+Math.random()*6.28,r=Math.sqrt((k+.5)/n)*R*(.85+Math.random()*.15);return [Math.cos(a)*r,Math.sin(a)*r]});
  const d0=Math.min(22,R*1.55/Math.sqrt(n)*1.25);
  for(let it=0;it<140;it++){
    for(let a=0;a<n;a++)for(let b=a+1;b<n;b++){
      let dx=pts[b][0]-pts[a][0],dy=pts[b][1]-pts[a][1],d=Math.hypot(dx,dy);
      if(d<d0){
        if(d<.01){dx=Math.random()-.5;dy=Math.random()-.5;d=Math.hypot(dx,dy)}
        const m=(d0-d)/2/d;
        pts[a][0]-=dx*m;pts[a][1]-=dy*m;pts[b][0]+=dx*m;pts[b][1]+=dy*m;
      }
    }
    pts.forEach(p=>{const d=Math.hypot(p[0],p[1]);if(d>R){p[0]*=R/d;p[1]*=R/d}});
  }
  const f=n<=9?1:n<=13?.92:n<=17?.82:n<=22?.72:.64;
  return `<div class="qbub" style="font-size:calc(clamp(14px,2.6vw,20px)*${f})">${letters.map((c,k)=>`<span style="left:${(50+pts[k][0]).toFixed(1)}%;top:${(50+pts[k][1]).toFixed(1)}%;transform:translate(-50%,-50%)">${esc(c)}</span>`).join("")}</div>`;
}
const img=(src,cls)=>`<img class="${cls||""}" alt="" decoding="async" src="${esc(src)}">`;
const WARM=new Map();
const unesc=s=>s.replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,"&");
function warm(q){
  if(!q||q.warmed)return;
  q.warmed=true;
  const h=[q.vis,q.rv&&q.rv.side,q.rv&&q.rv.extra,q.rv&&q.rv.mark].join("");
  const re=/<img[^>]*\ssrc="([^"]+)"/g;
  let m;
  while((m=re.exec(h))){
    const u=unesc(m[1]);
    if(/^data:/.test(u)||WARM.has(u))continue;
    const im=new Image();
    im.decoding="async";
    im.src=u;
    WARM.set(u,im);
    if(im.decode)im.decode().catch(()=>{});
  }
}

const DEX=()=>(window.VORTEX_DATA&&window.VORTEX_DATA.pokemon)||{};
const sprOf=n=>{const r=DEX()[n];return r&&icon(r)?img(icon(r),"qspr"):""};
const BUILD={
  types(it){
    const ex=shuffle(it.names.slice());
    const accept=new Set();
    it.names.forEach(n=>nameAccept(n).forEach(a=>accept.add(a)));
    const pill=t=>`<span class="qpill" style="--tc:${TC[t]||"#777"}">${esc(t.toUpperCase())}</span>`;
    const withIcon=ex.filter(n=>sprOf(n)).slice(0,40);
    const more=it.names.length-withIcon.length;
    const n=withIcon.length;
    const ss=n<=3?17:n<=6?13:n<=10?10.5:n<=16?8.5:n<=26?7:5.2;
    return {prompt:"Name a Pokémon which matches both of these types",vis:`<div class="qpills">${pill(it.a)}${pill(it.b)}</div>`,accept:[...accept],answer:ex.slice(0,6).join(", ")+(it.names.length>6?" …":""),mask:null,layout:"types",
      rv:{extra:`<div class="qsprs" style="--ss:${ss}">${withIcon.map(sprOf).join("")}${more>0?`<small>+${more} more</small>`:""}</div>`,noBar:true}};
  },
  scramblemove(it){
    return {prompt:"Unscramble these letters to make the name of an attack",vis:bubble(scrambleOf(it.name)),accept:[norm(it.name)],answer:it.name,mask:it.name,layout:"circle",rv:{side:`<div class="qbub ans"><span>${esc(it.name)}</span></div>`,text:it.name}};
  },
  scramblemon(it){
    return {prompt:"Unscramble these letters to make the name of a Pokémon",vis:bubble(scrambleOf(it.name)),accept:nameAccept(it.name),answer:it.name,mask:it.name,layout:"circle",rv:{side:`<div class="qcircle multi" style="--m:84%">${sprOf(it.name)}</div>`,text:it.name}};
  },
  evolevel(it){
    return {prompt:"What level is required for this evolution?",vis:`<div class="qevo">${img(icon(it.from))}<div class="qarrow"><i class="qcandy">?</i></div>${img(icon(it.to))}</div>`,accept:[String(it.level),"level"+it.level],answer:"Level "+it.level+" ("+it.from.name+" → "+it.to.name+")",mask:null,layout:"evo",rv:{mark:`<i class="qcandy on">${it.level}</i>`,text:"Level "+it.level+" · "+it.from.name+" → "+it.to.name}};
  },
  evoitem(it){
    const acc=[norm(it.item)].concat((ALIAS[it.item]||[]).map(norm));
    const ic=ITEMFILE.has(norm(it.item))?itemDir+ITEMFILE.get(norm(it.item)):"";
    return {prompt:"What item is needed for this evolution?",vis:`<div class="qevo">${img(icon(it.from))}<div class="qarrow"><i class="qhex">?</i></div>${img(icon(it.to))}</div>`,accept:acc,answer:it.item+" ("+it.from.name+" → "+it.to.name+")",mask:it.item,layout:"evo",rv:{mark:ic?`<img class="qitem" alt="" src="${esc(ic)}">`:`<i class="qcandy on">${esc(it.item)}</i>`,text:it.item+" · "+it.from.name+" → "+it.to.name}};
  },
  whos(it){
    return {prompt:"",vis:`<div class="qwho">${img(icon(it.rec))}</div>`,accept:nameAccept(it.rec.name),answer:it.rec.name,mask:it.rec.name,layout:"who",rv:{whos:true,text:it.rec.name}};
  },
  badge(it){
    return {prompt:"What is the name of this gym badge?",vis:`<div class="qcircle">${img(Q.badgeDir+it.file)}</div>`,accept:[norm(it.name),norm(it.name+" badge")],answer:it.name+" ("+it.region+")",mask:it.name,layout:"circle",rv:{text:it.name+" Badge · "+it.region}};
  },
  footprint(it){
    const acc=new Set();
    it.names.forEach(n=>{nameAccept(n).forEach(a=>acc.add(a));acc.add(norm(baseName(n)))});
    const multi=it.names.length>1;
    const shown=it.names.find(n=>!/\(/.test(n))||baseName(it.names[0]);
    const sps=it.names.map(sprOf).filter(Boolean).slice(0,9);
    const m=sps.length<=1?80:sps.length<=4?46:32;
    return {prompt:"Which Pokémon created this footprint?",vis:`<div class="qcircle">${`<img class="qfoot" alt="" src="${esc(Q.footprintDir+it.file)}" onload="vfp(this)">`}</div>`,accept:[...acc],answer:multi?it.names.slice(0,3).join(", ")+(it.names.length>3?" …":""):shown,mask:multi?null:shown,layout:"circle",rv:{side:sps.length?`<div class="qcircle multi pk" style="--m:${m}%">${sps.join("")}</div>`:null,pair:true,text:multi?it.names.slice(0,4).join(" · ")+(it.names.length>4?" +"+(it.names.length-4)+" more":""):shown}};
  }
};

function makeQ(kind,used){
  const it=pickW(P[kind],kind,used);
  const q=BUILD[kind](it);
  q.kind=kind;q.key=it.key;q.bg=KC[kind];q.shown=new Set();
  return q;
}

function planKinds(n,kinds){
  const base=shuffle(kinds.slice());
  const p=[];
  for(let i=0;i<n;i++)p.push(base[i%base.length]);
  return p;
}

function startRun(kinds,n){
  P=prepare();
  if(!P)return;
  clearTimeout(adv);
  const used=new Set();
  const plan=kinds.length===1?Array(n).fill(kinds[0]):planKinds(n,kinds);
  run={qs:plan.map(k=>makeQ(k,used)),i:0,res:[],t0:Date.now(),qt:0,answered:false,limit:+opt().limit||0,auto:opt().auto!==false};
  warm(run.qs[0]);warm(run.qs[1]);
  showQ();
}

function hintHTML(q){
  if(!q.mask)return "";
  let idx=-1;
  const cells=[...q.mask].map(ch=>{
    if(!SLOT.test(ch))return `<b class="p">${ch===" "?"&nbsp;":esc(ch)}</b>`;
    idx++;
    const on=q.shown.has(idx);
    return `<b class="s${on?" on":""}">${on?esc(ch):"_"}</b>`;
  }).join("");
  return `<div class="qhintbar"><span>Hint:</span><span class="qmask" id="qmask">${cells}</span></div>`;
}
function slotCount(q){return [...q.mask].filter(c=>SLOT.test(c)).length}

function showQ(){
  clearTimeout(adv);
  const q=run.qs[run.i];
  warm(q);warm(run.qs[run.i+1]);warm(run.qs[run.i+2]);
  run.qt=Date.now();run.answered=false;
  const box=$("#qbody");
  box.innerHTML=`
  <div class="qtop"><span>Question <b>${run.i+1}</b> / ${run.qs.length}</span><span>Score <b>${run.res.filter(r=>r.ok).length}</b></span><span id="qtime">${run.limit?run.limit.toFixed(1):"0.0"}s</span></div>
  ${run.limit?'<div class="qtimebar"><i id="qtbar"></i></div>':""}
  <div class="qcard ${q.layout} k-${q.kind}${q.mask?" hashint":""}" style="--qbg:${q.bg[0]};--qbg2:${q.bg[1]}">
    <div class="qchip">${kIcon(q.kind)}${esc(KINDS[q.kind])}</div>
    <div class="qtxt">${esc(q.prompt)}${q.layout==="types"?q.vis:""}</div>
    ${q.layout==="types"?"":`<div class="qside">${q.vis}</div>`}
    ${hintHTML(q)}
  </div>
  <form class="qform" id="qform" autocomplete="off">
    <input type="text" id="qin" placeholder="Type your answer" aria-label="Your answer" autocapitalize="off" spellcheck="false">
    <button class="btn" type="submit">Answer</button>
    ${q.mask?'<button class="btn ghost" type="button" id="qhint">Reveal a letter <kbd>Tab</kbd></button>':""}
    <button class="btn ghost" type="button" id="qskip">Skip <kbd>Esc</kbd></button>
    <button class="btn ghost" type="button" id="qquit">Quit</button>
  </form>
  <div id="qfb"></div>`;
  $("#qin").focus();
  clearInterval(timer);
  timer=setInterval(()=>{
    if(run.answered)return;
    const el=(Date.now()-run.qt)/1000,e=$("#qtime");
    if(run.limit){
      const left=Math.max(0,run.limit-el);
      if(e){e.textContent=left.toFixed(1)+"s";e.classList.toggle("low",left<=5)}
      const b=$("#qtbar");if(b){b.style.width=(100*left/run.limit)+"%";b.classList.toggle("low",left<=5)}
      if(left<=0)answer(true,"time");
    }else if(e)e.textContent=el.toFixed(1)+"s";
  },100);
}

function showAnswer(q,ok){
  const card=$(".qcard");
  if(!card)return;
  const rv=q.rv||{};
  card.classList.add(ok?"ok":"bad");
  if(rv.side){
    const s=card.querySelector(".qside");
    if(s){
      const fp=rv.pair?s.querySelector(".qcircle"):null;
      if(fp){s.classList.add("pair");s.innerHTML=fp.outerHTML.replace("qcircle","qcircle fp")+'<span class="qlink">=</span>'+rv.side}
      else s.innerHTML=rv.side;
    }
  }
  if(rv.whos){const w=card.querySelector(".qwho");if(w)w.classList.add("rv")}
  if(rv.mark){const m=card.querySelector(".qcandy,.qhex");if(m)m.outerHTML=rv.mark}
  if(rv.extra){const t=card.querySelector(".qtxt");if(t)t.insertAdjacentHTML("beforeend",rv.extra)}
  if(rv.noBar){
    card.classList.add("noans");
    const old=card.querySelector(".qhintbar");
    if(old)old.remove();
    return;
  }
  let bar=card.querySelector(".qhintbar");
  if(!bar){bar=document.createElement("div");bar.className="qhintbar";card.appendChild(bar)}
  bar.classList.add("ans");
  bar.innerHTML=`<span>Answer:</span><span class="qans">${esc(rv.text||q.answer)}</span>`;
}

function reveal(){
  const q=run.qs[run.i];
  if(!q.mask||run.answered)return;
  const left=[];
  for(let i=0;i<slotCount(q);i++)if(!q.shown.has(i))left.push(i);
  if(left.length<=1)return;
  q.shown.add(left[rnd(left.length)]);
  $("#qmask").outerHTML=hintHTML(q).match(/<span class="qmask"[\s\S]*<\/span>/)[0];
  $("#qin").focus();
}

function record(q,ok,ms){
  const t=S.t[q.kind]||(S.t[q.kind]={n:0,ok:0,ms:0});
  t.n++;if(ok)t.ok++;t.ms+=ms;
  const wk=q.kind+":"+q.key,w=S.weak[wk]||0;
  S.weak[wk]=ok?Math.max(0,w-1):Math.min(6,w+2);
  if(!S.weak[wk])delete S.weak[wk];
  saveS();
}

function answer(skip,why){
  if(run.answered)return;
  const q=run.qs[run.i];
  const raw=skip?"":$("#qin").value;
  if(!skip&&!norm(raw))return;
  const ms=Date.now()-run.qt;
  const ok=!skip&&q.accept.includes(norm(raw));
  run.answered=true;clearInterval(timer);
  run.res.push({kind:q.kind,ok,ms,given:skip?(why==="time"?"(time up)":"(skipped)"):raw.trim(),answer:q.answer,hinted:q.shown.size>0});
  record(q,ok,ms);
  $("#qin").disabled=true;
  const last=run.i===run.qs.length-1;
  $("#qfb").innerHTML=`<div class="qres ${ok?"ok":"bad"}"><b>${ok?"Correct!":(why==="time"?"Time's up.":skip?"Skipped.":"Not quite.")}</b><span>${(ms/1000).toFixed(1)}s${ok&&run.auto?" · next question…":""}${q.shown.size?" · "+q.shown.size+" letter"+(q.shown.size>1?"s":"")+" revealed":""}</span></div><div class="qform"><button class="btn" id="qnext" type="button">${last?"See results":"Next"}</button></div>`;
  showAnswer(q,ok);
  $("#qnext").focus();
  if(ok&&run.auto)adv=setTimeout(()=>{if(run&&!run.finished&&run.answered)$("#qnext")&&$("#qnext").click()},1000);
}

function finish(){
  clearInterval(timer);clearTimeout(adv);
  const ok=run.res.filter(r=>r.ok).length,tot=Date.now()-run.t0;
  if(run.qs.length===10&&(!S.best||ok>S.best.ok||(ok===S.best.ok&&tot<S.best.ms)))S.best={ok,ms:tot};
  saveS();
  $("#qbody").innerHTML=`
  <div class="qsum"><h3>${ok} / ${run.res.length} correct</h3>
  <p>Total ${(tot/1000).toFixed(1)}s · average ${(tot/run.res.length/1000).toFixed(1)}s per question${S.best?` · best 10-question score ${S.best.ok}/10 in ${(S.best.ms/1000).toFixed(0)}s`:""}</p>
  <table class="qtable"><thead><tr><th>#</th><th>Type</th><th>Your answer</th><th>Correct answer</th><th>Time</th></tr></thead><tbody>
  ${run.res.map((r,i)=>`<tr class="${r.ok?"ok":"bad"}"><td>${i+1}</td><td>${kBadge(r.kind)}</td><td>${esc(r.given)}${r.hinted?" (hint)":""}</td><td>${r.ok?"✓":esc(r.answer)}</td><td>${(r.ms/1000).toFixed(1)}s</td></tr>`).join("")}
  </tbody></table>
  <div class="qform"><button class="btn" id="qagain" type="button">Another quiz</button><button class="btn ghost" id="qhome" type="button">Back</button></div></div>`;
  run.finished=true;
}

function home(){
  clearInterval(timer);clearTimeout(adv);
  run=null;
  P=prepare();
  const box=$("#qbody");
  if(!P){box.innerHTML=`<div class="qmsg">Pokémon data isn't loaded. The quiz reads <code>data/pokemon.js</code>, so open this page next to the <code>data</code> folder.</div>`;return}
  const av=avail();
  if(!av.includes(pick))pick=av[0]||null;
  const tabs=ORDER.map(k=>{
    const on=k===pick,off=!av.includes(k);
    return `<button class="qtab" role="tab" type="button" data-k="${k}" style="${kVars(k)}" aria-selected="${on}" tabindex="${on?0:-1}"${off?" disabled":""}>${kIcon(k)}<span>${esc(KINDS[k])}</span></button>`;
  }).join("");
  const rows=ORDER.map(k=>{
    const t=S.t[k],n=P[k]?P[k].length:0;
    const need=(k==="badge"||k==="footprint")&&!n;
    return `<tr class="${n?"":"dim"}"><td>${kBadge(k)}</td><td>${n?n:(need?"run the crawler":"none")}</td><td>${t?t.n:0}</td><td>${t&&t.n?Math.round(100*t.ok/t.n)+"%":"–"}</td><td>${t&&t.n?(t.ms/t.n/1000).toFixed(1)+"s":"–"}</td></tr>`;
  }).join("");
  box.innerHTML=`
  <div class="qhome">
    <p>Practice for the Pokemon Vortex Discord Quiz.</p>
    <div class="qform"><button class="btn" id="qstart" type="button"${av.length?"":" disabled"}>Start quiz (10 questions)</button></div>
    <div class="qopts">
      <div class="qopt"><span>Timer</span><div class="qseg" role="group" aria-label="Time per question">${LIMITS.map(l=>`<button type="button" class="qsegb" data-lim="${l}" aria-pressed="${(+opt().limit||0)===l}">${l?l+"s":"Off"}</button>`).join("")}</div></div>
      <label class="qopt qchk"><input type="checkbox" id="qauto"${opt().auto!==false?" checked":""}><span>Auto-advance after a correct answer</span></label>
    </div>
    <div class="qdrillhead">Drill a single type</div>
    <div class="qtabs" role="tablist" aria-label="Drill type">${tabs}</div>
    <div class="qform"><button class="btn qdrillbtn" id="qdrill" type="button"${pick?"":" disabled"}${pick?` style="${kVars(pick)}"`:""}>${pick?kIcon(pick)+"Drill "+esc(KINDS[pick])+" (10)":"Drill (10)"}</button></div>
    <table class="qtable"><thead><tr><th>Type</th><th>Pool</th><th>Asked</th><th>Right</th><th>Avg time</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="qform"><button class="btn ghost small" id="qreset" type="button">Reset quiz stats</button></div>
    ${P.badge.length&&P.footprint.length?"":'<p class="qnote">Badge and footprint questions need <code>data/quiz-badges.js</code> and <code>data/quiz-footprints.js</code> from <code>crawl_quiz.py</code>.</p>'}
  </div>`;
}

function openQuiz(){
  $("#quiz").hidden=false;
  home();
}
function closeQuiz(){
  clearInterval(timer);clearTimeout(adv);
  $("#quiz").hidden=true;
}
window.VQ={open:openQuiz,close:closeQuiz};
$("#quiz").addEventListener("click",e=>{
  const sg=e.target.closest(".qsegb");
  if(sg){opt().limit=+sg.dataset.lim;saveS();home();return}
  const tb=e.target.closest(".qtab");
  if(tb){if(!tb.disabled){pick=tb.dataset.k;home();const a=$(".qtab[aria-selected=true]");a&&a.focus()}return}
  const db=e.target.closest("#qdrill");
  const id=db?"qdrill":e.target.id;
  if(id==="qstart")startRun(avail(),10);
  else if(id==="qdrill"&&pick)startRun([pick],10);
  else if(id==="qreset"){if(confirm("Reset all quiz stats and weak spots?")){S={t:{},weak:{},best:null,opt:S.opt};saveS();home()}}
  else if(id==="qhint")reveal();
  else if(id==="qskip")answer(true);
  else if(id==="qquit")home();
  else if(id==="qnext"){if(run.i===run.qs.length-1)finish();else{run.i++;showQ()}}
  else if(id==="qagain"){const k=run.qs.every(q=>q.kind===run.qs[0].kind)?[run.qs[0].kind]:avail();startRun(k,10)}
  else if(id==="qhome")home();
});
$("#quiz").addEventListener("change",e=>{if(e.target.id==="qauto"){opt().auto=e.target.checked;saveS()}});
$("#quiz").addEventListener("submit",e=>{e.preventDefault();if(run&&!run.finished&&!run.answered)answer(false)});
document.addEventListener("keydown",e=>{
  const tb=e.target.closest&&e.target.closest(".qtab");
  if(tb&&(e.key==="ArrowRight"||e.key==="ArrowLeft"||e.key==="Home"||e.key==="End")){
    const list=avail();
    if(!list.length)return;
    let i=list.indexOf(pick);
    if(e.key==="ArrowRight")i=(i+1)%list.length;
    else if(e.key==="ArrowLeft")i=(i-1+list.length)%list.length;
    else i=e.key==="Home"?0:list.length-1;
    e.preventDefault();pick=list[i];home();
    const a=$(".qtab[aria-selected=true]");a&&a.focus();
    return;
  }
  if($("#quiz").hidden||!run||run.finished)return;
  if(!run.answered&&!e.ctrlKey&&!e.altKey&&!e.metaKey){
    const q=run.qs[run.i];
    if(e.key==="Escape"){e.preventDefault();answer(true);return}
    if(e.key==="Tab"&&q.mask){e.preventDefault();reveal();return}
  }
  if(e.key==="Enter"&&run.answered){e.preventDefault();$("#qnext")&&$("#qnext").click()}
});
})();
