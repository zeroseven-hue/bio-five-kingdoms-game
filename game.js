'use strict';

const $ = id => document.getElementById(id);
const K = { monera: '原核生物界', protista: '原生生物界', fungi: '真菌界', plantae: '植物界', animalia: '動物界' };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const THEME_NAMES = {
    micro: '微觀奇兵大餐',
    plants: '植感大餐',
    animals: '動物派對大餐',
    mixed: '迴轉混合大餐'
};

let theme = 'mixed', nextTheme = 'mixed', banks = {}, queue = [], roundSpecies = [], completedLog = [];
let data = null, lanes = [], belt = [], orders = [], selected = null;
let score = 0, combo = 0, done = 0, attempts = 0, correct = 0, shuffleCount = 999, active = false, busy = false, mode = 'learn', sound = true, ctx;

let profile = { coins: 0, best: 0, plate: 'default', decor: 'mint', owned: ['default', 'mint'], seen: [] };

try {
    const old = JSON.parse(localStorage.getItem('bio_sushi_v4') || 'null');
    if (old) {
        if (Number.isFinite(old.coins)) profile.coins = Math.floor(old.coins);
        if (Number.isFinite(old.best)) profile.best = old.best;
        if (Array.isArray(old.seen)) profile.seen = old.seen;
    }
} catch (e) {}

function save() {
    try { localStorage.setItem('bio_sushi_v4', JSON.stringify(profile)); } catch (e) {}
}

function status(t) { $('status').textContent = t; }

function audio(kind) {
    if (!sound) return;
    try {
        const A = window.AudioContext || window.webkitAudioContext;
        if (!A) return;
        ctx ??= new A();
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        const notes = kind === 'success' ? [523, 659, 784] : kind === 'complete' ? [523, 659, 784, 1047] : kind === 'wrong' ? [330, 262] : [420, 700];
        notes.forEach((f, i) => {
            const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + i * .07;
            o.type = kind === 'wrong' ? 'sawtooth' : 'sine';
            o.frequency.setValueAtTime(f * (kind === 'success' ? 1 + Math.min(combo, 8) * .025 : 1), t);
            g.gain.setValueAtTime(.0001, t);
            g.gain.exponentialRampToValueAtTime(.05, t + .008);
            g.gain.exponentialRampToValueAtTime(.0001, t + .15);
            o.connect(g); g.connect(ctx.destination);
            o.start(t); o.stop(t + .16);
            o.onended = () => { o.disconnect(); g.disconnect(); };
        });
    } catch (e) {}
}

