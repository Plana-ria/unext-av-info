(()=>{if(window.__uaiPlaybackUi)return;window.__uaiPlaybackUi=true;
const CLS='uai-playback-info';let enabled=false,playlistHighest=null,playlistBusy=false,playlistKey='',playlistRetryAt=0;let serial=0,waiting=false,last=null,lastReply=0,lastPath='';
function q(w,h){return !w||!h?'取得不可':h>=2160?'4K':h>=1080?'1080p':h>=720?'720p':h+'p'}
function audio(t,ch){const name=/ec-3/i.test(t)?'Dolby Digital Plus':/ac-3/i.test(t)?'Dolby Digital':/mp4a/i.test(t)?'AAC':'音声形式不明';return name+' ('+(ch===2?'2.0ch':ch===1?'1.0ch':ch===6?'5.1ch':ch?ch+'ch・配置未確認':'ch未確認')+')'}
function trackAudio(t){if(!t?.audioCodec)return '取得不可';return audio(t.audioCodec,t.channelsCount)}
function video(){return [...document.querySelectorAll('video')].find(v=>v.videoWidth&&v.videoHeight)||document.querySelector('video')}
function mount(){
 if(!enabled){document.querySelectorAll('.'+CLS).forEach(e=>e.remove());return}
 if(!location.pathname.startsWith('/play/')){document.querySelectorAll('.'+CLS).forEach(e=>e.remove());return}
 for(const btn of document.querySelectorAll('[data-testid="player-setting-show"]')){
  const parent=btn.parentElement;if(!parent||parent.nextElementSibling?.classList.contains(CLS))continue;
  const el=document.createElement('span');el.className=CLS;
  el.style.cssText='display:inline-flex;align-items:center;justify-content:center;margin:0 8px 0 10px;padding:5px 10px;border:1px solid rgba(255,255,255,.3);border-radius:7px;background:rgba(4,13,29,.65);color:white;font-size:12px;line-height:1.35;white-space:pre-line;pointer-events:none';
  parent.after(el);
 }
 draw();
}
function mseAudio(){
 const buffers=last?.mse?.sourceBuffers?.filter(x=>/^audio\//i.test(x.mime)&&x.appends>0)||[];
 if(!buffers.length)return null;
 const b=buffers[buffers.length-1],t=b.mime;
 const entries=b.initSniff?.audioEntries||[];
 const ch=entries.find(x=>/^(mp4a|enca)$/.test(x.type)&&/mp4a/i.test(t)&&Number.isInteger(x.channels)&&x.channels>0)?.channels
 ||entries.find(x=>/^(ec-3|enca)$/.test(x.type)&&/ec-3/i.test(t)&&Number.isInteger(x.channels)&&x.channels>0)?.channels;
 return audio(t,ch);
}
function highestQuality(){
 if(!playlistHighest)return '映像 確認中 · 音声 確認中';
 return playlistHighest;
}
function parsePlaylistMPD(xml){
 const doc=new DOMParser().parseFromString(xml,'application/xml');if(doc.querySelector('parsererror'))throw Error('MPD XML不正');
 const videos=[],audios=[];
 for(const set of doc.querySelectorAll('AdaptationSet')){
  for(const rep of [...set.children].filter(x=>x.localName==='Representation')){
   const c=rep.getAttribute('codecs')||set.getAttribute('codecs')||'',mime=rep.getAttribute('mimeType')||set.getAttribute('mimeType')||'';
   const width=Number(rep.getAttribute('width')||set.getAttribute('width'))||0,height=Number(rep.getAttribute('height')||set.getAttribute('height'))||0;
   if(width&&height&&!/audio/i.test(mime)){videos.push({width,height});continue}
   if(/audio/i.test(mime)||/^(ec-3|ac-3|mp4a)/i.test(c)){
    const ac=rep.querySelector('AudioChannelConfiguration')||set.querySelector('AudioChannelConfiguration'),config=ac?.getAttribute('value')||'';
    const ch=/^F801$/i.test(config)&&/ec-3|ac-3/i.test(c)?6:/^\d+$/.test(config)?Number(config):0;
    audios.push({codec:c,channels:ch});
   }
  }
 }
 const atmos=audios.some(a=>/ec-3/i.test(a.codec))&&[...doc.querySelectorAll('SupplementalProperty,EssentialProperty')].some(x=>/EC3_ExtensionType/i.test(x.getAttribute('schemeIdUri')||'')&&/JOC/i.test(x.getAttribute('value')||''));
 return {videos,audios,atmos};
}
async function loadPlaylistHighest(){
 if(!enabled||!location.pathname.startsWith('/play/')||playlistBusy||Date.now()<playlistRetryAt)return;
 const key=location.href;if(playlistKey===key&&playlistHighest)return;
 playlistBusy=true;playlistKey=key;
 const id='playback-'+Date.now(),replyData=()=>new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{window.removeEventListener('message',handler);reject(Error('プレイリスト応答タイムアウト'))},12000);
  function handler(e){if(e.source!==window||e.data?.source!=='UAI_PLAYBACK_PLAYLIST_RESULT'||e.data.id!==id)return;clearTimeout(timer);window.removeEventListener('message',handler);resolve(e.data.data)}
  window.addEventListener('message',handler);
  window.postMessage({source:'UAI_PLAYBACK_QUERY',id},location.origin);
 });
 try{
  const result=await replyData();
  if(result?.error)throw Error(result.error);
  if(!result?.mpds?.length)throw Error('MPD URLがありません');
  const parsed=[];
  for(const url of result.mpds){
   if(!enabled||location.href!==key)return;
   try{
    const r=await chrome.runtime.sendMessage({type:'FETCH',url});
    if(r?.error)throw Error(r.error);
    parsed.push(parsePlaylistMPD(r.text));
   }catch{}
  }
  if(!parsed.length)throw Error('MPDを解析できません');
  const videos=parsed.flatMap(x=>x.videos).sort((a,b)=>b.width*b.height-a.width*a.height);
  const rank=c=>/ec-3/i.test(c||'')?3:/ac-3/i.test(c||'')?2:/mp4a/i.test(c||'')?1:0;
  const audios=parsed.flatMap(x=>x.audios).sort((a,b)=>(b.channels||0)-(a.channels||0)||rank(b.codec)-rank(a.codec));
  const v=videos[0],a=audios[0],atmos=parsed.some(x=>x.atmos);
  if(enabled&&location.href===key){playlistHighest='映像 '+(v?q(v.width,v.height):'未確認')+' · 音声 '+(atmos?'Dolby Atmos ('+(a?.channels===6?'5.1ch':a?.channels===2?'2.0ch':a?.channels===1?'1.0ch':a?.channels?a.channels+'ch・配置未確認':'構成不明')+')':a?audio(a.codec,a.channels):'未確認');draw()}
 }catch(e){
  if(enabled&&location.href===key){playlistHighest='映像 取得不可 · 音声 取得不可';playlistRetryAt=Date.now()+15000;draw()}
 }finally{playlistBusy=false}
}

