(function(){
  var KEY="vortexdex.theme";
  function get(){try{return localStorage.getItem(KEY)==="light"?"light":"dark"}catch(e){return"dark"}}
  function apply(t){
    document.documentElement.setAttribute("data-theme",t);
    var b=document.getElementById("btnTheme");
    if(b)b.textContent=t==="dark"?"Light mode":"Dark mode";
  }
  apply(get());
  function view(){var v=(location.hash||"#home").slice(1);return["home","dex","mydex","quiz","prices"].indexOf(v)<0?"home":v}
  document.documentElement.setAttribute("data-page",view());
  document.addEventListener("DOMContentLoaded",function(){apply(get())});
  document.addEventListener("click",function(e){
    if(!e.target.closest("#btnTheme"))return;
    var t=get()==="dark"?"light":"dark";
    try{localStorage.setItem(KEY,t)}catch(err){}
    apply(t);
  });
})();
