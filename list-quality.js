(()=>{if(window.__uaiListQuality)return;window.__uaiListQuality=true;
let enabled=false,visible=true,pending=false;
const LABEL='uai-list-quality';
const css=document.createElement('style');
css.textContent='.uai-list-quality{box-sizing:border-box;width:100%;min-width:0;margin-top:8px;padding:7px 0 1px;border-top:1px solid rgba(180,200,220,.2);color:#c9dae8;font:500 11px/1.45 system-ui,sans-serif;display:grid;gap:3px;pointer-events:none;overflow-wrap:anywhere}.uai-list-quality span{display:block;white-space:normal}';
document.documentElement.append(css);
const quality=id=>window.__uaiQualityForId?.(id)||{};
const titleId=a=>{
 try{
  const url=new URL(a.getAttribute('href')||'',location.href);
  if(url.origin!==location.origin)return null;
  return url.pathname.match(/^\/title\/(SID\d+)\/?$/)?.[1]||null;
 }catch{return null}
};
function tileFor(a){
 // Put the labels inside the clickable card, beneath its built-in description.
 // U-NEXT's grid cards have a metadata block; other one-title links can use
 // the link itself as a safe fallback, never the external grid row.
 const info=a.querySelector('[class*="sc-891f7a85-5"]');
 return info||a;
}
function clear(){document.querySelectorAll('.'+LABEL).forEach(node=>node.remove())}
function update(){
 if(!enabled||!visible||location.pathname.startsWith('/play/')){clear();return}
 const seen=new Map();
 for(const a of document.querySelectorAll('a[href*="/title/SID"]')){
  const id=titleId(a);if(!id||!a.querySelector('img')||!a.getClientRects().length)continue;
  // Episode entries and play/preview controls are never annotated.
  if(a.closest('[data-testid*="episode"],[data-testid*="Episode"],[data-testid*="trailer"],[data-testid*="Trailer"]'))continue;
  const tile=tileFor(a);
  if(!tile||tile.closest('#unext-av-info-card')||tile.closest('.'+LABEL))continue;
  if(!seen.has(tile))seen.set(tile,id);
 }
 for(const [tile,id] of seen){
  const q=quality(id),audio=q.atmos?'Dolby Atmos':q.audio?'Dolby Audio':'2 ch';
  const video=(q.fourk?'4K UHD':'Full HD 以下')+(q.dv?' · Dolby Vision':'');
  let label=Array.from(tile.children).find(el=>el.classList?.contains(LABEL));
  if(!label){label=document.createElement('div');label.className=LABEL;tile.append(label)}
  if(label.dataset.sid!==id||label.dataset.audio!==audio||label.dataset.video!==video){
   label.dataset.sid=id;label.dataset.audio=audio;label.dataset.video=video;
   const aLine=document.createElement('span'),vLine=document.createElement('span');
   aLine.textContent='🔊 '+audio;vLine.textContent='▣ '+video;
   label.replaceChildren(aLine,vLine);
  }
 }
 // Remove detached/reused or now-ineligible labels on SPA navigation.
 for(const label of document.querySelectorAll('.'+LABEL)){
  if(!seen.has(label.parentElement))label.remove();
 }
}
function schedule(){if(pending)return;pending=true;setTimeout(()=>{pending=false;update()},350)}
new MutationObserver(records=>{if(records.some(r=>Array.from(r.addedNodes).concat(Array.from(r.removedNodes)).some(n=>n.nodeType===1&&!n.classList?.contains(LABEL))))schedule()}).observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('UAI_QUALITY_UPDATED',schedule);
chrome.runtime.onMessage.addListener(m=>{if(m?.type==='UAI_ENABLED_CHANGED'){enabled=m.enabled!==false;schedule()}});
chrome.storage.local.get('uaiShowLists').then(s=>{visible=s.uaiShowLists!==false;schedule()}).catch(()=>{});
chrome.storage.onChanged.addListener((c,a)=>{if(a==='local'&&c.uaiShowLists){visible=c.uaiShowLists.newValue!==false;schedule()}});
chrome.runtime.sendMessage({type:'UAI_GET_ENABLED'}).then(r=>{enabled=r?.enabled!==false;schedule()}).catch(()=>{});
schedule();
})();