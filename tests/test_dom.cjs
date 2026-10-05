/* DOM integration tests; these do not claim to test rendered browser layout. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{runScripts:'outside-only',url:'https://emmcry.test/'});
const w=dom.window,d=w.document;
w.HTMLElement.prototype.scrollIntoView=function(){};
for(const file of ['web/runtime.js','web/compiled.js','web/app.js'])w.eval(fs.readFileSync(path.join(root,file),'utf8'));
for(let i=0;i<7;i++){
  d.querySelectorAll('.lesson-link')[i].click();
  d.querySelector('#run-lesson').click();
  assert.equal(d.querySelector('#lesson-result').textContent,'EXECUTED ✓');
}
assert.equal(d.querySelector('#progress-count').textContent,'7');
assert.equal(JSON.parse(w.localStorage.getItem('emm-lessons-v1')).length,7);
d.querySelector('#syntax-cry').click();
assert(d.querySelector('#lesson-code').textContent.includes('😭'));
assert.equal(d.querySelectorAll('.dungeon-cell').length,121);
d.querySelector('#tab-merge').click();
assert.equal(d.querySelectorAll('.tile').length,16);
for(const key of ['ArrowLeft','ArrowDown','ArrowRight','ArrowUp'])d.querySelector('#game-main').dispatchEvent(new w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));
assert(!d.querySelector('#game-status').textContent.includes('runtime'));
d.querySelector('#tab-poker').click();
assert.equal(d.querySelectorAll('.card.back').length,5);
d.querySelector('.poker-hand:last-child .card').click();
assert.equal(d.querySelectorAll('.card.selected').length,1);
d.querySelector('.game-action.accent').click();
assert.equal(d.querySelectorAll('.card.back').length,0);
assert.equal(d.querySelectorAll('.card').length,10);
d.querySelector('#restart-game').click();
assert.equal(d.querySelectorAll('.card.back').length,5);
d.querySelector('#show-source').click();
assert.equal(d.querySelector('#source-drawer').open,true);
assert(d.querySelector('#game-source').textContent.includes('??... draw'));
assert(d.querySelector('#source-hash').textContent.includes(w.EMM_PROJECT.hashes['games/poker.emm']));
console.log('DOM integration PASS: lessons, progress, syntax toggle, tabs, keyboard, card selection/draw/reveal/new round, and source inspector.');
dom.window.close();
