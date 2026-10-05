(function(){
  'use strict';
  const project=globalThis.EMM_PROJECT,$=id=>document.getElementById(id);
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
  const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
  let completed=new Set(read('emm-lessons-v1',[])),lessonIndex=0,syntax='emm',game='dungeon',best=read('emm-merge-best',0);
  const games=new Map();
  let toastTimer;
  function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2200);}
  function lesson(){
    const l=project.lessons[lessonIndex];$('lesson-title').textContent=l.title;$('lesson-description').textContent=l.description;
    $('lesson-file').textContent=l.id+'.'+(syntax==='emm'?'emm':'cry');$('lesson-code').textContent=l[syntax];
    $('lesson-output').textContent='Run the example to see what happens.';$('lesson-result').textContent='';
    $('next-lesson').disabled=lessonIndex===project.lessons.length-1;
    $('syntax-emm').classList.toggle('active',syntax==='emm');$('syntax-cry').classList.toggle('active',syntax==='cry');
    $('syntax-emm').setAttribute('aria-pressed',String(syntax==='emm'));$('syntax-cry').setAttribute('aria-pressed',String(syntax==='cry'));
    $('lesson-list').replaceChildren(...project.lessons.map((item,i)=>{let b=document.createElement('button');b.className='lesson-link'+(i===lessonIndex?' active':'')+(completed.has(item.id)?' completed':'');b.setAttribute('aria-current',i===lessonIndex?'step':'false');let mark=document.createElement('span');mark.className='lesson-mark';mark.textContent=completed.has(item.id)?'✓':String(i+1).padStart(2,'0');let label=document.createElement('span');label.textContent=item.title.split(' · ')[1];b.append(mark,label);b.onclick=()=>{lessonIndex=i;lesson();};return b;}));
    $('progress-count').textContent=completed.size;
  }
  $('syntax-emm').onclick=()=>{syntax='emm';lesson();};$('syntax-cry').onclick=()=>{syntax='cry';lesson();};
  $('next-lesson').onclick=()=>{lessonIndex=Math.min(6,lessonIndex+1);lesson();};
  $('run-lesson').onclick=()=>{let l=project.lessons[lessonIndex],output=[];try{new EMM.VM({}, {output:line=>output.push(line)}).load(l.ir);const result=output.join('\n');if(result!==l.expected)throw new Error('Example output did not match its verified result');completed.add(l.id);write('emm-lessons-v1',[...completed]);lesson();$('lesson-output').textContent=result;$('lesson-result').textContent='EXECUTED ✓';}catch(e){$('lesson-output').textContent=String(e.message||e);$('lesson-result').textContent='ERROR';}};
  $('copy-lesson').onclick=async()=>{try{await navigator.clipboard.writeText(project.lessons[lessonIndex][syntax]);toast('Code copied. Go make something.');}catch{let range=document.createRange();range.selectNodeContents($('lesson-code'));let selection=getSelection();selection.removeAllRanges();selection.addRange(range);toast('Code selected. Press Ctrl/Cmd+C to copy.');}};
  function engine(){if(!games.has(game)){const vm=new EMM.VM(project.modules,{limit:500000});vm.load(project.modules['games/'+game+'.emm']);games.set(game,vm);}return games.get(game);}
  const get=name=>engine().scope.get(name),num=x=>Number(x);
  function stat(label,value){let e=document.createElement('div');e.className='stat';let small=document.createElement('small');small.textContent=label;let strong=document.createElement('strong');strong.textContent=String(value);e.append(small,strong);return e;}
  function status(text,kind=''){$('game-status').textContent=text;$('game-status').className='game-status '+kind;}
  function actionButton(label,action,accent=false){const b=document.createElement('button');b.className='game-action'+(accent?' accent':'');b.textContent=label;b.onclick=()=>act(action);return b;}
  function arrows(extras=[]){return [actionButton('←','left'),actionButton('↑','up'),actionButton('↓','down'),actionButton('→','right'),...extras];}
  const pixel=(inner)=>'<svg viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges">'+inner+'</svg>';
  const icons={
    hero:pixel('<path fill="#d3fb85" d="M5 1h6v3H5zM4 4h8v5H4zM5 9h6v4H5zM3 9h2v4H3zM11 9h2v4h-2zM4 13h3v3H4zM9 13h3v3H9z"/><path fill="#243637" d="M5 5h2v2H5zM9 5h2v2H9z"/><path fill="#716598" d="M5 10h6v3H5z"/>'),
    enemy:pixel('<path fill="#ec8090" d="M2 3h2V1h2v2h4V1h2v2h2v8h-2v3h-2v-2H6v2H4v-3H2z"/><path fill="#392330" d="M4 5h2v3H4zM10 5h2v3h-2zM6 10h4v1H6z"/>'),
    boss:pixel('<path fill="#bba0ff" d="M1 2h3V0h2v2h4V0h2v2h3v10h-3v3H9v-3H7v3H4v-3H1z"/><path fill="#4b2450" d="M3 5h3v3H3zM10 5h3v3h-3z"/><path fill="#fcd270" d="M5 9h6v2H5z"/>'),
    chest:pixel('<path fill="#e9c073" d="M2 4h12v9H2z"/><path fill="#8d642f" d="M2 7h12v2H2zM3 3h10v2H3z"/><path fill="#fff1a8" d="M7 7h2v3H7z"/>'),
    potion:pixel('<path fill="#bcc8df" d="M6 1h4v4H6zM5 5h6v2H5zM3 7h10v7H3z"/><path fill="#73d5ce" d="M4 9h8v4H4z"/><path fill="#e2f8eb" d="M5 7h2v3H5z"/>'),
    stairs:pixel('<path fill="#7fb6d7" d="M2 2h12v12H2z"/><path fill="#213743" d="M3 3h10v3H3zM3 7h10v2H3zM3 10h10v3H3z"/>'),
    trap:pixel('<path fill="#e7a779" d="M2 13 4 6l2 7 2-9 2 9 2-7 2 7z"/>')
  };
  function dungeon(){
    const h=get('hero'),phase=get('phase'),tiles=get('tiles'),seen=get('seen'),enemies=get('enemies');
    $('game-stats').replaceChildren(stat('HP',h.hp+'/'+h.maxHp),stat('FLOOR',get('floor')+'/5'),stat('ATTACK',h.attack),stat('POTIONS',h.potions),stat('LEVEL',h.level),stat('GOLD',h.gold));
    let board=document.createElement('div');board.className='dungeon-board';board.setAttribute('aria-label','Dungeon map; movement controls below');
    for(let i=0;i<121;i++){
      let x=i%11,y=Math.floor(i/11),tile=num(tiles[i]),isHero=x===num(h.x)&&y===num(h.y),monster=enemies.find(m=>m.hp>0n&&num(m.x)===x&&num(m.y)===y),visible=seen[i],cell=document.createElement('button');
      let kind=!visible?'unseen':isHero?'hero':monster?'enemy':tile===1?'wall':tile===2?'chest':tile===3?'stairs':tile===4?'potion':tile===5?'trap':'floor';
      cell.className='dungeon-cell '+kind;cell.setAttribute('aria-label',kind+' at '+x+','+y);cell.tabIndex=-1;
      if(visible){let icon=icons[monster?(monster.boss?'boss':'enemy'):kind];if(icon)cell.innerHTML=icon;if(monster){let bar=document.createElement('span');bar.className='monster-health';cell.append(bar);cell.title=(monster.boss?'Sentinel':'Enemy')+' · '+monster.hp+' HP';}}
      cell.onclick=()=>{let dx=x-num(h.x),dy=y-num(h.y);if(Math.abs(dx)+Math.abs(dy)===1)act(dx===-1?'left':dx===1?'right':dy===-1?'up':'down');else{$('game-main').focus({preventScroll:true});toast('Use arrows/WASD, or click an adjacent cell.');}};board.append(cell);
    }
    $('game-stage').replaceChildren(board);$('game-actions').replaceChildren(...arrows([actionButton('P · Potion','potion'),actionButton('Wait','wait')]));
    $('game-log').replaceChildren(...get('journal').map(line=>{let li=document.createElement('li');li.textContent=line;return li;}));
    status(phase==='won'?'You escaped the catacombs! '+get('kills')+' defeats · '+get('turns')+' turns · '+h.gold+' gold':phase==='lost'?'Expedition ended on floor '+get('floor')+'. New expedition, new dungeon.':'Level '+h.level+' · '+h.xp+'/3 XP. Explore, manage potions, and reach the stairs.',phase==='won'?'won':phase==='lost'?'lost':'');
    if(phase!=='playing')for(let b of $('game-actions').children)b.disabled=true;
  }
  function merge(){
    const score=num(get('score'));if(score>best){best=score;write('emm-merge-best',best);}
    $('game-stats').replaceChildren(stat('SCORE',score),stat('BEST',best),stat('MOVES',get('moves')));
    let board=document.createElement('div');board.className='board-merge';board.setAttribute('aria-label','2048 board');
    get('board').forEach((v,i)=>{let tile=document.createElement('div');tile.className='tile'+(v>0n?' filled':'')+(v>=2048n?' high':'');tile.dataset.value=String(v);tile.textContent=v>0n?String(v):'';tile.setAttribute('aria-label','Row '+(Math.floor(i/4)+1)+', column '+(i%4+1)+': '+v);board.append(tile);});
    let start=null;board.onpointerdown=e=>{start={x:e.clientX,y:e.clientY};};board.onpointerup=e=>{if(!start)return;let dx=e.clientX-start.x,dy=e.clientY-start.y;start=null;if(Math.max(Math.abs(dx),Math.abs(dy))<25)return;act(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up');};
    $('game-stage').replaceChildren(board);let undo=actionButton('Undo','undo');undo.disabled=!get('canUndo');$('game-actions').replaceChildren(...arrows([undo]));
    status(get('over')?'No moves left. Undo the last move or start a fresh board.':get('won')?'2048 reached! Keep going for a higher score.':'Slide matching tiles together. Each tile merges once per move.',get('won')?'won':get('over')?'lost':'');
    $('game-log').replaceChildren(...['Merging creates points.','Unchanged moves spawn nothing.','Undo restores the board and score.','Best score stays on this device.'].map(text=>{let li=document.createElement('li');li.textContent=text;return li;}));
  }
  const suitSVG={S:'<path d="M12 2C8 7 3 9 3 14a5 5 0 0 0 8 4l-2 4h6l-2-4a5 5 0 0 0 8-4c0-5-5-7-9-12z"/>',H:'<path d="M12 22 3 13C-3 5 7-1 12 6 17-1 27 5 21 13z"/>',D:'<path d="m12 1 10 11-10 11L2 12z"/>',C:'<path d="M12 2a5 5 0 0 0-4 8 5 5 0 1 0 3 8l-2 4h6l-2-4a5 5 0 1 0 3-8 5 5 0 0 0-4-8z"/>'};
  function card(c,back,selected,index,selectable){let el=document.createElement(selectable?'button':'div');el.className='card'+(back?' back':c.suit==='H'||c.suit==='D'?' red':'')+(selected?' selected':'');if(back){el.textContent='...?';el.setAttribute('aria-label','Face-down dealer card');return el;}const rank=({11:'J',12:'Q',13:'K',14:'A'})[String(c.rank)]||String(c.rank);let top=document.createElement('span'),bottom=document.createElement('span');top.className='rank';bottom.className='rank rank-bottom';top.textContent=bottom.textContent=rank;el.innerHTML='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">'+suitSVG[c.suit]+'</svg>';el.prepend(top);el.append(bottom);el.setAttribute('aria-label',rank+' of '+({S:'spades',H:'hearts',D:'diamonds',C:'clubs'})[c.suit]+(selected?', selected for replacement':''));if(selectable){el.setAttribute('aria-pressed',String(selected));el.onclick=()=>act('select',BigInt(index));}return el;}
  function poker(){
    const phase=get('phase'),selected=get('selected');$('game-stats').replaceChildren(stat('WINS',get('wins')),stat('LOSSES',get('losses')),stat('TIES',get('ties')),stat('ROUNDS',get('rounds')));
    let table=document.createElement('div');table.className='poker-table';
    function hand(label,cards,hidden,player){let name=document.createElement('div');name.className='hand-label';let a=document.createElement('span'),b=document.createElement('span');a.textContent=label;b.textContent=player?get('playerLabel'):get('dealerLabel');name.append(a,b);let row=document.createElement('div');row.className='poker-hand';cards.forEach((c,i)=>row.append(card(c,hidden,player&&phase==='draw'&&selected[i],i,player&&phase==='draw')));table.append(name,row);}
    hand('DEALER',get('dealer'),phase!=='reveal',false);hand('YOUR HAND',get('player'),false,true);$('game-stage').replaceChildren(table);
    let draw=actionButton('Draw '+selected.filter(Boolean).length+' · Reveal','draw',true);draw.disabled=phase!=='draw';$('game-actions').replaceChildren(draw);
    status(get('result'),phase==='reveal'&&get('result').startsWith('You win')?'won':'');
    const lines=phase==='draw'?['Select any cards you want to replace.','Leave all unselected to stand pat.','Dealer also makes one draw.','All nine hand categories, with full kickers.']:['Your hand: '+get('playerLabel'),'Dealer: '+get('dealerLabel'),'Suit does not break a tie.','Next round deals a fresh shuffled deck.'];
    $('game-log').replaceChildren(...lines.map(text=>{let li=document.createElement('li');li.textContent=text;return li;}));
  }
  const config={dungeon:{title:'COKKING Catacombs',kicker:'FIVE FLOORS / ONE EXPEDITION',restart:'New expedition',instructions:'Explore a new dungeon every run. Bump into enemies to attack. Gather gold, potions, and weapon upgrades. Reach floor five and defeat the Sentinel to escape.',controls:'WASD / arrows · move\nP · potion  /  Space · wait\nClick the board to activate keys.',journal:'EXPEDITION LOG',proof:'Procedural map generation, combat, enemy turns, loot, leveling, fog, and the win condition are EMM functions.'},merge:{title:'2048: Dot by Dot',kicker:'A SMALL BOARD / BIG DECISIONS',restart:'New board',instructions:'Slide the board to combine matching numbers. Reach 2048, or keep playing for a new personal best. One-step undo gives you a second chance.',controls:'WASD / arrows · slide\nSwipe or use the buttons below.\nU · undo the last move',journal:'THE RULES',proof:'Slide order, once-per-move merging, tile spawning, score, undo, and game-over detection are written in EMM.'},poker:{title:'Punctuation Poker',kicker:'FIVE-CARD DRAW / NO BETTING',restart:'Next round',instructions:'Click cards to mark them for replacement, then draw once. The dealer makes its own decision. Your complete poker rankings and kickers determine the winner.',controls:'Click cards · hold / swap\nDraw · replace and reveal\nNext round · play again',journal:'TABLE NOTES',proof:'Deck creation, shuffle, draw choices, dealer decisions, all nine hand categories, and complete tiebreaks are EMM.'}};
  function render(){({dungeon,merge,poker})[game]();}
  function act(action,arg){try{const vm=engine();if(game==='dungeon')vm.call('act',action);else if(game==='merge')vm.call(action==='undo'?'undo':'move',...(action==='undo'?[]:[action]));else vm.call(action,...(arg===undefined?[]:[arg]));render();}catch(e){status('EMM runtime: '+String(e.message||e),'lost');}}
  function selectGame(name,focus=false){game=name;const c=config[game];document.querySelectorAll('[data-game]').forEach(b=>{let active=b.dataset.game===game;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});$('game-main').setAttribute('aria-labelledby','tab-'+game);$('game-title').textContent=c.title;$('game-kicker').textContent=c.kicker;$('restart-game').textContent=c.restart;$('game-instructions').textContent=c.instructions;$('controls-hint').textContent=c.controls;$('controls-hint').style.whiteSpace='pre-line';$('journal-title').textContent=c.journal;$('source-description').textContent=c.proof;const key='games/'+game+'.emm';$('source-filename').textContent=key;$('game-source').textContent=project.sources[key].emm;$('source-hash').textContent='Source SHA-256: '+project.hashes[key];render();if(focus)$('game-main').focus({preventScroll:true});}
  document.querySelectorAll('[data-game]').forEach(b=>{b.onclick=()=>selectGame(b.dataset.game,true);b.onkeydown=e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const keys=['dungeon','merge','poker'],i=keys.indexOf(game);selectGame(keys[(i+(e.key==='ArrowRight'?1:2))%3]);$('tab-'+game).focus();}};});
  $('restart-game').onclick=()=>{try{engine().call(game==='poker'?'deal':'start');render();}catch(e){status(String(e.message||e),'lost');}};
  $('show-source').onclick=()=>{$('source-drawer').open=true;$('source-drawer').scrollIntoView({behavior:'smooth',block:'start'});};
  $('download-source').onclick=()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([project.sources['games/'+game+'.emm'].emm],{type:'text/plain;charset=utf-8'}));a.href=url;a.download=game+'.emm';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  document.addEventListener('keydown',e=>{if(!$('game-main').contains(document.activeElement)||e.metaKey||e.ctrlKey||e.altKey)return;const map={ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',ArrowUp:'up',w:'up',ArrowDown:'down',s:'down'};let action=map[e.key];if(!action&&game==='dungeon')action=e.key.toLowerCase()==='p'?'potion':e.key===' '?'wait':null;if(!action&&game==='merge'&&e.key.toLowerCase()==='u')action='undo';if(action&&game!=='poker'){e.preventDefault();act(action);}});
  lesson();selectGame('dungeon');
})();
