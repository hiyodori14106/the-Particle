/**
 * the-Particle v3.1.0 - Quantum Loop Update
 * - Improved Math for Buy Max
 * - Japanese News Ticker
 * - Toast/Modal System
 */

const SAVE_KEY = 'theParticle_v3_1';
const INFINITY_LIMIT = 1.79e308;

// --- 日本語ニュースティッカー (条件付き表示) ---
// req: 到達粒子数
const NEWS_MESSAGES = [
  { req: 0, text: "システム起動... 粒子生成プロセス、スタンバイ。" },
  { req: 50, text: "最初の粒子が観測されました。ちっぽけですが、偉大な一歩です。" },
  { req: 500, text: "近所の猫が静電気でフワフワになっています。" },
  { req: 1e3, text: "研究員が「粒子が見える」と言い始めました。休暇が必要です。" },
  { req: 1e4, text: "あなたのPCのファンが悲鳴を上げています。" },
  { req: 1e5, text: "「粒子ダイエット」がSNSでトレンド入り。" },
  { req: 1e6, text: "物理学会から「やりすぎ」という警告メールが届きました。" },
  { req: 1e7, text: "誰かが加速器の上でカップ麺を作っています。" },
  { req: 1e9, text: "粒子の重みでサーバー室の床が少し凹みました。" },
  { req: 1e11, text: "政府が新しい税金「粒子税」の導入を検討中。" },
  { req: 1e14, text: "異次元からのノック音が聞こえます。「静かにして」とのことです。" },
  { req: 1e17, text: "近隣住民が「空間が歪んでいる気がする」と通報しました。" },
  { req: 1e20, text: "粒子が自我を持ち始めた可能性があります。" },
  { req: 1e25, text: "銀河系の一角がデータ過多で処理落ちしています。" },
  { req: 1e30, text: "神様がサーバーの再起動を検討しています。" },
  { req: 1e50, text: "現実のテクスチャ解像度が低下しています。" },
  { req: 1e100, text: "エラー：宇宙のメモリ領域が不足しています。" }
];
// 汎用ニュース
const FILLER_NEWS = [
  "今日の天気は晴れ、時々粒子嵐。",
  "加速器の作動音は「ブーン」ではなく「ズズズ...」です。",
  "研究室のコーヒーメーカーが粒子加速器に改造されました。",
  "未確認粒子物体(UPO)が目撃されました。",
  "「もっと粒子を！」と誰かが叫んでいます。",
  "時空連続体に軽微な亀裂を発見。テープで補修しました。"
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
      lastSaveTime: Date.now(),
    },
    
    infinity: {
      ip: 0,
      crunchCount: 0,
    },

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
    el.innerHTML = msg;
    container.appendChild(el);
    // アニメーション終了後に削除
    setTimeout(() => { if(el.parentNode) el.parentNode.removeChild(el); }, 4000);
  },
  
  modal: (title, body, actions = []) => {
    const overlay = document.getElementById('custom-modal-overlay');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = body;
    const actContainer = document.getElementById('modal-actions');
    actContainer.innerHTML = '';
    
    if(actions.length === 0) {
      actions.push({ text: '閉じる', class: 'primary', onClick: null });
    }

    actions.forEach(act => {
      const btn = document.createElement('button');
      btn.className = `ui-btn ${act.class || 'secondary'}`;
      btn.textContent = act.text;
      btn.style.width = 'auto'; 
      btn.style.padding = '8px 20px';
      btn.onclick = () => {
        if(act.onClick) act.onClick();
        UI.closeModal();
      };
      actContainer.appendChild(btn);
    });
    
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
      { text: '実行する', class: 'danger', onClick: onConfirm }
    ]);
  }
};

// --- 数学ロジック (Buy Max対応) ---

// n個目のコスト: base * r^n
function getCost(gen, n) {
  return gen.baseCost * Math.pow(gen.costMult, n);
}

// 現在のbought数からk個買う総コスト: Sum = currentCost * (r^k - 1) / (r - 1)
function getSumCost(gen, k) {
  const r = gen.costMult;
  const currentCost = gen.baseCost * Math.pow(r, gen.bought);
  if (r === 1) return currentCost * k;
  return currentCost * (Math.pow(r, k) - 1) / (r - 1);
}

