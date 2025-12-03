/**
 * the-Particle Infinity Update v2.0
 * - Big Crunch at 1.79e308
 * - Autobuyers at 1e50, 1e60...
 * - Glitch effects near Infinity
 */

const SAVE_KEY = 'theParticle_Infinity_v2';
const INFINITY_LIMIT = 1.79e308;

// 単位定義
const UNITS_ENG = ['', 'k', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
const UNITS_JP = ['', '万', '億', '兆', '京', '垓', '𥝱', '穣', '溝', '澗', '正', '載', '極'];

// --- ゲームデータ定義 ---
function getInitialState() {
  return {
    particles: 10,
    
    // 現在の宇宙の統計 (Prestigeでリセットされないが、Crunchでリセットされる)
    stats: {
      totalParticles: 10,
      prestigeCount: 0,
      startTime: Date.now(),
    },
    
    // メタ統計 (Crunchでもリセットされない)
    infinity: {
      ip: 0,          // Infinity Points
      crunchCount: 0, // 回数
      bestTime: null  // 最速到達時間(ms)
    },

    settings: {
      notation: 'sci',
      buyAmount: 1
    },

    lastTick: Date.now(),
    autobuyerTimer: 0, // オートバイヤー用タイマー

    generators: [
      { id: 0, name: "Accelerator Mk.1", baseCost: 10,   costMult: 1.5, amount: 0, bought: 0, production: 1 },
      { id: 1, name: "Accelerator Mk.2", baseCost: 100,  costMult: 1.8, amount: 0, bought: 0, production: 1 },
      { id: 2, name: "Accelerator Mk.3", baseCost: 1e3,  costMult: 2.2, amount: 0, bought: 0, production: 1 },
      { id: 3, name: "Accelerator Mk.4", baseCost: 1e4,  costMult: 3.0, amount: 0, bought: 0, production: 1 },
      { id: 4, name: "Accelerator Mk.5", baseCost: 1e6,  costMult: 4.0, amount: 0, bought: 0, production: 1 },
      { id: 5, name: "Accelerator Mk.6", baseCost: 1e8,  costMult: 6.0, amount: 0, bought: 0, production: 1 },
      { id: 6, name: "Accelerator Mk.7", baseCost: 1e10, costMult: 10.0, amount: 0, bought: 0, production: 1 },
      { id: 7, name: "Accelerator Mk.8", baseCost: 1e12, costMult: 15.0, amount: 0, bought: 0, production: 1 }
    ]
  };
}

let game = getInitialState();
let isCrunching = false; // 演出中フラグ

// --- ユーティリティ ---
function format(num) {
  if (!isFinite(num)) return "Infinity";
  if (num < 1000) return num.toFixed(2);
  
  const type = game.settings.notation;
  if (type === 'sci') return formatScientific(num);
  if (type === 'eng') {
    let exponent = Math.floor(Math.log10(num));
    let unitIndex = Math.floor(exponent / 3);
    if (unitIndex >= UNITS_ENG.length) return formatScientific(num);
    let mantissa = num / Math.pow(1000, unitIndex);
    return mantissa.toFixed(2) + " " + UNITS_ENG[unitIndex];
  }
  if (type === 'jp') {
    let exponent = Math.floor(Math.log10(num));
    let unitIndex = Math.floor(exponent / 4);
    if (unitIndex >= UNITS_JP.length) return formatScientific(num);
    let mantissa = num / Math.pow(10000, unitIndex);
    return mantissa.toFixed(2) + " " + UNITS_JP[unitIndex];
  }
  return formatScientific(num);
}

function formatScientific(num) {
  if (!isFinite(num)) return "Infinity";
  let exponent = Math.floor(Math.log10(num));
  let mantissa = num / Math.pow(10, exponent);
  return mantissa.toFixed(2) + "e" + exponent;
}

function formatTime(seconds) {
  if (seconds === null || seconds === undefined) return "--:--:--";
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

// --- コアロジック ---

// コスト計算
function getBulkCost(gen, count) {
  const r = gen.costMult;
  const currentCost = gen.baseCost * Math.pow(r, gen.bought);
  const multiplier = (Math.pow(r, count) - 1) / (r - 1);
  return currentCost * multiplier;
}

function getCost(gen) {
  return gen.baseCost * Math.pow(gen.costMult, gen.bought);
}

function getGlobalMultiplier() {
  return Math.pow(1.2, game.stats.prestigeCount);
}

function getPrestigeReq() {
  return 1 + (game.stats.prestigeCount * 10);
}

// --- ゲームループ ---
function gameLoop() {
  if (isCrunching) return; // 崩壊演出中は停止

  const now = Date.now();
  let dt = (now - game.lastTick) / 1000;
  if (dt > 1) dt = 1; 
  game.lastTick = now;

  // ビッグ・クランチ判定 (Infinity到達)
  if (game.particles >= INFINITY_LIMIT || !isFinite(game.particles)) {
    triggerBigCrunch();
    return;
  }

  // グリッチ演出の更新
  updateGlitchEffect();

  const globalMult = getGlobalMultiplier();

  // 生産
  const pps = game.generators[0].amount * game.generators[0].production * globalMult;
  const produced = pps * dt;
  game.particles += produced;
  game.stats.totalParticles += produced;

  // カスケード生産
  for (let i = 1; i < game.generators.length; i++) {
    const producer = game.generators[i];
    const target = game.generators[i - 1];
    target.amount += producer.amount * producer.production * globalMult * dt;
  }

  // オートバイヤー処理
  game.autobuyerTimer = (game.autobuyerTimer || 0) + dt;
  if (game.autobuyerTimer >= 1.0) {
    runAutobuyers();
    game.autobuyerTimer = 0;
  }

  updateUI(pps);
  
  if (!document.getElementById('app-wrapper').classList.contains('closed')) {
    updateStats();
  }
  
  if (now % 10000 < 20) saveGame(true);
  requestAnimationFrame(gameLoop);
}

// --- 新機能: オートバイヤー ---
function runAutobuyers() {
  // 条件: 1e50 -> Mk.1, 1e60 -> Mk.2, ... 1e120 -> Mk.8
  game.generators.forEach((gen, index) => {
    const threshold = Number('1e' + (50 + index * 10));
    if (game.particles >= threshold) {
      // オート購入実行 (Buy Maxの簡易版: 安いのでループで10個まで買う)
      for(let k=0; k<10; k++) {
        const cost = getCost(gen);
        if (game.particles >= cost) {
          game.particles -= cost;
          gen.amount++;
          gen.bought++;
          gen.production *= 1.1;
        } else {
          break;
        }
      }
    }
  });
}

// --- 新機能: グリッチ演出 ---
function updateGlitchEffect() {
  // 1e250あたりから開始、1e308でMAX
  if (game.particles < 1e250) {
    document.body.classList.remove('glitched');
    document.getElementById('glitch-layer').style.opacity = 0;
    return;
  }

  const logP = Math.log10(game.particles);
  const intensity = (logP - 250) / (308 - 250); // 0.0 ~ 1.0
  
  const overlay = document.getElementById('glitch-layer');
  if (intensity > 0) {
    document.body.classList.add('glitched');
    overlay.style.opacity = intensity * 0.8; // 最大0.8の不透明度
    
    // たまに文字化けさせる演出（オプション）
    if (Math.random() < intensity * 0.1) {
      document.getElementById('particle-display').style.transform = `translate(${Math.random()*4-2}px, ${Math.random()*4-2}px)`;
    } else {
      document.getElementById('particle-display').style.transform = 'none';
    }
  }
}

// --- 新機能: ビッグ・クランチ ---
function triggerBigCrunch() {
  isCrunching = true;
  
  // 現在の到達時間
  const currentTime = Date.now() - game.stats.startTime;
  
  // メタデータの更新
  if (!game.infinity) game.infinity = { ip:0, crunchCount:0, bestTime:null };
  game.infinity.ip += 1;
  game.infinity.crunchCount += 1;
  
  if (game.infinity.bestTime === null || currentTime < game.infinity.bestTime) {
    game.infinity.bestTime = currentTime;
  }
  
  saveGame(true); // クラッシュ前に一度IPを保存

  // 演出開始
  const overlay = document.getElementById('crunch-overlay');
  overlay.style.display = 'flex';
  
  // 4秒後にリセット実行
  setTimeout(() => {
    performInfinityReset();
    overlay.style.display = 'none';
    isCrunching = false;
    gameLoop();
  }, 4000);
}

function performInfinityReset() {
  const keptInfinity = JSON.parse(JSON.stringify(game.infinity));
  const keptSettings = JSON.parse(JSON.stringify(game.settings));
  
  // 初期状態に戻す
  game = getInitialState();
  
  // メタデータと設定を復元
  game.infinity = keptInfinity;
  game.settings = keptSettings;
  
  saveGame();
  
  alert(`ビッグ・クランチ完了。\nInfinity Points: ${game.infinity.ip} (+1)`);
  location.reload(); // 安全のためリロード
}


// --- アクション ---
function setBuyAmount(amount) {
  game.settings.buyAmount = amount;
  document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`buy-${amount}`).classList.add('active');
  updateUI(0);
}

function changeNotation(val) {
  game.settings.notation = val;
  updateUI(0);
}

function buyGenerator(index) {
  const gen = game.generators[index];
  const amountToBuy = game.settings.buyAmount;
  const cost = getBulkCost(gen, amountToBuy);
  if (game.particles >= cost) {
    game.particles -= cost;
    gen.amount += amountToBuy;
    gen.bought += amountToBuy;
    gen.production *= Math.pow(1.1, amountToBuy);
    updateUI(0);
  }
}

function buyMaxGenerator(index) {
  const gen = game.generators[index];
  let count = 0;
  // 安全のため最大100回ループ制限
  for(let i=0; i<100; i++){
    const cost = getCost(gen);
    if (game.particles >= cost) {
      game.particles -= cost;
      gen.amount++;
      gen.bought++;
      gen.production *= 1.1;
      count++;
    } else {
      break;
    }
  }
  if (count > 0) updateUI(0);
}

function doPrestige() {
  const req = getPrestigeReq();
  if (game.generators[7].amount < req) return;
  const globalMult = getGlobalMultiplier();
  if (!confirm(`ライナックを実行しますか？\n倍率: x${format(globalMult)} → x${format(globalMult * 1.2)}`)) return;

  game.stats.prestigeCount++;
  
  // プレステージリセット（粒子と加速器のみ）
  game.particles = 10;
  game.generators = getInitialState().generators;
  game.lastTick = Date.now();
  
  saveGame();
  updateUI(0);
}

// --- UI更新 ---
function updateUI(pps) {
  document.getElementById('particle-display').textContent = `${format(game.particles)} 粒子`;
  document.getElementById('pps-display').textContent = `(+${format(pps)} /秒)`;

  // Infinity Points表示
  if (game.infinity && game.infinity.ip > 0) {
    document.getElementById('ip-display-container').style.display = 'block';
    document.getElementById('ip-val').textContent = game.infinity.ip;
  }

  // プレステージ表示
  const globalMult = getGlobalMultiplier();
  const req = getPrestigeReq();
  const pContainer = document.getElementById('prestige-container');
  
  if (game.generators[7].amount >= req) {
    pContainer.style.display = 'block';
    document.getElementById('current-mult-display').textContent = `x${format(globalMult)} → x${format(globalMult * 1.2)}`;
    pContainer.querySelector('.prestige-btn').innerHTML = `<strong>ライナックを実行</strong><br>全生産量 1.2倍 & 最初から再開<br><small>(消費: Mk.8 - ${req}個)</small>`;
  } else {
    pContainer.style.display = 'none';
  }

  // リスト更新
  game.generators.forEach((gen, index) => {
    const btn = document.getElementById(`btn-${index}`);
    const btnMax = document.getElementById(`btn-max-${index}`);
    if (!btn) return;

    const buyAmt = game.settings.buyAmount;
    const cost = getBulkCost(gen, buyAmt);
    
    // オートバイヤーの状態表示
    const autoThreshold = Number('1e' + (50 + index * 10));
    const autoBadge = document.getElementById(`auto-badge-${index}`);
    if (autoBadge) {
      if (game.particles >= autoThreshold) {
        autoBadge.classList.add('active');
        autoBadge.textContent = "AUTO ON";
      } else {
        autoBadge.classList.remove('active');
        autoBadge.textContent = `AUTO: ${format(autoThreshold)}`;
      }
    }

    document.getElementById(`amount-${index}`).textContent = `所持: ${format(gen.amount)}`;
    document.getElementById(`mult-${index}`).textContent = `x${format(gen.production * globalMult)}`;
    
    btn.textContent = `${buyAmt}個: ${format(cost)}`;
    
    if (game.particles >= cost) btn.classList.remove('disabled');
    else btn.classList.add('disabled');
    
    if (game.particles >= getCost(gen)) btnMax.classList.remove('disabled');
    else btnMax.classList.add('disabled');
  });
}

function updateStats() {
  const elapsed = (Date.now() - game.stats.startTime) / 1000;
  document.getElementById('stat-time').textContent = formatTime(elapsed);
  document.getElementById('stat-total').textContent = format(game.stats.totalParticles);

  // 条件付き表示: ライナック回数
  if (game.stats.prestigeCount > 0 || (game.infinity && game.infinity.crunchCount > 0)) {
    document.getElementById('row-prestige').style.display = 'flex';
    document.getElementById('stat-prestige').textContent = `${game.stats.prestigeCount} 回`;
  }

  // 条件付き表示: Infinity Stats
  if (game.infinity && game.infinity.crunchCount > 0) {
    document.getElementById('infinity-stats').style.display = 'block';
    document.getElementById('stat-crunch').textContent = `${game.infinity.crunchCount} 回`;
    document.getElementById('stat-best-inf').textContent = formatTime(game.infinity.bestTime / 1000);
  }
}

// --- 初期化・ロード ---
function init() {
  const container = document.getElementById('generator-container');
  container.innerHTML = '';
  
  getInitialState().generators.forEach((gen, index) => {
    const row = document.createElement('div');
    row.className = 'generator-row';
    row.innerHTML = `
      <div class="gen-info">
        <div class="gen-name">
          ${gen.name} 
          <span id="auto-badge-${index}" class="auto-badge">AUTO: 1e${50 + index*10}</span>
        </div>
        <div class="gen-amount" id="amount-${index}">0</div>
        <div class="gen-multiplier" id="mult-${index}">x1.00</div>
      </div>
      <div class="btn-group">
        <button id="btn-${index}" class="buy-btn" onclick="buyGenerator(${index})">
          1個購入
        </button>
        <button id="btn-max-${index}" class="buy-btn max" onclick="buyMaxGenerator(${index})">
          Buy Max
        </button>
      </div>
    `;
    container.appendChild(row);
  });

  loadGame();
  gameLoop();
}

// セーブ/ロード/エクスポート機能（既存ロジックの微調整）
function saveGame(isAuto = false) {
  // Crunch中はセーブしない
  if(isCrunching) return; 
  game.lastTick = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(game));
  if (!isAuto) {
    const s = document.getElementById('save-status');
    s.textContent = "保存しました";
    setTimeout(() => s.textContent = "オートセーブ有効 (10秒毎)", 2000);
  }
}

