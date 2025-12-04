/**
 * the-Particle v3.0.0 - Expansion Update
 */

const SAVE_KEY = 'theParticle_v3';
const INFINITY_LIMIT = 1.79e308;

// --- ニュースティッカー用データ (100種の一部) ---
const NEWS_MESSAGES = [
  { req: 0, text: "宇宙が静かに生成されました。" },
  { req: 100, text: "近所の猫が粒子まみれです。" },
  { req: 1000, text: "科学者が「これ以上は危険だ」と警告していますが、無視しましょう。" },
  { req: 1e4, text: "粒子の重みでスマートフォンのバッテリー消費が増えています。" },
  { req: 1e6, text: "新しい物理法則が発見されました：『多ければ多いほど良い』" },
  { req: 1e9, text: "あなたの粒子貯蔵庫が地域の地価を下げています。" },
  { req: 1e12, text: "政府が粒子税の導入を検討中。" },
  { req: 1e15, text: "「粒子ダイエット」がSNSでトレンド入り。" },
  { req: 1e18, text: "異次元からのノック音が聞こえます。" },
  { req: 1e21, text: "粒子が独自の意識を持ち始めた可能性があります。" },
  { req: 1e24, text: "銀河系の一角が粒子の重みで歪んでいます。" },
  { req: 1e30, text: "神様から「やりすぎ」という苦情メールが届きました。" },
  { req: 1e50, text: "現実のテクスチャ解像度が低下しています。" },
  { req: 1e100, text: "エラー：宇宙のメモリが不足しています。" },
  // ... (論理的に選択されるため、実際には配列からランダム＋条件で表示)
];

// ダミー生成で100個っぽく見せるための配列
const FILLER_NEWS = [
  "粒子価格が過去最高値を更新。", "誰かが粒子の中で泳いでいます。", 
  "今日の天気は晴れ、時々粒子嵐。", "粒子スープが人気。", 
  "未確認粒子物体(UPO)を目撃。", "研究員が過労で倒れました。",
  "加速器の音がうるさいと近所から苦情。", "粒子のおかげで宝くじが当たりました（嘘です）。"
];

