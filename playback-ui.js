(()=>{if(window.__uaiPlaybackUi)return;window.__uaiPlaybackUi=true;
const CLS='uai-playback-info';let enabled=false;let serial=0,waiting=false,last=null,lastReply=0,lastPath='';
function q(w,h){return !w||!h?'取得不可':h>=2160?'4K':h>=1080?'1080p':h>=720?'720p':h+'p'}
function audio(t,ch){const name=/ec-3/i.test(t)?'Dolby Digital Plus':/ac-3/i.test(t)?'Dolby Digital':/mp4a/i.test(t)?'AAC':'音声形式不明';return name+' ('+(ch===2?'2.0ch':ch===1?'1.0ch':ch===6?'6ch・配置未確認':ch?ch+'ch・配置未確認':'ch未確認')+')'}
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
 const variants=(last?.variants||[]).filter(x=>x.allowedByApplication!==false&&x.allowedByKeySystem!==false);
 if(!variants.length)return '映像 取得不可 · 音声 取得不可';
 const videoBest=variants.filter(x=>x.width>0&&x.height>0).sort((a,b)=>(b.width*b.height)-(a.width*a.height))[0];
 const audioRank=x=>/ec-3/i.test(x.audioCodec||'')?3:/ac-3/i.test(x.audioCodec||'')?2:/mp4a/i.test(x.audioCodec||'')?1:0;
 const audioBest=variants.filter(x=>x.audioCodec).sort((a,b)=>audioRank(b)-audioRank(a)||(Number(b.channelsCount)||0)-(Number(a.channelsCount)||0)||(b.bandwidth||0)-(a.bandwidth||0))[0];
 return '映像 '+(videoBest?q(videoBest.width,videoBest.height):'取得不可')+' · 音声 '+(audioBest?trackAudio(audioBest):'取得不可');
}
function draw(){
 const v=video(),w=v?.videoWidth||last?.video?.width||last?.track?.width||last?.stats?.width,h=v?.videoHeight||last?.video?.height||last?.track?.height;
 const identified=last?.track?.audioCodec?trackAudio(last.track):null;
 const text='現在：映像 '+q(w,h)+' · 音声 '+(identified||(mseAudio()||'取得不可'))+'\n候補最高：'+highestQuality();
 for(const el of document.querySelectorAll('.'+CLS))el.textContent=text;
}
async function reinject(){if(!enabled)return;try{await chrome.runtime.sendMessage({type:'PLAYBACK_HOOK'})}catch{}}
function query(){
 if(!enabled||!location.pathname.startsWith('/play/'))return;
 mount();if(waiting)return;waiting=true;
 const id=++serial;let finished=false;
 function done(){if(finished)return;finished=true;waiting=false;clearTimeout(timer);window.removeEventListener('message',reply)}
 function reply(e){if(e.source!==window||e.data?.source!=='UAI_PLAYBACK_RESULT'||e.data?.id!==id)return;done();last=e.data.data;lastReply=Date.now();draw()}
 const timer=setTimeout(()=>{done();if(!lastReply||Date.now()-lastReply>6000)reinject();draw()},2000);
 window.addEventListener('message',reply);window.postMessage({source:'UAI_PLAYBACK_REQUEST',id},location.origin);
}
function setEnabled(next){const was=enabled;enabled=next;if(!enabled){last=null;lastReply=0;document.querySelectorAll('.'+CLS).forEach(e=>e.remove())}else if(!was){last=null;lastReply=0;reinject();query()}}
chrome.runtime.onMessage.addListener(m=>{if(m?.type==='UAI_ENABLED_CHANGED')setEnabled(m.enabled!==false)});
chrome.runtime.sendMessage({type:'UAI_GET_ENABLED'}).then(r=>setEnabled(r?.enabled!==false)).catch(()=>{});
let scheduled=false;
new MutationObserver(()=>{if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;mount()},350)}).observe(document.documentElement,{childList:true,subtree:true});
setInterval(()=>{if(!enabled)return;if(lastPath!==location.pathname){lastPath=location.pathname;last=null;lastReply=0}query()},2500);
reinject();setTimeout(query,500);
})();