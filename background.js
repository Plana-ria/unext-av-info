// Settings are shared between the context menu and the options page.
const DEFAULTS={uaiShowTitle:true,uaiShowPlayback:true,uaiShowLists:true,uaiAllowHistory:false};
const ITEMS=[['uaiShowTitle','作品ページの品質表示'],['uaiShowPlayback','再生ページの品質表示'],['uaiShowLists','検索結果・一覧ページでの品質表示']];
async function installModeMenu(){
 const saved=await chrome.storage.local.get(Object.keys(DEFAULTS));
 await chrome.contextMenus.removeAll();
 chrome.contextMenus.create({id:'uai-views',title:'表示項目',contexts:['action']});
 for(const [key,label] of ITEMS)chrome.contextMenus.create({id:key,parentId:'uai-views',title:label,type:'checkbox',contexts:['action'],checked:saved[key]!==false});
 chrome.contextMenus.create({id:'uai-history',title:'再生履歴への影響制御',contexts:['action']});
 chrome.contextMenus.create({id:'uai-history-safe',parentId:'uai-history',title:'未再生作品の履歴追加を許容しない（推奨）',type:'radio',contexts:['action'],checked:saved.uaiAllowHistory!==true});
 chrome.contextMenus.create({id:'uai-history-allow',parentId:'uai-history',title:'未再生作品の履歴追加を許容する',type:'radio',contexts:['action'],checked:saved.uaiAllowHistory===true});
 chrome.contextMenus.create({id:'uai-options',title:'設定ページを開く',contexts:['action']});
}
chrome.runtime.onInstalled.addListener(()=>{chrome.storage.local.remove('allowTitleAnalysis').catch(()=>{});installModeMenu().catch(console.error)});
chrome.runtime.onStartup.addListener(()=>installModeMenu().catch(console.error));
chrome.contextMenus.onClicked.addListener(async info=>{
 const key=ITEMS.find(([id])=>id===info.menuItemId)?.[0];
 if(key)await chrome.storage.local.set({[key]:info.checked===true});
 else if(info.menuItemId==='uai-history-safe'||info.menuItemId==='uai-history-allow')await chrome.storage.local.set({uaiAllowHistory:info.menuItemId==='uai-history-allow'});
 else if(info.menuItemId==='uai-options')await chrome.runtime.openOptionsPage();
});
chrome.storage.onChanged.addListener((changes,area)=>{
 if(area!=='local'||!Object.keys(DEFAULTS).some(key=>key in changes))return;
 // Also refresh native check marks when a setting is changed in the options page.
 for(const [key] of ITEMS)if(key in changes)chrome.contextMenus.update(key,{checked:changes[key].newValue!==false}).catch(()=>{});
 if('uaiAllowHistory' in changes){
  const allow=changes.uaiAllowHistory.newValue===true;
  chrome.contextMenus.update('uai-history-safe',{checked:!allow}).catch(()=>{});
  chrome.contextMenus.update('uai-history-allow',{checked:allow}).catch(()=>{});
 }
});
// A single toolbar toggle is shared by all U-NEXT tabs and persisted across restarts.
let enabled=false;
const activeFetches=new Set();
const initialized=chrome.storage.local.get('enabled').then(state=>{
 enabled=state.enabled!==false;
 updateBadge();
}).catch(()=>updateBadge());
function updateBadge(){
 chrome.action.setBadgeText({text:enabled?'':'OFF'});
 chrome.action.setBadgeBackgroundColor({color:'#666666'});
 chrome.action.setTitle({title:'U-NEXT AV Info：'+(enabled?'ON（クリックでOFF）':'OFF（クリックでON）')});
}
chrome.action.onClicked.addListener(async()=>{
 await initialized;
 enabled=!enabled;
 if(!enabled){for(const controller of activeFetches)controller.abort();activeFetches.clear()}
 await chrome.storage.local.set({enabled});
 updateBadge();
 const tabs=await chrome.tabs.query({url:'https://video.unext.jp/*'});
 for(const tab of tabs)if(tab.id!=null)chrome.tabs.sendMessage(tab.id,{type:'UAI_ENABLED_CHANGED',enabled}).catch(()=>{});
});
chrome.runtime.onMessage.addListener((m,s,send)=>{
 if(m?.type==='UAI_GET_ENABLED'){initialized.then(()=>send({enabled}));return true;}
 if(!s.tab?.url?.startsWith('https://video.unext.jp/'))return;
 // Initialization is asynchronous after a service-worker restart.
 // Wait for persisted state before allowing any extension-originated request.
 if(m?.type==='FETCH'||m?.type==='INJECT'||m?.type==='PLAYBACK_HOOK'){
  initialized.then(()=>{
   if(!enabled){send({error:'拡張機能はOFFです'});return}
   handleEnabledMessage(m,s,send);
  }).catch(error=>send({error:String(error)}));
  return true;
 }
});
function handleEnabledMessage(m,s,send){
 if(m?.type==='PLAYBACK_HOOK'){chrome.scripting.executeScript({target:{tabId:s.tab.id},world:'MAIN',files:['playback-hook.js']}).then(()=>send({ok:true})).catch(e=>send({error:String(e.message||e)}));return true;}
 if(m?.type==='INJECT'){send({ok:true});return false;}
 if(m?.type==='FETCH'){
  (async()=>{
   const controller=new AbortController();activeFetches.add(controller);
   try{
    const u=new URL(m.url);
    if(u.protocol!=='https:'|| !(/(^|\.)(unext\.jp|nxtv\.jp)$/.test(u.hostname)))throw Error('取得先ホストが許可されていません');
    const init=m.range&&/^bytes=\d+-\d+$/.test(m.range);
    const headers=init?{Range:m.range}:{};
    const timeout=setTimeout(()=>controller.abort(),12000);
    let r;try{r=await fetch(u.href,{credentials:'omit',cache:'no-store',headers,redirect:'error',signal:controller.signal});}catch(e){clearTimeout(timeout);throw e}
    if(!r.ok){clearTimeout(timeout);throw Error('HTTP '+r.status)}
    const limit=init?524288:3000000;
    const length=Number(r.headers.get('content-length'));
    if(length>limit){clearTimeout(timeout);throw Error('取得データの上限超過')}
    const reader=r.body?.getReader();let parts=[],size=0;
    if(reader){try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit)throw Error('取得データの上限超過');parts.push(value)}}finally{clearTimeout(timeout);reader.releaseLock()}}
    else {try{const b=await r.arrayBuffer();size=b.byteLength;if(size>limit)throw Error('取得データの上限超過');parts=[new Uint8Array(b)]}finally{clearTimeout(timeout)}}
    const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.byteLength}
    if(init){
      if(r.status!==206&&Number(m.range.slice(6).split('-')[0])>0)throw Error('Range応答がありません');
      const a=bytes;let str='';for(let i=0;i<a.length;i+=8192)str+=String.fromCharCode(...a.subarray(i,i+8192));send({base64:btoa(str)});
    }else{send({text:new TextDecoder().decode(bytes)});}
   }catch(e){send({error:e.message});}finally{activeFetches.delete(controller)}
  })();return true;
 }
}