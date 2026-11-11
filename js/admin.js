(function(){
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
})();
