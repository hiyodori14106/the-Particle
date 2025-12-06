/**
 * the-Particle v2.8 (Infinity Upgrades)
 */
const SAVE_KEY = 'theParticle_v2_8';
let INFINITY_LIMIT = 1.79e308; // 変数に変更(Break Infinity用)

// --- 単位定義 ---
const UNITS_ENG = [
 '', 'k', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 
 'Ud', 'Dd', 'Td', 'Qad', 'Qid', 'Sxd', 'Spd', 'Od', 'Nd', 'Vg', 
 'Uvg', 'Dvg', 'Tvg', 'Qavg', 'Qivg', 'Sxvg', 'Spvg', 'Ovg', 'Nvg', 'Tg', 
 'Utg', 'Dtg', 'Ttg', 'Qatg', 'Qitg', 'Sxtg', 'Sptg', 'Otg', 'Ntg'
];

const UNITS_JP = [
 '', '万', '億', '兆', '京', '垓', '𥝱', '穣', '溝', '澗', '正', '載', '極', 
 '恒河沙', '阿僧祇', '那由他', '不可思議', '無量大数', 
 '洛叉', '倶胝', '阿庾多', '那由他', '頻婆羅', '矜羯羅', '阿伽羅', '最勝', 
 '摩婆羅', '阿婆羅', '多婆羅', '界分', '普摩', '祢摩', '阿婆鈐', '弥伽婆', 
 '毘ラガ', '毘ガバ', '僧褐邏'
];

// --- Infinity Upgrades 定義 ---
const INF_UPGRADES = [
  {
    id: 0,
    title: "Time Dilation",
    desc: "総プレイ時間に応じて生産倍率増加",
    cost: 1,
    effect: (game) => {
      // 秒数を取得
      const totalSec = (Date.now() - game.stats.startTime) / 1000;
      // log10(秒数 + 10) をベースにする
      const mult = Math.max(1, 1 + Math.log10(totalSec + 1) * 0.5);
      return mult;
    },
    formatEffect: (val) => `x${format(val)}`
  },
  {
    id: 1,
    title: "Linac Boost",
    desc: "ライナック回数に応じてIP獲得量増加",
    cost: 3,
    effect: (game) => {
      return 1 + (game.stats.totalLinacs * 0.1);
    },
    formatEffect: (val) => `x${format(val)} IP`
  },
  {
    id: 2,
    title: "Shift Power",
    desc: "シフト回数に応じて生産倍率増加",
    cost: 5,
    effect: (game) => {
      return Math.pow(2, game.shifts);
    },
    formatEffect: (val) => `x${format(val)}`
  }
  // 追加可能
];

