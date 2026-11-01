(()=>{if(window.__uaiDvOfficial)return;window.__uaiDvOfficial=true;
const KEY='uaiDvOfficialFeatureV2',TTL=24*60*60*1000;
let enabled=false,cache=null,inflight=false,requestId=0,lastError='';
const sid=()=>location.pathname.match(/SID\d+/)?.[0]||null;
const matched=()=>enabled&&!!cache?.ids?.includes(sid());
window.__uaiDvMatched=matched;
function notify(){window.dispatchEvent(new Event('UAI_DV_UPDATED'))}
function update(){
 const id=sid();
 const host=document.getElementById('unext-av-info-card');
 const shadow=host?.shadowRoot;
 const sub=shadow?.getElementById('vs');
 if(sub){
  let tag=shadow.getElementById('uai-dv-label');
  if(!matched()){tag?.remove()}
  else if(!tag){tag=document.createElement('div');tag.id='uai-dv-label';tag.textContent='Dolby Vision';tag.style.cssText='font-size:13px;font-weight:600;color:#b5dfff;margin-top:7px';sub.after(tag)}
 }
 notify();
}
async function refresh(){
 if(!enabled||inflight||cache&&Date.now()-cache.time<TTL)return;
 inflight=true;lastError='';
 const id='feature-'+(++requestId);
 try{
  const response=await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{window.removeEventListener('message',handler);reject(Error('一覧APIタイムアウト'))},55000);
   function handler(e){if(e.source!==window||e.data?.source!=='UAI_DV_FEATURE_RESULT'||e.data.id!==id)return;clearTimeout(timer);window.removeEventListener('message',handler);resolve(e.data.data)}
   window.addEventListener('message',handler);
   window.postMessage({source:'UAI_DV_FEATURE_QUERY',id},location.origin);
  });
  if(response?.error)throw Error(response.error);
  const ids=[...new Set((response.ids||[]).filter(v=>typeof v==='string'&&/^SID\d+$/.test(v)))];
  if(!ids.length||!Number.isInteger(response.pages))throw Error('作品一覧が不完全です');
  cache={ids,pages:response.pages,time:Date.now()};
  await chrome.storage.local.set({[KEY]:cache});
 }catch(e){lastError=String(e?.message||e).slice(0,160);console.warn('[U-NEXT AV Info] Dolby Vision feature lookup unavailable:',lastError)}
 finally{inflight=false;update()}
}
function setEnabled(next){enabled=next===true;update();if(enabled)refresh()}
chrome.runtime.onMessage.addListener(m=>{if(m?.type==='UAI_ENABLED_CHANGED')setEnabled(m.enabled!==false)});
Promise.all([chrome.storage.local.get(KEY),chrome.runtime.sendMessage({type:'UAI_GET_ENABLED'})]).then(([saved,reply])=>{
 const savedCache=saved?.[KEY];if(savedCache&&Array.isArray(savedCache.ids)&&Number.isFinite(savedCache.time))cache=savedCache;
 setEnabled(reply?.enabled!==false);
}).catch(()=>{});
let lastUrl=location.href;
setInterval(()=>{if(location.href!==lastUrl){lastUrl=location.href;update();if(enabled)refresh()}else update()},1800);
})();