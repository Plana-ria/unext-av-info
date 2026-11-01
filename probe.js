(()=>{if(window.__unextAvProbeLoaded)return;window.__unextAvProbeLoaded=true;

// Track title IDs passed through GraphQL POST requests during SPA navigation.
// Capture only public title identifiers; never store credentials or response bodies.
let observedTitle=null,observedRoute=null,observedEpisode=null,observedEpisodeRoute=null,extensionEnabled=false;
function recordTitle(source){
 try{
  const items=Array.isArray(source)?source:[source];
  for(const item of items){
   if(!item||typeof item!=='object')continue;
   const op=String(item.operationName||'');
   if(!['cosmo_getVideoTitle','cosmo_getVideoTitleEpisodes','cosmo_getVideoTitleRelatedStuffs','cosmo_getPlaylistUrl'].includes(op))continue;
   const code=item.variables?.code;
   if(op==='cosmo_getPlaylistUrl'&&typeof code==='string'&&/^ED\\d+$/.test(code)){observedEpisode=code;observedEpisodeRoute=location.href;window.postMessage({source:'UAI_EPISODE_FOUND',episode:code},location.origin)}
   if(typeof code==='string'&&/^SID\d+$/.test(code)){
    observedTitle=code;observedRoute=location.href;
    window.postMessage({source:'UAI_TITLE_FOUND',title:code},location.origin);
   }
  }
 }catch{}
}
function inspectBody(body){
 try{
  if(typeof body==='string'){recordTitle(JSON.parse(body));return}
  if(body instanceof URLSearchParams){const op=body.get('operationName');recordTitle({operationName:op,variables:JSON.parse(body.get('variables')||'{}')});}
 }catch{}
}
function inspectRequest(url,body){
 try{
  const u=new URL(typeof url==='string'?url:url?.url||'',location.href);
  if(u.hostname!=='cc.unext.jp')return;
  const op=u.searchParams.get('operationName');
  if(op)recordTitle({operationName:op,variables:JSON.parse(u.searchParams.get('variables')||'{}')});
  inspectBody(body);
 }catch{}
}
const originalFetch=window.fetch;
if(typeof originalFetch==='function')window.fetch=function(input,init){
 try{inspectRequest(input,init?.body);if(!init?.body&&input instanceof Request&&input.method==='POST'&&new URL(input.url,location.href).hostname==='cc.unext.jp')input.clone().text().then(inspectBody).catch(()=>{});}catch{}
 return originalFetch.apply(this,arguments);
};
const originalOpen=XMLHttpRequest.prototype.open,originalSend=XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.open=function(method,url){
 try{this.__uaiRequestUrl=String(url);inspectRequest(url,null);}catch{}
 return originalOpen.apply(this,arguments);
};
XMLHttpRequest.prototype.send=function(body){
 try{inspectRequest(this.__uaiRequestUrl,body);}catch{}
 return originalSend.apply(this,arguments);
};
window.addEventListener('message',e=>{
 if(e.source!==window||e.data?.source!=='UAI_GET_TITLE'||!extensionEnabled)return;
 if(e.data.fresh&&observedRoute!==location.href){observedTitle=null;observedRoute=null}
 if(observedTitle)window.postMessage({source:'UAI_TITLE_FOUND',title:observedTitle},location.origin);
 if(observedEpisode)window.postMessage({source:'UAI_EPISODE_FOUND',episode:observedEpisode},location.origin);
});
const hashes={episodes:'8bc4fa1b6e96812ac7836912a04eb511616511b10a25da8447d2afd389fd39dc',playlist:'a2309e22a6819ff747cf9a389dd78db35fa3c386fac1d53461061ba20fa44e34'};
function entries(){return performance.getEntriesByType('resource').map(e=>e.name)}
function route(){for(const name of entries().slice().reverse()){try{let u=new URL(name);if(u.hostname==='cc.unext.jp'&&u.searchParams.get('zxuid')&&u.searchParams.get('zxemp'))return {uid:u.searchParams.get('zxuid'),emp:u.searchParams.get('zxemp')}}catch{}}throw Error('API接続情報が取得できません。ページを再読み込みしてください')}
function sid(){const m=location.pathname.match(/SID\d+/);if(m)return m[0];if(observedTitle)return observedTitle;for(const name of entries().slice().reverse()){try{const u=new URL(name);if(u.hostname!=='cc.unext.jp'||!['cosmo_getVideoTitle','cosmo_getVideoTitleEpisodes','cosmo_getVideoTitleRelatedStuffs'].includes(u.searchParams.get('operationName')))continue;const id=JSON.parse(u.searchParams.get('variables')||'{}').code;if(/^SID\d+$/.test(id))return id}catch{}}return null}
async function query(op,variables,hash,signal){const r=route(),u=new URL('https://cc.unext.jp/');u.searchParams.set('zxuid',r.uid);u.searchParams.set('zxemp',r.emp);u.searchParams.set('operationName',op);u.searchParams.set('variables',JSON.stringify(variables));u.searchParams.set('extensions',JSON.stringify({persistedQuery:{version:1,sha256Hash:hash}}));
const version=(window.__NEXT_DATA__?.props?.pageProps?._sentryBaggage?.match(/sentry-release=([^,]+)/)?.[1]||'v130.1-prod-102c043').replace(/[^\w.-]/g,'');
const response=await fetch(u.href,{credentials:'include',signal,headers:{accept:'*/*','content-type':'application/json','apollographql-client-name':'cosmo','apollographql-client-version':version}});if(!response.ok)throw Error(op+' HTTP '+response.status);const body=await response.json();if(body.errors?.length)throw Error(op+': '+body.errors.map(e=>e.message).join('; ').slice(0,150));return body.data}
const activeQueries=new Map();
window.addEventListener('message',e=>{if(e.source!==window||e.data?.source!=='UAI_SET_ENABLED')return;extensionEnabled=e.data.enabled===true;if(!extensionEnabled){for(const controller of activeQueries.values())controller.abort();activeQueries.clear()}});
window.addEventListener('message',e=>{if(e.source!==window||e.data?.source!=='UAI_CANCEL_QUERY')return;const id=String(e.data.id||'');for(const [key,controller] of activeQueries){if(key.startsWith(id+'-')){controller.abort();activeQueries.delete(key)}}});
window.addEventListener('message',async e=>{const m=e.data;if(e.source!==window||m?.source!=='UAI_QUERY'||!extensionEnabled)return;const id=m.id;const controller=new AbortController();activeQueries.set(String(id),controller);const send=data=>window.postMessage({source:'UAI_RESULT',id,data},location.origin);
try{const title=m.title;if(!/^SID\d+$/.test(title||''))throw Error('作品IDを検出できません');
const requestUrl=location.href;const stillCurrent=()=>extensionEnabled&&!controller.signal.aborted&&location.href===requestUrl;
if(!stillCurrent())return;
let ep=location.pathname.match(/ED\d+/)?.[0];if(!ep){const x=await query('cosmo_getVideoTitleEpisodes',{code:title,page:1,pageSize:20},hashes.episodes,controller.signal);if(!stillCurrent())return;ep=x?.webfront_title_titleEpisodes?.episodes?.[0]?.id;}
if(!stillCurrent())return;
if(!ep)throw Error('エピソードIDを取得できません');
const x=await query('cosmo_getPlaylistUrl',{code:ep,playMode:'caption',bitrateLow:1500,bitrateHigh:null,validationOnly:false},hashes.playlist,controller.signal),info=x?.webfront_playlistUrl;if(!info)throw Error('プレイリスト情報がありません');
if(!stillCurrent())return;
const profiles=(info.urlInfo||[]).flatMap(x=>x.movieProfile||[]);
const mpds=profiles.map(p=>p.playlistUrl).filter(s=>typeof s==='string'&&s.includes('.mpd')).map(s=>{const u=new URL(s);if(info.playToken)u.searchParams.set('play_token',info.playToken);return u.href});
send({title,ep,mpds:mpds.slice(0,3),codecs:[...new Set(profiles.flatMap(p=>(p.movieAudioList||[]).map(a=>a.audioType)))]});
}catch(err){if(!controller.signal.aborted)send({title:m.title,error:String(err.message||err).slice(0,200)})}finally{activeQueries.delete(String(id))}});
window.addEventListener('message',e=>{
 if(e.source!==window||e.data?.source!=='UAI_CANCEL_PLAYBACK_QUERY')return;
 for(const [id,controller] of activeQueries)if(id.startsWith('playback-')){controller.abort();activeQueries.delete(id)}
});
window.addEventListener('message',async e=>{
 const m=e.data;if(e.source!==window||m?.source!=='UAI_PLAYBACK_QUERY'||!extensionEnabled)return;
 const id=String(m.id||'');const ctrl=new AbortController();activeQueries.set(id,ctrl);
 const send=data=>window.postMessage({source:'UAI_PLAYBACK_PLAYLIST_RESULT',id,data},location.origin);
 try{
  const page=location.href;
  let episode=location.pathname.match(/ED\d+/)?.[0]||(observedEpisodeRoute===location.href?observedEpisode:null);
  if(!episode)throw Error('再生エピソードID未検出');
  const x=await query('cosmo_getPlaylistUrl',{code:episode,playMode:'caption',bitrateLow:1500,bitrateHigh:null,validationOnly:false},hashes.playlist,ctrl.signal);
  if(ctrl.signal.aborted||!extensionEnabled||location.href!==page)return;
  const info=x?.webfront_playlistUrl;if(!info)throw Error('プレイリスト情報なし');
  const profiles=(info.urlInfo||[]).flatMap(x=>x.movieProfile||[]);
  const urls=profiles.map(p=>p.playlistUrl).filter(u=>typeof u==='string'&&u.includes('.mpd')).map(str=>{const u=new URL(str);if(info.playToken)u.searchParams.set('play_token',info.playToken);return u.href});
  send({episode,mpds:[...new Set(urls)].slice(0,3)});
 }catch(err){if(!ctrl.signal.aborted)send({error:String(err.message||err).slice(0,160)})}
 finally{activeQueries.delete(id)}
});


const featureHash='853a073696b3f87faccf8c1f134a6085f3d16706e0d037a4426707bf40bb0fe3';
const featureCodes={dv:'FET0009245',fourk:'FET0008865',atmos:'FET0008864'};
window.addEventListener('message',async e=>{
 const m=e.data;
 if(e.source!==window||m?.source!=='UAI_FEATURE_QUERY'||!extensionEnabled)return;
 const featureCode=featureCodes[m.kind];
 if(!featureCode)return;
 const id=String(m.id||''),controller=new AbortController(),key='feature-'+id;
 activeQueries.set(key,controller);
 const send=data=>window.postMessage({source:'UAI_FEATURE_RESULT',id,kind:m.kind,data},location.origin);
 try{
  const fetchPage=async page=>{
   const data=await query('cosmo_VideoFeature',{featureCode,page,pageSize:20},featureHash,controller.signal);
   const feature=data?.webfront_feature;
   if(feature?.id!==featureCode||!feature.pageInfo||!Array.isArray(feature.titles))throw Error('特集API応答形式が一致しません');
   if(Number(feature.pageInfo.page)!==page)throw Error('ページ番号が一致しません');
   return feature;
  };
  const first=await fetchPage(1);
  const pages=Number(first.pageInfo.pages),expected=Number(first.pageInfo.results);
  if(!Number.isInteger(pages)||pages<1||pages>100||!Number.isInteger(expected)||expected<1)throw Error('ページ情報が不正です');
  const results=new Array(pages);results[0]=first.titles;
  let next=2;
  const worker=async()=>{while(next<=pages&&!controller.signal.aborted){const page=next++;const result=await fetchPage(page);if(Number(result.pageInfo.pages)!==pages||Number(result.pageInfo.results)!==expected)throw Error('取得中に一覧が変更されました');results[page-1]=result.titles}};
  await Promise.all(Array.from({length:Math.min(4,pages-1)},worker));
  if(controller.signal.aborted)return;
  const ids=results.flat().map(t=>t?.id);
  if(ids.length!==expected||ids.some(v=>typeof v!=='string'||!/^SID\d+$/.test(v))||new Set(ids).size!==expected)throw Error('作品一覧の取得が不完全です');
  send({ids,pages});
 }catch(err){if(!controller.signal.aborted)send({error:String(err.message||err).slice(0,160)})}
 finally{activeQueries.delete(key)}
});
})();