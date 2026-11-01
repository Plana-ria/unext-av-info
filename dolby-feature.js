(()=>{if(window.__uaiDvOfficial)return;window.__uaiDvOfficial=true;
const KEY='uaiDvOfficialFeatureV1',TTL=24*3600*1000;
let enabled=false,cache=null,inflight=false,lastError='',waiters=new Map(),n=0;
const sid=()=>location.pathname.match(/SID\d+/)?.[0]||null;
const status=()=>{
 const id=sid();
 if(!id)return '作品IDを取得できません';
 if(!enabled)return '拡張機能OFF';
 if(!cache)return lastError?'取得失敗: '+lastError:'公式特集一覧を取得中';
 return cache.ids.includes(id)?'Dolby Vision対応（公式特集掲載）':'公式特集に掲載なし（非対応とは限りません）';
};
function paint(){
 const id=sid(),isPlay=location.pathname.startsWith('/play/');
 document.querySelectorAll('.uai-official-dv').forEach(el=>{if(!enabled||!id||!el.isConnected)el.remove()});
 if(!enabled||!id)return;
 let anchor=isPlay?document.querySelector('.uai-playback-info'):document.getElementById('unext-av-info-card');
 if(!anchor)return;
 let box=document.querySelector('.uai-official-dv');
 if(!box){box=document.createElement('div');box.className='uai-official-dv';box.style.cssText='background:rgba(8,20,36,.92);border:1px solid #64829c;border-radius:8px;color:#fff;font:12px/1.5 sans-serif;padding:8px 10px;max-width:580px;position:relative;z-index:2';anchor.after(box)}
 box.textContent='Dolby Vision公式特集照合: '+status()+(cache?' / '+cache.ids.length+'作品 / '+new Date(cache.time).toLocaleString('ja-JP')+'取得':'');
}
async function load(force=false){
 if(!enabled||inflight)return;
 if(!force&&cache&&Date.now()-cache.time<TTL){paint();return}
 inflight=true;lastError='';paint();
 try{
  const id='dv-'+(++n),result=await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{waiters.delete(id);reject(Error('API応答タイムアウト（45秒）'))},45000);
   waiters.set(id,data=>{clearTimeout(timer);waiters.delete(id);resolve(data)});
   window.postMessage({source:'UAI_DV_FEATURE_QUERY',id},location.origin);
  });
  if(result.error)throw Error(result.error);
  if(!Array.isArray(result.ids)||!result.ids.length)throw Error('作品一覧が空です');
  const ids=[...new Set(result.ids.filter(s=>/^SID\d+$/.test(s)))];
  if(!ids.length)throw Error('有効な作品IDがありません');
  cache={ids,time:Date.now(),pages:result.pages};
  await chrome.storage.local.set({[KEY]:cache});
 }catch(e){lastError=String(e.message||e).slice(0,150)}
 finally{inflight=false;paint()}
}
window.addEventListener('message',e=>{
 if(e.source!==window||e.data?.source!=='UAI_DV_FEATURE_RESULT')return;
 waiters.get(e.data.id)?.(e.data.data);
});
function enabledChanged(v){enabled=v===true;paint();if(enabled)load()}
chrome.runtime.onMessage.addListener(m=>{if(m?.type==='UAI_ENABLED_CHANGED')enabledChanged(m.enabled!==false)});
Promise.all([chrome.storage.local.get(KEY),chrome.runtime.sendMessage({type:'UAI_GET_ENABLED'})]).then(([saved,settings])=>{
 const data=saved[KEY];if(data&&Array.isArray(data.ids)&&Number.isFinite(data.time))cache=data;
 enabledChanged(settings?.enabled!==false);
}).catch(e=>{lastError=String(e.message||e).slice(0,120);paint()});
let last=location.href;
setInterval(()=>{if(location.href!==last){last=location.href;paint();if(enabled)load()}else paint()},1700);
})();