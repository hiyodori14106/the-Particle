/**
 * the-Particle Complete Edition (Bugfix Ver)
 * - Prestige Req: 1 + 10*n Mk.8
 * - Prestige Mult: 1.2x
 * - Fixed format function to show decimals
 */

// --- ゲームデータ定義 ---
function getInitialState() {
  return {
    particles: 10,
    totalParticles: 10,
    prestigeCount: 0,
    startTime: Date.now(),
    lastTick: Date.now(),
    generators: [
      { id: 0, name: "Accelerator Mk.1", baseCost: 10,   costMult: 1.5,  amount: 0, bought: 0, production: 1 },
      { id: 1, name: "Accelerator Mk.2", baseCost: 100,   costMult: 1.8,  amount: 0, bought: 0, production: 1 },
      { id: 2, name: "Accelerator Mk.3", baseCost: 1e3,   costMult: 2.2,  amount: 0, bought: 0, production: 1 },
      { id: 3, name: "Accelerator Mk.4", baseCost: 1e4,   costMult: 3.0,  amount: 0, bought: 0, production: 1 },
      { id: 4, name: "Accelerator Mk.5", baseCost: 1e6,   costMult: 4.0,  amount: 0, bought: 0, production: 1 },
      { id: 5, name: "Accelerator Mk.6", baseCost: 1e8,   costMult: 6.0,  amount: 0, bought: 0, production: 1 },
      { id: 6, name: "Accelerator Mk.7", baseCost: 1e10,  costMult: 10.0, amount: 0, bought: 0, production: 1 },
      { id: 7, name: "Accelerator Mk.8", baseCost: 1e12,  costMult: 15.0, amount: 0, bought: 0, production: 1 }
    ]
  };
}

// グローバル変数
let game = getInitialState();
const SAVE_KEY = 'theParticleComplete_v2_modified'; 

// --- ユーティリティ: 数値整形 (修正版) ---
function format(num) {
  // 1000未満の場合は小数点以下2桁まで考慮して表示
  // Number(...).toString() を使うことで、"1.20" は "1.2" に、"1.00" は "1" になり見やすくなります
  if (num < 1000) return Number(num.toFixed(2)).toString();

  let exponent = Math.floor(Math.log10(num));
  let mantissa = num / Math.pow(10, exponent);
  return mantissa.toFixed(2) + "e" + exponent;
}