function draw(){
 const v=video(),w=v?.videoWidth||last?.video?.width||last?.track?.width||last?.stats?.width,h=v?.videoHeight||last?.video?.height||last?.track?.height;
 const identified=last?.track?.audioCodec?trackAudio(last.track):null;
 const text='現在：映像 '+q(w,h)+' · 音声 '+(identified||(mseAudio()||'取得不可'))+'\n最高品質：'+highestQuality();
 for(const el of document.querySelectorAll('.'+CLS))el.textContent=text;
}
async function reinject(){if(!enabled)return;try{await chrome.runtime.sendMessage({type:'PLAYBACK_HOOK'})}catch{}}
function query(){
 if(!enabled||!location.pathname.startsWith('/play/'))return;
 loadPlaylistHighest();
 mount();if(waiting)return;waiting=true;
 const id=++serial;let finished=false;
 function done(){if(finished)return;finished=true;waiting=false;clearTimeout(timer);window.removeEventListener('message',reply)}
 function reply(e){if(e.source!==window||e.data?.source!=='UAI_PLAYBACK_RESULT'||e.data?.id!==id)return;done();last=e.data.data;lastReply=Date.now();draw()}
 const timer=setTimeout(()=>{done();if(!lastReply||Date.now()-lastReply>6000)reinject();draw()},2000);
 window.addEventListener('message',reply);window.postMessage({source:'UAI_PLAYBACK_REQUEST',id},location.origin);
}
function setEnabled(next){const was=enabled;enabled=next;if(!enabled){playlistHighest=null;playlistKey='';last=null;lastReply=0;document.querySelectorAll('.'+CLS).forEach(e=>e.remove())}else if(!was){last=null;lastReply=0;reinject();query()}}
chrome.runtime.onMessage.addListener(m=>{if(m?.type==='UAI_ENABLED_CHANGED')setEnabled(m.enabled!==false)});
chrome.runtime.sendMessage({type:'UAI_GET_ENABLED'}).then(r=>setEnabled(r?.enabled!==false)).catch(()=>{});
let scheduled=false;
new MutationObserver(()=>{if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;mount()},350)}).observe(document.documentElement,{childList:true,subtree:true});
setInterval(()=>{if(!enabled)return;if(lastPath!==location.href){lastPath=location.href;playlistHighest=null;playlistKey='';playlistRetryAt=0;last=null;lastReply=0}query()},2500);
reinject();setTimeout(query,500);
})();