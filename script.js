/**
 * the-Particle v3.2.0 - Auto Update Fix
 * - Re-implemented Auto Buyers
 * - Integrated with new Buy Max math
 */

const SAVE_KEY = 'theParticle_v3_2';
const INFINITY_LIMIT = 1.79e308;

// --- ニュースティッカー ---
const NEWS_MESSAGES = [
  { req: 0, text: "システム起動... 粒子生成プロセス、スタンバイ。" },
  { req: 50, text: "最初の粒子が観測されました。ちっぽけですが、偉大な一歩です。" },
  { req: 500, text: "近所の猫が静電気でフワフワになっています。" },
  { req: 1e3, text: "研究員が「粒子が見える」と言い始めました。休暇が必要です。" },
  { req: 1e4, text: "オートメーションシステムが稼働を開始しました。" },
  { req: 1e6, text: "物理学会から「やりすぎ」という警告メールが届きました。" },
  { req: 1e9, text: "粒子の重みでサーバー室の床が少し凹みました。" },
  { req: 1e12, text: "自動化された加速器が独自の言語で会話しています。" },
  { req: 1e15, text: "「粒子ダイエット」がSNSでトレンド入り。" },
  { req: 1e20, text: "異次元からのノック音が聞こえます。「静かにして」とのことです。" },
  { req: 1e50, text: "現実のテクスチャ解像度が低下しています。" },
  { req: 1e100, text: "エラー：宇宙のメモリ領域が不足しています。" }
];
const FILLER_NEWS = [
  "今日の天気は晴れ、時々粒子嵐。",
  "加速器の作動音は「ブーン」ではなく「ズズズ...」です。",
  "研究室のコーヒーメーカーが粒子加速器に改造されました。",
  "未確認粒子物体(UPO)が目撃されました。",
  "自動購入システムがあなたの財布を狙っています。"
];

// --- 初期データ ---
function getInitialState() {
  return {
    particles: 10,
    linacs: 0, 
    shifts: 0, 
    
    stats: {
      totalParticles: 10,
      totalLinacs: 0,
      startTime: Date.now(),
      lastSaveTime: Date.now(),
    },
    
    infinity: { ip: 0, crunchCount: 0 },

    settings: {
      notation: 'sci',
      buyAmount: 1,
      skipConfirm: false
    },

    // autoUnlocked, autoActive を追加
    generators: [
      { id: 0, name: "Accelerator Mk.1", baseCost: 10,   costMult: 1.5, amount: 0, bought: 0, production: 1, autoUnlocked: false, autoActive: false },
      { id: 1, name: "Accelerator Mk.2", baseCost: 100,  costMult: 1.8, amount: 0, bought: 0, production: 1, autoUnlocked: false, autoActive: false },
      { id: 2, name: "Accelerator Mk.3", baseCost: 1e3,  costMult: 2.2, amount: 0, bought: 0, production: 1, autoUnlocked: false, autoActive: false },
      { id: 3, name: "Accelerator Mk.4", baseCost: 1e4,  costMult: 3.0, amount: 0, bought: 0, production: 1, autoUnlocked: false, autoActive: false },
      { id: 4, name: "Accelerator Mk.5", baseCost: 1e6,  costMult: 4.0, amount: 0, bought: 0, production: 1, autoUnlocked: false, autoActive: false },
      { id: 5, name: "Accelerator Mk.6", baseCost: 1e8,  costMult: 6.0, amount: 0, bought: 0, production: 1, autoUnlocked: false, autoActive: false },
      { id: 6, name: "Accelerator Mk.7", baseCost: 1e10, costMult: 10.0, amount: 0, bought: 0, production: 1, autoUnlocked: false, autoActive: false },
      { id: 7, name: "Accelerator Mk.8", baseCost: 1e12, costMult: 15.0, amount: 0, bought: 0, production: 1, autoUnlocked: false, autoActive: false }
    ]
  };
}

let game = getInitialState();
let isCrunching = false;
// オートバイヤーの実行間隔制御用
let autoBuyerTimer = 0;

