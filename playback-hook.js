(()=>{if(window.__uaiPlaybackHook)return;window.__uaiPlaybackHook=true;
let player=null;
let observedManifest=null,manifestPage=location.href;
function parseManifest(xml){
 try{
  if(typeof xml!=='string'||xml.length>3000000||!/<MPD[\s>]/i.test(xml))return;
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  if(doc.querySelector('parsererror'))return;
  const video=[],audio=[];
  for(const ad of doc.querySelectorAll('AdaptationSet')){
   const mime=ad.getAttribute('mimeType')||'',kind=ad.getAttribute('contentType')||'';
   for(const rep of ad.querySelectorAll('Representation')){
    const codec=rep.getAttribute('codecs')||ad.getAttribute('codecs')||'';
    const width=Number(rep.getAttribute('width')||ad.getAttribute('width'))||0,height=Number(rep.getAttribute('height')||ad.getAttribute('height'))||0;
    const channelsNode=rep.querySelector('AudioChannelConfiguration')||ad.querySelector('AudioChannelConfiguration');
    const channels=Number(channelsNode?.getAttribute('value'))||0;
    if(kind==='video'||mime.startsWith('video/')||width&&height)video.push({width,height,codec});
    else if(kind==='audio'||mime.startsWith('audio/')||/^(ec-3|ac-3|mp4a)/i.test(codec))audio.push({codec,channels});
   }
  }
  if(video.length||audio.length)observedManifest={video,audio};
 }catch{}
}
function inspectManifestUrl(url){try{return /\.mpd(?:[?#]|$)/i.test(new URL(url,location.href).pathname)}catch{return false}}
function looksLikeManifest(contentType){return /dash\+xml|mpegurl|application\/xml/i.test(contentType||'')}
function readPlayerManifest(p){
 try{
  const m=p?.getManifest?.();if(!m?.variants?.length)return null;
  return {video:m.variants.flatMap(v=>v.video?[{width:v.video.width||0,height:v.video.height||0,codec:v.video.codecs||''}]:[]),audio:m.variants.flatMap(v=>v.audio?[{codec:v.audio.codecs||'',channels:Number(v.audio.channelsCount)||0}]:[])};
 }catch{return null}
}
const nativeFetch=window.fetch;
if(typeof nativeFetch==='function'){
 window.fetch=function(...args){
  const result=nativeFetch.apply(this,args);
  try{const url=typeof args[0]==='string'?args[0]:args[0]?.url;result.then(r=>{if(r.ok&&(inspectManifestUrl(url)||looksLikeManifest(r.headers.get('content-type'))))r.clone().text().then(parseManifest).catch(()=>{})}).catch(()=>{})}catch{}
  return result;
 };
}
const xhrOpen=XMLHttpRequest.prototype.open,xhrSend=XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.open=function(method,url){this.__uaiManifestUrl=inspectManifestUrl(url);return xhrOpen.apply(this,arguments)};
XMLHttpRequest.prototype.send=function(){
 this.addEventListener('load',()=>{
  try{if(this.status>=200&&this.status<300&&(this.__uaiManifestUrl||looksLikeManifest(this.getResponseHeader('content-type')))){
   if(this.responseType==='arraybuffer'&&this.response instanceof ArrayBuffer)parseManifest(new TextDecoder().decode(this.response));
   else if(!this.responseType||this.responseType==='text')parseManifest(this.responseText);
  }}catch{}
 },{once:true});
 return xhrSend.apply(this,arguments);
};

const mse={sourceBuffers:[],appendCount:0,errors:[],hooked:false};
function sniff(x){
 const entries=[];
 for(let i=4;i+28<x.length;i++){
  const type=String.fromCharCode(...x.subarray(i,i+4));
  if(!['mp4a','ec-3','ac-3','enca'].includes(type))continue;
  const start=i-4,size=(((x[start]*16777216+x[start+1]*65536+x[start+2]*256+x[start+3])>>>0));
  const channels=(x[start+24]<<8)|x[start+25],sampleSize=(x[start+26]<<8)|x[start+27];
  if(size>=36&&start+size<=x.length&&channels>=1&&channels<=16&&sampleSize>=8&&sampleSize<=32)entries.push({type,channels,sampleSize});
 }
 return entries;
}
function install(){
 for(const klass of [window.MediaSource,window.ManagedMediaSource]){
  const p=klass?.prototype;if(!p?.addSourceBuffer||p.addSourceBuffer.__uaiWrapped)continue;
  const original=p.addSourceBuffer;
  function wrapped(mime){
   const result=original.apply(this,arguments),rec={mime:String(mime).slice(0,180),appends:0,initSniff:null};
   mse.sourceBuffers.push(rec);if(mse.sourceBuffers.length>24)mse.sourceBuffers.shift();
   try{
    const old=result.appendBuffer;
    result.appendBuffer=function(bytes){
     rec.appends++;mse.appendCount++;
     if(!rec.initSniff&&bytes&&rec.appends<=3){
      const x=new Uint8Array(bytes instanceof ArrayBuffer?bytes:bytes.buffer,bytes.byteOffset||0,Math.min(bytes.byteLength,65536));
      const str=new TextDecoder('latin1').decode(x);
      rec.initSniff={mp4a:str.includes('mp4a'),ec3:str.includes('ec-3')||str.includes('dec3'),ac3:str.includes('ac-3'),audioEntries:sniff(x)};
     }
     return old.apply(this,arguments);
    };
   }catch(e){mse.errors.push(String(e).slice(0,80))}
   return result;
  }
  wrapped.__uaiWrapped=true;
  try{p.addSourceBuffer=wrapped;mse.hooked=true}catch(e){mse.errors.push(String(e).slice(0,80))}
 }
}
install();
function watch(){install();const p=window.shaka?.Player?.prototype;if(!p||p.__uaiHooked)return;p.__uaiHooked=true;
 for(const method of ['load','attach']){const old=p[method];if(typeof old==='function')p[method]=function(...a){player=this;return old.apply(this,a)}}
}
const t=setInterval(watch,200);setTimeout(()=>clearInterval(t),90000);
window.addEventListener('message',e=>{
 if(e.source!==window||e.data?.source!=='UAI_PLAYBACK_REQUEST')return;
 watch();if(manifestPage!==location.href){manifestPage=location.href;observedManifest=null}const v=document.querySelector('video');
 let track=null,stats=null,variants=[];
 try{if(player){variants=player.getVariantTracks?.()||[];track=variants.find(x=>x.active)||null;stats=player.getStats?.()||null}}catch{}
 window.postMessage({source:'UAI_PLAYBACK_RESULT',id:e.data.id,data:{
  video:v?{width:v.videoWidth,height:v.videoHeight,readyState:v.readyState}:null,
  track:track?{width:track.width,height:track.height,audioCodec:track.audioCodec,channelsCount:track.channelsCount}:null,
  stats:stats?{width:stats.width,height:stats.height}:null,
  manifest:readPlayerManifest(player)||observedManifest,
  variants:variants.map(x=>({width:x.width,height:x.height,audioCodec:x.audioCodec,videoCodec:x.videoCodec,channelsCount:x.channelsCount,bandwidth:x.bandwidth,allowedByApplication:x.allowedByApplication,allowedByKeySystem:x.allowedByKeySystem})),
  mse:{hooked:mse.hooked,sourceBuffers:mse.sourceBuffers.map(x=>({...x})),appendCount:mse.appendCount}
 }},location.origin);
});
})();