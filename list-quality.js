(()=>{if(window.__uaiListQuality)return;window.__uaiListQuality=true;
let enabled=true,visible=true,pending=false,lastLocation=location.href;
const style=document.createElement('style');style.textContent='.uai-list-quality{padding:5px 2px 3px;color:#c9dae8;font:500 11px/1.45 system-ui,sans-serif;display:grid;gap:2px;max-width:100%;pointer-events:none}.uai-list-quality span{overflow-wrap:anywhere}';document.documentElement.append(style);
const quality=id=>window.__uaiQualityForId?.(id)||{};
function shouldShowListQuality(){
 const url=new URL(location.href);
 return !url.searchParams.has('td')&&!url.pathname.startsWith('/play/');
}

function update(){
 if(!enabled||!visible||!shouldShowListQuality()){document.querySelectorAll('.uai-list-quality').forEach(e=>e.remove());return}
 const groups=new Map();
 for(const a of document.querySelectorAll('a[href*="SID"]')){
  const match=(a.getAttribute('href')||'').match(/^\/title\/(SID\d+)(?:\/)?(?:[?#]|$)/);if(!match)continue;
  // Require actual catalog tile links; never decorate an episode/preview thumbnail.
  if(!a.matches('[data-testid="videoListView-title-link"],[data-component-name*="titleCard"],a[class*="sc-"]'))continue;
  if(a.closest('[role="dialog"],[aria-modal="true"],[data-testid*="episode"],[data-testid*="Episode"]'))continue;
  const id=match[0];
  // Only use links wrapping a visible cover image; do not touch navigation or inline text links.
  if(!a.querySelector('img')||!a.getClientRects().length)continue;
  let parent=a.parentElement;if(!parent||parent.closest('#unext-av-info-card')||parent.closest('.uai-list-quality'))continue;
  // Choose the complete title tile, not the cropped image container.
  for(let depth=0;depth<4;depth++){
   const outer=parent.parentElement;if(!outer||outer===document.body)break;
   const otherIds=new Set(Array.from(outer.querySelectorAll('a[href*="SID"]')).map(x=>(x.getAttribute('href')||'').match(/SID\\d+/)?.[0]).filter(Boolean));
   if(otherIds.size>1)break;
   const bounds=outer.getBoundingClientRect();
   if(bounds.width<115||bounds.width>550||bounds.height>750)break;
   parent=outer;
  }
  const prior=groups.get(parent);if(!prior||prior.querySelectorAll('img').length<a.querySelectorAll('img').length)groups.set(parent,a);
 }
 for(const [parent,a] of groups){
  const id=(a.getAttribute('href')||'').match(/^\/title\/(SID\d+)/)?.[1];if(!id)continue;
  const q=quality(id);const audio=q.atmos?'Dolby Atmos':q.audio?'Dolby Audio':'2 ch';
  const video=(q.fourk?'4K UHD':'Full HD 以下')+(q.dv?' · Dolby Vision':'');
  let label=Array.from(parent.children).find(el=>el.classList?.contains('uai-list-quality'));
  if(!label){label=document.createElement('div');label.className='uai-list-quality';parent.append(label)}
  if(label.dataset.sid!==id||label.dataset.audio!==audio||label.dataset.video!==video){
   label.dataset.sid=id;label.dataset.audio=audio;label.dataset.video=video;
   label.replaceChildren();
   for(const line of ['音声：'+audio,'映像：'+video]){const el=document.createElement('span');el.textContent=line;label.append(el)}
  }
 }
}
function schedule(){if(pending)return;pending=true;setTimeout(()=>{pending=false;update()},400)}
const observer=new MutationObserver(schedule);observer.observe(document.documentElement,{childList:true,subtree:true});
// History.pushState/replaceState can change ?td without modifying the DOM immediately.
setInterval(()=>{if(lastLocation!==location.href){lastLocation=location.href;schedule()}},500);
window.addEventListener('UAI_QUALITY_UPDATED',schedule);
chrome.runtime.onMessage.addListener(m=>{if(m?.type==='UAI_ENABLED_CHANGED'){enabled=m.enabled!==false;schedule()}});
chrome.storage.local.get('uaiShowLists').then(s=>{visible=s.uaiShowLists!==false;schedule()}).catch(()=>{});
chrome.storage.onChanged.addListener((c,a)=>{if(a==='local'&&c.uaiShowLists){visible=c.uaiShowLists.newValue!==false;schedule()}});
chrome.runtime.sendMessage({type:'UAI_GET_ENABLED'}).then(r=>{enabled=r?.enabled!==false;schedule()}).catch(()=>{});
schedule();
})();