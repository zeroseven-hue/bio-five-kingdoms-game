'use strict';
const $=id=>document.getElementById(id), K={monera:'原核生物界',protista:'原生生物界',fungi:'真菌界',plantae:'植物界',animalia:'動物界'};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const THEME_NAMES={micro:'微觀奇兵',plants:'植感大餐',animals:'動物派對',mixed:'混合大餐'}; let theme='mixed',nextTheme='mixed',banks={},queue=[],roundSpecies=[],completedLog=[];
let data, lanes=[],belt=[],orders=[],selected=null,score=0,combo=0,done=0,attempts=0,correct=0,shuffle=2,active=false,busy=false,mode='learn',sound=true,ctx;
let profile={coins:0,best:0,plate:'default',decor:'mint',owned:['default','mint'],seen:[]};
try{const old=JSON.parse(localStorage.getItem('bio_lab_v3')||'null');if(old){if(Number.isFinite(old.coins)&&old.coins>=0)profile.coins=Math.floor(old.coins);if(Number.isFinite(old.best))profile.best=old.best;if(Array.isArray(old.seen))profile.seen=old.seen.filter(x=>typeof x==='string');if(Array.isArray(old.owned))profile.owned=[...new Set(['default','mint',...old.owned.filter(x=>['dish','gold','blue'].includes(x))])];if(['default','dish','gold'].includes(old.plate)&&profile.owned.includes(old.plate))profile.plate=old.plate;if(['mint','blue'].includes(old.decor)&&profile.owned.includes(old.decor))profile.decor=old.decor;}else{let n=Number(localStorage.getItem('bio_coins'));if(Number.isFinite(n)&&n>0)profile.coins=Math.floor(n);}}catch(e){}
function save(){try{localStorage.setItem('bio_lab_v3',JSON.stringify(profile));}catch(e){status('目前無法保存進度；仍可正常遊玩。');}}
function status(t){$('status').textContent=t;}
function audio(kind){if(!sound)return;try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;ctx??=new A();if(ctx.state==='suspended')ctx.resume().catch(()=>{});const notes=kind==='success'?[523,659,784]:kind==='complete'?[523,659,784,1047]:kind==='wrong'?[330,262]:kind==='pick'?[420,700]:[600,800];notes.forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+i*.07;o.type=kind==='pick'?'sine':'triangle';o.frequency.setValueAtTime(f*(kind==='success'?1+Math.min(combo,8)*.025:1),t);if(kind==='pick')o.frequency.exponentialRampToValueAtTime(f*.7,t+.08);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.055,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+.16);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+.18);o.onended=()=>{o.disconnect();g.disconnect();};});}catch(e){}}
function art(s){const n=s.name;let shape='';const eyes='<circle cx="43" cy="44" r="2" fill="#304748"/><circle cx="57" cy="44" r="2" fill="#304748"/><path d="M47 50q3 3 6 0" fill="none"/><circle cx="36" cy="49" r="3" fill="#e8ac9f" stroke="none"/>';
if(s.visual){const v=s.visual;if(v==='star')shape='<path d="M50 8l10 21 27 3-20 18 6 23-23-13-23 13 6-23-20-18 27-3Z" fill="#efd5a3"/>';else if(v==='spider'||v==='crab'||v==='insect')shape='<ellipse cx="50" cy="45" rx="17" ry="21" fill="#c0cfd4"/><path d="M33 33L17 18l-8 14m24 12L12 42 5 55m28-1L17 63l-3 11m53-41 16-15 8 14m-24 12 21-2 7 13m-28-1 16 9 3 11" fill="none"/>';else if(v==='snail')shape='<path d="M15 65q25-25 63-7v10H15Z" fill="#dbcca9"/><circle cx="43" cy="42" r="22" fill="#d4b59b"/><path d="M43 42q15-10 9 9t-25-5m50 12V35l7-7" fill="none"/>';else if(v==='worm')shape='<path d="M15 43q7-22 33 0t38-2" fill="none" stroke="#c69f9a" stroke-width="20"/>';else if(v==='bird'||v==='platypus')shape='<ellipse cx="50" cy="44" rx="22" ry="29" fill="#c7d3de"/><ellipse cx="50" cy="51" rx="13" ry="17" fill="#fff3db"/><path d="M44 29h22l-10 8Z" fill="#e7be83"/>';else if(v==='bat')shape='<path d="M41 33Q12 8 7 54l15-8 11 16 13-7m13-22q29-25 34 21l-15-8-11 16-13-7" fill="#b9b1ce"/><ellipse cx="50" cy="42" rx="12" ry="24" fill="#d7cadd"/>';else if(v==='frog'||v==='lizard')shape='<ellipse cx="50" cy="45" rx="25" ry="22" fill="#b1d2b1"/><circle cx="34" cy="25" r="9" fill="#b1d2b1"/><circle cx="65" cy="25" r="9" fill="#b1d2b1"/><path d="M25 50L12 66h20m43-16 13 16H68" fill="none"/>';else if(v==='octopus')shape='<ellipse cx="50" cy="33" rx="23" ry="22" fill="#e2b7c5"/><path d="M29 42q-22 33-14 25m25-22q-14 31-5 24m16-24q8 31 14 24m7-27q22 31 17 21" fill="none"/>';else shape='<path d="M14 42q22-35 55-8l19-12v40L69 50Q36 78 14 42Z" fill="#b9dce1"/>';return `<svg viewBox="0 0 100 80" aria-hidden="true"><g stroke="#34494b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${shape}${eyes}</g></svg>`;}
if(s.kingdom==='monera'){shape=n==='藍綠菌'?'<g fill="#a9d5c3"><circle cx="20" cy="40" r="10"/><circle cx="39" cy="39" r="11"/><circle cx="59" cy="41" r="11"/><circle cx="79" cy="40" r="10"/></g><path d="M15 40h7m12-3h8m12 5h8m11-4h7"/>':'<rect x="23" y="25" width="54" height="34" rx="17" fill="#f3cb9d"/><path d="M77 42q15-15 14 7M28 23l-4-6m24 6v-7m24 8 5-7M28 61l-4 7m24-7v7"/><path d="M35 39q6-8 11 0t11 0t10 0" fill="none"/>';
}else if(n==='草履蟲'){shape='<ellipse cx="50" cy="41" rx="34" ry="20" fill="#e7cfed"/><path d="M19 26l-6-5m17-3-2-6m18 8v-8m16 10 3-8m13 21 8-3m-2 17 7 5M25 56l-5 7m22-1v7m19-9 3 7"/>';}
else if(n==='變形蟲'){shape='<path d="M19 40q-16-19 5-19l17 6q4-22 18-10l-2 14q34-16 25 5l-12 9q28 17 5 19l-22-9q-16 23-23 5l4-13q-21 12-15-7Z" fill="#c9dfee"/>';}
else if(n==='水綿'){shape='<rect x="12" y="27" width="76" height="29" rx="7" fill="#cbdf9d"/><path d="M36 27v29m26-29v29M16 30q23 13 0 22m24-22q22 13 0 22m26-22q23 13 0 22" fill="none" stroke="#5f9774"/>';}
else if(n==='矽藻'){shape='<ellipse cx="50" cy="41" rx="35" ry="20" fill="#efdc99"/><path d="M25 30v22m10-28v32m30-32v32m10-26v22" stroke="#bea558"/>';}
else if(n==='酵母菌'){shape='<ellipse cx="48" cy="43" rx="24" ry="25" fill="#f4d8b0"/><ellipse cx="72" cy="23" rx="12" ry="13" fill="#f4d8b0"/><circle cx="40" cy="36" r="6" fill="#e8bf92" stroke="none"/>';}
else if(n==='黑黴菌'){shape='<path d="M15 69q35-15 70 0M25 66V35m25 30V22m25 44V32" fill="none"/><g fill="#727688"><circle cx="25" cy="31" r="10"/><circle cx="50" cy="18" r="12"/><circle cx="75" cy="28" r="10"/></g>';}
else if(n==='香菇'){shape='<path d="M39 43h22l5 27H34Z" fill="#f5e6cb"/><path d="M15 42Q20 8 50 10q30-2 35 32Z" fill="#c58d78"/><path d="M25 37h50" fill="none"/>';}
else if(s.kingdom==='plantae'){shape=n==='筆筒樹'?'<path d="M45 72l4-49h9l5 49Z" fill="#bd9978"/><g fill="#98c9a0"><path d="M52 24Q14-1 12 35q25-18 40-11M52 24Q82-4 89 31q-24-14-37-7M52 25Q26 18 20 50q18-18 32-25M52 25q27-4 32 24Q66 33 52 25"/></g>':'<path d="M50 72V25"/><path d="M50 50Q12 52 20 18q33 0 30 32M51 40q-2-32 30-27 3 27-30 27" fill="#b0d1a5"/><path d="M24 24l22 22m29-27-21 17" fill="none"/>';}
else if(n==='水母'){shape='<path d="M17 44Q18 8 50 10q32-2 33 34Z" fill="#d6cdeb"/><path d="M28 44q-12 13 0 26m15-26q12 17-1 29m15-29q-12 15 1 29m14-29q12 11 0 25" fill="none"/>';}
else if(n==='渦蟲'){shape='<path d="M50 10L31 21q-7 48 19 51 26-3 19-51Z" fill="#dbc7a7"/>';}
else{shape='<path d="M26 66l5-28h38l6 28Z" fill="#f0bdaf"/><path d="M31 38q-18-15-11-24m20 24q-14-19-5-26m15 26V8m10 30q14-18 5-26m4 26q18-15 11-24" fill="none"/>';}
return `<svg viewBox="0 0 100 80" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><g stroke="#34494b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${shape}${eyes}</g></svg>`;}
function researcher(i){return `<svg viewBox="0 0 80 80" aria-hidden="true"><g stroke="#34494b" stroke-width="2"><path d="M15 75q0-27 25-27t25 27" fill="#fff"/><circle cx="40" cy="30" r="23" fill="${['#dce8cc','#f6d8c6','#cfe1f0'][i]}"/><path d="M18 20q18-24 42 0" fill="${['#a8bc95','#d3b69c','#abc2d5'][i]}"/><circle cx="32" cy="30" r="2"/><circle cx="48" cy="30" r="2"/><path d="M35 40q5 4 10 0M40 52v19" fill="none"/><rect x="50" y="58" width="11" height="9" fill="#e8c776"/></g></svg>`;}
function match(o,c){let [type,val]=o.rule.split(':');if(type==='accepted')return o.acceptedSpecies.includes(c.name);return type==='kingdom'?c.kingdom===val:type==='trait'?c.traits.includes(val):type==='all'?val.split(',').every(v=>c.traits.includes(v)):false;}
const rnd=a=>a[Math.floor(Math.random()*a.length)];let uid=0;const sample=s=>({...s,uid:++uid});
function shuffled(a){a=[...a];for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function chooseMissions(){let chosen=[];for(let unit of (theme==='mixed'?['micro','plants','animals']:[theme])){let basic=shuffled(banks[unit].missions.filter(m=>m.difficulty==='基礎')),hard=shuffled(banks[unit].missions.filter(m=>m.difficulty==='挑戰'));chosen.push(...basic.slice(0,theme==='mixed'?2:6),...hard.slice(0,theme==='mixed'?1:3));}return shuffled(chosen).map(m=>({...m,current:0,needed:2}));}
function nextOrder(){return queue.shift()||null;}
function makeLanes(){lanes=Array.from({length:5},()=>Array.from({length:4},()=>sample(rnd(roundSpecies))));orders.forEach((o,i)=>{if(o)lanes[i][0]=sample(rnd(data.species.filter(s=>match(o,s))));});}
function start(){if(!data)return;theme=nextTheme;score=combo=done=attempts=correct=0;shuffle=2;belt=[];selected=null;busy=false;active=true;completedLog=[];queue=chooseMissions();roundSpecies=data.species.filter(s=>theme==='mixed'||s.unit===theme);orders=Array.from({length:3},nextOrder);makeLanes();render();status(`本局：${THEME_NAMES[theme]}。9 張不同委託，每張 2 個正確樣本；共需答對 18 次。`);}
function render(){ $('coins').textContent=profile.coins;$('score').textContent=score;$('combo').textContent='×'+combo;$('progress').textContent=done+' / 9';$('capacity').textContent=belt.length+' / 7';$('shuffle').textContent=`重整樣本（${shuffle}）`;$('shuffle').disabled=!active||busy||!shuffle;$('clue').disabled=selected===null||!active||busy;$('return').disabled=selected===null||!active||busy;
$('orders').innerHTML=orders.map((o,i)=>o?`<button class="order" data-order="${i}" ${!active||busy?'disabled':''}><div class="researcher">${researcher(i)}<span>${['小葉研究員','小菇研究員','阿核研究員'][i]}</span></div><h3>${esc(o.text)}</h3><progress max="${o.needed}" value="${o.current}"></progress><p>已收集 ${o.current} / ${o.needed} · 點此提交</p><small>${THEME_NAMES[o.unit]} · ${o.difficulty}</small></button>`:`<div class="order completed">${researcher(i)}<h3>本席研究已完成</h3><p>繼續完成其他委託。</p></div>`).join('');
$('belt').innerHTML=Array.from({length:7},(_,i)=>{let c=belt[i];return `<button class="slot ${c?'filled':''} ${c?.uid===selected?'selected':''} ${profile.plate}" data-belt="${i}" aria-label="${c?esc('選取'+c.name):'空樣本盤'}" aria-pressed="${c?.uid===selected}" ${!c||!active||busy?'disabled':''}>${c?art(c)+esc(c.name):String(i+1)}</button>`;}).join('');
$('lanes').innerHTML=lanes.map((l,i)=>`<div class="lane">${l.map((c,j)=>`<button class="card" data-lane="${i}" ${j||!active||busy?'disabled':''}>${art(c)}<strong>${esc(c.name)}</strong><small>${j?'等待前方取樣':'點我取樣'}</small></button>`).join('')}</div>`).join('');
let c=belt.find(c=>c.uid===selected);$('inspector').innerHTML=c?`<strong>${esc(c.name)}</strong> ${mode==='learn'?c.traits.filter(t=>!['真核','原核','單細胞真核','植物','動物','藻類'].includes(t)).map(t=>`<span class="pill">${esc(t)}</span>`).join(''):'｜先根據名稱與圖像判斷，需要時可查看線索。'}`:'先取樣，或選擇暫存盤中的生物。滿盤仍可提交或放回，不會直接結束。';document.documentElement.style.setProperty('--bench',profile.decor==='blue'?'#d0e4ef':'#d7ebe2');}
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
async function fly(c,from,to){if(reduced()||!from||!to)return;let a=from.getBoundingClientRect(),b=to.getBoundingClientRect(),el=document.createElement('div');el.className='fly';el.innerHTML=art(c);el.style.left=a.left+a.width/2-32+'px';el.style.top=a.top+a.height/2-32+'px';$('effects').append(el);try{await el.animate([{transform:'translate(0,0) scale(1)'},{transform:`translate(${(b.left+b.width/2-a.left-a.width/2)*.5}px,${(b.top+b.height/2-a.top-a.height/2)*.5-60}px) scale(1.2)`},{transform:`translate(${b.left+b.width/2-a.left-a.width/2}px,${b.top+b.height/2-a.top-a.height/2}px) scale(.7)`}],{duration:350,easing:'ease-in-out'}).finished;}finally{el.remove();}}
function burst(text,target){if(reduced())return;let r=target.getBoundingClientRect(),el=document.createElement('div');el.className='burst';el.textContent=text;el.style.left=Math.min(innerWidth-170,Math.max(8,r.left))+'px';el.style.top=r.top+20+'px';$('effects').append(el);el.animate([{opacity:1,transform:'translateY(0) scale(.8)'},{opacity:0,transform:'translateY(-65px) scale(1.1)'}],{duration:900}).finished.finally(()=>el.remove());for(let i=0;i<12;i++){let p=document.createElement('i');p.className='particle';p.style.left=r.left+r.width/2+'px';p.style.top=r.top+r.height/2+'px';p.style.background=['#ecc467','#9bcdbb','#eaa494'][i%3];$('effects').append(p);p.animate([{opacity:1,transform:'translate(0,0)'},{opacity:0,transform:`translate(${Math.cos(i)*80}px,${Math.sin(i)*70}px) rotate(180deg)`}],{duration:650}).finished.finally(()=>p.remove());}}
async function pick(i){if(!active||busy)return;if(belt.length===7){status('暫存盤滿了。先提交樣本，或選一張放回軌道；不會因此失敗。');return;}let c=lanes[i][0];if(!c)return;busy=true;let from=document.querySelector(`[data-lane="${i}"]:not(:disabled)`),to=document.querySelector(`[data-belt="${belt.length}"]`);audio('pick');await fly(c,from,to);if(!active){busy=false;return;}lanes[i].shift();while(lanes[i].length<4){let live=orders.filter(Boolean);let task=live.length?rnd(live):null;let pool=task?roundSpecies.filter(s=>match(task,s)):roundSpecies;lanes[i].push(sample(rnd(pool.length?pool:roundSpecies)));}belt.push(c);selected=c.uid;busy=false;render();status(`已取樣「${c.name}」。請選擇符合的研究委託。`);}
function hint(o){if(o.hint)return o.hint;let [t,v]=o.rule.split(':');return t==='kingdom'?{'monera':'先看有沒有細胞核。','protista':'原生生物包含部分藻類與原生動物，不一定都是單細胞。','fungi':'真菌沒有葉綠體，酵母菌也屬於真菌。','plantae':'不能只看綠色；水綿在本課堂分類中屬於原生生物界。','animalia':'不能只用會不會移動來判斷，海葵也是動物。'}[v]:'比較樣本是否符合委託要求的全部特徵。';}
async function submit(i){if(!active||busy)return;let c=belt.find(c=>c.uid===selected),o=orders[i];if(!o)return;if(!c){status('先選一個暫存盤樣本，再點研究委託。');return;}attempts++;if(!match(o,c)){combo=0;audio('wrong');render();document.querySelector(`[data-order="${i}"]`).classList.add('shake');status(`「${c.name}」尚不符合這張委託。${hint(o)} 樣本保留，可查看線索再試一次。`);return;}correct++;busy=true;let from=document.querySelector(`[data-belt="${belt.indexOf(c)}"]`),to=document.querySelector(`[data-order="${i}"]`);audio('success');await fly(c,from,to);belt=belt.filter(x=>x.uid!==c.uid);selected=null;combo++;let gain=15+Math.min(combo-1,5)*3;score+=gain;profile.coins+=5;if(!profile.seen.includes(c.name))profile.seen.push(c.name);o.current++;let completed=o.current===o.needed;if(completed){done++;score+=50;profile.coins+=20;completedLog.push({id:o.id,text:o.text,unit:o.unit,source:o.source,explanation:o.explanation});orders[i]=nextOrder();}busy=false;render();burst(completed?'委託完成！':`COMBO ×${combo}`,$('orders').children[i]);if(completed){audio('complete');burst('+20 金幣',$('coins'));}status(`正確！${c.name}屬於${K[c.kingdom]}。${o.explanation||c.note} +${gain} 分${completed?'；委託完成，額外 +50 分、20 金幣。':''}`);save();if(done>=9)finish();}
function finish(){active=false;profile.best=Math.max(profile.best,score);save();render();modal(`<h2>研究完成！</h2><p>你完成了 9 張委託。</p><div class="dashboard"><div><small>本局得分</small><strong>${score}</strong></div><div><small>提交正確率</small><strong>${Math.round(correct/attempts*100)}%</strong></div><div><small>個人最佳</small><strong>${profile.best}</strong></div></div><p>主題：${THEME_NAMES[theme]}。正確 ${correct} 次／提交 ${attempts} 次。可重新開始，或看看你解鎖的圖鑑。</p><details><summary>本局研究回顧（含原題來源）</summary>${completedLog.map(m=>`<p><strong>${esc(m.text)}</strong><br>${esc(m.explanation)}<br><small>${THEME_NAMES[m.unit]}｜原題第 ${m.source.questionId} 題</small></p>`).join('')}</details>`);}
function modal(html){$('dialog-content').innerHTML=html;if(!$('dialog').open)$('dialog').showModal();}
function atlas(){modal(`<h2>生物圖鑑</h2><p>已研究 ${data.species.filter(s=>profile.seen.includes(s.name)).length} / ${data.species.length} 種。完整線索可供複習；插圖不是顯微照片。</p><div class="atlas-grid">${data.species.map(s=>`<article class="atlas-card">${art(s)}<h3>${esc(s.name)} ${profile.seen.includes(s.name)?'✓':''}</h3><p>${K[s.kingdom]}</p><p>${s.traits.filter(t=>!['真核','原核','植物','動物','藻類','單細胞真核'].includes(t)).map(esc).join('、')}</p><p>${esc(s.note)}</p></article>`).join('')}</div><p>藍綠菌有些呈單細胞，有些形成群體或絲狀體；不以「全都是單細胞」作為本遊戲的提示。</p>`);}
const items=[['default','plate','標準樣本盤',0],['dish','plate','藍色玻璃培養皿',100],['gold','plate','金色研究徽章盤',300],['mint','decor','薄荷研究檯',0],['blue','decor','天空藍研究檯',150]];
function shop(){modal(`<h2>研究室裝飾</h2><p>金幣 ${profile.coins} · 裝飾不影響判定或得分。</p>${items.map(([id,type,name,cost])=>`<div class="shop-row"><span>${name}</span><button data-buy="${id}" ${profile[type]===id?'disabled':''}>${profile[type]===id?'已裝備':profile.owned.includes(id)?'裝備':cost+' 金幣'}</button></div>`).join('')}`);}
$('orders').addEventListener('click',e=>{let b=e.target.closest('[data-order]');if(b)submit(Number(b.dataset.order));});$('lanes').addEventListener('click',e=>{let b=e.target.closest('[data-lane]');if(b&&!b.disabled)pick(Number(b.dataset.lane));});$('belt').addEventListener('click',e=>{let b=e.target.closest('[data-belt]');if(b&&!busy&&active){selected=belt[Number(b.dataset.belt)]?.uid??null;audio('pick');render();}});
$('return').onclick=()=>{if(busy||!active)return;let c=belt.find(c=>c.uid===selected);if(!c)return;lanes.reduce((a,b)=>a.length<=b.length?a:b).push(c);belt=belt.filter(x=>x.uid!==selected);selected=null;render();status('樣本已放回軌道後方。可繼續取樣。');};
$('clue').onclick=()=>{let c=belt.find(c=>c.uid===selected);if(c)modal(`<h2>${esc(c.name)}｜觀察線索</h2>${art(c)}<p>${c.traits.filter(t=>!['真核','原核','植物','動物','藻類','單細胞真核'].includes(t)).map(esc).join('、')}</p><p>${esc(c.note)}</p><p>查看線索不扣分。請回到研究室，再自己選擇委託。</p>`);};
$('shuffle').onclick=()=>{if(!shuffle||busy||!active)return;shuffle--;makeLanes();audio('pick');render();status('待調查樣本已重整；暫存盤保留。前方已補入符合現有委託的樣本。');};
$('new').onclick=()=>{if(busy)return;if(active&&attempts>0){modal('<h2>重新開始？</h2><p>這局的分數與研究進度會重置，已賺得的金幣與圖鑑保留。</p><button id="confirm-new">開始新研究</button>');$('confirm-new').onclick=()=>{$('dialog').close();start();};}else start();};
$('mode').onchange=()=>{mode=$('mode').value;render();status(mode==='learn'?'練習模式：選樣本就能看見特徵。':'挑戰模式：預設隱藏特徵，需要時仍可查看線索。');};
$('sound').onclick=()=>{sound=!sound;$('sound').textContent='音效：'+(sound?'開':'關');$('sound').setAttribute('aria-pressed',String(sound));if(sound)audio('pick');};
$('guide').onclick=()=>modal('<h2>歡迎來到五界研究所</h2><ol><li>點軌道最下方的生物，取到暫存盤。</li><li>點暫存盤選樣本，閱讀特徵。</li><li>點符合的研究委託，親自提交。</li><li>每張委託收集 2 個樣本；完成 9 張即可結算。混合大餐三個單元各 3 張，同局不重複。</li></ol><p>答錯只中斷連擊，不扣金幣，樣本保留。暫存盤滿了仍能提交或放回。需要時使用重整樣本。</p><p>同一生物可符合不同委託，但一次提交只能交給一張。這是分類與收集遊戲，生物不會合成或進化成另一界。</p>');$('atlas').onclick=()=>data&&atlas();$('shop').onclick=shop;$('close').onclick=()=>$('dialog').close();
$('dialog-content').addEventListener('click',e=>{let b=e.target.closest('[data-buy]');if(!b)return;let [id,type,,cost]=items.find(x=>x[0]===b.dataset.buy);if(!profile.owned.includes(id)){if(profile.coins<cost){b.textContent='金幣不足';return;}profile.coins-=cost;profile.owned.push(id);}profile[type]=id;save();audio('complete');render();shop();});
function syncTheme(){document.querySelectorAll('[data-theme]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.theme===nextTheme)));$('theme-info').textContent=THEME_NAMES[nextTheme]+(nextTheme==='mixed'?'：三單元各 3 張（各 2 基礎、1 挑戰）。':'：本單元 9 張（6 基礎、3 挑戰）。')+'同局不重複，下一局可能再出現。';}
document.querySelectorAll('[data-theme]').forEach(b=>b.onclick=()=>{nextTheme=b.dataset.theme;syncTheme();});
$('begin').onclick=()=>{if(busy||!data)return;if(active&&attempts>0){modal('<h2>開始新的主題研究？</h2><p>目前這局的分數與委託進度會重置。金幣與圖鑑保留。</p><button id="confirm-theme">開始新研究</button>');$('confirm-theme').onclick=()=>{$('dialog').close();start();};}else start();};
async function load(){try{let files=['biology.json','unit03_prokaryotes_protists_fungi.json','unit04_plants.json','unit05_animals.json'];let results=await Promise.all(files.map(async f=>{let r=await fetch('data/'+f);if(!r.ok)throw Error(f+' HTTP '+r.status);return r.json();}));data=results[0];for(let bank of results.slice(1))banks[bank.unit]=bank;if(!Array.isArray(data.species)||!data.species.length)throw Error('生物資料錯誤');const ids=new Set();for(let unit of ['micro','plants','animals']){let bank=banks[unit];if(!bank||bank.missions.length<12)throw Error('題庫不足');let concepts=new Set();for(let m of bank.missions){if(ids.has(m.id)||concepts.has(m.concept)||m.unit!==unit||!m.source||!Array.isArray(m.acceptedSpecies)||!m.acceptedSpecies.length||m.acceptedSpecies.some(n=>!data.species.some(s=>s.name===n&&(unit==='plants'?s.kingdom==='plantae':unit==='animals'?s.kingdom==='animalia':s.unit==='micro'))))throw Error('委託題庫格式錯誤');ids.add(m.id);concepts.add(m.concept);}if(bank.missions.filter(m=>m.difficulty==='基礎').length<6||bank.missions.filter(m=>m.difficulty==='挑戰').length<3)throw Error('難度分布不足');}syncTheme();roundSpecies=data.species;render();status('選擇上方主題，點「開始這份研究」。一局 9 張委託，共需答對 18 次。');}catch(e){active=false;status('題庫載入失敗：請確認 data 內的四個 JSON 均已上傳，並以 GitHub Pages 開啟。');$('begin').disabled=true;console.error(e);}}
load();


/* --- URL 參數與教師派發相容性 --- */
(function checkUrlParams() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const m = urlParams.get('mode');
        if (m === 'solo' || m === 'learn') {
            mode = 'learn';
            if ($('mode')) $('mode').value = 'learn';
        } else if (m === 'group-tablet' || m === 'challenge' || m === 'projector') {
            mode = 'challenge';
            if ($('mode')) $('mode').value = 'challenge';
        }
    } catch(e){}
})();

/* --- 課堂專注計時器邏輯 --- */
let timerSeconds = 180;
let timerInterval = null;
let isTimerRunning = false;
let timerAudioCtx = null;

function updateTimerDisplay() {
    const m = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
    const s = (timerSeconds % 60).toString().padStart(2, '0');
    const el = document.getElementById('timer-text');
    if (el) el.innerText = `${m}:${s}`;
}

function setTimerSeconds(sec) {
    pauseTimer();
    timerSeconds = sec;
    updateTimerDisplay();
}

function toggleTimer() {
    if (isTimerRunning) pauseTimer();
    else startTimer();
}

function startTimer() {
    isTimerRunning = true;
    const btn = document.getElementById('t-toggle-btn');
    if (btn) {
        btn.innerText = "⏸️ 暫停";
        btn.style.background = "#f59e0b";
    }

    timerInterval = setInterval(() => {
        if (timerSeconds > 0) {
            timerSeconds--;
            updateTimerDisplay();
        } else {
            pauseTimer();
            playTimerAlarm();
        }
    }, 1000);
}

function pauseTimer() {
    isTimerRunning = false;
    clearInterval(timerInterval);
    const btn = document.getElementById('t-toggle-btn');
    if (btn) {
        btn.innerText = "🚀 開始";
        btn.style.background = "#059669";
    }
}

function resetTimer() {
    pauseTimer();
    timerSeconds = 180;
    updateTimerDisplay();
}

function playTimerAlarm() {
    if (!timerAudioCtx) timerAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    try {
        let osc = timerAudioCtx.createOscillator(), gain = timerAudioCtx.createGain();
        osc.connect(gain); gain.connect(timerAudioCtx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.2, timerAudioCtx.currentTime);
        osc.start(); osc.stop(timerAudioCtx.currentTime + 1.0);
    } catch(e){}
}

function openTimerModal() { document.getElementById('timer-modal').style.display = 'flex'; }
function closeTimerModal() { document.getElementById('timer-modal').style.display = 'none'; }
