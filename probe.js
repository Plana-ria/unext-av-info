(()=>{if(window.__unextAvProbeLoaded)return;window.__unextAvProbeLoaded=true;

// Track title IDs passed through GraphQL POST requests during SPA navigation.
// Capture only public title identifiers; never store credentials or response bodies.
let observedTitle=null;
function recordTitle(source){
 try{
  const items=Array.isArray(source)?source:[source];
  for(const item of items){
   if(!item||typeof item!=='object')continue;
   const op=String(item.operationName||'');
   if(!['cosmo_getVideoTitle','cosmo_getVideoTitleEpisodes','cosmo_getVideoTitleRelatedStuffs'].includes(op))continue;
   const code=item.variables?.code;
   if(typeof code==='string'&&/^SID\d+$/.test(code)){
    observedTitle=code;
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
 if(e.source===window&&e.data?.source==='UAI_GET_TITLE'&&observedTitle)window.postMessage({source:'UAI_TITLE_FOUND',title:observedTitle},location.origin);
});
const hashes={episodes:'8bc4fa1b6e96812ac7836912a04eb511616511b10a25da8447d2afd389fd39dc',playlist:'a2309e22a6819ff747cf9a389dd78db35fa3c386fac1d53461061ba20fa44e34'};
function entries(){return performance.getEntriesByType('resource').map(e=>e.name)}
function route(){for(const name of entries().slice().reverse()){try{let u=new URL(name);if(u.hostname==='cc.unext.jp'&&u.searchParams.get('zxuid')&&u.searchParams.get('zxemp'))return {uid:u.searchParams.get('zxuid'),emp:u.searchParams.get('zxemp')}}catch{}}throw Error('API接続情報が取得できません。ページを再読み込みしてください')}
function sid(){const m=location.pathname.match(/SID\d+/);if(m)return m[0];if(observedTitle)return observedTitle;if(observedTitle)return observedTitle;for(const name of entries().slice().reverse()){try{const u=new URL(name);if(u.hostname!=='cc.unext.jp'||!['cosmo_getVideoTitle','cosmo_getVideoTitleEpisodes','cosmo_getVideoTitleRelatedStuffs'].includes(u.searchParams.get('operationName')))continue;const id=JSON.parse(u.searchParams.get('variables')||'{}').code;if(/^SID\d+$/.test(id))return id}catch{}}return null}
async function query(op,variables,hash){const r=route(),u=new URL('https://cc.unext.jp/');u.searchParams.set('zxuid',r.uid);u.searchParams.set('zxemp',r.emp);u.searchParams.set('operationName',op);u.searchParams.set('variables',JSON.stringify(variables));u.searchParams.set('extensions',JSON.stringify({persistedQuery:{version:1,sha256Hash:hash}}));
const version=(window.__NEXT_DATA__?.props?.pageProps?._sentryBaggage?.match(/sentry-release=([^,]+)/)?.[1]||'v130.1-prod-102c043').replace(/[^\w.-]/g,'');
const response=await fetch(u.href,{credentials:'include',headers:{accept:'*/*','content-type':'application/json','apollographql-client-name':'cosmo','apollographql-client-version':version}});if(!response.ok)throw Error(op+' HTTP '+response.status);const body=await response.json();if(body.errors?.length)throw Error(body.errors.map(e=>e.message).join('; ').slice(0,150));return body.data}
window.addEventListener('message',async e=>{const m=e.data;if(e.source!==window||m?.source!=='UAI_QUERY')return;const id=m.id;const send=data=>window.postMessage({source:'UAI_RESULT',id,data},location.origin);
try{const title=sid();if(!title)throw Error('作品IDを検出できません');
let ep=location.pathname.match(/ED\d+/)?.[0];if(!ep){const x=await query('cosmo_getVideoTitleEpisodes',{code:title,page:1,pageSize:20},hashes.episodes);ep=x?.webfront_title_titleEpisodes?.episodes?.[0]?.id;}
if(!ep)throw Error('エピソードIDを取得できません');
const x=await query('cosmo_getPlaylistUrl',{code:ep,playMode:'caption',bitrateLow:1500,bitrateHigh:null,validationOnly:false},hashes.playlist),info=x?.webfront_playlistUrl;if(!info)throw Error('プレイリスト情報がありません');
const profiles=(info.urlInfo||[]).flatMap(x=>x.movieProfile||[]);
const mpds=profiles.map(p=>p.playlistUrl).filter(s=>typeof s==='string'&&s.includes('.mpd')).map(s=>{const u=new URL(s);if(info.playToken)u.searchParams.set('play_token',info.playToken);return u.href});
send({title,ep,mpds:mpds.slice(0,3),codecs:[...new Set(profiles.flatMap(p=>(p.movieAudioList||[]).map(a=>a.audioType)))]});
}catch(err){send({error:String(err.message||err).slice(0,200)})}});
})();