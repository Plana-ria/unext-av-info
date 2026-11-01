const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'..','playback-ui.js'),'utf8');
const start=src.indexOf('function resolveHighestAudio('),end=src.indexOf('function draw(){',start);
assert.ok(start>=0&&end>start);
const resolve=vm.runInNewContext(src.slice(start,end)+'\nresolveHighestAudio');
test('official Dolby Audio must not borrow AAC 2ch',()=>{
 assert.equal(resolve('AAC (2 ch)',{dolby:true,allowHistory:true}),'Dolby Audio');
});
test('confirmed Dolby Digital Plus channel and codec are kept together',()=>{
 assert.equal(resolve('Dolby Digital Plus (5.1ch)',{dolby:true,allowHistory:true}),'Dolby Audio (5.1ch / Dolby Digital Plus)');
});
test('confirmed Dolby Digital 2ch can be shown',()=>{
 assert.equal(resolve('Dolby Digital (2.0ch)',{dolby:true,allowHistory:true}),'Dolby Audio (2.0ch / Dolby Digital)');
});
test('official Atmos hides unrelated codec and channel data',()=>{
 assert.equal(resolve('Dolby Digital Plus (5.1ch)',{atmos:true,allowHistory:true}),'Dolby Atmos');
});
test('unlisted AAC retains MPD codec',()=>{
 assert.equal(resolve('AAC (2.0ch)',{allowHistory:true}),'AAC (2.0ch)');
});
test('missing MPD track is not invented',()=>{
 assert.equal(resolve('確認中',{dolby:true,allowHistory:true}),'Dolby Audio');
});
