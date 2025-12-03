/**
 * the-Particle Complete Edition v1.1
 * - Prestige Req: 1 + 10*n Mk.8
 * - Prestige Mult: 1.2x
 * - Added: Buy 1/10/100 toggle
 * - Added: Notation settings (Sci/Eng/Jp)
 * - Added: Persistent Stats & Import/Export
 */

const SAVE_KEY = 'theParticleComplete_v2_stable';

// --- 定数：単位定義 ---
const UNITS_ENG = ['', 'k', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
// 1万, 1億, 1兆, 1京, 1垓... (4桁区切り)
const UNITS_JP = ['', '万', '億', '兆', '京', '垓', '𥝱', '穣', '溝', '澗', '正', '載', '極'];

// --- ゲームデータ定義 ---
function getInitialState() {
  return {
    // 通貨 (リセット対象)
    particles: 10,
    
    // 統計 (リセットしないもの)
    stats: {
      totalParticles: 10, // 通算生産量
      prestigeCount: 0,   // ライナック回数
      startTime: Date.now(), // 初回プレイ開始時刻
    },
    
    // 設定
    settings: {
      notation: 'sci', // 'sci', 'eng', 'jp'
      buyAmount: 1     // 1, 10, 100
    },

    // システム (リセット対象だが、stats更新に使う)
    lastTick: Date.now(),

    // 施設 (リセット対象)
    generators: [
      { id: 0, name: "Accelerator Mk.1", baseCost: 10,    costMult: 1.5,  amount: 0, bought: 0, production: 1 },
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

let game = getInitialState();

// --- ユーティリティ: 数値整形 ---
function format(num) {
  if (num < 1000) return num.toFixed(2);

  const type = game.settings.notation;

  // 科学的表記 (Scientific)
  if (type === 'sci') {
    let exponent = Math.floor(Math.log10(num));
    let mantissa = num / Math.pow(10, exponent);
    return mantissa.toFixed(2) + "e" + exponent;
  }

  // 英語単位 (k, M, B, T...) - 3桁区切り
  if (type === 'eng') {
    let exponent = Math.floor(Math.log10(num));
    let unitIndex = Math.floor(exponent / 3);
    if (unitIndex >= UNITS_ENG.length) return formatScientific(num); // フォールバック
    let mantissa = num / Math.pow(1000, unitIndex);
    return mantissa.toFixed(2) + " " + UNITS_ENG[unitIndex];
  }

  // 日本語単位 (万, 億, 兆...) - 4桁区切り
  if (type === 'jp') {
    // 10000未満はそのまま表示されるよう調整済み (冒頭のif)
    let exponent = Math.floor(Math.log10(num));
    let unitIndex = Math.floor(exponent / 4);
    if (unitIndex >= UNITS_JP.length) return formatScientific(num);
    let mantissa = num / Math.pow(10000, unitIndex);
    return mantissa.toFixed(2) + " " + UNITS_JP[unitIndex];
  }
  
  return num.toFixed(2);
}

function formatScientific(num) {
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

// n個購入するためのコスト計算 (等比数列の和)
// Cost = Base * r^Current * (r^n - 1) / (r - 1)
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
  const now = Date.now();
  let dt = (now - game.lastTick) / 1000;
  if (dt > 1) dt = 1; 
  
  game.lastTick = now;
  const globalMult = getGlobalMultiplier();

  // 生産
  const pps = game.generators[0].amount * game.generators[0].production * globalMult;
  const produced = pps * dt;
  game.particles += produced;
  game.stats.totalParticles += produced; // 永続統計への加算

  // カスケード
  for (let i = 1; i < game.generators.length; i++) {
    const producer = game.generators[i];
    const target = game.generators[i - 1];
    target.amount += producer.amount * producer.production * globalMult * dt;
  }

  updateUI(pps);
  
  if (!document.getElementById('app-wrapper').classList.contains('closed')) {
    updateStats();
  }
  
  if (now % 10000 < 20) saveGame(true);
  requestAnimationFrame(gameLoop);
}

// --- オフライン進行 ---
function simulateOfflineProgress(seconds) {
  if (seconds > 86400 * 7) seconds = 86400 * 7;

  const initial = game.particles;
  const totalTicks = 1000;
  const dt = seconds / totalTicks;
  const globalMult = getGlobalMultiplier();

  for (let t = 0; t < totalTicks; t++) {
    const pps = game.generators[0].amount * game.generators[0].production * globalMult;
    const produced = pps * dt;
    game.particles += produced;
    game.stats.totalParticles += produced;

    for (let i = 1; i < game.generators.length; i++) {
      const producer = game.generators[i];
      const target = game.generators[i - 1];
      target.amount += producer.amount * producer.production * globalMult * dt;
    }
  }

  const gained = game.particles - initial;
  if (gained > 0) {
    setTimeout(() => {
      alert(`=== 演算処理終了 ===\n\n経過時間: ${formatTime(seconds)}\n獲得粒子: ${format(gained)}`);
    }, 100);
  }
}

// --- アクション ---

// 設定変更: 購入数量
function setBuyAmount(amount) {
  game.settings.buyAmount = amount;
  
  // ボタンの見た目更新
  document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`buy-${amount}`).classList.add('active');
  
  updateUI(0); // ボタンテキスト更新用
}

// 設定変更: 表記
function changeNotation(val) {
  game.settings.notation = val;
  updateUI(0);
}

// 購入処理
function buyGenerator(index) {
  const gen = game.generators[index];
  const amountToBuy = game.settings.buyAmount;
  
  const cost = getBulkCost(gen, amountToBuy);
  
  if (game.particles >= cost) {
    game.particles -= cost;
    gen.amount += amountToBuy;
    gen.bought += amountToBuy;
    gen.production *= Math.pow(1.1, amountToBuy); // 倍率も個数分掛ける
    updateUI(0);
  }
}

function buyMaxGenerator(index) {
  const gen = game.generators[index];
  let count = 0;
  
  // 簡易的なBuy Max (一度に大量に計算すると重くなる場合があるのでループ制限を設けても良いが、ここでは基本ループ)
  // 高速化のため、安価なものは一度に計算するロジックを入れるのが理想だが、シンプル実装にする
  while (true) {
    const cost = getCost(gen);
    if (game.particles >= cost) {
      game.particles -= cost;
      gen.amount += 1;
      gen.bought += 1;
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

  const currentMult = format(getGlobalMultiplier());
  const nextMult = format(getGlobalMultiplier() * 1.2);
  
  if (!confirm(`ライナックを実行しますか？\n\n・現在の粒子と加速器は全てリセットされます\n・通算統計は保持されます\n・生産倍率: x${currentMult} → x${nextMult}`)) return;

  // 統計更新
  game.stats.prestigeCount++;

  // リセット処理 (statsとsettingsは維持)
  const fresh = getInitialState();
  game.particles = fresh.particles;
  game.generators = fresh.generators;
  game.lastTick = Date.now();
  // runStartTime的なものがあればここでリセット

  saveGame();
  updateUI(0);
}

// --- UI更新 ---
function updateUI(pps) {
  document.getElementById('particle-display').textContent = `${format(game.particles)} 粒子`;
  document.getElementById('pps-display').textContent = `(+${format(pps)} /秒)`;

  const globalMult = getGlobalMultiplier();
  const req = getPrestigeReq();
  const mk8 = game.generators[7];
  
  // プレステージ表示
  const pContainer = document.getElementById('prestige-container');
  if (mk8.amount >= req) {
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
    
    document.getElementById(`amount-${index}`).textContent = `所持: ${format(gen.amount)}`;
    document.getElementById(`mult-${index}`).textContent = `x${format(gen.production * globalMult)}`;
    
    // ボタンテキスト更新
    btn.textContent = `${buyAmt}個: ${format(cost)}`;
    
    if (game.particles >= cost) {
      btn.classList.remove('disabled');
    } else {
      btn.classList.add('disabled');
    }
    
    // Maxボタン判定
    if (game.particles >= getCost(gen)) {
      btnMax.classList.remove('disabled');
    } else {
      btnMax.classList.add('disabled');
    }
  });
}

function updateStats() {
  const elapsed = (Date.now() - game.stats.startTime) / 1000;
  document.getElementById('stat-time').textContent = formatTime(elapsed);
  document.getElementById('stat-total').textContent = format(game.stats.totalParticles);
  document.getElementById('stat-prestige').textContent = `${game.stats.prestigeCount} 回`;
}

// --- サイドバーなど ---
function toggleSidebar() {
  document.getElementById('app-wrapper').classList.toggle('closed');
}

function switchTab(name, btn) {
  document.querySelectorAll('.sidebar-content').forEach(c => c.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// --- セーブ・ロード・インポート/エクスポート ---
function saveGame(isAuto = false) {
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

      // 互換性維持のためのマージ
      // 旧バージョンデータの移行ロジック
      if (parsed.prestigeCount !== undefined && parsed.stats === undefined) {
         // 旧データ構造からの移行
         fresh.stats.prestigeCount = parsed.prestigeCount || 0;
         fresh.stats.totalParticles = parsed.totalParticles || 0;
         fresh.stats.startTime = parsed.startTime || Date.now();
         // 他のプロパティをコピー
         fresh.particles = parsed.particles;
         fresh.generators = parsed.generators;
         game = fresh;
      } else {
         // 新データ構造ならそのままマージ
         game = { ...fresh, ...parsed };
         // statsオブジェクト内の欠損もケア
         game.stats = { ...fresh.stats, ...(parsed.stats || {}) };
         game.settings = { ...fresh.settings, ...(parsed.settings || {}) };
         if (parsed.generators) {
           game.generators = parsed.generators.map((g, i) => ({ ...fresh.generators[i], ...g }));
         }
      }

      // オフライン進行
      const now = Date.now();
      const offlineSeconds = (now - (game.lastTick || now)) / 1000;
      if (offlineSeconds > 1) simulateOfflineProgress(offlineSeconds);
      game.lastTick = now;

      // UI初期化
      document.getElementById('notation-select').value = game.settings.notation;
      setBuyAmount(game.settings.buyAmount);

    } catch(e) {
      console.error("Save data corrupted", e);
    }
  }
}

function hardReset() {
  if(confirm("【警告】\n全データを削除してリセットしますか？")) {
    localStorage.removeItem(SAVE_KEY);
    location.reload();
  }
}

// エクスポート
function exportSave() {
  saveGame(true); // 最新状態にする
  const str = btoa(JSON.stringify(game)); // Base64エンコード
  const area = document.getElementById('save-textarea');
  const ioArea = document.getElementById('io-area');
  const ioLabel = document.getElementById('io-label');
  const actionBtn = document.getElementById('io-action-btn');
  
  ioArea.style.display = 'block';
  ioLabel.textContent = "この文字列をコピーして保存してください:";
  area.value = str;
  actionBtn.style.display = 'none'; // エクスポート時はボタン不要
  
  area.select();
  document.execCommand('copy');
  alert("クリップボードにコピーしました");
}

// インポート準備
function importSave() {
  const ioArea = document.getElementById('io-area');
  const ioLabel = document.getElementById('io-label');
  const area = document.getElementById('save-textarea');
  const actionBtn = document.getElementById('io-action-btn');

  ioArea.style.display = 'block';
  ioLabel.textContent = "セーブデータを貼り付けてください:";
  area.value = "";
  actionBtn.style.display = 'block';
  actionBtn.textContent = "データを読み込む";
}

// インポート実行
function confirmImport() {
  const str = document.getElementById('save-textarea').value.trim();
  if (!str) return;
  
  try {
    const decoded = atob(str);
    JSON.parse(decoded); // 有効なJSONかチェック
    localStorage.setItem(SAVE_KEY, decoded);
    alert("読み込みに成功しました。リロードします。");
    location.reload();
  } catch (e) {
    alert("データが無効です。\n" + e);
  }
}

// --- 初期化 ---
function init() {
  // HTML生成
  const container = document.getElementById('generator-container');
  container.innerHTML = '';
  
  // 一時的にジェネレータリストを使ってHTML枠を作る
  getInitialState().generators.forEach((gen, index) => {
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

  loadGame();
  gameLoop();
}

init();
