// Run: node --test tests/playback-video.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Execute the exact formatting helper used by playback-ui.js.
const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'playback-ui.js'), 'utf8');
const start = source.indexOf('function resolveHighestVideo(');
const end = source.indexOf('\nfunction draw(){', start);
assert.ok(start >= 0 && end > start, 'video formatting helper must exist');
const resolve = vm.runInNewContext(source.slice(start, end) + '\nresolveHighestVideo');

test('official 4K overrides Full HD without borrowing H.264 codec', () => {
  assert.equal(resolve('Full HD (H.264)', {fourk: true, dv: false}), '4K UHD');
});
test('official 4K with Dolby Vision does not borrow a lower-tier codec', () => {
  assert.equal(resolve('Full HD (H.264)', {fourk: true, dv: true}), '4K UHD Dolby Vision');
});
test('actual MPD 4K keeps its own codec', () => {
  assert.equal(resolve('4K UHD (HEVC)', {fourk: true, dv: true}), '4K UHD Dolby Vision (HEVC)');
});
test('no official upgrade preserves MPD Full HD codec', () => {
  assert.equal(resolve('Full HD (H.264)', {fourk: false, dv: false}), 'Full HD (H.264)');
});
test('MPD 4K remains 4K even without an official listing', () => {
  assert.equal(resolve('4K UHD (HEVC)', {fourk: false, dv: false}), '4K UHD (HEVC)');
});
test('an official 4K listing without an MPD codec shows no invented codec', () => {
  assert.equal(resolve('確認中', {fourk: true, dv: true}), '4K UHD Dolby Vision');
});
test('unknown MPD details remain unknown without official 4K', () => {
  assert.equal(resolve('取得不可', {fourk: false, dv: false}), '取得不可');
});
