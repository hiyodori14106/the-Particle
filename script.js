// ゲームの初期状態定義（リセット時にも使うため関数化）
function getInitialState() {
    return {
        particles: 10,
        totalParticles: 10, // 統計：累計生産量
        startTime: Date.now(), // 統計：開始時刻
        lastTick: Date.now(),
        generators: [
            { id: 0, name: "加速器 Mk I",    baseCost: 10,      costMult: 1.5,  amount: 0, bought: 0, production: 1 },
            { id: 1, name: "加速器 Mk II",   baseCost: 100,     costMult: 1.8,  amount: 0, bought: 0, production: 1 },
            { id: 2, name: "加速器 Mk III",  baseCost: 1e3,     costMult: 2.2,  amount: 0, bought: 0, production: 1 },
            { id: 3, name: "加速器 Mk IV",   baseCost: 1e4,     costMult: 3.0,  amount: 0, bought: 0, production: 1 },
            { id: 4, name: "加速器 Mk V",    baseCost: 1e6,     costMult: 4.0,  amount: 0, bought: 0, production: 1 },
            { id: 5, name: "加速器 Mk VI",   baseCost: 1e8,     costMult: 6.0,  amount: 0, bought: 0, production: 1 },
            { id: 6, name: "加速器 Mk VII",  baseCost: 1e10,    costMult: 10.0, amount: 0, bought: 0, production: 1 },
            { id: 7, name: "加速器 Mk VIII", baseCost: 1e12,    costMult: 15.0, amount: 0, bought: 0, production: 1 }
        ]
    };
}

let game = getInitialState();

// 数値整形
function format(num) {
    if (num < 1000) return Math.floor(num);
    let exponent = Math.floor(Math.log10(num));
    let mantissa = num / Math.pow(10, exponent);
    return mantissa.toFixed(2) + "e" + exponent;
}

// 時間整形 (秒 -> HH:MM:SS)
function formatTime(seconds) {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

function getCost(gen) {
    return gen.baseCost * Math.pow(gen.costMult, gen.bought);
}

// メインループ
function gameLoop() {
    const now = Date.now();
    const dt = (now - game.lastTick) / 1000;
    
    // タブが非アクティブだった時などの巨大な時間を防ぐ（最大24時間分まで一度に計算）
    // ※本来はもっと複雑な計算が必要ですが、簡易的に
    if (dt > 86400) {
        game.lastTick = now; // スキップ
        requestAnimationFrame(gameLoop);
        return;
    }
    
    game.lastTick = now;

    // 1. 生産処理
    const pps = game.generators[0].amount * game.generators[0].production;
    const produced = pps * dt;
    
    game.particles += produced;
    game.totalParticles += produced; // 統計用に加算

    // 2. 連鎖生産 (Mk 2 -> Mk 1...)
    for (let i = 1; i < game.generators.length; i++) {
        const producer = game.generators[i];
        const target = game.generators[i - 1];
        target.amount += producer.amount * producer.production * dt;
    }

    updateUI(pps);
    updateStats(); // 統計更新

    // オートセーブ (10秒に1回判定)
    if (now % 10000 < 20) {
        saveGame(true); // true = サイレントセーブ
    }

    requestAnimationFrame(gameLoop);
}

function updateUI(pps) {
    document.getElementById('particle-display').textContent = `${format(game.particles)} 粒子`;
    document.getElementById('pps-display').textContent = `(+${format(pps)} /秒)`;

    game.generators.forEach((gen, index) => {
        const cost = getCost(gen);
        const btn = document.getElementById(`btn-${index}`);
        
        // 要素が存在しない場合のエラー回避（初期化前など）
        if (!btn) return;

        document.getElementById(`amount-${index}`).textContent = `所持数: ${format(gen.amount)}`;
        document.getElementById(`mult-${index}`).textContent = `x${format(gen.production)}`;
        btn.innerHTML = `購入<br>コスト: ${format(cost)}`;
        
        if (game.particles >= cost) {
            btn.classList.remove('disabled');
        } else {
            btn.classList.add('disabled');
        }
    });
}

// サイドバーの統計更新
function updateStats() {
    const elapsedSeconds = (Date.now() - game.startTime) / 1000;
    document.getElementById('stat-time').textContent = formatTime(elapsedSeconds);
    document.getElementById('stat-total').textContent = format(game.totalParticles);
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

// --- セーブ＆ロード機能 ---

const SAVE_KEY = 'theParticleSave_v1';

function saveGame(isAuto = false) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(game));
    if (!isAuto) {
        const status = document.getElementById('save-status');
        status.textContent = "セーブしました！";
        setTimeout(() => status.textContent = "オートセーブ有効", 2000);
    }
}

function loadGame() {
    const savedData = localStorage.getItem(SAVE_KEY);
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            // 保存データと現在の構造をマージ（バージョンアップ対策）
            // 実際はもっと丁寧にやる必要がありますが、簡易的に上書き
            game = { ...getInitialState(), ...parsed };
            
            // 配列の中身もマージが必要（ジェネレーターなど）
            if (parsed.generators) {
                game.generators = parsed.generators.map((gen, i) => ({
                    ...getInitialState().generators[i],
                    ...gen
                }));
            }
            
            game.lastTick = Date.now(); // ロード直後のタイムスキップ防止
            console.log("Game Loaded");
        } catch (e) {
            console.error("Save file corrupted", e);
        }
    }
}

function hardReset() {
    if (confirm("本当にデータを全て消去しますか？（この操作は取り消せません）")) {
        localStorage.removeItem(SAVE_KEY);
        location.reload();
    }
}

// 初期化
function init() {
    loadGame(); // 起動時にロード

    const container = document.getElementById('generator-container');
    container.innerHTML = ''; 

    game.generators.forEach((gen, index) => {
        const row = document.createElement('div');
        row.className = 'generator-row';
        row.classList.add(index % 2 === 0 ? 'row-even' : 'row-odd');
        
        row.innerHTML = `
            <div class="gen-info">
                <div class="gen-name">${gen.name}</div>
                <div class="gen-amount" id="amount-${index}">所持数: 0</div>
                <div class="gen-multiplier" id="mult-${index}">x1.00</div>
            </div>
            <button id="btn-${index}" class="buy-btn" onclick="buyGenerator(${index})">
                購入
            </button>
        `;
        container.appendChild(row);
    });

    gameLoop();
}

init();
