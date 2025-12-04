/**
 * the-Particle Infinity Update v2.2
 * - Persistent Autobuyers through Crunch
 * - Toggleable Autobuyers
 */

const SAVE_KEY = 'theParticle_Infinity_v2_2'; // データ構造変更のためキーを変更
const INFINITY_LIMIT = 1.79e308;

// 単位定義
const UNITS_ENG = ['', 'k', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
const UNITS_JP = ['', '万', '億', '兆', '京', '垓', '𥝱', '穣', '溝', '澗', '正', '載', '極'];

// --- ゲームデータ初期定義 ---
function getInitialState() {
  return {
    particles: 10,
    
    stats: {
      totalParticles: 10,
      prestigeCount: 0,
      startTime: Date.now(),
    },
    
    infinity: {
      ip: 0,
      crunchCount: 0,
      bestTime: null
    },

    settings: {
      notation: 'sci',
      buyAmount: 1
    },

    lastTick: Date.now(),
    autobuyerTimer: 0,

    generators: [
      // autoUnlocked: false (初期値)
      // autoActive: true (デフォルトでON)
      { id: 0, name: "Accelerator Mk.1", baseCost: 10,   costMult: 1.5, amount: 0, bought: 0, production: 1, autoUnlocked: false, autoActive: true },
      { id: 1, name: "Accelerator Mk.2", baseCost: 100,  costMult: 1.8, amount: 0, bought: 0, production: 1, autoUnlocked: false, autoActive: true },
      { id: 2, name: "Accelerator Mk.3", baseCost: 1e3,  costMult: 2.2, amount: 0, bought: 0, production: 1, autoUnlocked: false, autoActive: true },
      { id: 3, name: "Accelerator Mk.4", baseCost: 1e4,  costMult: 3.0, amount: 0, bought: 0, production: 1, autoUnlocked: false, autoActive: true },
      { id: 4, name: "Accelerator Mk.5", baseCost: 1e6,  costMult: 4.0, amount: 0, bought: 0, production: 1, autoUnlocked: false, autoActive: true },
      { id: 5, name: "Accelerator Mk.6", baseCost: 1e8,  costMult: 6.0, amount: 0, bought: 0, production: 1, autoUnlocked: false, autoActive: true },
      { id: 6, name: "Accelerator Mk.7", baseCost: 1e10, costMult: 10.0, amount: 0, bought: 0, production: 1, autoUnlocked: false, autoActive: true },
      { id: 7, name: "Accelerator Mk.8", baseCost: 1e12, costMult: 15.0, amount: 0, bought: 0, production: 1, autoUnlocked: false, autoActive: true }
    ]
  };
}

let game = getInitialState();
let isCrunching = false;

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

// --- コスト計算 ---
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
  if (isCrunching) return;

  const now = Date.now();
  let dt = (now - game.lastTick) / 1000;
  if (dt > 1) dt = 1; 
  game.lastTick = now;

  // Infinity判定
  if (game.particles >= INFINITY_LIMIT || !isFinite(game.particles)) {
    triggerBigCrunch();
    return;
  }

  updateGlitchEffect();

  const globalMult = getGlobalMultiplier();

  // 生産処理
  const pps = game.generators[0].amount * game.generators[0].production * globalMult;
  const produced = pps * dt;
  game.particles += produced;
  game.stats.totalParticles += produced;

  // カスケード（Mk.2がMk.1を作る...）
  for (let i = 1; i < game.generators.length; i++) {
    const producer = game.generators[i];
    const target = game.generators[i - 1];
    target.amount += producer.amount * producer.production * globalMult * dt;
  }

  // オートバイヤー処理 (0.5秒ごと)
  game.autobuyerTimer = (game.autobuyerTimer || 0) + dt;
  if (game.autobuyerTimer >= 0.5) {
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

// --- オートバイヤー ---
function runAutobuyers() {
  game.generators.forEach((gen, index) => {
    const threshold = Number('1e' + (50 + index * 10));

    // 1. アンロック判定（到達で解放、リセットまで維持）
    if (!gen.autoUnlocked && game.particles >= threshold) {
      gen.autoUnlocked = true;
    }

    // 2. 購入実行（解放済みかつONの場合）
    if (gen.autoUnlocked && gen.autoActive) {
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

// ON/OFF 切り替え
function toggleAutobuyer(index) {
  const gen = game.generators[index];
  if (!gen.autoUnlocked) return; // 未解放なら反応しない
  gen.autoActive = !gen.autoActive;
  updateUI(0);
}

// --- グリッチ・演出 ---
function updateGlitchEffect() {
  if (game.particles < 1e250) {
    document.body.classList.remove('glitched');
    document.getElementById('glitch-layer').style.opacity = 0;
    return;
  }
  const logP = Math.log10(game.particles);
  const intensity = (logP - 250) / (308 - 250); 
  
  const overlay = document.getElementById('glitch-layer');
  if (intensity > 0) {
    document.body.classList.add('glitched');
    overlay.style.opacity = intensity * 0.8;
    if (Math.random() < intensity * 0.1) {
      document.getElementById('particle-display').style.transform = `translate(${Math.random()*4-2}px, ${Math.random()*4-2}px)`;
    } else {
      document.getElementById('particle-display').style.transform = 'none';
    }
  }
}

// --- ビッグ・クランチ ---
function triggerBigCrunch() {
  isCrunching = true;
  const currentTime = Date.now() - game.stats.startTime;
  
  if (!game.infinity) game.infinity = { ip:0, crunchCount:0, bestTime:null };
  game.infinity.ip += 1;
  game.infinity.crunchCount += 1;
  if (game.infinity.bestTime === null || currentTime < game.infinity.bestTime) {
    game.infinity.bestTime = currentTime;
  }
  
  saveGame(true);

  const overlay = document.getElementById('crunch-overlay');
  overlay.style.display = 'flex';
  
  setTimeout(() => {
    performInfinityReset();
    overlay.style.display = 'none';
    isCrunching = false;
    gameLoop();
  }, 4000);
}

function performInfinityReset() {
  // 1. 各種データを退避
  const keptInfinity = JSON.parse(JSON.stringify(game.infinity));
  const keptSettings = JSON.parse(JSON.stringify(game.settings));
  
  // ★ここで現在のオートバイヤーの状態(解放/ON/OFF)を保存
  const keptAutobuyers = game.generators.map(gen => ({
    unlocked: gen.autoUnlocked,
    active: gen.autoActive
  }));
  
  // 2. ゲーム初期化
  game = getInitialState();
  
  // 3. データ復元
  game.infinity = keptInfinity;
  game.settings = keptSettings;
  
  // ★オートバイヤーの状態を復元して上書き
  game.generators.forEach((gen, index) => {
    if (keptAutobuyers[index]) {
      gen.autoUnlocked = keptAutobuyers[index].unlocked;
      gen.autoActive = keptAutobuyers[index].active;
    }
  });
  
  saveGame();
  alert(`ビッグ・クランチ完了。\nInfinity Points: ${game.infinity.ip} (+1)\nオートバイヤーの状態は維持されました。`);
  location.reload();
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
  game.particles = 10;
  
  // Prestigeではオートバイヤー状態はそのまま、量と生産倍率だけリセット
  game.generators.forEach(gen => {
    gen.amount = 0;
    gen.bought = 0;
    gen.production = 1; 
  });

  game.lastTick = Date.now();
  saveGame();
  updateUI(0);
}

// --- UI更新 ---
function updateUI(pps) {
  document.getElementById('particle-display').textContent = `${format(game.particles)} 粒子`;
  document.getElementById('pps-display').textContent = `(+${format(pps)} /秒)`;

  if (game.infinity && game.infinity.ip > 0) {
    document.getElementById('ip-display-container').style.display = 'block';
    document.getElementById('ip-val').textContent = game.infinity.ip;
  }

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

  game.generators.forEach((gen, index) => {
    const btn = document.getElementById(`btn-${index}`);
    const btnMax = document.getElementById(`btn-max-${index}`);
    if (!btn) return;

    const buyAmt = game.settings.buyAmount;
    const cost = getBulkCost(gen, buyAmt);
    
    // --- オートバイヤーバッジ表示制御 ---
    const autoBadge = document.getElementById(`auto-badge-${index}`);
    const threshold = Number('1e' + (50 + index * 10));
    
    if (autoBadge) {
      autoBadge.className = 'auto-badge'; // クラスリセット
      autoBadge.onclick = null;

      if (gen.autoUnlocked) {
        // アンロック済み
        autoBadge.classList.add('clickable');
        autoBadge.onclick = () => toggleAutobuyer(index);

        if (gen.autoActive) {
            autoBadge.classList.add('active');
            autoBadge.textContent = "AUTO: ON";
        } else {
            autoBadge.classList.add('inactive');
            autoBadge.textContent = "AUTO: OFF";
        }
      } else {
        // 未アンロック
        autoBadge.textContent = `Req: ${format(threshold)}`;
      }
    }
    // ----------------------------------

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

  if (game.stats.prestigeCount > 0 || (game.infinity && game.infinity.crunchCount > 0)) {
    document.getElementById('row-prestige').style.display = 'flex';
    document.getElementById('stat-prestige').textContent = `${game.stats.prestigeCount} 回`;
  }

  if (game.infinity && game.infinity.crunchCount > 0) {
    document.getElementById('infinity-stats').style.display = 'block';
    document.getElementById('stat-crunch').textContent = `${game.infinity.crunchCount} 回`;
    document.getElementById('stat-best-inf').textContent = formatTime(game.infinity.bestTime / 1000);
  }
}

// --- 初期化 ---
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
          <span id="auto-badge-${index}" class="auto-badge">Req: 1e${50 + index*10}</span>
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

// --- セーブ・ロード・エクスポート ---
function saveGame(isAuto = false) {
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
      
      game = { ...fresh, ...parsed };
      game.stats = { ...fresh.stats, ...(parsed.stats || {}) };
      game.infinity = { ...fresh.infinity, ...(parsed.infinity || {}) };
      game.settings = { ...fresh.settings, ...(parsed.settings || {}) };
      
      if (parsed.generators) {
        game.generators = parsed.generators.map((g, i) => {
            const freshGen = fresh.generators[i];
            return { 
                ...freshGen, 
                ...g,
                autoUnlocked: g.autoUnlocked !== undefined ? g.autoUnlocked : freshGen.autoUnlocked,
                autoActive: g.autoActive !== undefined ? g.autoActive : freshGen.autoActive
            };
        });
      }
      
      document.getElementById('notation-select').value = game.settings.notation;
      setBuyAmount(game.settings.buyAmount);
    } catch(e) {
      console.error(e);
    }
  }
}

function hardReset() {
    if(confirm("本当に全てのデータを消去しますか？")) {
        localStorage.removeItem(SAVE_KEY);
        location.reload();
    }
}
function exportSave() {
    saveGame(true);
    const str = btoa(JSON.stringify(game));
    const area = document.getElementById('save-textarea');
    document.getElementById('io-area').style.display = 'block';
    area.value = str;
}
function importSave() { document.getElementById('io-area').style.display = 'block'; }
function confirmImport() {
    const str = document.getElementById('save-textarea').value.trim();
    try {
        const decoded = atob(str);
        JSON.parse(decoded);
        localStorage.setItem(SAVE_KEY, decoded);
        location.reload();
    } catch(e) { alert("データ無効"); }
}
function toggleSidebar() { document.getElementById('app-wrapper').classList.toggle('closed'); }
function switchTab(name, btn) {
    document.querySelectorAll('.sidebar-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`tab-${name}`).classList.add('active');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

// 起動
init();