// --- UI Helpers ---
const UI = {
  toast: (msg) => {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = msg;
    container.appendChild(el);
    setTimeout(() => { if(el.parentNode) el.parentNode.removeChild(el); }, 4000);
  },
  
  modal: (title, body, actions = []) => {
    const overlay = document.getElementById('custom-modal-overlay');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = body;
    const actContainer = document.getElementById('modal-actions');
    actContainer.innerHTML = '';
    
    if(actions.length === 0) actions.push({ text: '閉じる', class: 'primary', onClick: null });

    actions.forEach(act => {
      const btn = document.createElement('button');
      btn.className = `ui-btn ${act.class || 'secondary'}`;
      btn.textContent = act.text;
      btn.style.width = 'auto'; btn.style.padding = '8px 20px';
      btn.onclick = () => { if(act.onClick) act.onClick(); UI.closeModal(); };
      actContainer.appendChild(btn);
    });
    overlay.style.display = 'flex';
  },
  
  closeModal: () => { document.getElementById('custom-modal-overlay').style.display = 'none'; },

  confirm: (title, body, onConfirm) => {
    if (game.settings.skipConfirm) { onConfirm(); return; }
    UI.modal(title, body, [
      { text: 'キャンセル', class: 'secondary' },
      { text: '実行する', class: 'danger', onClick: onConfirm }
    ]);
  }
};

// --- Math Logic ---
function getSumCost(gen, k) {
  const r = gen.costMult;
  const currentCost = gen.baseCost * Math.pow(r, gen.bought);
  if (r === 1) return currentCost * k;
  return currentCost * (Math.pow(r, k) - 1) / (r - 1);
}

function calcMaxAffordable(gen, budget) {
  const r = gen.costMult;
  const currentCost = gen.baseCost * Math.pow(r, gen.bought);
  if (budget < currentCost) return 0;
  if (r === 1) return Math.floor(budget / currentCost);
  const val = (budget * (r - 1)) / currentCost + 1;
  const k = Math.floor(Math.log(val) / Math.log(r));
  return k > 0 ? k : 0;
}

function getGlobalMultiplier() {
  const base = 1.2 + ((game.shifts || 0) * 0.2);
  return Math.pow(base, game.linacs || 0);
}

// --- Auto Logic ---
function checkAutoUnlock() {
  game.generators.forEach((gen, i) => {
    // Mk.1は 1e50, Mk.2は 1e60... という閾値設定 (v2準拠)
    const threshold = Number(`1e${50 + (i * 10)}`);
    if (!gen.autoUnlocked && game.particles >= threshold) {
      gen.autoUnlocked = true;
      UI.toast(`${gen.name} のオート機能が解放されました`);
      updateGeneratorUI(i); // バッジ表示更新のため
    }
  });
}

function runAutobuyers() {
  game.generators.forEach((gen, i) => {
    if (gen.autoUnlocked && gen.autoActive) {
      // Max購入を試みる
      buyMaxGenerator(i, true); // true = suppress UI update for performance
    }
  });
}

function toggleAutobuyer(id) {
  const gen = game.generators[id];
  if (!gen.autoUnlocked) return;
  gen.autoActive = !gen.autoActive;
  updateGeneratorUI(id);
}

// --- Game Loop ---
function gameLoop() {
  if (isCrunching) return;

  const now = Date.now();
  let dt = (now - game.stats.lastSaveTime) / 1000;
  if (dt < 0) dt = 0;
  game.stats.lastSaveTime = now;

  if (game.particles >= INFINITY_LIMIT) {
    triggerBigCrunch();
    return;
  }

  // Unlock Check
  checkAutoUnlock();

  // Autobuyer Execution (Every ~0.5s to save performance, or per frame if light)
  autoBuyerTimer += dt;
  if (autoBuyerTimer >= 0.1) { // 0.1秒ごとに実行
    runAutobuyers();
    autoBuyerTimer = 0;
  }

  // Production
  const globalMult = getGlobalMultiplier();
  
  // Tier 1 -> Particles
  const g0 = game.generators[0];
  const pps = g0.amount * g0.production * globalMult;
  game.particles += pps * dt;
  game.stats.totalParticles += pps * dt;

  // Tier N -> Tier N-1
  for (let i = 1; i < game.generators.length; i++) {
    const producer = game.generators[i];
    const target = game.generators[i - 1];
    const prod = producer.amount * producer.production * globalMult;
    target.amount += prod * dt;
  }

  updateGlitchEffect();
  updateUI(pps);
  updateNewsTicker();
  requestAnimationFrame(gameLoop);
}

// --- Actions ---
function buyGenerator(id) {
  const gen = game.generators[id];
  const amount = game.settings.buyAmount;
  const cost = getSumCost(gen, amount);
  if (game.particles >= cost) {
    game.particles -= cost;
    gen.amount += amount;
    gen.bought += amount;
    gen.production *= Math.pow(1.1, amount);
    updateGeneratorUI(id);
  }
}

