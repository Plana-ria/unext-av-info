(()=>{if(window.__unextAvInfoActive)return;window.__unextAvInfoActive=true;
const ID='unext-av-info-card';let current='',busy=false,runId=0,lastUrl=location.href,resourceSince=performance.now();
function sid(){const m=location.pathname.match(/SID\d+/);if(m)return m[0];if(observedTitle)return observedTitle;const a=performance.getEntriesByType('resource').filter(e=>e.startTime>=resourceSince);for(let i=a.length-1;i>=0;i--){try{const u=new URL(a[i].name);if(u.hostname!=='cc.unext.jp'||!['cosmo_getVideoTitle','cosmo_getVideoTitleEpisodes','cosmo_getVideoTitleRelatedStuffs'].includes(u.searchParams.get('operationName')))continue;const id=JSON.parse(u.searchParams.get('variables')||'{}').code;if(/^SID\d+$/.test(id))return id}catch{}}return null}
function anchor(){return [...document.querySelectorAll('h2')].find(h=>h.textContent.trim()==='キャスト・スタッフ')?.parentElement}
let observedTitle=null;
window.addEventListener('message',e=>{
 if(e.source!==window||e.data?.source!=='UAI_TITLE_FOUND'||!/^SID\d+$/.test(e.data.title||''))return;
 if(observedTitle!==e.data.title){observedTitle=e.data.title;invalidate();schedule()}
});
window.postMessage({source:'UAI_GET_TITLE'},location.origin);
const rootOf=()=>document.getElementById(ID)?.shadowRoot;
function invalidate(){++runId;busy=false;current='';const links=rootOf()?.getElementById('official-links');if(links)links.hidden=true;render('準備中','確認中','作品情報を待っています','確認中','作品情報を待っています','','')}
function render(state,a,as,v,vs,note,detail){const sh=rootOf();if(!sh)return;for(const [k,value] of Object.entries({state,a,as,v,vs,note,detail}))sh.getElementById(k).textContent=value??'';sh.getElementById('note').hidden=!note;sh.getElementById('actions').hidden=state!=='取得失敗'}
function card(){const host=document.createElement('section');host.id=ID;const sh=host.attachShadow({mode:'open'});sh.innerHTML=`<style>
:host{display:block;width:100%;margin:0 0 42px;color:#edf4fc;font:inherit}*{box-sizing:border-box}.panel{background:rgba(24,37,54,.77);border:1px solid #415264;border-radius:14px;padding:22px}header{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px}h2{font-size:23px;font-weight:700;color:white;margin:0}.state{font-size:12px;color:#c5d6e8}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.metric{border:1px solid #3a4e62;background:rgba(255,255,255,.04);border-radius:10px;padding:16px;min-width:0}.label{font-size:12px;color:#b5c8d9;margin-bottom:7px}.primary{font-size:21px;font-weight:700;overflow-wrap:anywhere}.sub{font-size:12px;color:#c4d2de;margin-top:5px;overflow-wrap:anywhere}.official-links[hidden],.official-links .help-link[hidden]{display:none!important}.official-links{margin-top:14px;padding-top:12px;border-top:1px solid #415264}.official-links .help-link{display:block;width:fit-content;margin-top:8px}.help-link{display:inline-block;margin-top:10px;font-size:12px;color:#9bd4ff;text-decoration:underline;text-underline-offset:2px}.help-link:hover{color:#cdeaff}.help-link:focus-visible{outline:2px solid #9bd4ff;outline-offset:3px}.note[hidden]{display:none}.note{white-space:pre-line;font-size:11px;color:#b2c1d2;margin-top:14px;line-height:1.7}details{margin-top:15px;font-size:12px;color:#c3d3df}summary{cursor:pointer}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px;line-height:1.5}button{background:#29445f;border:1px solid #56718b;border-radius:7px;color:white;padding:8px 13px;cursor:pointer}#actions{margin-top:12px}#actions[hidden]{display:none!important}@media(max-width:650px){.grid{grid-template-columns:1fr}.panel{padding:15px}h2{font-size:19px}}</style>
<div class="panel"><header><h2>音声・映像の配信情報</h2><span id="state" class="state">準備中</span></header><div class="grid">
<div class="metric"><div class="label">音声</div><div class="primary" id="a">解析待ち</div><div class="sub" id="as">—</div></div>
<div class="metric"><div class="label">画質</div><div class="primary" id="v">解析待ち</div><div class="sub" id="vs">—</div></div></div>
<div class="note" id="note"></div><div class="official-links" id="official-links" hidden><div>U-NEXT公式の対応条件</div><a id="dolby-help" class="help-link" href="https://help.unext.jp/guide/detail/what-is-dolby-audio-and-dolby-atmos" target="_blank" rel="noopener noreferrer">Dolby音声の対応条件（U-NEXT公式） ↗</a><a id="fourk-help" class="help-link" href="https://help.unext.jp/guide/detail/what-is-4k" target="_blank" rel="noopener noreferrer">4K画質の対応条件（U-NEXT公式） ↗</a></div><div id="actions" hidden><button id="retry">再取得</button></div>
<details><summary>取得した詳細と注意事項</summary><pre id="detail"></pre></details></div>`;sh.getElementById('retry').onclick=run;return host}
function setOfficialHelpLinks(parsed){
 const sh=rootOf();if(!sh)return;
 const dolby=parsed.aud.some(t=>/^(ec-3|ac-3)/i.test(t.c));
 const fourk=parsed.vid.some(t=>t.w>=3840&&t.h>=2160);
 sh.getElementById('dolby-help').hidden=!dolby;
 sh.getElementById('fourk-help').hidden=!fourk;
 sh.getElementById('official-links').hidden=!(dolby||fourk);
}
function channel(t){const c=String(t.config||'').toUpperCase();if(c==='F801'&&/ec-3|ac-3/i.test(t.c))return '5.1ch';if(t.channels===1)return '1.0ch';if(t.channels===2)return '2.0ch';return t.channels?t.channels+'ch（構成未確認）':'構成不明'}
function codec(s){if(/ec-3/i.test(s))return 'Dolby Digital Plus';if(/ac-3/i.test(s))return 'Dolby Digital';if(/mp4a/i.test(s))return 'AAC';if(/hvc1|hev1/i.test(s))return 'HEVC';if(/avc1/i.test(s))return 'H.264';return s||'不明'}
function attrs(e,n){return e.getAttribute(n)}
function mpdParse(xml){const d=new DOMParser().parseFromString(xml,'application/xml');if(d.querySelector('parsererror'))throw Error('MPD XML解析エラー');
const aud=[],vid=[];for(const set of d.querySelectorAll('AdaptationSet')){const reps=[...set.children].filter(e=>e.localName==='Representation');for(const r of reps){const mime=attrs(r,'mimeType')||attrs(set,'mimeType')||'',c=attrs(r,'codecs')||attrs(set,'codecs')||'',base=attrs(r,'bandwidth'),w=+(attrs(r,'width')||attrs(set,'width')||0),h=+(attrs(r,'height')||attrs(set,'height')||0);if(!/audio/i.test(mime)&&!/^(ec-3|ac-3|mp4a)/i.test(c)){if(w||h)vid.push({w,h,c,bitrate:+base||0,fps:attrs(r,'frameRate')||attrs(set,'frameRate')||''});continue}
let ac=r.querySelector('AudioChannelConfiguration')||set.querySelector('AudioChannelConfiguration');const conf=ac?.getAttribute('value')||'';let channels=null;if(/^\d+$/.test(conf))channels=+conf;else if(/^F801$/i.test(conf)&&/ec-3|ac-3/i.test(c))channels=6;
aud.push({c,channels,config:conf,bitrate:+base||0,rate:attrs(r,'audioSamplingRate')||attrs(set,'audioSamplingRate')||'',representation:r,adaptation:set})}}
const mpdAtmos=[...d.querySelectorAll('SupplementalProperty,EssentialProperty')].some(p=>/EC3_ExtensionType/i.test(p.getAttribute('schemeIdUri')||'')&&/JOC/i.test(p.getAttribute('value')||'')&&!!aud.find(a=>/ec-3/i.test(a.c)));return{aud,vid,mpdAtmos,d}}
function parseDec3(bytes){for(let i=0;i+12<bytes.length;i++){if(bytes[i+4]!==100||bytes[i+5]!==101||bytes[i+6]!==99||bytes[i+7]!==51)continue;const n=(bytes[i]*16777216+bytes[i+1]*65536+bytes[i+2]*256+bytes[i+3])>>>0;if(n<8||i+n>bytes.length)continue;const p=bytes.slice(i+8,i+n);const hex=[...p].map(v=>v.toString(16).padStart(2,'0')).join(' ');return {hex,atmos:p.length>=7&&p[p.length-2]===1&&p[p.length-1]>0,bytes:p.length}}return null}
async function checkInit(parsed,mpdUrl){
const direct=(n,name)=>[...n?.children||[]].find(x=>x.localName===name);
const list=[];
const tracks=parsed.aud.filter(t=>/ec-3/i.test(t.c));let checked=0;
for(const t of tracks.slice(0,8)){checked++;
 try{
  const r=t.representation,adapt=t.adaptation;
  let base=mpdUrl;
  for(const n of [parsed.d.documentElement,direct(parsed.d.documentElement,'Period'),adapt,r]){
    const u=direct(n,'BaseURL')?.textContent?.trim();if(u)base=new URL(u,base).href;
  }
  const templ=direct(r,'SegmentTemplate')||direct(adapt,'SegmentTemplate');
  const sb=direct(r,'SegmentBase')||direct(adapt,'SegmentBase');
  let rel=templ?.getAttribute('initialization'),range='bytes=0-262143';
  if(rel){
    rel=rel.replace(/\$RepresentationID\$/g,r.getAttribute('id')||'').replace(/\$Bandwidth\$/g,r.getAttribute('bandwidth')||'');
    if(/\$[^$]+\$/.test(rel))throw Error('初期化セグメント変数の解決に失敗');
  }else{
    const init=direct(sb,'Initialization');
    if(!init)throw Error('初期化セグメントの記述なし');
    rel=init.getAttribute('sourceURL')||'';
    const raw=init.getAttribute('range');
    if(raw&&/^\d+-\d+$/.test(raw)){let [x,y]=raw.split('-').map(Number);range='bytes='+x+'-'+Math.min(y,x+262143);}
  }
  const url=new URL(rel||'',base);
  const response=await chrome.runtime.sendMessage({type:'FETCH',url:url.href,range});
  if(response?.error)throw Error(response.error);
  const bin=atob(response.base64||''),bytes=Uint8Array.from(bin,x=>x.charCodeAt(0));
  const box=parseDec3(bytes);
  list.push(box?'dec3: '+box.hex+(box.atmos?' / Atmos拡張フラグあり':' / Atmos識別未確認'):'dec3未検出');
  if(box?.atmos)return {atmos:true,details:list.join('\n')};
 }catch(e){list.push('初期化セグメント: '+String(e.message||e).slice(0,160));}
}
return {atmos:false,details:(list.join('\n')||'初期化情報なし')+(tracks.length>checked?'\n未検査のE-AC-3トラック: '+(tracks.length-checked):'')};
}

function fpsNumber(s){if(!s)return 24;const [n,d]=String(s).split('/').map(Number);return Number.isFinite(n)&&n>0&&(!d||d>0)?n/(d||1):24}
function channelCount(a){return Number(a.channels)||(/F801/i.test(a.config)&&/ec-3|ac-3/i.test(a.c)?6:0)}
function audioLabel(a){return codec(a.c)+' ('+channel(a)+')'}
function videoLabel(v){return v.h>=2160?'4K UHD':v.h>=1080?'Full HD':v.h>=720?'HD':v.h+'p'}
function makeCapabilitiesConfig(v,a){return {
 type:'media-source',
 video:{contentType:'video/mp4; codecs="'+v.c+'"',width:v.w,height:v.h,bitrate:Math.max(1,v.bitrate),framerate:fpsNumber(v.fps)},
 audio:{contentType:'audio/mp4; codecs="'+a.c+'"',channels:String(channelCount(a)),bitrate:Math.max(1,a.bitrate),samplerate:Number(a.rate)||48000,spatialRendering:false},
 keySystemConfiguration:{keySystem:'com.widevine.alpha',initDataType:'cenc',
 persistentState:'optional',distinctiveIdentifier:'optional',sessionTypes:['temporary'],
 audio:{robustness:'SW_SECURE_CRYPTO',encryptionScheme:'cenc'},
 video:{robustness:'SW_SECURE_CRYPTO',encryptionScheme:'cenc'}}
}}
async function checkPlaybackCapabilities(videos,audios,atmos){
 if(!navigator.mediaCapabilities?.decodingInfo)return {note:'この環境での再生対応判定は利用できません。最高品質での視聴にはU-NEXTの対応端末が必要になる場合があります。',detail:'MediaCapabilities API が利用できません'};
 if(!videos.length||!audios.length)return {note:'この環境での再生対応判定は確認できません。',detail:'音声または映像トラックが取得できません'};
 const combinations=[];
 const results=[];
 for(const v of videos)for(const a of audios){
  if(!channelCount(a)||!v.w||!v.h||!v.c||!a.c)results.push({v,a,state:'unknown'});
  else combinations.push({v,a});
 }
 // Bound concurrent MediaCapabilities queries to avoid stressing the title page.
 for(let i=0;i<combinations.length;i+=4){
 const batch=await Promise.all(combinations.slice(i,i+4).map(async x=>{
  try{const r=await navigator.mediaCapabilities.decodingInfo(makeCapabilitiesConfig(x.v,x.a));return {...x,state:r.supported?'yes':'no'}}
  catch(e){return {...x,state:'unknown'}}
 }));results.push(...batch);
 }
 const supported=results.filter(r=>r.state==='yes'),unknown=results.filter(r=>r.state==='unknown');
 if(!supported.length)return {note:'この環境で再生可能な音声・映像の組み合わせを確認できませんでした。',detail:'対応判定: 対応 '+supported.length+'件 / 非対応 '+results.filter(r=>r.state==='no').length+'件 / 未判定 '+unknown.length+'件'};
 const bestVideo=supported.map(x=>x.v).sort((x,y)=>y.w*y.h-x.w*x.h||y.bitrate-x.bitrate)[0];
 const bestAudio=supported.map(x=>x.a).sort((x,y)=>channelCount(y)-channelCount(x)||(/ec-3/i.test(y.c)?1:0)-(/ec-3/i.test(x.c)?1:0)||y.bitrate-x.bitrate)[0];
 const videoBest=videos.slice().sort((a,b)=>b.w*b.h-a.w*a.h)[0];
 const audioBest=audios.slice().sort((a,b)=>channelCount(b)-channelCount(a)||(/ec-3/i.test(b.c)?1:0)-(/ec-3/i.test(a.c)?1:0)||b.bitrate-a.bitrate)[0];
 const videoSame=bestVideo.w===videoBest.w&&bestVideo.h===videoBest.h&&bestVideo.c===videoBest.c;
 const audioSame=bestAudio.c===audioBest.c&&channelCount(bestAudio)===channelCount(audioBest);
 const videoUnknown=unknown.some(x=>x.v.w*x.v.h>=videoBest.w*videoBest.h&&x.v.c===videoBest.c);
 const audioUnknown=unknown.some(x=>x.a.c===audioBest.c&&channelCount(x.a)===channelCount(audioBest));
 const simultaneous=supported.some(x=>x.v===bestVideo&&x.a===bestAudio);
 const details='Widevine (SW_SECURE_CRYPTO / cenc) / 対応 '+supported.length+'件 / 非対応 '+results.filter(r=>r.state==='no').length+'件 / 未判定 '+unknown.length+'件 / 個別最大品質の同時再生: '+(simultaneous?'対応判定あり':'対応判定なし');
 const notices=[];
 if(!videoSame){
  if(videoUnknown)notices.push('画質：最高画質の再生対応状況を確認できませんでした。');
  else notices.push('画質：この環境では最大 '+videoLabel(bestVideo)+'（'+codec(bestVideo.c)+'）での再生が可能と判定されました。最高画質で視聴するにはU-NEXTの対応端末で再生する必要があります。');
 }
 if(!audioSame){
  if(audioUnknown)notices.push('音声：最高音質の再生対応状況を確認できませんでした。');
  else notices.push('音声：この環境では最大 '+audioLabel(bestAudio)+' での再生が可能と判定されました。最高音質で視聴するにはU-NEXTの対応端末で再生する必要があります。');
 }
 return {note:notices.join('\n'),detail:details};
}
async function run(title=sid()){if(!title)return;const id=++runId,requestUrl=location.href;const valid=()=>id===runId&&location.href===requestUrl&&sid()===title;busy=true;const links=rootOf()?.getElementById('official-links');if(links)links.hidden=true;render('照会中','確認中','音声情報を取得中','確認中','画質情報を取得中','配信情報を解析しています。','');
const fail=e=>{if(!valid())return;busy=false;render('取得失敗','判定不能','音声情報を取得できませんでした','判定不能','画質情報を取得できませんでした',String(e.message||e),'エラー: '+String(e.message||e))};
try{const injected=await chrome.runtime.sendMessage({type:'INJECT'});if(injected?.error)throw Error(injected.error);
const data=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{window.removeEventListener('message',handler);reject(Error('API応答タイムアウト'))},16000);function handler(e){if(e.source!==window||e.data?.source!=='UAI_RESULT'||e.data.id!==id)return;clearTimeout(timer);window.removeEventListener('message',handler);resolve(e.data.data)}window.addEventListener('message',handler);window.postMessage({source:'UAI_QUERY',id,title},location.origin)});
if(!valid())return;if(data.title&&data.title!==title)throw Error('作品IDが一致しません');if(data.error)throw Error(data.error);if(!data.mpds?.length)throw Error('MPD URLを取得できませんでした');let last;
for(const url of data.mpds){try{const r=await chrome.runtime.sendMessage({type:'FETCH',url});if(r?.error)throw Error(r.error);const parsed=mpdParse(r.text);if(!parsed.aud.length&&!parsed.vid.length)throw Error('MPDに映像・音声情報がありません');
const init=await checkInit(parsed,url);if(!valid())return;setOfficialHelpLinks(parsed);
const aud=parsed.aud.sort((a,b)=>channelCount(b)-channelCount(a)||(/ec-3/i.test(b.c)?1:0)-(/ec-3/i.test(a.c)?1:0)||b.bitrate-a.bitrate),a=aud[0],best=parsed.vid.sort((a,b)=>b.w*b.h-a.w*a.h)[0];
const atmos=parsed.mpdAtmos||init.atmos;const audioMain=atmos?'Dolby Atmos':a?channel(a):'不明',audioSub=a?codec(a.c):'音声情報なし';
const videoMain=!best?'不明':best.h>=2160?'4K UHD':best.h>=1080?'Full HD':best.h>=720?'HD':best.h+'p',videoSub=best?best.w+'×'+best.h+' / '+codec(best.c):'映像情報なし';
const note='この環境での再生対応状況を確認中です。';
const detail='作品: '+data.title+' / '+data.ep+'\nAtmos(MPD): '+(parsed.mpdAtmos?'検出':'未確認')+'\n'+init.details+'\n音声:\n'+aud.map(t=>codec(t.c)+' / '+channel(t)+' / '+t.bitrate+'bps / '+t.rate+'Hz').join('\n')+'\n映像:\n'+parsed.vid.map(t=>t.w+'×'+t.h+' / '+codec(t.c)+' / '+t.bitrate+'bps').join('\n')+'\n※MPDにある配信候補であり、実際の再生形式は端末によります。';
render('解析完了',audioMain,audioSub,videoMain,videoSub,note,detail);
const capability=await checkPlaybackCapabilities(parsed.vid,parsed.aud,atmos);
if(!valid())return;
render('解析完了',audioMain,audioSub,videoMain,videoSub,capability.note,detail+'\n再生対応判定: '+capability.detail);
busy=false;return;
}catch(e){last=e}}throw last||Error('MPD解析失敗')}
catch(e){fail(e)}}
function attach(){
 const target=anchor();
 if(!target){if(current)invalidate();document.getElementById(ID)?.remove();return}
 let host=document.getElementById(ID);const fresh=!host;if(!host)host=card();
 if(host.nextElementSibling!==target||host.parentElement!==target.parentElement)target.before(host);
 const title=sid();
 if(!title){
  if(current!=='waiting'){invalidate();current='waiting';render('準備中','確認中','作品情報を待っています','確認中','作品情報を待っています','作品情報の読み込みを待っています。','')}
  return;
 }
 const key=title+'|'+location.pathname;
 if(key!==current||fresh){if(current&&current!==key)invalidate();current=key;run(title)}
}
let pending=false;function schedule(){if(pending)return;pending=true;setTimeout(()=>{pending=false;attach()},300)}
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
setInterval(()=>{if(lastUrl!==location.href){lastUrl=location.href;resourceSince=performance.now();observedTitle=null;invalidate();window.postMessage({source:'UAI_GET_TITLE',fresh:true},location.origin);schedule()}else if(anchor()&&(!sid()||!document.getElementById(ID)))schedule()},700);
schedule()})();