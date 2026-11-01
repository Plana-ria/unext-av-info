(()=>{if(window.__uaiDvOfficial)return;window.__uaiDvOfficial=true;
const TTL=24*60*60*1000,RETRY=15*60*1000;
const specs={dv:{key:'uaiDvOfficialFeatureV2'},fourk:{key:'uai4kOfficialFeatureV1'},atmos:{key:'uaiAtmosOfficialFeatureV1'}};
const state={dv:{cache:null,inflight:false,lastAttempt:0},fourk:{cache:null,inflight:false,lastAttempt:0},atmos:{cache:null,inflight:false,lastAttempt:0}};
let enabled=false,serial=0,lastUrl=location.href,lastFlags='';
const sid=()=>window.__uaiCurrentTitleId?.()||location.pathname.match(/SID\d+/)?.[0]||null;
const matches=kind=>enabled&&!!state[kind].cache?.ids?.includes(sid());
window.__uaiDvMatched=()=>matches('dv');
window.__uai4kMatched=()=>matches('fourk');
window.__uaiAtmosMatched=()=>matches('atmos');
function paint(){
 const sh=document.getElementById('unext-av-info-card')?.shadowRoot,primary=sh?.getElementById('v');
 if(primary){
  const value=primary.textContent||'';
  const base=value.replace(/ Dolby Vision$/,'');
  const isQuality=/^(?:4K UHD|Full HD|HD|[0-9]+p)$/.test(base);
  const next=isQuality?(matches('fourk')?'4K UHD':base)+(matches('dv')?' Dolby Vision':''):base;
  if(value!==next)primary.textContent=next;
 }
 const audio=sh?.getElementById('a');
 if(audio){const value=audio.textContent||'';const base=value==='Dolby Atmos (公式)'?'不明':value;const actual=base==='Dolby Atmos';const next=matches('atmos')&&!actual?'Dolby Atmos':base;if(next!==value)audio.textContent=next;}
 const flags=String(sid())+'|'+matches('dv')+'|'+matches('fourk')+'|'+matches('atmos')+'|'+enabled;
 if(lastFlags!==flags){lastFlags=flags;window.dispatchEvent(new Event('UAI_DV_UPDATED'))}
}
async function refresh(kind){
 const item=state[kind],cache=item.cache,now=Date.now();
 if(!enabled||item.inflight||cache&&now-cache.time<TTL||now-item.lastAttempt<RETRY)return;
 item.inflight=true;item.lastAttempt=now;
 const id=kind+'-'+(++serial);
 try{
  const result=await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{window.removeEventListener('message',reply);reject(Error('一覧APIタイムアウト'))},90000);
   function reply(e){
    if(e.source!==window||e.data?.source!=='UAI_FEATURE_RESULT'||e.data.id!==id||e.data.kind!==kind)return;
    clearTimeout(timer);window.removeEventListener('message',reply);resolve(e.data.data);
   }
   window.addEventListener('message',reply);
   window.postMessage({source:'UAI_FEATURE_QUERY',id,kind},location.origin);
  });
  if(result?.error)throw Error(result.error);
  const ids=result?.ids;
  if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length||ids.some(x=>typeof x!=='string'||!/^SID\d+$/.test(x)))throw Error('作品一覧が不完全です');
  item.cache={ids,time:Date.now(),pages:result.pages};
  await chrome.storage.local.set({[specs[kind].key]:item.cache});
 }catch(e){console.warn('[U-NEXT AV Info] '+kind+' feature lookup:',String(e.message||e).slice(0,160))}
 finally{item.inflight=false;paint()}
}
function start(){if(!enabled)return;refresh('dv');refresh('fourk');refresh('atmos')}
function setEnabled(v){enabled=v===true;paint();start()}
chrome.runtime.onMessage.addListener(m=>{if(m?.type==='UAI_ENABLED_CHANGED')setEnabled(m.enabled!==false)});
Promise.all([chrome.storage.local.get(Object.values(specs).map(s=>s.key)),chrome.runtime.sendMessage({type:'UAI_GET_ENABLED'})]).then(([stored,reply])=>{
 for(const kind of Object.keys(specs)){const c=stored[specs[kind].key];if(c&&Array.isArray(c.ids)&&Number.isFinite(c.time))state[kind].cache=c}
 setEnabled(reply?.enabled!==false);
}).catch(e=>console.warn('[U-NEXT AV Info] feature cache:',String(e.message||e)));
setInterval(()=>{if(lastUrl!==location.href){lastUrl=location.href;lastFlags=''}paint();start()},1800);
})();