function buyMaxGenerator(id, silent = false) {
  const gen = game.generators[id];
  const max = calcMaxAffordable(gen, game.particles);
  if (max > 0) {
    const cost = getSumCost(gen, max);
    game.particles -= cost;
    gen.amount += max;
    gen.bought += max;
    gen.production *= Math.pow(1.1, max);
    if (!silent) updateGeneratorUI(id);
  }
}

function buyMaxAll() {
  for (let i = game.generators.length - 1; i >= 0; i--) {
    buyMaxGenerator(i);
  }
}

function doLinac() {
  const req = 1 + (game.linacs * 10);
  if (game.generators[7].amount < req) return;
  UI.confirm("ライナックを実行 [L]", 
    `リセットして倍率を強化します。<br>Next: x${format(Math.pow(1.2+(game.shifts*0.2), game.linacs+1))}`, 
    () => {
      game.linacs++;
      game.stats.totalLinacs++;
      resetOnPrestige();
      UI.toast("ライナック完了！");
    });
}

function doLinacShift() {
  const req = 5 + (game.shifts * 5);
  if (game.linacs < req) return;
  UI.confirm("ライナック・シフト [S+L]", 
    `次元超越を行います。<br>全てをリセットし、ベース倍率を増加させます。`, 
    () => {
      game.shifts++;
      game.linacs = 0;
      resetOnPrestige();
      UI.toast("シフト完了！次元拡張成功。");
    });
}

function resetOnPrestige() {
  game.particles = 10;
  game.generators.forEach(g => {
    g.amount = 0;
    g.bought = 0;
    g.production = 1;
    // Unlock状態は維持するか、リセットするか？
    // 通常、Prestigeで自動化は維持されることが多いが、
    // ここでは「全てを失う」設定ならfalseにするが、遊びやすさ重視でtrue維持推奨
    // g.autoUnlocked = false; // 維持するならコメントアウト
  });
  saveGame();
}

// --- UI Updates ---
function updateUI(pps) {
  document.getElementById('particle-display').textContent = format(game.particles) + " 粒子";
  document.getElementById('pps-display').textContent = `(+${format(pps)} /秒)`;

  const linacReq = 1 + (game.linacs * 10);
  const mk8 = game.generators[7].amount;
  const linacPct = Math.min(100, (mk8 / linacReq) * 100);
  document.getElementById('prog-linac').style.width = `${linacPct}%`;
  document.getElementById('prog-linac-text').textContent = `${linacPct.toFixed(0)}%`;
  document.getElementById('current-linac-count').textContent = game.linacs;

  const shiftReq = 5 + (game.shifts * 5);
  if (game.shifts > 0 || game.linacs > 0) {
    document.getElementById('shift-prog-row').style.display = 'flex';
    document.getElementById('prog-shift').style.width = `${Math.min(100, (game.linacs/shiftReq)*100)}%`;
    document.getElementById('prog-shift-text').textContent = `${Math.min(100, (game.linacs/shiftReq)*100).toFixed(0)}%`;
  }

  if (game.shifts > 0) {
    document.getElementById('shift-status').style.display = 'block';
    document.getElementById('shift-mult-display').textContent = `x${format(1.2+(game.shifts*0.2))}`;
    document.getElementById('shift-count').textContent = game.shifts;
  }

  const pContainer = document.getElementById('prestige-container');
  const btnLinac = document.getElementById('btn-linac');
  const btnShift = document.getElementById('btn-shift');

  if (mk8 >= linacReq * 0.5 || game.linacs > 0) {
    pContainer.style.display = 'block';
    if (mk8 >= linacReq) {
      btnLinac.classList.remove('disabled');
      btnLinac.onclick = doLinac;
      btnLinac.style.opacity = "1";
      btnLinac.querySelector('strong').textContent = "ライナックを実行 [L]";
    } else {
      btnLinac.classList.add('disabled');
      btnLinac.onclick = null;
      btnLinac.style.opacity = "0.5";
      btnLinac.querySelector('strong').textContent = `Req: Mk.8 x${format(linacReq)}`;
    }
    btnShift.style.display = (game.linacs >= shiftReq) ? 'inline-block' : 'none';
  } else {
    pContainer.style.display = 'none';
  }

  // ジェネレーターUI更新は requestAnimationFrame毎だと重いので、
  // 変化があるときだけ呼ぶのが理想だが、ここでは毎F呼ぶ（Autoもあるため）
  // ただしAutoBuyerが高速に動くときはスキップされるようになっている
  game.generators.forEach((g, i) => updateGeneratorUI(i));
}