// 予算budgetで買える最大個数を計算 (対数計算)
function calcMaxAffordable(gen, budget) {
  const r = gen.costMult;
  const currentCost = gen.baseCost * Math.pow(r, gen.bought);
  
  if (budget < currentCost) return 0;
  if (r === 1) return Math.floor(budget / currentCost);

  // budget >= currentCost * (r^k - 1) / (r - 1)
  // (budget * (r-1) / currentCost) + 1 >= r^k
  // k <= log_r( ... )
  const val = (budget * (r - 1)) / currentCost + 1;
  const k = Math.floor(Math.log(val) / Math.log(r));
  return k > 0 ? k : 0;
}

// グローバル倍率
function getGlobalMultiplier() {
  const base = 1.2 + ((game.shifts || 0) * 0.2);
  return Math.pow(base, game.linacs || 0);
}

// --- ゲームループ ---
function gameLoop() {
  if (isCrunching) return;

  const now = Date.now();
  let dt = (now - game.stats.lastSaveTime) / 1000;
  if (dt < 0) dt = 0;
  // saveTimeを更新するが、実際のオフライン計算用とは別にフレームデルタとして処理
  // ここでは簡易的に前フレームからの差分として扱うため、lastTickが必要だが
  // 簡略化のため lastSaveTime を tick としても使う（頻繁な書き込みはしない）
  game.stats.lastSaveTime = now;
  
  // ビッグクランチ
  if (game.particles >= INFINITY_LIMIT) {
    triggerBigCrunch();
    return;
  }

  // グリッチエフェクト更新
  updateGlitchEffect();

  const globalMult = getGlobalMultiplier();
  
  // 生産処理 (簡易モデル: Tier 1は粒子を、Tier NはTier N-1を生産)
  // バランス調整のため、全Tierが粒子を生みつつ、上位は下位もブーストする形式ではなく
  // 古典的な「Tier 1のみが粒子生産」モデルまたは「全Tierが粒子生産」モデルを選択
  // ここでは「全Tierが粒子を生産する」シンプルな形式にします（爽快感重視）
  
  let pps = 0;
  // 上位による下位へのブースト係数などを入れると面白いが、今回はシンプルに
  // 各Generatorが固有の生産力を持ち、GlobalMultがかかる
  
  // カスケード生産（Antimatter Dimensions風）
  // Tier 8 -> Tier 7 ... -> Tier 1 -> Particles
  // dtが長い場合(ラグ)の補正は簡易的
  
  // まず粒子生産 (Tier 1)
  const g0 = game.generators[0];
  const tier1Prod = g0.amount * g0.production * globalMult;
  pps = tier1Prod;
  game.particles += pps * dt;
  game.stats.totalParticles += pps * dt;

  // 次にジェネレーター生産 (Tier N -> Tier N-1)
  for (let i = 1; i < game.generators.length; i++) {
    const producer = game.generators[i];
    const target = game.generators[i - 1];
    const production = producer.amount * producer.production * globalMult;
    // 下位ジェネレーターを増やす
    target.amount += production * dt;
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
    gen.production *= Math.pow(1.1, amount); // 購入ごとに生産力1.1倍
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
  // 上位から順に買う方が効率的かもしれないが、ここではID順
  // Max Allは通常「全ての所持金を使って」最適化するが、
  // 簡易的に各TierでMax計算をして、買えるなら買う（残金で次を買う）
  for (let i = game.generators.length - 1; i >= 0; i--) {
    buyMaxGenerator(i);
  }
}

function doLinac() {
  const req = 1 + (game.linacs * 10);
  if (game.generators[7].amount < req) return;

  UI.confirm(
    "ライナックを実行 (L)",
    `現在の粒子と加速器を全てリセットし、生産倍率を強化します。<br>
     次の倍率: <strong style="color:var(--accent-color)">x${format(Math.pow(1.2 + (game.shifts*0.2), game.linacs + 1))}</strong>`,
    () => {
      game.linacs++;
      game.stats.totalLinacs++;
      resetOnPrestige();
      UI.toast("ライナック完了！ 宇宙が再構成されました。");
    }
  );
}

function doLinacShift() {
  const req = 5 + (game.shifts * 5);
  if (game.linacs < req) return;

  UI.confirm(
    "ライナック・シフト (Shift+L)",
    `<span style="color:var(--shift-color)">警告：次元超越を行います。</span><br>
     ライナック回数も0に戻りますが、ベース倍率が恒久的に増加します。<br>
     実行しますか？`,
    () => {
      game.shifts++;
      game.linacs = 0;
      resetOnPrestige();
      UI.toast("シフト完了！ 新たな物理法則が適用されました。");
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

// --- UI更新 ---
function updateUI(pps) {
  document.getElementById('particle-display').textContent = format(game.particles) + " 粒子";
  document.getElementById('pps-display').textContent = `(+${format(pps)} /秒)`;

  // 進捗バー更新
  const linacReq = 1 + (game.linacs * 10);
  const mk8 = game.generators[7].amount;
  const linacPct = Math.min(100, (mk8 / linacReq) * 100);
  
  document.getElementById('prog-linac').style.width = `${linacPct}%`;
  document.getElementById('prog-linac-text').textContent = `${linacPct.toFixed(0)}%`;
  document.getElementById('current-linac-count').textContent = game.linacs;

  // シフト進捗
  const shiftReq = 5 + (game.shifts * 5);
  if (game.shifts > 0 || game.linacs > 0) {
    document.getElementById('shift-prog-row').style.display = 'flex';
    const shiftPct = Math.min(100, (game.linacs / shiftReq) * 100);
    document.getElementById('prog-shift').style.width = `${shiftPct}%`;
    document.getElementById('prog-shift-text').textContent = `${shiftPct.toFixed(0)}%`;
  }
  
  // シフトバー表示
  if (game.shifts > 0) {
      document.getElementById('shift-status').style.display = 'block';
      const base = 1.2 + (game.shifts * 0.2);
      document.getElementById('shift-mult-display').textContent = `x${format(base)}`;
      document.getElementById('shift-count').textContent = game.shifts;
  }

  // Prestigeバナー制御
  const pContainer = document.getElementById('prestige-container');
  const btnLinac = document.getElementById('btn-linac');
  const btnShift = document.getElementById('btn-shift');
  
  // 表示条件: ライナック可能 or シフト可能 or ある程度進んでいる
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
        btnLinac.querySelector('strong').textContent = `あとMk.8が ${format(linacReq - mk8)}個`;
    }

    if (game.linacs >= shiftReq) {
        btnShift.style.display = 'inline-block';
    } else {
        btnShift.style.display = 'none';
    }
  } else {
    pContainer.style.display = 'none';
  }

  // ジェネレーターUI
  game.generators.forEach((g, i) => updateGeneratorUI(i));
}

function updateGeneratorUI(id) {
  const gen = game.generators[id];
  const amtEl = document.getElementById(`amt-${id}`);
  if(!amtEl) return; // まだ生成されていない場合

  amtEl.textContent = format(gen.amount);
  document.getElementById(`mult-${id}`).textContent = "x" + format(gen.production * getGlobalMultiplier());
  
  const btn = document.getElementById(`btn-${id}`);
  const amountToBuy = game.settings.buyAmount;
  const cost = getSumCost(gen, amountToBuy);
  
  btn.innerHTML = `Buy x${amountToBuy}<br><span style="font-size:0.8em">${format(cost)}</span>`;
  
  if (game.particles >= cost) btn.classList.remove('disabled');
  else btn.classList.add('disabled');
}

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

// --- ニュースティッカー ---
let newsTimer = 0;
function updateNewsTicker() {
  newsTimer++;
  if (newsTimer > 600) { // 約10秒
    const content = document.getElementById('news-content');
    // 条件に合うニュースを抽出
    const available = NEWS_MESSAGES.filter(n => game.particles >= n.req);
    // 最近のものほど優先度高く選ぶなどのロジックも可能だが、ここではランダム
    let pool = [];
    // 直近の達成項目を優先的に
    if (available.length > 0) pool.push(available[available.length - 1].text);
    pool = pool.concat(FILLER_NEWS);
    
    const text = pool[Math.floor(Math.random() * pool.length)];
    
    // アニメーションリセット
    const newEl = content.cloneNode(true);
    newEl.textContent = text;
    content.parentNode.replaceChild(newEl, content);
    
    newsTimer = 0;
  }
}

// --- オフライン進行 ---
function processOfflineProgress() {
  const now = Date.now();
  const last = game.stats.lastSaveTime;
  const diff = (now - last) / 1000;
  
  if (diff > 60) { // 1分以上
    const globalMult = getGlobalMultiplier();
    // 簡易計算: 実際のカスケードをシミュレートするのは重いので、Tier 1の生産力 * 時間とする
    const pps = game.generators[0].amount * game.generators[0].production * globalMult;
    const gained = pps * diff;
    
    if (gained > 0) {
      game.particles += gained;
      game.stats.totalParticles += gained;
      UI.modal(
        "WELCOME BACK",
        `あなたは <strong style="color:#fff">${formatTime(diff)}</strong> 間、宇宙を離れていました。<br>
         その間にシミュレーションを行い、<br>
         <h2 style="color:var(--accent-color); text-align:center; margin:10px 0;">+${format(gained)} 粒子</h2>
         を獲得しました。`
      );
    }
  }
  // 時間更新
  game.stats.lastSaveTime = now;
}

// --- ユーティリティ ---
const UNITS_ENG = ['', 'k', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc'];
const UNITS_JP = ['', '万', '億', '兆', '京', '垓', '𥝱', '穣', '溝', '澗'];

function format(num) {
  if (num === undefined || num === null) return "0";
  if (num < 1000) return Math.floor(num * 100) / 100 + "";
  
  if (game.settings.notation === 'sci') {
    return formatScientific(num);
  } else {
    let unitArr = game.settings.notation === 'jp' ? UNITS_JP : UNITS_ENG;
    let step = game.settings.notation === 'jp' ? 4 : 3;
    let e = Math.floor(Math.log10(num));
    let level = Math.floor(e / step);
    if (level >= unitArr.length) return formatScientific(num);
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

// --- セーブ・ロード ---
function saveGame() {
  if(isCrunching) return;
  game.stats.lastSaveTime = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(game));
  
  // ボタンからの呼び出し時のみトースト
  const btn = document.activeElement;
  if(btn && btn.tagName === "BUTTON") {
     UI.toast("セーブ完了");
  }
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
      game.generators = fresh.generators.map((g, i) => ({ ...g, ...(saved.generators[i] || {}) }));
    } catch(e) { console.error(e); }
  }
  
  // UI反映
  setBuyAmount(game.settings.buyAmount);
  document.getElementById('chk-skip-confirm').checked = game.settings.skipConfirm;
  const sel = document.getElementById('notation-select');
  if(sel) sel.value = game.settings.notation;

  processOfflineProgress();
}

function setBuyAmount(n) {
  game.settings.buyAmount = n;
  document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`buy-${n}`).classList.add('active');
  game.generators.forEach((g,i)=>updateGeneratorUI(i));
}

function toggleSkipConfirm(el) {
  game.settings.skipConfirm = el.checked;
}
function changeNotation(val) {
  game.settings.notation = val;
  updateUI(0);
}
function hardReset() {
  if(confirm("【警告】全てのデータを削除しますか？復元できません。")) {
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
    UI.toast("セーブデータをコピーしました");
  } catch(e) {
    UI.modal("Export Error", "コピーできませんでした。<br>HTTPS環境でない可能性があります。");
  }
}
async function importSaveFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    const data = JSON.parse(atob(text));
    if (data && data.particles !== undefined) {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      UI.toast("インポート成功。リロードします...");
      setTimeout(()=>location.reload(), 1000);
    } else {
      throw new Error();
    }
  } catch(e) {
    UI.toast("インポート失敗: データが無効です");
  }
}

