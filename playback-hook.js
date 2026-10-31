(()=>{if(window.__uaiPlaybackHook)return;window.__uaiPlaybackHook=true;
let player=null;
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
 watch();const v=document.querySelector('video');
 let track=null,stats=null,variants=[];
 try{if(player){variants=player.getVariantTracks?.()||[];track=variants.find(x=>x.active)||null;stats=player.getStats?.()||null}}catch{}
 window.postMessage({source:'UAI_PLAYBACK_RESULT',id:e.data.id,data:{
  video:v?{width:v.videoWidth,height:v.videoHeight,readyState:v.readyState}:null,
  track:track?{width:track.width,height:track.height,audioCodec:track.audioCodec,channelsCount:track.channelsCount}:null,
  stats:stats?{width:stats.width,height:stats.height}:null,
  variants:variants.map(x=>({width:x.width,height:x.height,audioCodec:x.audioCodec,videoCodec:x.videoCodec,channelsCount:x.channelsCount,bandwidth:x.bandwidth,allowedByApplication:x.allowedByApplication,allowedByKeySystem:x.allowedByKeySystem})),
  mse:{hooked:mse.hooked,sourceBuffers:mse.sourceBuffers.map(x=>({...x})),appendCount:mse.appendCount}
 }},location.origin);
});
})();