function art(s) {
    const n = s.name;
    let shape = '';
    const eyes = '<circle cx="43" cy="44" r="2" fill="#304748"/><circle cx="57" cy="44" r="2" fill="#304748"/><path d="M47 50q3 3 6 0" fill="none"/><circle cx="36" cy="49" r="3" fill="#e8ac9f" stroke="none"/>';
    
    if (s.kingdom === 'monera') {
        shape = n === '藍綠菌' ? '<g fill="#a9d5c3"><circle cx="20" cy="40" r="10"/><circle cx="39" cy="39" r="11"/><circle cx="59" cy="41" r="11"/><circle cx="79" cy="40" r="10"/></g><path d="M15 40h7m12-3h8m12 5h8m11-4h7"/>' : '<rect x="23" y="25" width="54" height="34" rx="17" fill="#f3cb9d"/><path d="M77 42q15-15 14 7M28 23l-4-6m24 6v-7m24 8 5-7M28 61l-4 7m24-7v7"/><path d="M35 39q6-8 11 0t11 0t10 0" fill="none"/>';
    } else if (n === '草履蟲') {
        shape = '<ellipse cx="50" cy="41" rx="34" ry="20" fill="#e7cfed"/><path d="M19 26l-6-5m17-3-2-6m18 8v-8m16 10 3-8m13 21 8-3m-2 17 7 5M25 56l-5 7m22-1v7m19-9 3 7"/>';
    } else if (n === '變形蟲') {
        shape = '<path d="M19 40q-16-19 5-19l17 6q4-22 18-10l-2 14q34-16 25 5l-12 9q28 17 5 19l-22-9q-16 23-23 5l4-13q-21 12-15-7Z" fill="#c9dfee"/>';
    } else if (n === '酵母菌') {
        shape = '<ellipse cx="48" cy="43" rx="24" ry="25" fill="#f4d8b0"/><ellipse cx="72" cy="23" rx="12" ry="13" fill="#f4d8b0"/><circle cx="40" cy="36" r="6" fill="#e8bf92" stroke="none"/>';
    } else if (n === '香菇') {
        shape = '<path d="M39 43h22l5 27H34Z" fill="#f5e6cb"/><path d="M15 42Q20 8 50 10q30-2 35 32Z" fill="#c58d78"/><path d="M25 37h50" fill="none"/>';
    } else if (s.kingdom === 'plantae') {
        shape = '<path d="M50 72V25"/><path d="M50 50Q12 52 20 18q33 0 30 32M51 40q-2-32 30-27 3 27-30 27" fill="#b0d1a5"/><path d="M24 24l22 22m29-27-21 17" fill="none"/>';
    } else {
        shape = '<path d="M26 66l5-28h38l6 28Z" fill="#f0bdaf"/><path d="M31 38q-18-15-11-24m20 24q-14-19-5-26m15 26V8m10 30q14-18 5-26m4 26q18-15 11-24" fill="none"/>';
    }
    return `<svg viewBox="0 0 100 80" width="48" height="40" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><g stroke="#34494b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${shape}${eyes}</g></svg>`;
}

function customerAvatar(i) {
    return ['🧑‍🔬', '👩‍🔬', '👨‍🔬'][i % 3];
}

function match(o, c) {
    if (!o || !c) return false;
    let [type, val] = o.rule.split(':');
    if (type === 'accepted') return o.acceptedSpecies.includes(c.name);
    return type === 'kingdom' ? c.kingdom === val : type === 'trait' ? c.traits.includes(val) : false;
}

const rnd = a => a[Math.floor(Math.random() * a.length)];
let uid = 0;
const sample = s => ({ ...s, uid: ++uid });

