/**
 * the-Particle Shift Update v2.3
 * - Implements Linac Shift
 */

const SAVE_KEY = 'theParticle_Shift_v2_3';
const INFINITY_LIMIT = 1.79e308;

// 単位定義
const UNITS_ENG = ['', 'k', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
const UNITS_JP = ['', '万', '億', '兆', '京', '垓', '𥝱', '穣', '溝', '澗', '正', '載', '極'];

// --- ゲームデータ初期定義 ---
function getInitialState() {
  return {
    particles: 10,
    linacs: 0, // 現在の周回のライナック数（シフトでリセット）
    shifts: 0, // ライナックシフト回数
    
    stats: {
      totalParticles: 10,
      totalLinacs: 0, // 通算ライナック数（統計用・リセットなし）
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

// --- 計算ロジック ---
function getBulkCost(gen, count) {
  const r = gen.costMult;
  const currentCost = gen.baseCost * Math.pow(r, gen.bought);
  const multiplier = (Math.pow(r, count) - 1) / (r - 1);
  return currentCost * multiplier;
}

function getCost(gen) {
  return gen.baseCost * Math.pow(gen.costMult, gen.bought);
}

// ライナック周り
function getLinacBaseMult() {
  // シフト0回なら1.2倍、1回なら1.4倍...
  return 1.2 + (game.shifts * 0.2);
}

function getGlobalMultiplier() {
  const base = getLinacBaseMult();
  return Math.pow(base, game.linacs);
}

function getLinacReq() {
  return 1 + (game.linacs * 10);
}

// シフト周り
function getShiftReq() {
  // 最初は5、次は10 (+5ずつ増える)
  return 5 + (game.shifts * 5);
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

  // カスケード
  for (let i = 1; i < game.generators.length; i++) {
    const producer = game.generators[i];
    const target = game.generators[i - 1];
    target.amount += producer.amount * producer.production * globalMult * dt;
  }

  // オートバイヤー処理
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
    if (!gen.autoUnlocked && game.particles >= threshold) {
      gen.autoUnlocked = true;
    }
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

function toggleAutobuyer(index) {
  const gen = game.generators[index];
  if (!gen.autoUnlocked) return;
  gen.autoActive = !gen.autoActive;
  updateUI(0);
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

// 通常のライナック（生産倍率UP）
function doLinac() {
  const req = getLinacReq();
  if (game.generators[7].amount < req) return;
  const currentBase = getLinacBaseMult();
  
  if (!confirm(`ライナックを実行しますか？\nベース倍率: ${format(currentBase)}倍\n現在のライナック数: ${game.linacs} -> ${game.linacs+1}`)) return;

  game.linacs++;
  game.stats.totalLinacs++; // 統計加算
  
  // リセット処理 (粒子とジェネレーター)
  game.particles = 10;
  game.generators.forEach(gen => {
    gen.amount = 0;
    gen.bought = 0;
    gen.production = 1; 
  });

  saveGame();
  updateUI(0);
}

// ライナック・シフト (ベース倍率UP)
function doLinacShift() {
  const shiftReq = getShiftReq();
  if (game.linacs < shiftReq) return;

  const currentBase = getLinacBaseMult();
  const nextBase = currentBase + 0.2;

  if (!confirm(`【警告】ライナック・シフトを実行しますか？\n\n失うもの:\n- 全ての粒子\n- 全てのAccelerator\n- 現在のライナック数 (${game.linacs}回)\n\n得られるもの:\n- ライナック倍率強化 (${format(currentBase)} -> ${format(nextBase)})\n\n※統計上のライナック回数は保持されます。`)) return;

  // シフト実行
  game.shifts++;
  
  // リセット処理 (粒子、ジェネレーター、そして現在のライナック数)
  game.linacs = 0;
  game.particles = 10;
  game.generators.forEach(gen => {
    gen.amount = 0;
    gen.bought = 0;
    gen.production = 1; 
  });

  saveGame();
  updateUI(0);
  alert(`シフト完了！\n現在のライナック倍率が ${format(nextBase)}倍 になりました。`);
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
  }
}

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
  const keptInfinity = JSON.parse(JSON.stringify(game.infinity));
  const keptSettings = JSON.parse(JSON.stringify(game.settings));
  const keptAutobuyers = game.generators.map(gen => ({
    unlocked: gen.autoUnlocked,
    active: gen.autoActive
  }));
  
  game = getInitialState();
  
  game.infinity = keptInfinity;
  game.settings = keptSettings;
  game.generators.forEach((gen, index) => {
    if (keptAutobuyers[index]) {
      gen.autoUnlocked = keptAutobuyers[index].unlocked;
      gen.autoActive = keptAutobuyers[index].active;
    }
  });
  
  saveGame();
  location.reload();
}

// --- UI更新 ---
function updateUI(pps) {
  document.getElementById('particle-display').textContent = `${format(game.particles)} 粒子`;
  document.getElementById('pps-display').textContent = `(+${format(pps)} /秒)`;

  if (game.infinity && game.infinity.ip > 0) {
    document.getElementById('ip-display-container').style.display = 'block';
    document.getElementById('ip-val').textContent = game.infinity.ip;
  }

  // シフト情報更新
  const baseMult = getLinacBaseMult();
  document.getElementById('shift-mult-display').textContent = `x${format(baseMult)}`;
  document.getElementById('shift-count').textContent = game.shifts;

  // プレステージ/シフトバナー制御
  const globalMult = getGlobalMultiplier();
  const linacReq = getLinacReq();
  const shiftReq = getShiftReq();
  const pContainer = document.getElementById('prestige-container');
  
  // 表示条件: Mk.8が必要数に達した かつ (シフト条件を満たしていない または ライナック条件を満たしている)
  // 単純化: Mk.8がある程度あればバナーを出す
  if (game.generators[7].amount >= linacReq || game.linacs >= shiftReq) {
    pContainer.style.display = 'block';
    
    document.getElementById('current-linac-count').textContent = game.linacs;
    document.getElementById('next-shift-req').textContent = shiftReq;

    // 通常ライナックボタン
    const btnLinac = document.getElementById('btn-linac');
    if (game.generators[7].amount >= linacReq) {
        btnLinac.classList.remove('disabled');
        btnLinac.innerHTML = `<strong>ライナックを実行</strong><br><span style="font-size:0.8em;">生産倍率 x${format(baseMult)} & リセット (Mk.8: ${linacReq}個消費)</span>`;
        btnLinac.onclick = doLinac;
    } else {
        btnLinac.classList.add('disabled');
        btnLinac.innerHTML = `<strong>ライナック未到達</strong><br><span style="font-size:0.8em;">Mk.8 が ${linacReq}個 必要</span>`;
        btnLinac.onclick = null;
    }

    // シフトボタン
    const btnShift = document.getElementById('btn-shift');
    if (game.linacs >= shiftReq) {
        btnShift.style.display = 'inline-block';
        const nextBase = baseMult + 0.2;
        btnShift.innerHTML = `<strong>ライナック・シフト</strong><br><span style="font-size:0.8em;">ライナック倍率 ${format(baseMult)} → ${format(nextBase)}</span>`;
    } else {
        btnShift.style.display = 'none';
    }

  } else {
    pContainer.style.display = 'none';
  }

  // ジェネレーターリスト更新
  game.generators.forEach((gen, index) => {
    const btn = document.getElementById(`btn-${index}`);
    const btnMax = document.getElementById(`btn-max-${index}`);
    if (!btn) return;

    const buyAmt = game.settings.buyAmount;
    const cost = getBulkCost(gen, buyAmt);
    
    // オートバイヤー
    const autoBadge = document.getElementById(`auto-badge-${index}`);
    const threshold = Number('1e' + (50 + index * 10));
    
    if (autoBadge) {
      autoBadge.className = 'auto-badge';
      autoBadge.onclick = null;
      if (gen.autoUnlocked) {
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
        autoBadge.textContent = `Req: ${format(threshold)}`;
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

  if (game.stats.totalLinacs > 0) {
    document.getElementById('row-prestige').style.display = 'flex';
    document.getElementById('stat-prestige').textContent = `${game.stats.totalLinacs} 回`;
  }
  
  if (game.shifts > 0) {
    document.getElementById('row-shift').style.display = 'flex';
    document.getElementById('stat-shift').textContent = `${game.shifts} 回`;
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

// --- セーブ・ロード ---
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
      
      // 旧バージョンからのマイグレーション
      // linacs と stats.totalLinacs が無い場合（旧バージョン）は prestigeCount から移行
      let migratedStats = { ...fresh.stats, ...(parsed.stats || {}) };
      let currentLinacs = parsed.linacs !== undefined ? parsed.linacs : (parsed.stats && parsed.stats.prestigeCount) || 0;
      
      // もし旧データなら totalLinacs も同期
      if (migratedStats.totalLinacs === undefined && parsed.stats && parsed.stats.prestigeCount) {
        migratedStats.totalLinacs = parsed.stats.prestigeCount;
      }

      game = { ...fresh, ...parsed };
      game.linacs = currentLinacs;
      game.stats = migratedStats;
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

init();