// --- データ初期値 ---
function getInitialState() {
  return {
    particles: 10,
    linacs: 0, 
    shifts: 0, 
    stats: {
      totalParticles: 10,
      totalLinacs: 0,
      startTime: Date.now(),
    },
    infinity: {
      ip: 0,
      crunchCount: 0,
      bestTime: null,
      upgrades: [], // 購入済みIDリスト
      broken: false // Break Infinityフラグ
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
  if (num === undefined || num === null || isNaN(num)) return "0.00";
  if (!isFinite(num)) return "Infinity";
  if (num < 1000) return num.toFixed(2);
  
  const type = game.settings ? game.settings.notation : 'sci';
  
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
  if (!seconds || isNaN(seconds)) return "--:--:--";
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

function getLinacBaseMult() {
  const s = game.shifts || 0;
  return 1.2 + (s * 0.2);
}

function hasUpgrade(id) {
  return game.infinity && game.infinity.upgrades && game.infinity.upgrades.includes(id);
}

function getGlobalMultiplier() {
  let mult = 1;
  
  // ライナック
  const base = getLinacBaseMult();
  const l = game.linacs || 0;
  mult *= Math.pow(base, l);

  // Infinity Upgrades
  if (hasUpgrade(0)) {
    mult *= INF_UPGRADES[0].effect(game);
  }
  if (hasUpgrade(2)) {
    mult *= INF_UPGRADES[2].effect(game);
  }

  return mult;
}

function getLinacReq() {
  const l = game.linacs || 0;
  return 1 + (l * 10);
}

function getShiftReq() {
  const s = game.shifts || 0;
  return 5 + (s * 5);
}

// --- ゲームループ ---
function gameLoop() {
  if (isCrunching) return;

  const now = Date.now();
  let dt = (now - game.lastTick) / 1000;
  if (dt > 1) dt = 1; 
  game.lastTick = now;

  if (isNaN(game.particles)) game.particles = 10;
  
  // Break Infinity チェック
  if (game.infinity.broken) {
    INFINITY_LIMIT = 1e999; // 実質無限
  } else {
    INFINITY_LIMIT = 1.79e308;
  }

  if (game.particles >= INFINITY_LIMIT && !game.infinity.broken) {
    triggerBigCrunch();
    return;
  }

  updateGlitchEffect();

  const globalMult = getGlobalMultiplier();

  const g0 = game.generators[0];
  const pps = g0.amount * g0.production * globalMult;
  const produced = pps * dt;
  
  if (!isNaN(produced)) {
    game.particles += produced;
    game.stats.totalParticles += produced;
  }

  for (let i = 1; i < game.generators.length; i++) {
    const producer = game.generators[i];
    const target = game.generators[i - 1];
    const amountToAdd = producer.amount * producer.production * globalMult * dt;
    if (!isNaN(amountToAdd)) {
      target.amount += amountToAdd;
    }
  }

  game.autobuyerTimer = (game.autobuyerTimer || 0) + dt;
  if (game.autobuyerTimer >= 0.5) {
    runAutobuyers();
    game.autobuyerTimer = 0;
  }

  updateUI(pps);
  
  const wrapper = document.getElementById('app-wrapper');
  if (wrapper && !wrapper.classList.contains('closed')) {
    updateStats();
    updateInfinityTab(); // Infinityタブの更新
  }
  
  if (now % 10000 < 20) saveGame(true);
  
  requestAnimationFrame(gameLoop);
}

// --- アクション ---
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

function setBuyAmount(amount) {
  game.settings.buyAmount = amount;
  document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
  const btn = document.getElementById(`buy-${amount}`);
  if(btn) btn.classList.add('active');
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
  const r = gen.costMult; 
  const currentCost = gen.baseCost * Math.pow(r, gen.bought);
  if (game.particles < currentCost) return;

  const numerator = (game.particles * (r - 1)) / currentCost + 1;
  let count = Math.floor(Math.log(numerator) / Math.log(r));

  if (count <= 0) return;

  const totalCost = currentCost * (Math.pow(r, count) - 1) / (r - 1);
  if (game.particles >= totalCost) {
    game.particles -= totalCost;
    gen.amount += count;
    gen.bought += count;
    gen.production *= Math.pow(1.1, count);
    updateUI(0);
  }
}

function doLinac() {
  const req = getLinacReq();
  if (game.generators[7].amount < req) return;
  const currentBase = getLinacBaseMult();
  
  if (!confirm(`ライナックを実行しますか？\nベース倍率: ${format(currentBase)}倍\n現在のライナック数: ${game.linacs} -> ${game.linacs+1}`)) return;

  game.linacs = (game.linacs || 0) + 1;
  game.stats.totalLinacs = (game.stats.totalLinacs || 0) + 1;
  
  game.particles = 10;
  game.generators.forEach(gen => {
    gen.amount = 0;
    gen.bought = 0;
    gen.production = 1; 
  });

  saveGame();
  updateUI(0);
}

function doLinacShift() {
  const shiftReq = getShiftReq();
  if ((game.linacs || 0) < shiftReq) return;

  const currentBase = getLinacBaseMult();
  const nextBase = currentBase + 0.2;

  if (!confirm(`【警告】ライナック・シフトを実行しますか？\n\n失うもの:\n- 全ての粒子\n- 全てのAccelerator\n- 現在のライナック数 (${game.linacs}回)\n\n得られるもの:\n- ライナック倍率強化 (${format(currentBase)} -> ${format(nextBase)})\n\n`)) return;

  game.shifts = (game.shifts || 0) + 1;
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

// --- Infinity Logic ---
function buyInfinityUpgrade(id) {
  if (hasUpgrade(id)) return;
  const upgrade = INF_UPGRADES.find(u => u.id === id);
  if (!upgrade) return;
  
  if (game.infinity.ip >= upgrade.cost) {
    game.infinity.ip -= upgrade.cost;
    game.infinity.upgrades.push(id);
    updateInfinityTab();
    updateUI(0); // IP表示更新のため
  }
}

function unlockBreakInfinity() {
  if (game.infinity.ip >= 1e50 && !game.infinity.broken) {
    game.infinity.broken = true;
    alert("LIMIT BROKEN.\n粒子の上限が撤廃されました。");
    updateInfinityTab();
  }
}

// --- UI更新 ---
function updateUI(pps) {
  const pDisplay = document.getElementById('particle-display');
  if(pDisplay) pDisplay.textContent = `${format(game.particles)} 粒子`;
  
  const ppsDisplay = document.getElementById('pps-display');
  if(ppsDisplay) ppsDisplay.textContent = `(+${format(pps)} /秒)`;

  // IP表示
  const ipContainer = document.getElementById('ip-display-container');
  const infTabBtn = document.getElementById('tab-btn-infinity');

  if (game.infinity && game.infinity.crunchCount > 0) {
    if (ipContainer) {
      ipContainer.style.display = 'inline-block';
      document.getElementById('ip-val').textContent = format(game.infinity.ip); // フォーマット適用
    }
    // Infinityタブボタンを表示
    if (infTabBtn) infTabBtn.style.display = 'block';
  } else {
    if (ipContainer) ipContainer.style.display = 'none';
    if (infTabBtn) infTabBtn.style.display = 'none';
  }

  const shiftStatusBar = document.getElementById('shift-status');
  if (shiftStatusBar) {
    if ((game.shifts || 0) > 0) {
      shiftStatusBar.style.display = 'flex';
      const baseMult = getLinacBaseMult();
      document.getElementById('shift-mult-display').textContent = `x${format(baseMult)}`;
      document.getElementById('shift-count').textContent = game.shifts || 0;
    } else {
      shiftStatusBar.style.display = 'none';
    }
  }

  const linacReq = getLinacReq();
  const shiftReq = getShiftReq();
  const pContainer = document.getElementById('prestige-container');
  const baseMult = getLinacBaseMult();

  if (pContainer) {
    if (game.generators[7].amount >= linacReq || game.linacs >= shiftReq) {
      pContainer.style.display = 'block';
      
      const linacCountEl = document.getElementById('current-linac-count');
      if(linacCountEl) linacCountEl.textContent = game.linacs || 0;
      
      const nextShiftEl = document.getElementById('next-shift-req');
      if(nextShiftEl) nextShiftEl.textContent = shiftReq;

      const btnLinac = document.getElementById('btn-linac');
      if (btnLinac) {
        if (game.generators[7].amount >= linacReq) {
          btnLinac.classList.remove('disabled');
          btnLinac.innerHTML = `<strong>ライナックを実行</strong><br><span style="font-size:0.8em;">生産倍率 x${format(baseMult)} & リセット (Mk.8: ${linacReq}個消費)</span>`;
          btnLinac.onclick = doLinac;
        } else {
          btnLinac.classList.add('disabled');
          btnLinac.innerHTML = `<strong>ライナック未到達</strong><br><span style="font-size:0.8em;">Mk.8 が ${linacReq}個 必要</span>`;
          btnLinac.onclick = null;
        }
      }

      const btnShift = document.getElementById('btn-shift');
      if (btnShift) {
        if (game.linacs >= shiftReq) {
          btnShift.style.display = 'inline-block';
          const nextBase = baseMult + 0.2;
          btnShift.innerHTML = `<strong>ライナック・シフト</strong><br><span style="font-size:0.8em;">ライナック倍率 ${format(baseMult)} → ${format(nextBase)}</span>`;
        } else {
          btnShift.style.display = 'none';
        }
      }
    } else {
      pContainer.style.display = 'none';
    }
  }

  game.generators.forEach((gen, index) => {
    const btn = document.getElementById(`btn-${index}`);
    const btnMax = document.getElementById(`btn-max-${index}`);
    if (!btn) return;

    const buyAmt = game.settings.buyAmount;
    const cost = getBulkCost(gen, buyAmt);
    
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
    document.getElementById(`mult-${index}`).textContent = `x${format(gen.production * getGlobalMultiplier())}`;
    
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

  const statPrestige = document.getElementById('stat-prestige');
  const rowPrestige = document.getElementById('row-prestige');
  if (game.stats.totalLinacs > 0 && statPrestige && rowPrestige) {
    rowPrestige.style.display = 'flex';
    statPrestige.textContent = `${game.stats.totalLinacs} 回`;
  }
  
  const statShift = document.getElementById('stat-shift');
  const rowShift = document.getElementById('row-shift');
  if (game.shifts > 0 && statShift && rowShift) {
    rowShift.style.display = 'flex';
    statShift.textContent = `${game.shifts} 回`;
  }

  if (game.infinity && game.infinity.crunchCount > 0) {
    const infStats = document.getElementById('infinity-stats');
    if(infStats) infStats.style.display = 'block';
    document.getElementById('stat-crunch').textContent = `${game.infinity.crunchCount} 回`;
    document.getElementById('stat-best-inf').textContent = formatTime(game.infinity.bestTime / 1000);
  }
}

function updateInfinityTab() {
  // IP表示更新
  document.getElementById('inf-tab-ip-display').textContent = format(game.infinity.ip);

  // アップグレード描画
  const container = document.getElementById('infinity-upgrades-container');
  if (container) {
    container.innerHTML = '';
    INF_UPGRADES.forEach(up => {
      const bought = hasUpgrade(up.id);
      const btn = document.createElement('div');
      btn.className = `inf-upgrade-btn ${bought ? 'bought' : ''}`;
      if (!bought && game.infinity.ip < up.cost) btn.classList.add('disabled');
      
      // 現在の効果値を計算
      const currentEffect = up.effect(game);
      
      btn.innerHTML = `
        <div style="width:100%">
          <div class="inf-desc">${up.title}: ${up.desc}</div>
          <div style="font-size:0.8em; color:#00ff9d;">現在の効果: ${up.formatEffect(currentEffect)}</div>
        </div>
        <div class="inf-cost">${bought ? 'BOUGHT' : 'COST: ' + format(up.cost) + ' IP'}</div>
      `;
      
      if (!bought) {
        btn.onclick = () => buyInfinityUpgrade(up.id);
      }
      container.appendChild(btn);
    });
  }

  // Break Infinity Section
  const breakSec = document.getElementById('break-infinity-section');
  const btnBreak = document.getElementById('btn-break-infinity');
  const msgBreak = document.getElementById('break-active-msg');
  
  if (game.infinity.ip >= 1e50 || game.infinity.broken) {
    breakSec.style.display = 'block';
    if (game.infinity.broken) {
      btnBreak.style.display = 'none';
      msgBreak.style.display = 'block';
    } else {
      btnBreak.style.display = 'block';
      msgBreak.style.display = 'none';
      if (game.infinity.ip < 1e50) {
         btnBreak.classList.add('disabled');
      } else {
         btnBreak.classList.remove('disabled');
      }
    }
  } else {
    breakSec.style.display = 'none';
  }
}


function updateGlitchEffect() {
  const overlay = document.getElementById('glitch-layer');
  if (!overlay) return;
  
  // Break Infinity時は演出を控えるか、あるいはもっと激しくするか。今回は控えめに
  if (game.infinity.broken && game.particles < 1e250) {
    document.body.classList.remove('glitched');
    overlay.style.opacity = 0;
    return;
  }

  if (game.particles < 1e250) {
    document.body.classList.remove('glitched');
    overlay.style.opacity = 0;
    return;
  }
  const logP = Math.log10(game.particles);
  const intensity = (logP - 250) / (308 - 250); 
  if (intensity > 0) {
    document.body.classList.add('glitched');
    overlay.style.opacity = intensity * 0.8;
  }
}

// --- ビッグ・クランチ ---
function triggerBigCrunch() {
  if (isCrunching) return;

  const currentTime = Date.now() - game.stats.startTime;
  if (!game.infinity) game.infinity = { ip:0, crunchCount:0, bestTime:null, upgrades:[], broken:false };
  
  // IP獲得計算 (基本1 + アップグレード等あれば)
  let gainedIP = 1;
  if (hasUpgrade(1)) gainedIP *= INF_UPGRADES[1].effect(game);
  
  game.infinity.ip = (game.infinity.ip || 0) + gainedIP;
  game.infinity.crunchCount = (game.infinity.crunchCount || 0) + 1;
  
  if (game.infinity.bestTime === null || currentTime < game.infinity.bestTime) {
    game.infinity.bestTime = currentTime;
  }
  
  isCrunching = true;
  saveGame();

  const overlay = document.getElementById('crunch-overlay');
  if(overlay) {
    overlay.classList.add('active');
  }
  
  setTimeout(() => {
    performInfinityReset();
  }, 5000);

  setTimeout(() => {
    if(overlay) overlay.classList.remove('active');
    isCrunching = false;
  }, 8500);
}

function performInfinityReset() {
  const savedInfinity = JSON.parse(JSON.stringify(game.infinity));
  const savedSettings = JSON.parse(JSON.stringify(game.settings));
  
  const freshState = getInitialState();
  
  game.particles = freshState.particles;
  game.linacs = freshState.linacs;
  game.shifts = freshState.shifts;
  game.generators = freshState.generators;
  game.stats = freshState.stats;
  game.stats.startTime = Date.now(); // Reset time for new run

  game.infinity = savedInfinity;
  game.settings = savedSettings;
  
  game.lastTick = Date.now();
  
  updateUI(0);
  updateStats();
  document.body.classList.remove('glitched');
  
  saveGame();
  console.log("Universe Reborn.");
}

// --- セーブ・ロード ---
function saveGame(isAuto = false) {
  if(isCrunching && isAuto) return;
  
  game.lastTick = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(game));
  
  if (!isAuto) {
    const s = document.getElementById('save-status');
    if(s) {
      s.textContent = "保存しました";
      setTimeout(() => s.textContent = "オートセーブ有効 (10秒毎)", 2000);
    }
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
      
      // 配列やオブジェクトの補完
      if (!game.infinity.upgrades) game.infinity.upgrades = [];
      if (game.infinity.broken === undefined) game.infinity.broken = false;

      if (parsed.generators) {
        game.generators = parsed.generators.map((g, i) => {
          const freshGen = fresh.generators[i] || g;
          return { 
            ...freshGen, 
            ...g,
            autoUnlocked: g.autoUnlocked !== undefined ? g.autoUnlocked : freshGen.autoUnlocked,
            autoActive: g.autoActive !== undefined ? g.autoActive : freshGen.autoActive
          };
        });
      }
      
      const notSel = document.getElementById('notation-select');
      if(notSel) notSel.value = game.settings.notation;
      setBuyAmount(game.settings.buyAmount);

    } catch(e) {
      console.error("Save Load Error:", e);
    }
  }
}

function hardReset() {
  if(confirm("本当に全てのデータを消去しますか？（元に戻せません）")) {
    localStorage.removeItem(SAVE_KEY);
    location.reload();
  }
}

function exportSave() {
  saveGame(true);
  const str = btoa(JSON.stringify(game));
  const area = document.getElementById('save-textarea');
  toggleImportArea(true); 
  area.value = str;
  area.select();
}

function toggleImportArea(forceOpen = false) {
  const area = document.getElementById('io-area');
  if (!area) return;
  if (forceOpen) {
    area.style.display = 'block';
  } else {
    area.style.display = (area.style.display === 'none') ? 'block' : 'none';
  }
}

function confirmImport() {
  const str = document.getElementById('save-textarea').value.trim();
  if (!str) return;
  try {
    const decoded = atob(str);
    JSON.parse(decoded); 
    localStorage.setItem(SAVE_KEY, decoded);
    location.reload();
  } catch(e) { 
    alert("データが無効です"); 
  }
}

// --- UI操作 ---
function toggleSidebar() { 
  const el = document.getElementById('app-wrapper');
  if(el) el.classList.toggle('closed');
}

function switchTab(name, btn) {
  document.querySelectorAll('.sidebar-content').forEach(c => {
    c.classList.remove('active');
  });
  
  const targetContent = document.getElementById('tab-' + name);
  if (targetContent) {
    targetContent.classList.add('active');
  }
  
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  if(btn) {
    btn.classList.add('active');
  } else {
    const btns = document.querySelectorAll('.tab-btn');
    btns.forEach(b => {
        if(b.getAttribute('onclick') && b.getAttribute('onclick').includes(name)) {
            b.classList.add('active');
        }
    });
  }
}

// ショートカットキー
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
  const key = e.key.toLowerCase();
  if (key >= '1' && key <= '8') {
    const index = parseInt(key) - 1;
    buyGenerator(index);
    animateButton(index);
  }
  if (key === 'm') {
    game.generators.forEach((_, i) => buyMaxGenerator(i));
    for(let i=0; i<8; i++) animateButton(i);
  }
  if (key === 's') {
    e.preventDefault();
    saveGame();
    const s = document.getElementById('save-status');
    if(s) {
        s.textContent = "★ QUICK SAVE! ★";
        s.style.color = "#00ff9d";
        setTimeout(() => { 
            s.textContent = "オートセーブ有効 (10秒毎)"; 
            s.style.color = "";
        }, 2000);
    }
  }
});

function animateButton(index) {
  const btn = document.getElementById(`btn-${index}`);
  if (btn) {
    btn.classList.add('btn-pressed');
    setTimeout(() => btn.classList.remove('btn-pressed'), 150);
  }
}

// ニュースティッカー
const NEWS_DATA = [
  { req: 0, text: "システム起動... 観測を開始します。" },
  { req: 0, text: "近所の猫が粒子まみれになっています。" },
  { req: 0, text: "電気代の請求書が怖くてポストを開けられません。" },
  { req: 0, text: "【TIPS】キーボードの 'M' で最大購入、'S' でセーブ可能です。" },
  { req: 50, text: "研究室のコーヒーが勝手に沸騰し始めました。" },
  { req: 100, text: "微細な振動が床から伝わってきます。" },
  { req: 500, text: "「ただの光る点だ」と友人に笑われました。" },
  { req: 1000, text: "近所のコンビニで「粒子払い」が可能になりました。" },
  { req: 5000, text: "あなたの指先から微弱なガンマ線が出ています。" },
  { req: 1e4, text: "部屋の照明が不要になりました。" },
  { req: 5e4, text: "スマホのバッテリーが減らなくなりました。" },
  { req: 1e5, text: "科学雑誌「ムー」があなたの特集を組みました。" },
  { req: 5e5, text: "水道からプラズマが出るという苦情が殺到しています。" },
  { req: 1e6, text: "物理学者があなたの家の前でデモ行進をしています。" },
  { req: 1e7, text: "税務署が「粒子の課税区分」について頭を抱えています。" },
  { req: 1e8, text: "地元の天気予報: 「ところにより粒子、のち時空の歪みでしょう」" },
  { req: 1e9, text: "世界中のスパコンが計算に追いつけません。" },
  { req: 1e10, text: "月面から「コッチヲ見ルナ」という信号を受信しました。" },
  { req: 1e11, text: "あなたのくしゃみで株価が乱高下しています。" },
  { req: 1e12, text: "空間に亀裂が見えますが、気にしてはいけません。" },
  { req: 1e13, text: "物理法則のアップデート待機中... (99%)" },
  { req: 1e14, text: "昨日の夕飯が何だったか、歴史から消滅しました。" },
  { req: 1e15, text: "銀河系の質量バランスが崩れ始めています。" },
  { req: 1e18, text: "「重力」のサブスクリプション期限が切れそうです。" },
  { req: 1e20, text: "もう何も怖くない。" },
  { req: 1e22, text: "シュレーディンガーの猫が、箱の中から餌を要求しています。" },
  { req: 1e25, text: "全宇宙のエントロピーが減少に転じました。" },
  { req: 1e30, text: "神様から「やりすぎ」という苦情メールが届きました。" },
  { req: 1e50, text: "宇宙のデータ容量が圧迫されています。" },
  { req: 1e60, text: "現実と虚構の境界線が溶けてバターになりました。" },
  { req: 1e80, text: "数学者が「1+1=粒子」であることを証明しました。" },
  { req: 1e100, text: "ERROR: テキスト出力機能に異常が発生しています。" },
  { req: 1e150, text: "あ　な　た　は　誰　で　す　か　？" },
  { req: 1e200, text: "NULL POINTER EXCEPTION: UNIVERSE NOT FOUND." },
  { req: 1e250, text: "システム警告: ビッグ・クランチが接近しています。" },
  { req: 1e300, text: "サヨウナラ。" }
];

function updateNewsText() {
  const content = document.getElementById('news-content');
  if (!content) return;
  const availableNews = NEWS_DATA.filter(n => game.particles >= n.req);
  if (availableNews.length === 0) return;
  const randIndex = Math.floor(Math.random() * availableNews.length);
  content.textContent = availableNews[randIndex].text;
}

function initNews() {
  const track = document.querySelector('.news-track');
  if (track) {
    updateNewsText();
    track.addEventListener('animationiteration', updateNewsText);
  }
}

function init() {
  console.log("Game Initializing...");

  const container = document.getElementById('generator-container');
  if(container) {
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
  }

  loadGame();
  initNews();
  
  // デフォルトでStatsを開く
  switchTab('stats');

  gameLoop();
}

init();
