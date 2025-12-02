/**
 * the-Particle Complete Edition
 * - Cascade Production System (Mk.N -> Mk.N-1 -> Particle)
 * - Exponential Idle Simulation (Offline Progress)
 * - Prestige System
 * - Buy Max
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
            { id: 0, name: "Accelerator Mk.1", baseCost: 10,      costMult: 1.5,  amount: 0, bought: 0, production: 1 },
            { id: 1, name: "Accelerator Mk.2", baseCost: 100,     costMult: 1.8,  amount: 0, bought: 0, production: 1 },
            { id: 2, name: "Accelerator Mk.3", baseCost: 1e3,     costMult: 2.2,  amount: 0, bought: 0, production: 1 },
            { id: 3, name: "Accelerator Mk.4", baseCost: 1e4,     costMult: 3.0,  amount: 0, bought: 0, production: 1 },
            { id: 4, name: "Accelerator Mk.5", baseCost: 1e6,     costMult: 4.0,  amount: 0, bought: 0, production: 1 },
            { id: 5, name: "Accelerator Mk.6", baseCost: 1e8,     costMult: 6.0,  amount: 0, bought: 0, production: 1 },
            { id: 6, name: "Accelerator Mk.7", baseCost: 1e10,    costMult: 10.0, amount: 0, bought: 0, production: 1 },
            { id: 7, name: "Accelerator Mk.8", baseCost: 1e12,    costMult: 15.0, amount: 0, bought: 0, production: 1 }
        ]
    };
}

// グローバル変数
let game = getInitialState();
const SAVE_KEY = 'theParticleComplete_v1';

// --- ユーティリティ: 数値整形 ---
function format(num) {
    if (num < 1000) return Math.floor(num);
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
    return Math.pow(2, game.prestigeCount);
}

// --- ゲームループ (メイン処理) ---
function gameLoop() {
    const now = Date.now();
    let dt = (now - game.lastTick) / 1000;
    
    // スリープ復帰等の長時間経過はループ内では無視（1秒以上はカット）
    if (dt > 1) dt = 1; 
    
    game.lastTick = now;
    const globalMult = getGlobalMultiplier();

    // 1. 粒子の生産 (Mk.1 -> 粒子)
    const pps = game.generators[0].amount * game.generators[0].production * globalMult;
    const produced = pps * dt;
    game.particles += produced;
    game.totalParticles += produced;

    // 2. カスケード生産 (Mk.N -> Mk.N-1)
    // 上位の加速器が下位の加速器を生産する
    for (let i = 1; i < game.generators.length; i++) {
        const producer = game.generators[i];
        const target = game.generators[i - 1];
        target.amount += producer.amount * producer.production * globalMult * dt;
    }

    // UI更新
    updateUI(pps);
    
    // サイドバーが開いている時だけ統計更新
    const wrapper = document.getElementById('app-wrapper');
    if (!wrapper.classList.contains('closed')) {
        updateStats();
    }
    
    // オートセーブ (10秒ごと)
    if (now % 10000 < 20) saveGame(true);

    requestAnimationFrame(gameLoop);
}

// --- オフライン進行シミュレーション (Antimatter Dimensions Style) ---
function simulateOfflineProgress(seconds) {
    // バランス保護: 最大7日分まで
    if (seconds > 86400 * 7) seconds = 86400 * 7; 

    const initialParticles = game.particles;
    const totalTicks = 1000; // 時間を1000分割して計算
    const dt = seconds / totalTicks; 
    const globalMult = getGlobalMultiplier();

    // シミュレーションループ
    for (let t = 0; t < totalTicks; t++) {
        // 粒子生産
        const pps = game.generators[0].amount * game.generators[0].production * globalMult;
        game.particles += pps * dt;
        game.totalParticles += pps * dt;

        // カスケード生産
        for (let i = 1; i < game.generators.length; i++) {
            const producer = game.generators[i];
            const target = game.generators[i - 1];
            target.amount += producer.amount * producer.production * globalMult * dt;
        }
    }

    const gained = game.particles - initialParticles;

    if (gained > 0) {
        // 描画を待ってからアラート
        setTimeout(() => {
            alert(
                `=== 次元シミュレーション完了 ===\n\n` +
                `経過時間: ${formatTime(seconds)}\n` +
                `演算ステップ: ${totalTicks} ticks\n` +
                `獲得粒子: ${format(gained)}\n\n` +
                `あなたの宇宙は加速し続けていました。`
            );
        }, 100);
    }
}

// --- アクション: 購入関連 ---

// 1個購入
function buyGenerator(index) {
    const gen = game.generators[index];
    const cost = getCost(gen);
    if (game.particles >= cost) {
        game.particles -= cost;
        gen.amount += 1;
        gen.bought += 1;
        gen.production *= 1.1; // 購入ボーナス
        updateUI(0);
    }
}

// 最大購入 (Buy Max)
function buyMaxGenerator(index) {
    const gen = game.generators[index];
    let boughtCount = 0;

    // ループで購入し続ける (コストは指数関数的なので無限ループはしない)
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
    if (!confirm("次元リセットを実行しますか？\n\n・現在の粒子と加速器は全て失われます\n・全体の生産速度が「2倍」になります")) return;

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

    // プレステージバナー表示制御 (Mk.8所持時)
    const prestigeContainer = document.getElementById('prestige-container');
    if (game.generators[7].amount >= 1) {
        prestigeContainer.style.display = 'block';
        document.getElementById('current-mult-display').textContent = 
            `x${format(globalMult)} → x${format(globalMult * 2)}`;
    } else {
        prestigeContainer.style.display = 'none';
    }

    // ジェネレーターリスト更新
    game.generators.forEach((gen, index) => {
        const btn = document.getElementById(`btn-${index}`);
        const btnMax = document.getElementById(`btn-max-${index}`);
        
        if (!btn || !btnMax) return;
        
        const cost = getCost(gen);
        const totalMult = gen.production * globalMult;

        document.getElementById(`amount-${index}`).textContent = `所持: ${format(gen.amount)}`;
        document.getElementById(`mult-${index}`).textContent = `x${format(totalMult)}`;
        
        // ボタン表示更新
        btn.innerHTML = `1個: ${format(cost)}`;
        
        // 購入可否判定
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
            // 前回保存時刻を取得 (ない場合は現在時刻)
            const savedLastTick = parsed.lastTick || Date.now();

            // データ結合
            game = { ...fresh, ...parsed };
            if (parsed.generators) {
                game.generators = parsed.generators.map((g, i) => ({ ...fresh.generators[i], ...g }));
            }
            if (game.prestigeCount === undefined) game.prestigeCount = 0;

            // オフライン計算の実行
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
    // セーブデータロード
    loadGame();
    
    // UI生成
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

    // ゲームループ開始
    gameLoop();
}

// スタート
init();
