// --- ゲームの初期状態 ---
function getInitialState() {
    return {
        particles: 10,
        totalParticles: 10,
        prestigeCount: 0, // リセット回数
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
let game = getInitialState();

// --- 計算ロジック ---
function format(num) {
    if (num < 1000) return Math.floor(num);
    let exponent = Math.floor(Math.log10(num));
    let mantissa = num / Math.pow(10, exponent);
    return mantissa.toFixed(2) + "e" + exponent;
}

function formatTime(seconds) {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

function getCost(gen) {
    return gen.baseCost * Math.pow(gen.costMult, gen.bought);
}

// 全体倍率（リセット回数に応じた 2^n 倍）
function getGlobalMultiplier() {
    return Math.pow(2, game.prestigeCount);
}

// --- ゲームループ ---
function gameLoop() {
    const now = Date.now();
    let dt = (now - game.lastTick) / 1000;
    if (dt > 86400) dt = 0;
    game.lastTick = now;

    const globalMult = getGlobalMultiplier();

    // 生産: Mk.1 * 倍率
    const pps = game.generators[0].amount * game.generators[0].production * globalMult;
    const produced = pps * dt;
    game.particles += produced;
    game.totalParticles += produced;

    // カスケード生産: Mk.N -> Mk.N-1 (これにも倍率がかかる)
    for (let i = 1; i < game.generators.length; i++) {
        const producer = game.generators[i];
        const target = game.generators[i - 1];
        target.amount += producer.amount * producer.production * globalMult * dt;
    }

    updateUI(pps);
    
    const wrapper = document.getElementById('app-wrapper');
    if (!wrapper.classList.contains('closed')) {
        updateStats();
    }
    
    // オートセーブ
    if (now % 10000 < 20) saveGame(true);

    requestAnimationFrame(gameLoop);
}

// --- UI更新 ---
function updateUI(pps) {
    document.getElementById('particle-display').textContent = `${format(game.particles)} 粒子`;
    document.getElementById('pps-display').textContent = `(+${format(pps)} /秒)`;

    const globalMult = getGlobalMultiplier();

    // リセットボタンの制御 (Mk.8を持っているか？)
    const prestigeContainer = document.getElementById('prestige-container');
    if (game.generators[7].amount >= 1) {
        prestigeContainer.style.display = 'block';
        document.getElementById('current-mult-display').textContent = 
            `現在の倍率: x${format(globalMult)} → 次回: x${format(globalMult * 2)}`;
    } else {
        prestigeContainer.style.display = 'none';
    }

    game.generators.forEach((gen, index) => {
        const btn = document.getElementById(`btn-${index}`);
        if (!btn) return;
        
        const cost = getCost(gen);
        const totalMult = gen.production * globalMult;

        document.getElementById(`amount-${index}`).textContent = `所持数: ${format(gen.amount)}`;
        document.getElementById(`mult-${index}`).textContent = `x${format(totalMult)}`;
        
        btn.innerHTML = `購入<br>コスト: ${format(cost)}`;
        
        if (game.particles >= cost) {
            btn.classList.remove('disabled');
        } else {
            btn.classList.add('disabled');
        }
    });
}

function updateStats() {
    const elapsed = (Date.now() - game.startTime) / 1000;
    document.getElementById('stat-time').textContent = formatTime(elapsed);
    document.getElementById('stat-total').textContent = format(game.totalParticles);
    document.getElementById('stat-prestige').textContent = `${game.prestigeCount} 回`;
}

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

// --- プレステージ処理 ---
function doPrestige() {
    if (!confirm("次元リセットを実行しますか？\n(現在の生産物は消えますが、速度が2倍になります)")) return;

    game.prestigeCount++;
    
    // 状態をリセット（回数などは維持）
    const freshState = getInitialState();
    game.particles = freshState.particles;
    game.generators = freshState.generators;
    
    saveGame();
    updateUI(0);
}

// --- サイドバー・タブ ---
function toggleSidebar() {
    document.getElementById('app-wrapper').classList.toggle('closed');
}

function switchTab(tabName, btn) {
    document.querySelectorAll('.sidebar-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

// --- セーブシステム ---
const SAVE_KEY = 'theParticleSave_v4';

function saveGame(isAuto = false) {
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
            // デフォルト値とマージ
            const fresh = getInitialState();
            game = { ...fresh, ...parsed };
            
            // ジェネレーターのマージ
            if (parsed.generators) {
                game.generators = parsed.generators.map((g, i) => ({ ...fresh.generators[i], ...g }));
            }
            // 新機能用のデータ補完
            if (game.prestigeCount === undefined) game.prestigeCount = 0;

            game.lastTick = Date.now();
        } catch(e) { console.error(e); }
    }
}

function hardReset() {
    if(confirm("本当にデータを初期化しますか？")) {
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
            <button id="btn-${index}" class="buy-btn" onclick="buyGenerator(${index})">購入</button>
        `;
        container.appendChild(row);
    });
    gameLoop();
}

init();





Evaluate

Compare