function updateGeneratorUI(id) {
  const gen = game.generators[id];
  const amtEl = document.getElementById(`amt-${id}`);
  if(!amtEl) return;

  // 数値更新
  amtEl.textContent = format(gen.amount);
  document.getElementById(`mult-${id}`).textContent = "x" + format(gen.production * getGlobalMultiplier());
  
  const btn = document.getElementById(`btn-${id}`);
  const amountToBuy = game.settings.buyAmount;
  const cost = getSumCost(gen, amountToBuy);
  
  btn.innerHTML = `Buy x${amountToBuy}<br><span style="font-size:0.8em">${format(cost)}</span>`;
  if (game.particles >= cost) btn.classList.remove('disabled');
  else btn.classList.add('disabled');

  // Autoバッジ更新
  const badge = document.getElementById(`auto-badge-${id}`);
  if (badge) {
    if (gen.autoUnlocked) {
      badge.classList.add('unlocked');
      badge.textContent = gen.autoActive ? "AUTO: ON" : "AUTO: OFF";
      if (gen.autoActive) badge.classList.add('active');
      else badge.classList.remove('active');
      badge.onclick = () => toggleAutobuyer(id);
    } else {
      const threshold = Number(`1e${50 + (id * 10)}`);
      badge.classList.remove('unlocked', 'active');
      badge.textContent = `Req: ${formatScientific(threshold)}`;
      badge.onclick = null;
    }
  }
}

// --- Glitch/Effects ---
function updateGlitchEffect() {
  const overlay = document.getElementById('glitch-layer');
  if (game.particles > 1e200) {
    document.body.classList.add('glitched');
    overlay.style.opacity = Math.min(0.5, (Math.log10(game.particles) - 200) / 100);
  } else {
    document.body.classList.remove('glitched');
    overlay.style.opacity = 0;
  }
}

// --- News ---
let newsTimer = 0;
function updateNewsTicker() {
  newsTimer++;
  if (newsTimer > 600) {
    const content = document.getElementById('news-content');
    const available = NEWS_MESSAGES.filter(n => game.particles >= n.req);
    let pool = [];
    if (available.length > 0) pool.push(available[available.length - 1].text);
    pool = pool.concat(FILLER_NEWS);
    const text = pool[Math.floor(Math.random() * pool.length)];
    
    const newEl = content.cloneNode(true);
    newEl.textContent = text;
    content.parentNode.replaceChild(newEl, content);
    newsTimer = 0;
  }
}

