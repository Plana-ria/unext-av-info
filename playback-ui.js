(()=>{if(window.__uaiPlaybackUi)return;window.__uaiPlaybackUi=true;
const CLS='uai-playback-info';let enabled=false,showPlayback=false,playlistHighest=null,playlistBusy=false,playlistKey='',playlistAttempts=0,playlistGeneration=0;let serial=0,waiting=false,last=null,lastReply=0,lastPath='';
function q(w,h){return !w||!h?'取得不可':h>=2160?'4K UHD':h>=1080?'Full HD':h>=720?'HD':h+'p'}
function audio(t,ch){const name=/ec-3/i.test(t)?'Dolby Digital Plus':/ac-3/i.test(t)?'Dolby Digital':/mp4a/i.test(t)?'AAC':'音声形式不明';return name+' ('+(ch===2?'2.0ch':ch===1?'1.0ch':ch===6?'5.1ch':ch?ch+'ch・配置未確認':'ch未確認')+')'}
function trackAudio(t){if(!t?.audioCodec)return '取得不可';return audio(t.audioCodec,t.channelsCount)}
function video(){return [...document.querySelectorAll('video')].find(v=>v.videoWidth&&v.videoHeight)||document.querySelector('video')}
function mount(){
 if(!enabled||!showPlayback){document.querySelectorAll('.'+CLS).forEach(e=>e.remove());return}
 if(!location.pathname.startsWith('/play/')){document.querySelectorAll('.'+CLS).forEach(e=>e.remove());return}
 for(const btn of document.querySelectorAll('[data-testid="player-setting-show"]')){
  const parent=btn.parentElement;if(!parent||parent.nextElementSibling?.classList.contains(CLS))continue;
  const el=document.createElement('span');el.className=CLS;
  el.style.cssText='display:inline-grid;grid-template-columns:max-content max-content max-content;column-gap:clamp(3px,min(1.1vw,1.7vh),13px);row-gap:clamp(1px,min(.4vw,.65vh),5px);align-items:center;margin:clamp(5px,min(1.3vw,2vh),15px) 8px 0 10px;padding:clamp(3px,min(.8vw,1.2vh),9px) clamp(4px,min(1vw,1.6vh),12px);border:1px solid rgba(255,255,255,.3);border-radius:8px;background:rgba(4,13,29,.75);color:white;font-size:clamp(8px,min(1.3vw,1.9vh),12px);line-height:1.4;white-space:nowrap;pointer-events:none;max-width:calc(100vw - 36px);overflow-x:auto';
  for(const [name,style] of [['empty',''],['video-head','color:#b3bfcd;font-size:.92em;font-weight:600'],['audio-head','color:#b3bfcd;font-size:.92em;font-weight:600'],['current-label','color:#b3bfcd;font-size:.92em'],['current-video','font-weight:600'],['current-audio','font-weight:600'],['highest-label','color:#b3bfcd;font-size:.92em'],['highest-video','font-weight:600'],['highest-audio','font-weight:600']]){
   const cell=document.createElement('span');cell.dataset.uaiCell=name;cell.style.cssText=style+';white-space:nowrap';el.append(cell);
  }
  el.querySelector('[data-uai-cell="video-head"]').textContent='映像';
  el.querySelector('[data-uai-cell="audio-head"]').textContent='音声';
  el.querySelector('[data-uai-cell="current-label"]').textContent='現在品質';
  el.querySelector('[data-uai-cell="highest-label"]').textContent='最高品質';
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
function resetPlaylist(){
 if(playlistBusy)window.postMessage({source:'UAI_CANCEL_PLAYBACK_QUERY',id:playlistKey+'|'+playlistGeneration},location.origin);
 playlistGeneration++;playlistBusy=false;playlistHighest=null;playlistKey='';playlistAttempts=0;
}
async function loadPlaylistHighest(){
 if(!enabled||!showPlayback||!location.pathname.startsWith('/play/')||playlistBusy)return;
 const key=location.href;
 if(playlistKey!==key){resetPlaylist();playlistKey=key}
 if(playlistHighest||playlistAttempts>=2)return;
 const generation=playlistGeneration,id='playback-'+generation+'-'+(++serial);
 playlistBusy=true;playlistAttempts++;
 const valid=()=>enabled&&location.href===key&&playlistGeneration===generation;
 const replyData=()=>new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{window.removeEventListener('message',handler);reject(Error('プレイリスト応答タイムアウト'))},12000);
  function handler(e){if(e.source!==window||e.data?.source!=='UAI_PLAYBACK_PLAYLIST_RESULT'||e.data.id!==id)return;clearTimeout(timer);window.removeEventListener('message',handler);resolve(e.data.data)}
  window.addEventListener('message',handler);
  window.postMessage({source:'UAI_PLAYBACK_QUERY',id},location.origin);
 });
 try{
  const result=await replyData();
  if(!valid())return;
  if(result?.error)throw Error(result.error);
  if(!result?.mpds?.length)throw Error('MPD URLがありません');
  const analyze=window.__uaiAnalyzePlaylist;
  if(typeof analyze!=='function')throw Error('共通MPD解析が利用できません');
  const summary=await analyze(result.mpds,valid);
  if(!valid())return;
  playlistHighest='映像 '+summary.video+' · 音声 '+summary.audio;
  draw();
 }catch(e){
  if(!valid())return;
  // Only transient network/time-out failures merit one retry; never repeat endlessly.
  const temporary=/タイムアウト|通信|network|fetch|HTTP 5\\d\\d/i.test(String(e?.message||e));
  if(!temporary||playlistAttempts>=2)playlistAttempts=2;
  playlistHighest=playlistAttempts>=2?'映像 取得不可 · 音声 取得不可':null;
  if(!playlistHighest)setTimeout(()=>{if(valid())loadPlaylistHighest()},1200);
  draw();
 }finally{if(valid())playlistBusy=false}
}

function draw(){
 const v=video(),w=v?.videoWidth||last?.video?.width||last?.track?.width||last?.stats?.width,h=v?.videoHeight||last?.video?.height||last?.track?.height;
 const currentVideo=q(w,h),currentAudio=last?.track?.audioCodec?trackAudio(last.track):(mseAudio()||'取得不可');
 const highest=playlistHighest;
 const separator=' · 音声 ';
 const index=highest?.indexOf(separator)??-1;
 const baseVideo=index>=0?highest.slice(0,index).replace(/^映像 /,''):'確認中';
 const fourk=window.__uai4kMatched?.()===true,dv=window.__uaiDvMatched?.()===true;
 const actual4k=/^4K UHD\b/.test(baseVideo);
 const enhanced=fourk&&!actual4k&&index>=0&&baseVideo!=='取得不可'&&baseVideo!=='確認中';
 const videoWith4k=enhanced?baseVideo.replace(/^(?:Full HD|HD|\d+p)/,'4K UHD'):baseVideo;
 const highestVideo=dv&&index>=0&&videoWith4k!=='取得不可'&&videoWith4k!=='確認中'?(videoWith4k.includes(' (')?videoWith4k.replace(' (',' Dolby Vision ('):videoWith4k+' Dolby Vision'):videoWith4k;
 const originalHighestAudio=index>=0?highest.slice(index+separator.length):'確認中';
 const highestAudio=window.__uaiAtmosMatched?.()===true?'Dolby Atmos':window.__uaiDolbyAudioMatched?.()===true?'Dolby Audio':originalHighestAudio;
 for(const el of document.querySelectorAll('.'+CLS)){
  const cells={currentVideo,currentAudio,highestVideo,highestAudio};
  for(const [name,value] of Object.entries(cells)){
   const cell=el.querySelector('[data-uai-cell="'+name.replace(/[A-Z]/g,x=>'-'+x.toLowerCase())+'"]');
   if(cell)cell.textContent=value;
  }
 }
}
async function reinject(){if(!enabled||!showPlayback)return;try{await chrome.runtime.sendMessage({type:'PLAYBACK_HOOK'})}catch{}}
function query(){
 if(!enabled||!showPlayback||!location.pathname.startsWith('/play/'))return;
 if(lastPath!==location.href){lastPath=location.href;resetPlaylist();last=null;lastReply=0}
 loadPlaylistHighest();
 mount();if(waiting)return;waiting=true;
 const id=++serial;let finished=false;
 function done(){if(finished)return;finished=true;waiting=false;clearTimeout(timer);window.removeEventListener('message',reply)}
 function reply(e){if(e.source!==window||e.data?.source!=='UAI_PLAYBACK_RESULT'||e.data?.id!==id)return;done();last=e.data.data;lastReply=Date.now();draw()}
 const timer=setTimeout(()=>{done();if(!lastReply||Date.now()-lastReply>6000)reinject();draw()},2000);
 window.addEventListener('message',reply);window.postMessage({source:'UAI_PLAYBACK_REQUEST',id},location.origin);
}
function setEnabled(next){const was=enabled;enabled=next;if(!enabled){resetPlaylist();last=null;lastReply=0;document.querySelectorAll('.'+CLS).forEach(e=>e.remove())}else if(!was&&showPlayback){last=null;lastReply=0;reinject();query()}}
chrome.runtime.onMessage.addListener(m=>{if(m?.type==='UAI_ENABLED_CHANGED')setEnabled(m.enabled!==false)});
chrome.storage.local.get('uaiShowPlayback').then(x=>{showPlayback=x.uaiShowPlayback!==false;if(!showPlayback){resetPlaylist();document.querySelectorAll('.'+CLS).forEach(e=>e.remove())}else if(enabled){reinject();query()}}).catch(()=>{});
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.uaiShowPlayback){showPlayback=changes.uaiShowPlayback.newValue!==false;if(!showPlayback){resetPlaylist();document.querySelectorAll('.'+CLS).forEach(e=>e.remove())}else if(enabled)query()}});
chrome.runtime.sendMessage({type:'UAI_GET_ENABLED'}).then(r=>setEnabled(r?.enabled!==false)).catch(()=>{});
let scheduled=false;
window.addEventListener('UAI_DV_UPDATED',draw);
new MutationObserver(()=>{if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;mount()},350)}).observe(document.documentElement,{childList:true,subtree:true});
setInterval(()=>{if(enabled)query()},2500);
reinject();setTimeout(query,500);
})();