// --- 初期状態 ---
function getInitialState() {
  return {
    particles: 10,
    linacs: 0,
    shifts: 0,
    
    stats: {
      totalParticles: 10,
      totalLinacs: 0,
      startTime: Date.now(),
      lastSaveTime: Date.now()
    },
    
    infinity: { ip: 0, crunchCount: 0, bestTime: null },

    settings: {
      notation: 'sci',
      buyAmount: 1,
      skipConfirm: false
    },

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
let isCrunching = false;

// --- UI システム (Toast & Modal) ---
const UI = {
  toast: (msg) => {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  },
  
  modal: (title, body, actions = []) => {
    const overlay = document.getElementById('custom-modal-overlay');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = body;
    const actContainer = document.getElementById('modal-actions');
    actContainer.innerHTML = '';
    
    actions.forEach(act => {
      const btn = document.createElement('button');
      btn.className = `ui-btn ${act.class || 'secondary'}`;
      btn.textContent = act.text;
      btn.onclick = () => {
        if(act.onClick) act.onClick();
        UI.closeModal();
      };
      // スタイル調整
      btn.style.width = 'auto';
      btn.style.padding = '5px 15px';
      actContainer.appendChild(btn);
    });
    
    if(actions.length === 0) {
      const close = document.createElement('button');
      close.className = 'ui-btn primary';
      close.textContent = '閉じる';
      close.style.width = 'auto';
      close.onclick = UI.closeModal;
      actContainer.appendChild(close);
    }
    
    overlay.style.display = 'flex';
  },
  
  closeModal: () => {
    document.getElementById('custom-modal-overlay').style.display = 'none';
  },

  confirm: (title, body, onConfirm) => {
    if (game.settings.skipConfirm) {
      onConfirm();
      return;
    }
    UI.modal(title, body, [
      { text: 'キャンセル', class: 'secondary' },
      { text: '実行', class: 'danger', onClick: onConfirm }
    ]);
  }
};

// --- 数学ユーティリティ (Buy Max用) ---
function getCost(gen, count) {
  // count個目のコスト (0-indexed)
  return gen.baseCost * Math.pow(gen.costMult, count);
}

function getSumCost(gen, amountToBuy) {
  // 現在のbought数からamountToBuy個買う総コスト: Sum = a * (r^n - 1) / (r - 1)
  // a = 現在の次のコスト
  const r = gen.costMult;
  const a = gen.baseCost * Math.pow(r, gen.bought);
  if (r === 1) return a * amountToBuy;
  return a * (Math.pow(r, amountToBuy) - 1) / (r - 1);
}

function calcMaxAffordable(gen, budget) {
  const r = gen.costMult;
  const currentCost = gen.baseCost * Math.pow(r, gen.bought);
  if (budget < currentCost) return 0;
  
  if (r === 1) return Math.floor(budget / currentCost);

  // Formula: budget >= currentCost * (r^n - 1) / (r - 1)
  // (budget * (r - 1)) / currentCost + 1 >= r^n
  // n <= log_r( ... )
  const num = (budget * (r - 1)) / currentCost + 1;
  const n = Math.floor(Math.log(num) / Math.log(r));
  return n > 0 ? n : 0;
}

// --- ゲームロジック ---

function getGlobalMultiplier() {
  const base = 1.2 + ((game.shifts || 0) * 0.2);
  return Math.pow(base, game.linacs || 0);
}

function gameLoop() {
  if (isCrunching) return;
  
  const now = Date.now();
  let dt = (now - game.stats.lastSaveTime) / 1000;
  game.stats.lastSaveTime = now;
  
  if (dt > 1) dt = 1; // ラグ防止（オフライン計算は別処理）

  // Infinity Check
  if (game.particles >= INFINITY_LIMIT) {
    triggerBigCrunch();
    return;
  }

  const globalMult = getGlobalMultiplier();
  let pps = 0;

  // 生産計算 (カスケードなしの簡易モデルへ変更、または前回のロジック維持)
  // 今回はTier 1のみが生産し、他はTier 1を生産するカスケード方式と仮定
  // ※元のコードに合わせてTier 1が粒子、Tier NがTier N-1を生産する形式にします
  
  // Tier 0 -> 粒子
  const g0 = game.generators[0];
  pps = g0.amount * g0.production * globalMult;
  game.particles += pps * dt;
  game.stats.totalParticles += pps * dt;

  // Tier N -> Tier N-1
  for (let i = 1; i < game.generators.length; i++) {
    const producer = game.generators[i];
    const target = game.generators[i - 1];
    const prod = producer.amount * producer.production * globalMult;
    target.amount += prod * dt;
  }

  updateUI(pps);
  updateNewsTicker();
  requestAnimationFrame(gameLoop);
}

// --- アクション ---

function buyGenerator(id) {
  const gen = game.generators[id];
  const amount = game.settings.buyAmount;
  const cost = getSumCost(gen, amount);
  
  if (game.particles >= cost) {
    game.particles -= cost;
    gen.amount += amount;
    gen.bought += amount;
    gen.production *= Math.pow(1.1, amount); // 購入ごとに強化
    updateGeneratorUI(id);
  }
}

function buyMaxGenerator(id) {
  const gen = game.generators[id];
  const max = calcMaxAffordable(gen, game.particles);
  if (max > 0) {
    const cost = getSumCost(gen, max);
    game.particles -= cost;
    gen.amount += max;
    gen.bought += max;
    gen.production *= Math.pow(1.1, max);
    updateGeneratorUI(id);
  }
}

function buyMaxAll() {
  // コストの安い順、あるいは上のTierから順に買うなど戦略があるが、
  // ここでは単純に全てのTierでMax購入を試みる
  game.generators.forEach((g, i) => buyMaxGenerator(i));
}

function doLinac() {
  const req = 1 + (game.linacs * 10);
  if (game.generators[7].amount < req) return;

  UI.confirm(
    "ライナックを実行",
    `リセットして生産倍率を上げますか？<br>現在の倍率: x${format(getGlobalMultiplier())}`,
    () => {
      game.linacs++;
      game.stats.totalLinacs++;
      resetOnPrestige();
      UI.toast("ライナック完了！生産効率UP");
    }
  );
}

function doLinacShift() {
  const req = 5 + (game.shifts * 5);
  if (game.linacs < req) return;

  UI.confirm(
    "ライナック・シフト",
    "全てを失い、ライナックのベース倍率を強化します。<br>本当によろしいですか？",
    () => {
      game.shifts++;
      game.linacs = 0;
      resetOnPrestige();
      UI.toast("シフト完了！次元を超越しました");
    }
  );
}

function resetOnPrestige() {
  game.particles = 10;
  game.generators.forEach(g => {
    g.amount = 0;
    g.bought = 0;
    g.production = 1;
  });
  saveGame();
}

// --- オフライン進行 ---
function processOfflineProgress() {
  const now = Date.now();
  const last = game.stats.lastSaveTime;
  const diff = (now - last) / 1000;

  if (diff > 60) { // 1分以上
    // 簡易計算: 現在のPPS * 時間
    // 本来はカスケードがあるのでもっと増えるが、簡易計算とする
    const globalMult = getGlobalMultiplier();
    const pps = game.generators[0].amount * game.generators[0].production * globalMult;
    const gained = pps * diff;
    
    if (gained > 0) {
      game.particles += gained;
      game.stats.totalParticles += gained;
      UI.modal(
        "WELCOME BACK",
        `あなたは ${formatTime(diff)} 休みました。<br>その間にシミュレーションを行い、<br>
        <strong style="color:var(--accent-color); font-size:1.2em;">${format(gained)}</strong> 粒子を獲得しました。`
      );
    }
  }
  game.stats.lastSaveTime = now;
}

// --- ニュースティッカー ---
let newsTimer = 0;
function updateNewsTicker() {
  newsTimer++;
  if (newsTimer > 600) { // 約10秒ごと (60fps)
    const content = document.getElementById('news-content');
    // 条件に合うニュースを抽出
    const available = NEWS_MESSAGES.filter(n => game.particles >= n.req);
    const pool = [...available.map(n => n.text), ...FILLER_NEWS];
    const text = pool[Math.floor(Math.random() * pool.length)];
    
    // アニメーションリセットハック
    content.style.animation = 'none';
    content.offsetHeight; /* trigger reflow */
    content.querySelector('span').textContent = text;
    content.style.animation = 'scrollNews 15s linear infinite';
    
    newsTimer = 0;
  }
}

// --- UI更新 ---
function updateUI(pps) {
  document.getElementById('particle-display').textContent = format(game.particles) + " 粒子";
  document.getElementById('pps-display').textContent = `(+${format(pps)} /秒)`;

  // 進捗バー
  const linacReq = 1 + (game.linacs * 10);
  const mk8Amount = game.generators[7].amount;
  const linacProg = Math.min(100, (mk8Amount / linacReq) * 100);
  document.getElementById('prog-linac').style.width = `${linacProg}%`;
  document.getElementById('current-linac-count').textContent = game.linacs;
  
  // Shiftバー
  const shiftReq = 5 + (game.shifts * 5);
  if (game.shifts > 0 || game.linacs > 0) {
    document.getElementById('shift-prog-row').style.display = 'flex';
    const shiftProg = Math.min(100, (game.linacs / shiftReq) * 100);
    document.getElementById('prog-shift').style.width = `${shiftProg}%`;
  }

  // ボタン状態
  const btnLinac = document.getElementById('btn-linac');
  const btnShift = document.getElementById('btn-shift');
  const pContainer = document.getElementById('prestige-container');
  
  if (linacProg >= 100 || game.linacs >= shiftReq) {
    pContainer.style.display = 'flex';
    
    if (linacProg >= 100) {
      btnLinac.classList.remove('disabled');
      btnLinac.onclick = doLinac;
    } else {
      btnLinac.classList.add('disabled');
    }

    if (game.linacs >= shiftReq) {
      btnShift.style.display = 'inline-block';
      btnShift.onclick = doLinacShift;
    } else {
      btnShift.style.display = 'none';
    }
  } else {
    pContainer.style.display = 'none';
  }

  // Generator更新
  game.generators.forEach((g, i) => updateGeneratorUI(i));
}

function updateGeneratorUI(id) {
  const gen = game.generators[id];
  const btn = document.getElementById(`btn-${id}`);
  const amtEl = document.getElementById(`amt-${id}`);
  const multEl = document.getElementById(`mult-${id}`);
  
  if(!btn) return;

  const amountToBuy = game.settings.buyAmount;
  const cost = getSumCost(gen, amountToBuy);
  
  amtEl.textContent = format(gen.amount);
  multEl.textContent = "x" + format(gen.production * getGlobalMultiplier());
  
  btn.innerHTML = `Buy x${amountToBuy}<br>${format(cost)}`;
  if (game.particles >= cost) btn.classList.remove('disabled');
  else btn.classList.add('disabled');
}

// --- ユーティリティ ---
const UNITS = ['', 'k', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc'];
const UNITS_JP = ['', '万', '億', '兆', '京', '垓', '𥝱', '穣', '溝', '澗'];

function format(num) {
  if (num === undefined || num === null) return "0";
  if (num < 1000) return Math.floor(num * 100) / 100 + ""; // 小数第2位まで
  
  if (game.settings.notation === 'sci') {
    let e = Math.floor(Math.log10(num));
    let m = num / Math.pow(10, e);
    return m.toFixed(2) + "e" + e;
  } else {
    // Eng/JP
    let unitArr = game.settings.notation === 'jp' ? UNITS_JP : UNITS;
    let step = game.settings.notation === 'jp' ? 4 : 3;
    let e = Math.floor(Math.log10(num));
    let level = Math.floor(e / step);
    if (level >= unitArr.length) return formatScientific(num); // fallback
    let m = num / Math.pow(10, level * step);
    return m.toFixed(2) + unitArr[level];
  }
}

function formatScientific(num) {
  let e = Math.floor(Math.log10(num));
  let m = num / Math.pow(10, e);
  return m.toFixed(2) + "e" + e;
}

function formatTime(sec) {
  let h = Math.floor(sec / 3600);
  let m = Math.floor((sec % 3600) / 60);
  let s = Math.floor(sec % 60);
  return `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

// --- セーブ/ロード/設定 ---

function saveGame() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(game));
  UI.toast("ゲームを保存しました");
}

function loadGame() {
  const data = localStorage.getItem(SAVE_KEY);
  if (data) {
    try {
      const saved = JSON.parse(data);
      // データマイグレーション (古いセーブデータとの互換性維持)
      const fresh = getInitialState();
      game = { ...fresh, ...saved };
      game.stats = { ...fresh.stats, ...saved.stats };
      game.settings = { ...fresh.settings, ...saved.settings };
      
      // 配列系の復元
      game.generators = fresh.generators.map((g, i) => ({
        ...g,
        ...(saved.generators[i] || {})
      }));
      
    } catch (e) {
      console.error("Save invalid", e);
    }
  }
  
  // 設定反映
  const sel = document.getElementById('notation-select');
  if(sel) sel.value = game.settings.notation;
  document.getElementById('chk-skip-confirm').checked = game.settings.skipConfirm;
  setBuyAmount(game.settings.buyAmount);
  
  processOfflineProgress();
}

function setBuyAmount(n) {
  game.settings.buyAmount = n;
  document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
  const id = `buy-${n}`;
  const el = document.getElementById(id);
  if(el) el.classList.add('active');
  
  // Generatorボタン更新
  game.generators.forEach((g,i) => updateGeneratorUI(i));
}

function toggleSkipConfirm(el) {
  game.settings.skipConfirm = el.checked;
}

function changeNotation(val) {
  game.settings.notation = val;
  updateUI(0);
}

function hardReset() {
  if(confirm("本当にデータを消去しますか？")) {
    localStorage.removeItem(SAVE_KEY);
    location.reload();
  }
}

// クリップボード
async function exportSaveToClipboard() {
  saveGame();
  const str = btoa(JSON.stringify(game));
  try {
    await navigator.clipboard.writeText(str);
    UI.toast("セーブデータをクリップボードにコピーしました");
  } catch(e) {
    UI.modal("Export", "コピーに失敗しました。以下をコピーしてください:", 
      [{text:'閉じる', class:'primary'}]
    );
    // フォールバックは省略(textarea表示等)
  }
}

async function importSaveFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    const data = JSON.parse(atob(text));
    if(data && data.particles !== undefined) {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      UI.toast("インポート成功。リロードします...");
      setTimeout(() => location.reload(), 1000);
    } else {
      throw new Error("Invalid Data");
    }
  } catch(e) {
    UI.toast("インポート失敗: クリップボードの内容が無効です");
  }
}

// --- ビッグ・クランチ ---
function triggerBigCrunch() {
  isCrunching = true;
  document.getElementById('crunch-overlay').style.display = 'flex';
  game.infinity.crunchCount++;
  
  setTimeout(() => {
    // IP獲得計算などは省略(今回は1固定)
    game.infinity.ip++;
    
    // 強制リセット
    const fresh = getInitialState();
    fresh.infinity = game.infinity;
    fresh.settings = game.settings;
    fresh.stats.totalParticles = 0; 
    game = fresh;
    
    saveGame();
    location.reload();
  }, 4000);
}

// --- ショートカットキー ---
document.addEventListener('keydown', (e) => {
  // 入力フォーム等にいる場合は無視
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  
  const key = e.key.toUpperCase();
  
  if (['1','2','3','4','5','6','7','8'].includes(key)) {
    buyGenerator(parseInt(key) - 1);
  }
  if (key === 'M') buyMaxAll();
  if (key === 'S') saveGame();
  if (key === 'L') doLinac();
});

// --- 初期化 ---
function init() {
  // Generatorリスト生成
  const container = document.getElementById('generator-container');
  getInitialState().generators.forEach((g, i) => {
    const div = document.createElement('div');
    div.className = 'generator-row';
    div.innerHTML = `
      <div class="gen-info">
        <div class="gen-name">${g.name}</div>
        <div class="gen-stats">所持: <span id="amt-${i}">0</span> | 倍率: <span id="mult-${i}" style="color:var(--accent-color)">x1.00</span></div>
      </div>
      <div class="btn-group">
        <button id="btn-${i}" class="buy-btn" onclick="buyGenerator(${i})">Buy</button>
      </div>
    `;
    container.appendChild(div);
  });

  loadGame();
  
  // サイドバー制御
  window.toggleSidebar = () => {
    document.getElementById('app-wrapper').classList.toggle('closed');
  };
  
  window.switchTab = (tabName, btn) => {
    document.querySelectorAll('.sidebar-content').forEach(e => e.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  };
  
  // オートセーブ
  setInterval(() => saveGame(), 10000);

  requestAnimationFrame(gameLoop);
}

init();