// ビッグクランチ
function triggerBigCrunch() {
  isCrunching = true;
  document.getElementById('crunch-overlay').style.display = 'flex';
  setTimeout(() => {
    // リセット
    localStorage.removeItem(SAVE_KEY); // 実際はInfinityデータ引き継ぎだが簡略化
    // 本来はここで Prestige ポイント(IP)を加算して強くてニューゲーム
    // 今回は演出のみでハードリセットに近い挙動
    const fresh = getInitialState();
    fresh.infinity.crunchCount = (game.infinity.crunchCount || 0) + 1;
    game = fresh;
    saveGame();
    location.reload();
  }, 4000);
}

// --- ショートカットキー ---
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  const k = e.key.toUpperCase();
  if (['1','2','3','4','5','6','7','8'].includes(k)) buyGenerator(parseInt(k)-1);
  if (k === 'M') buyMaxAll();
  if (k === 'S') saveGame();
  if (k === 'L') doLinac();
});

// --- 初期化 ---
function init() {
  const container = document.getElementById('generator-container');
  getInitialState().generators.forEach((g, i) => {
    const div = document.createElement('div');
    div.className = 'generator-row';
    div.innerHTML = `
      <div class="gen-info">
        <div class="gen-name">${g.name}</div>
        <div class="gen-stats">所持: <span id="amt-${i}">0</span> | 倍率: <span id="mult-${i}" style="color:var(--accent-color)">x1.00</span></div>
      </div>
      <button id="btn-${i}" class="buy-btn" onclick="buyGenerator(${i})">Buy</button>
    `;
    container.appendChild(div);
  });

  window.toggleSidebar = () => document.getElementById('app-wrapper').classList.toggle('closed');
  window.switchTab = (name, btn) => {
    document.querySelectorAll('.sidebar-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`tab-${name}`).classList.add('active');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  };

  loadGame();
  setInterval(() => saveGame(), 10000); // オートセーブ
  requestAnimationFrame(gameLoop);
}

init();
