const keys=['uaiShowTitle','uaiShowPlayback','uaiShowLists'];
const status=document.getElementById('status');
async function load(){
 const s=await chrome.storage.local.get([...keys,'uaiAllowHistory']);
 for(const key of keys)document.getElementById(key).checked=s[key]!==false;
 document.querySelector('input[name="history"][value="'+(s.uaiAllowHistory===true?'allow':'safe')+'"]').checked=true;
}
async function save(value){
 try{await chrome.storage.local.set(value);status.textContent='設定を保存しました';}
 catch(error){status.textContent='保存に失敗しました: '+error.message;}
}
for(const key of keys)document.getElementById(key).addEventListener('change',event=>save({[key]:event.target.checked}));
for(const radio of document.querySelectorAll('input[name="history"]'))radio.addEventListener('change',event=>{
 if(event.target.checked)save({uaiAllowHistory:event.target.value==='allow'});
});
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&[...keys,'uaiAllowHistory'].some(k=>k in changes))load().catch(console.error)});
load().catch(error=>{status.textContent='設定の読み込みに失敗しました: '+error.message});