function loadGame() {
  const data = localStorage.getItem(SAVE_KEY);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      const fresh = getInitialState();
      
      // データのマージ
      game = { ...fresh, ...parsed };
      game.stats = { ...fresh.stats, ...(parsed.stats || {}) };
      game.infinity = { ...fresh.infinity, ...(parsed.infinity || {}) }; // infinityデータのマージ
      game.settings = { ...fresh.settings, ...(parsed.settings || {}) };
      if (parsed.generators) {
        game.generators = parsed.generators.map((g, i) => ({ ...fresh.generators[i], ...g }));
      }
      
      // UI反映
      document.getElementById('notation-select').value = game.settings.notation;
      setBuyAmount(game.settings.buyAmount);
    } catch(e) {
      console.error(e);
    }
  }
}

function hardReset() {
  if(confirm("本当に全てのデータを消去しますか？\nInfinity Pointsも失われます。")) {
    localStorage.removeItem(SAVE_KEY);
    location.reload();
  }
}

// インポート・エクスポート関数は既存のものをそのまま使用
function exportSave() {
  saveGame(true);
  const str = btoa(JSON.stringify(game));
  const area = document.getElementById('save-textarea');
  document.getElementById('io-area').style.display = 'block';
  document.getElementById('io-label').textContent = "コピーしてください:";
  area.value = str;
  document.getElementById('io-action-btn').style.display = 'none';
  area.select();
  document.execCommand('copy');
  alert("コピーしました");
}

function importSave() {
  document.getElementById('io-area').style.display = 'block';
  document.getElementById('io-label').textContent = "貼り付けてください:";
  document.getElementById('save-textarea').value = "";
  const btn = document.getElementById('io-action-btn');
  btn.style.display = 'block';
  btn.textContent = "読み込む";
}

function confirmImport() {
  const str = document.getElementById('save-textarea').value.trim();
  if (!str) return;
  try {
    const decoded = atob(str);
    JSON.parse(decoded);
    localStorage.setItem(SAVE_KEY, decoded);
    location.reload();
  } catch (e) {
    alert("データが無効です");
  }
}

function toggleSidebar() {
  document.getElementById('app-wrapper').classList.toggle('closed');
}

function switchTab(name, btn) {
  document.querySelectorAll('.sidebar-content').forEach(c => c.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// 起動
init();





