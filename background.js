chrome.runtime.onMessage.addListener((m,s,send)=>{
 if(!s.tab?.url?.startsWith('https://video.unext.jp/'))return;
 if(m?.type==='PLAYBACK_HOOK'){chrome.scripting.executeScript({target:{tabId:s.tab.id},world:'MAIN',files:['playback-hook.js']}).then(()=>send({ok:true})).catch(e=>send({error:String(e.message||e)}));return true;}
 if(m?.type==='INJECT'){send({ok:true});return false;}
 if(m?.type==='FETCH'){
  (async()=>{
   try{
    const u=new URL(m.url);
    if(u.protocol!=='https:'|| !(/(^|\.)(unext\.jp|nxtv\.jp)$/.test(u.hostname)))throw Error('取得先ホストが許可されていません');
    const init=m.range&&/^bytes=\d+-\d+$/.test(m.range);
    const headers=init?{Range:m.range}:{};
    const r=await fetch(u.href,{credentials:'omit',cache:'no-store',headers});
    if(!r.ok)throw Error('HTTP '+r.status);
    if(init){
      if(r.status!==206&&Number(m.range.slice(6).split('-')[0])>0)throw Error('Range応答がありません');
      const b=await r.arrayBuffer();if(b.byteLength>524288)throw Error('初期化データの上限超過');
      const a=new Uint8Array(b);let str='';for(let i=0;i<a.length;i+=8192)str+=String.fromCharCode(...a.subarray(i,i+8192));send({base64:btoa(str)});
    }else{const t=await r.text();if(t.length>3000000)throw Error('MPDサイズ超過');send({text:t});}
   }catch(e){send({error:e.message});}
  })();return true;
 }
});