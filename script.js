// ゲームのデータなどは以前と同じ構造
function getInitialState() {
    return {
        particles: 10,
        totalParticles: 10,
        startTime: Date.now(),
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

// --- ユーティリティ関数 ---
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

// --- メインループ ---
function gameLoop() {
    const now = Date.now();
    let dt = (now - game.lastTick) / 1000;
    if (dt > 86400) dt = 0; // 長すぎるオフラインは一旦無視（簡易版）
    game.lastTick = now;

    // 生産計算
    const pps = game.generators[0].amount * game.generators[0].production;
    const produced = pps * dt;
    game.particles += produced;
    game.totalParticles += produced;

    // カスケード生産
    for (let i = 1; i < game.generators.length; i++) {
        const producer = game.generators[i];
        const target = game.generators[i - 1];
        target.amount += producer.amount * producer.production * dt;
    }

    updateUI(pps);
    updateStats();

    // オートセーブ
    if (now % 10000 < 20) saveGame(true);

    requestAnimationFrame(gameLoop);
}

// --- UI更新 ---
function updateUI(pps) {
    document.getElementById('particle-display').textContent = `${format(game.particles)} 粒子`;
    document.getElementById('pps-display').textContent = `(+${format(pps)} /秒)`;

    game.generators.forEach((gen, index) => {
        const btn = document.getElementById(`btn-${index}`);
        if (!btn) return;

        const cost = getCost(gen);
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

function updateStats() {
    // サイドバーが開いている時のみ計算して更新（負荷軽減）
    const sidebar = document.getElementById('sidebar');
    if (!sidebar.classList.contains('closed')) {
        const elapsedSeconds = (Date.now() - game.startTime) / 1000;
        document.getElementById('stat-time').textContent = formatTime(elapsedSeconds);
        document.getElementById('stat-total').textContent = format(game.totalParticles);
    }
}

// --- アクション ---
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

// --- サイドバー制御 (New!) ---
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const wrapper = document.querySelector('.app-wrapper');
    
    sidebar.classList.toggle('closed');
    
    // 開くボタンの表示制御用クラス
    if (sidebar.classList.contains('closed')) {
        wrapper.classList.add('sidebar-hidden');
    } else {
        wrapper.classList.remove('sidebar-hidden');
    }
}

function switchTab(tabName, btnElement) {
    // すべてのタブコンテンツを隠す
    const contents = document.querySelectorAll('.sidebar-content');
    contents.forEach(c => c.classList.remove('active'));

    // 対象のコンテンツを表示
    document.getElementById(`tab-${tabName}`).classList.add('active');

    // ボタンのスタイル更新
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(b => b.classList.remove('active'));
    btnElement.classList.add('active');
}

// --- セーブ・ロード ---
const SAVE_KEY = 'theParticleSave_v2';

function saveGame(isAuto = false) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(game));
    if (!isAuto) {
        const status = document.getElementById('save-status');
        status.textContent = "セーブ完了！";
        setTimeout(() => status.textContent = "オートセーブ有効", 2000);
    }
}

function loadGame() {
    const savedData = localStorage.getItem(SAVE_KEY);
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            game = { ...getInitialState(), ...parsed };
            if (parsed.generators) {
                game.generators = parsed.generators.map((gen, i) => ({
                    ...getInitialState().generators[i],
                    ...gen
                }));
            }
            game.lastTick = Date.now();
        } catch (e) { console.error(e); }
    }
}

function hardReset() {
    if (confirm("データを完全に消去しますか？")) {
        localStorage.removeItem(SAVE_KEY);
        location.reload();
    }
}

// 初期化
function init() {
    loadGame();
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
            <button id="btn-${index}" class="buy-btn" onclick="buyGenerator(${index})">購入</button>
        `;
        container.appendChild(row);
    });
    
    gameLoop();
}

init();
