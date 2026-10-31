const radios=document.querySelectorAll('input[name="mode"]');
chrome.storage.local.get('allowTitleAnalysis').then(v=>{document.querySelector('input[value="'+(v.allowTitleAnalysis===true?'allow':'safe')+'"]').checked=true});
for(const input of radios)input.addEventListener('change',async()=>{if(!input.checked)return;await chrome.storage.local.set({allowTitleAnalysis:input.value==='allow'});document.getElementById('status').textContent='設定を保存しました';});