function formatTime(seconds) {
  if (seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

// --- コアロジック ---
function getCost(gen) {
  return gen.baseCost * Math.pow(gen.costMult, gen.bought);
}

function getGlobalMultiplier() {
  return Math.pow(1.2, game.prestigeCount);
}

// 次のライナックに必要なMk.8の数
function getPrestigeReq() {
  return 1 + (game.prestigeCount * 10);
}

// --- ゲームループ (メイン処理) ---
function gameLoop() {
  const now = Date.now();
  let dt = (now - game.lastTick) / 1000;
  
  if (dt > 1) dt = 1; 
  
  game.lastTick = now;
  const globalMult = getGlobalMultiplier();

  // 1. 粒子の生産 (Mk.1 -> 粒子)
  const pps = game.generators[0].amount * game.generators[0].production * globalMult;
  const produced = pps * dt;
  game.particles += produced;
  game.totalParticles += produced;

  // 2. カスケード生産 (Mk.N -> Mk.N-1)
  for (let i = 1; i < game.generators.length; i++) {
    const producer = game.generators[i];
    const target = game.generators[i - 1];
    target.amount += producer.amount * producer.production * globalMult * dt;
  }

  // UI更新
  updateUI(pps);
  
  const wrapper = document.getElementById('app-wrapper');
  if (!wrapper.classList.contains('closed')) {
    updateStats();
  }
  
  if (now % 10000 < 20) saveGame(true);

  requestAnimationFrame(gameLoop);
}

// --- オフライン進行シミュレーション ---
function simulateOfflineProgress(seconds) {
  if (seconds > 86400 * 7) seconds = 86400 * 7; 

  const initialParticles = game.particles;
  const totalTicks = 1000;
  const dt = seconds / totalTicks; 
  const globalMult = getGlobalMultiplier();

  for (let t = 0; t < totalTicks; t++) {
    const pps = game.generators[0].amount * game.generators[0].production * globalMult;
    game.particles += pps * dt;
    game.totalParticles += pps * dt;

    for (let i = 1; i < game.generators.length; i++) {
      const producer = game.generators[i];
      const target = game.generators[i - 1];
      target.amount += producer.amount * producer.production * globalMult * dt;
    }
  }

  const gained = game.particles - initialParticles;

  if (gained > 0) {
    setTimeout(() => {
      alert(
        `=== 演算処理終了 ===\n\n` +
        `経過時間: ${formatTime(seconds)}\n` +
        `演算ステップ: ${totalTicks} ticks\n` +
        `獲得粒子: ${format(gained)}\n\n`
      );
    }, 100);
  }
}

// --- アクション: 購入関連 ---

function buyGenerator(index) {
  const gen = game.generators[index];
  const cost = getCost(gen);
  if (game.particles >= cost) {
    game.particles -= cost;
    gen.amount += 1;
    gen.bought += 1;
    gen.production *= 1.1;
    updateUI(0);
  }
}

function buyMaxGenerator(index) {
  const gen = game.generators[index];
  let boughtCount = 0;

  while (true) {
    const cost = getCost(gen);
    if (game.particles >= cost) {
      game.particles -= cost;
      gen.amount += 1;
      gen.bought += 1;
      gen.production *= 1.1;
      boughtCount++;
    } else {
      break;
    }
  }
  
  if (boughtCount > 0) updateUI(0);
}

// プレステージ (リセット)
function doPrestige() {
  const req = getPrestigeReq();
  if (game.generators[7].amount < req) return;

  if (!confirm(`ライナックを実行しますか？\n\n・現在の粒子と加速器は全て失われます\n・生産倍率が 1.2倍 加算されます (現在 x${format(getGlobalMultiplier())})\n・次回は Mk.8 が ${req + 10} 個必要になります`)) return;

  game.prestigeCount++;
  
  const freshState = getInitialState();
  game.particles = freshState.particles;
  game.totalParticles = 0;
  game.generators = freshState.generators;
  game.startTime = Date.now();
  game.lastTick = Date.now();
  
  saveGame();
  updateUI(0);
}

// --- UI更新処理 ---
function updateUI(pps) {
  document.getElementById('particle-display').textContent = `${format(game.particles)} 粒子`;
  document.getElementById('pps-display').textContent = `(+${format(pps)} /秒)`;

  const globalMult = getGlobalMultiplier();

  // プレステージバナー
  const prestigeContainer = document.getElementById('prestige-container');
  const mk8 = game.generators[7];
  const req = getPrestigeReq();

  if (mk8.amount >= req) {
    prestigeContainer.style.display = 'block';
    
    const infoSpan = document.getElementById('current-mult-display');
    infoSpan.textContent = `x${format(globalMult)} → x${format(globalMult * 1.2)}`;
    
    const btn = prestigeContainer.querySelector('.prestige-btn');
    btn.innerHTML = `<strong>ライナックを実行</strong><br>全生産量 1.2倍 & 最初から再開<br><small>(消費: Mk.8 - ${req}個)</small>`;
    
  } else {
    prestigeContainer.style.display = 'none';
  }

  // ジェネレーターリスト
  game.generators.forEach((gen, index) => {
    const btn = document.getElementById(`btn-${index}`);
    const btnMax = document.getElementById(`btn-max-${index}`);
    
    if (!btn || !btnMax) return;
    
    const cost = getCost(gen);
    const totalMult = gen.production * globalMult;

    document.getElementById(`amount-${index}`).textContent = `所持: ${format(gen.amount)}`;
    document.getElementById(`mult-${index}`).textContent = `x${format(totalMult)}`;
    
    btn.innerHTML = `1個: ${format(cost)}`;
    
    if (game.particles >= cost) {
      btn.classList.remove('disabled');
      btnMax.classList.remove('disabled');
    } else {
      btn.classList.add('disabled');
      btnMax.classList.add('disabled');
    }
  });
}

function updateStats() {
  const elapsed = (Date.now() - game.startTime) / 1000;
  document.getElementById('stat-time').textContent = formatTime(elapsed);
  document.getElementById('stat-total').textContent = format(game.totalParticles);
  document.getElementById('stat-prestige').textContent = `${game.prestigeCount} 回`;
}

// --- サイドバー・タブ制御 ---
function toggleSidebar() {
  document.getElementById('app-wrapper').classList.toggle('closed');
}

function switchTab(tabName, btn) {
  document.querySelectorAll('.sidebar-content').forEach(c => c.classList.remove('active'));
  document.getElementById(`tab-${tabName}`).classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// --- セーブ/ロードシステム ---
function saveGame(isAuto = false) {
  game.lastTick = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(game));
  if (!isAuto) {
    const s = document.getElementById('save-status');
    s.textContent = "保存しました";
    setTimeout(() => s.textContent = "オートセーブ有効", 2000);
  }
}

function loadGame() {
  const data = localStorage.getItem(SAVE_KEY);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      const fresh = getInitialState();
      const savedLastTick = parsed.lastTick || Date.now();

      game = { ...fresh, ...parsed };
      if (parsed.generators) {
        game.generators = parsed.generators.map((g, i) => ({ ...fresh.generators[i], ...g }));
      }
      if (game.prestigeCount === undefined) game.prestigeCount = 0;

      const now = Date.now();
      const offlineSeconds = (now - savedLastTick) / 1000;
      
      if (offlineSeconds > 1) {
        simulateOfflineProgress(offlineSeconds);
      }
      
      game.lastTick = now;
    } catch(e) { console.error("Save data error", e); }
  }
}

function hardReset() {
  if(confirm("【警告】\n全データを削除してリセットしますか？\nこの操作は取り消せません。")) {
    localStorage.removeItem(SAVE_KEY);
    location.reload();
  }
}

// --- 初期化 ---
function init() {
  loadGame();
  
  const container = document.getElementById('generator-container');
  container.innerHTML = '';

  game.generators.forEach((gen, index) => {
    const row = document.createElement('div');
    row.className = 'generator-row';
    row.innerHTML = `
      <div class="gen-info">
        <div class="gen-name">${gen.name}</div>
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

  gameLoop();
}

init();