function shuffled(a) {
    a = [...a];
    for (let i = a.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function chooseMissions() {
    let chosen = [];
    let list = theme === 'mixed' ? ['micro', 'plants', 'animals'] : [theme];
    for (let unit of list) {
        let basic = shuffled(banks[unit].missions.filter(m => m.difficulty === '基礎'));
        let hard = shuffled(banks[unit].missions.filter(m => m.difficulty === '挑戰'));
        chosen.push(...basic.slice(0, theme === 'mixed' ? 2 : 6), ...hard.slice(0, theme === 'mixed' ? 1 : 3));
    }
    return shuffled(chosen).map(m => ({ ...m, current: 0, needed: 2 }));
}

function nextOrder() { return queue.shift() || null; }

function makeLanes() {
    lanes = Array.from({ length: 5 }, () => Array.from({ length: 4 }, () => sample(rnd(roundSpecies))));
    orders.forEach((o, i) => {
        if (o) lanes[i][0] = sample(rnd(data.species.filter(s => match(o, s))));
    });
}

function start() {
    if (!data) return;
    theme = nextTheme;
    score = combo = done = attempts = correct = 0;
    belt = []; selected = null; busy = false; active = true; completedLog = [];
    queue = chooseMissions();
    roundSpecies = data.species.filter(s => theme === 'mixed' || s.unit === theme);
    orders = Array.from({ length: 3 }, nextOrder);
    makeLanes();
    render();
    status(`🍣 本局大餐：${THEME_NAMES[theme]}。共 9 張顧客委託，點擊生物食材直接出餐！`);
}

function render() {
    $('coins').textContent = profile.coins;
    $('score').textContent = score;
    $('combo').textContent = '×' + combo;
    $('progress').textContent = done + ' / 9';
    $('capacity').textContent = belt.length + ' / 7';

    // 繪製 3 位顧客點餐
    $('orders').innerHTML = orders.map((o, i) => o ? `
        <div class="customer-seat" data-order="${i}">
            <div class="customer-header">
                <div class="customer-avatar">${customerAvatar(i)}</div>
                <div class="customer-info">
                    <h3>${['小葉研究員', '小菇研究員', '阿核研究員'][i]} 點餐</h3>
                    <small>${THEME_NAMES[o.unit]} · ${o.difficulty}</small>
                </div>
            </div>
            <div class="customer-bubble">💬 需求：${esc(o.text)}</div>
            <div class="order-progress">
                <span>進度：${o.current} / ${o.needed}</span>
                <span style="color:var(--primary-green);">👉 點此送餐</span>
            </div>
            <progress max="${o.needed}" value="${o.current}"></progress>
        </div>
    ` : `
        <div class="customer-seat" style="background:#f8fafc; opacity:0.8;">
            <div class="customer-header">
                <div class="customer-avatar">✅</div>
                <div class="customer-info">
                    <h3>本席顧客已滿意結帳</h3>
                    <small>繼續完成其他顧客委託</small>
                </div>
            </div>
            <div class="customer-bubble">🎉 太美味了！謝謝大廚！</div>
        </div>
    `).join('');

    // 繪製暫存吧台
    $('belt').innerHTML = Array.from({ length: 7 }, (_, i) => {
        let c = belt[i];
        return `<div class="plate-slot ${c ? 'filled' : ''} ${c?.uid === selected ? 'selected' : ''}" data-belt="${i}">
            ${c ? art(c) + `<strong>${esc(c.name)}</strong>` : String(i + 1)}
        </div>`;
    }).join('');

    // 繪製 5 條木紋食材軌道 (任何卡片皆可點擊取樣/出餐)
    $('lanes').innerHTML = lanes.map((l, i) => `
        <div class="lane-column">
            ${l.map((c, j) => `
                <div class="food-card" data-lane="${i}" data-index="${j}">
                    ${art(c)}
                    <strong>${esc(c.name)}</strong>
                    <small>${mode === 'learn' ? (c.traits[0] || '特徵') : '點擊取樣/出餐'}</small>
                </div>
            `).join('')}
        </div>
    `).join('');

    let c = belt.find(c => c.uid === selected);
    $('inspector').innerHTML = c ? `
        <strong>已選取【${esc(c.name)}】</strong>：${c.traits.map(esc).join('、')} (點上方顧客送餐)
    ` : '點擊下方軌道上的生物食材取樣，或點暫存盤生物再點顧客進行出餐。';
}

async function pickCard(laneIndex, cardIndex) {
    if (!active || busy) return;
    let c = lanes[laneIndex][cardIndex];
    if (!c) return;

    // 若暫存盤未滿，放進暫存盤並選取
    if (belt.length < 7) {
        audio('pick');
        lanes[laneIndex].splice(cardIndex, 1);
        // 補充新食材
        lanes[laneIndex].push(sample(rnd(roundSpecies)));
        belt.push(c);
        selected = c.uid;
        render();
        status(`🍣 已取出食材「${c.name}」放入吧台盤！請點上方符合需求的顧客出餐。`);
    } else {
        status('吧台暫存盤已滿 7 個！請先選擇一個生物送給顧客，或點「放回食材」。');
    }
}

async function submitOrder(orderIndex) {
    if (!active || busy) return;
    let o = orders[orderIndex];
    if (!o) return;

    let c = belt.find(x => x.uid === selected);
    if (!c && belt.length > 0) c = belt[belt.length - 1]; // 自動預設最後拿取的食材

    if (!c) {
        status('請先點擊下方的生物食材，再點顧客進行出餐！');
        return;
    }

    attempts++;
    if (!match(o, c)) {
        combo = 0;
        audio('wrong');
        render();
        status(`❌ 顧客：「【${c.name}】不符合我的需求！」提示：${o.explanation || '請再閱讀題目特徵。'}`);
        return;
    }

    correct++;
    busy = true;
    audio('success');

    belt = belt.filter(x => x.uid !== c.uid);
    selected = null;
    combo++;
    let gain = 15 + Math.min(combo - 1, 5) * 3;
    score += gain;
    profile.coins += 5;

    o.current++;
    let completed = o.current === o.needed;
    if (completed) {
        done++;
        score += 50;
        profile.coins += 20;
        completedLog.push({ id: o.id, text: o.text, unit: o.unit, source: o.source, explanation: o.explanation });
        orders[orderIndex] = nextOrder();
    }

    busy = false;
    render();
    status(`🎉 正確！出餐【${c.name}】！+${gain} 分${completed ? '；顧客滿意離席，額外 +50 分！' : ''}`);
    save();

    if (done >= 9) finish();
}

function finish() {
    active = false;
    profile.best = Math.max(profile.best, score);
    save();
    render();

    const certId = 'GC-' + Math.floor(1000 + Math.random() * 9000);
    modal(`
        <h2 style="color:var(--primary-green); text-align:center;">🎉 恭喜完成五界迴轉大餐！</h2>
        <p style="text-align:center; color:var(--text-muted);">滿意出餐 9 張顧客委託，獲得頂級星級大廚認證！</p>
        
        <div style="background:#ecfdf5; border:2px dashed #6ee7b7; border-radius:16px; padding:16px; margin:16px 0; text-align:center;">
            <p style="font-size:13px; color:#047857; font-weight:700;">📜 Google Classroom 防偽認證證書</p>
            <h3 style="font-size:22px; color:var(--wood-dark); margin:6px 0;">認證碼：${certId}</h3>
            <p style="font-size:12px; color:var(--text-muted);">本局得分：${score} 分 ｜ 提交正確率：${Math.round(correct / attempts * 100)}%</p>
        </div>

        <details style="margin-top:12px; font-size:13px;">
            <summary style="font-weight:700; cursor:pointer; color:var(--wood-dark);">📋 本局出餐委託回顧與會考原題號</summary>
            <div style="margin-top:8px; max-height:160px; overflow-y:auto; line-height:1.6;">
                ${completedLog.map(m => `<p style="border-bottom:1px solid #eee; padding:4px 0;"><strong>${esc(m.text)}</strong><br><small>${m.explanation}｜會考原題第 ${m.source.questionId} 題</small></p>`).join('')}
            </div>
        </details>
    `);
}

function modal(html) {
    $('dialog-content').innerHTML = html;
    if (!$('dialog').open) $('dialog').showModal();
}

function atlas() {
    modal(`
        <h2>📚 五界生物特徵圖鑑</h2>
        <p style="font-size:13px; color:var(--text-muted); margin-bottom:12px;">生物分類與重要特徵速查（圖像為特徵示意）</p>
        <div style="max-height:300px; overflow-y:auto; display:grid; grid-template-columns:repeat(auto-fill, minmax(140px,1fr)); gap:10px;">
            ${data.species.map(s => `
                <div style="background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:12px; padding:10px; text-align:center;">
                    ${art(s)}
                    <h4 style="font-size:14px; margin:4px 0; color:var(--wood-dark);">${esc(s.name)}</h4>
                    <span style="font-size:11px; background:#dcfce7; color:#166534; padding:2px 6px; border-radius:6px;">${K[s.kingdom]}</span>
                    <p style="font-size:11px; color:var(--text-muted); margin-top:4px;">${s.note}</p>
                </div>
            `).join('')}
        </div>
    `);
}

function shop() {
    modal(`
        <h2>🎨 生態食堂裝飾</h2>
        <p style="font-size:13px; color:var(--text-muted);">研究金幣：${profile.coins}</p>
        <p style="margin-top:12px; font-size:14px;">已自動配備【薄荷生態吧台】與【金色大廚徽章】！</p>
    `);
}

// 事件監聽
$('orders').addEventListener('click', e => {
    let b = e.target.closest('[data-order]');
    if (b) submitOrder(Number(b.dataset.order));
});

$('lanes').addEventListener('click', e => {
    let b = e.target.closest('[data-lane]');
    if (b) pickCard(Number(b.dataset.lane), Number(b.dataset.index));
});

$('belt').addEventListener('click', e => {
    let b = e.target.closest('[data-belt]');
    if (b) {
        let c = belt[Number(b.dataset.belt)];
        if (c) { selected = c.uid; render(); }
    }
});

$('return').onclick = () => {
    let c = belt.find(x => x.uid === selected);
    if (!c) return;
    belt = belt.filter(x => x.uid !== selected);
    selected = null;
    render();
    status('已將食材放回儲存庫。');
};

$('clue').onclick = () => {
    let c = belt.find(x => x.uid === selected);
    if (c) modal(`<h2>${esc(c.name)} 觀察線索</h2>${art(c)}<p>${c.traits.map(esc).join('、')}</p><p>${esc(c.note)}</p>`);
};

$('shuffle').onclick = () => {
    makeLanes();
    audio('pick');
    render();
    status('🔄 已為您免費刷一波全新食材！');
};

$('begin').onclick = () => start();
$('mode').onchange = () => { mode = $('mode').value; render(); };
$('sound').onclick = () => { sound = !sound; $('sound').textContent = '🔊 音效：' + (sound ? '開' : '關'); };
$('guide').onclick = () => modal(`
    <h2>🍣 生物迴轉食堂 玩法說明</h2>
    <ol style="padding-left:20px; line-height:1.8; font-size:14px;">
        <li>查看頂部顧客對話框的點餐需求（如：無細胞核的原核生物）。</li>
        <li>點擊下方軌道上的生物食材直接取樣出餐。</li>
        <li>每張顧客委託收集 2 份正確生物，完成 9 張即可結算大廚證書！</li>
    </ol>
`);
$('atlas').onclick = () => data && atlas();
$('shop').onclick = shop;
$('close').onclick = () => $('dialog').close();

// 主題切換
document.querySelectorAll('[data-theme]').forEach(b => {
    b.onclick = () => {
        nextTheme = b.dataset.theme;
        document.querySelectorAll('[data-theme]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.theme === nextTheme)));
        $('theme-info').textContent = THEME_NAMES[nextTheme] + '：點擊「開始迴轉出餐研究」。';
    };
});

// 載入 JSON
async function load() {
    try {
        let files = ['biology.json', 'unit03_prokaryotes_protists_fungi.json', 'unit04_plants.json', 'unit05_animals.json'];
        let results = await Promise.all(files.map(async f => {
            let r = await fetch('data/' + f);
            if (!r.ok) throw Error(f + ' HTTP ' + r.status);
            return r.json();
        }));
        data = results[0];
        for (let bank of results.slice(1)) banks[bank.unit] = bank;
        roundSpecies = data.species;
        render();
        status('🍣 迴轉食堂已就緒！請選擇主題大餐，點擊「開始迴轉出餐研究」。');
    } catch (e) {
        console.error(e);
        status('題庫載入中，請確保已上傳 JSON 題庫。');
    }
}

load();

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
    if (btn) { btn.innerText = "⏸️ 暫停"; btn.style.background = "#f59e0b"; }

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
    if (btn) { btn.innerText = "🚀 開始"; btn.style.background = "#059669"; }
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
    } catch (e) {}
}

function openTimerModal() { document.getElementById('timer-modal').style.display = 'flex'; }
function closeTimerModal() { document.getElementById('timer-modal').style.display = 'none'; }