// --- Utils ---
const UNITS_ENG = ['', 'k', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc'];
const UNITS_JP = ['', '万', '億', '兆', '京', '垓', '𥝱', '穣', '溝', '澗'];

function format(num) {
  if (num === undefined || num === null) return "0.00";
  
  // 1000未満でも常に小数点2桁を表示 (.toFixed(2)) して幅ブレを防止
  if (num < 1000) return num.toFixed(2);
  
  if (game.settings.notation === 'sci') return formatScientific(num);
  
  let unitArr = game.settings.notation === 'jp' ? UNITS_JP : UNITS_ENG;
  let step = game.settings.notation === 'jp' ? 4 : 3;
  
  let e = Math.floor(Math.log10(num));
  let level = Math.floor(e / step);
  
  if (level >= unitArr.length) return formatScientific(num);
  
  let m = num / Math.pow(10, level * step);
  // 単位付きでも常に小数点2桁固定
  return m.toFixed(2) + unitArr[level];
}

function formatScientific(num) {
  if (num === 0) return "0.00";
  let e = Math.floor(Math.log10(num));
  let m = num / Math.pow(10, e);
  // 科学的記法でもマンティッサを2桁固定
  return m.toFixed(2) + "e" + e;
}

function formatTime(sec) {
  if (isNaN(sec) || sec < 0) return "0:00:00";
  let h = Math.floor(sec / 3600);
  let m = Math.floor((sec % 3600) / 60);
  let s = Math.floor(sec % 60);
  return `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

// --- Save/Load ---
function saveGame() {
  if(isCrunching) return;
  game.stats.lastSaveTime = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(game));
  const btn = document.activeElement;
  if(btn && btn.tagName === "BUTTON") UI.toast("セーブ完了");
}
function loadGame() {
  const data = localStorage.getItem(SAVE_KEY);
  if (data) {
    try {
      const saved = JSON.parse(data);
      const fresh = getInitialState();
      game = { ...fresh, ...saved };
      game.stats = { ...fresh.stats, ...saved.stats };
      game.settings = { ...fresh.settings, ...saved.settings };
      // Generatorの結合（AutoUnlockフラグなどを維持しつつ、新プロパティも反映）
      game.generators = fresh.generators.map((g, i) => ({ ...g, ...(saved.generators[i] || {}) }));
    } catch(e) { console.error(e); }
  }
  setBuyAmount(game.settings.buyAmount);
  document.getElementById('chk-skip-confirm').checked = game.settings.skipConfirm;
  const sel = document.getElementById('notation-select');
  if(sel) sel.value = game.settings.notation;
  processOfflineProgress();
}
function processOfflineProgress() {
  const now = Date.now();
  const last = game.stats.lastSaveTime;
  const diff = (now - last) / 1000;
  if (diff > 60) {
    const pps = game.generators[0].amount * game.generators[0].production * getGlobalMultiplier();
    const gained = pps * diff;
    if (gained > 0) {
      game.particles += gained;
      game.stats.totalParticles += gained;
      UI.modal("OFFLINE", `おかえりなさい。<br>オフライン進行 (${formatTime(diff)}) で<br><strong style="color:var(--accent-color)">+${format(gained)} 粒子</strong><br>を獲得しました。`);
    }
  }
  game.stats.lastSaveTime = now;
}

// --- Init ---
function setBuyAmount(n) {
  game.settings.buyAmount = n;
  document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`buy-${n}`).classList.add('active');
  game.generators.forEach((g,i)=>updateGeneratorUI(i));
}
function toggleSkipConfirm(el) { game.settings.skipConfirm = el.checked; }
function changeNotation(val) { game.settings.notation = val; updateUI(0); }
function hardReset() {
  if(confirm("【警告】データを完全削除しますか？")) {
    localStorage.removeItem(SAVE_KEY);
    location.reload();
  }
}
async function exportSaveToClipboard() {
  saveGame();
  try {
    await navigator.clipboard.writeText(btoa(JSON.stringify(game)));
    UI.toast("コピーしました");
  } catch(e) { UI.modal("Error", "クリップボードへのコピーに失敗しました"); }
}
async function importSaveFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    const data = JSON.parse(atob(text));
    if (data && data.particles !== undefined) {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      location.reload();
    } else throw new Error();
  } catch(e) { UI.toast("データが無効です"); }
}

function triggerBigCrunch() {
  isCrunching = true;
  document.getElementById('crunch-overlay').style.display = 'flex';
  setTimeout(() => {
    const fresh = getInitialState();
    fresh.infinity.crunchCount = (game.infinity.crunchCount || 0) + 1;
    game = fresh;
    saveGame();
    location.reload();
  }, 4000);
}

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  const k = e.key.toUpperCase();
  if (['1','2','3','4','5','6','7','8'].includes(k)) buyGenerator(parseInt(k)-1);
  if (k === 'M') buyMaxAll();
  if (k === 'S') saveGame();
  if (k === 'L') doLinac();
});

function init() {
  const container = document.getElementById('generator-container');
  getInitialState().generators.forEach((g, i) => {
    const div = document.createElement('div');
    div.className = 'generator-row';
    div.innerHTML = `
      <div class="gen-info">
        <div class="gen-name-row">
          <span class="gen-name">${g.name}</span>
          <span id="auto-badge-${i}" class="auto-badge">Req: 1e${50 + i * 10}</span>
        </div>
        <div class="gen-stats">
          所持: <span id="amt-${i}" style="color:#fff;font-weight:bold;">0</span> | 
          倍率: <span id="mult-${i}" style="color:var(--accent-color)">x1.00</span>
        </div>
      </div>
      <button id="btn-${i}" class="buy-btn" onclick="buyGenerator(${i})">Buy</button>
    `;
    container.appendChild(div);
  });
  
  window.toggleSidebar = () => document.getElementById('app-wrapper').classList.toggle('closed');
  window.switchTab = (n,b) => {
    document.querySelectorAll('.sidebar-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`tab-${n}`).classList.add('active');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    b.classList.add('active');
  };

  loadGame();
  setInterval(() => saveGame(), 10000);
  requestAnimationFrame(gameLoop);
}

init();





Evaluate

Compare



57,226 個のトークン
 自動消去
