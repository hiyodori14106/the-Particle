// ゲームの状態を管理するオブジェクト
const game = {
    particles: 10, // 初期通貨
    lastTick: Date.now(),
    // 加速器（Generator）の定義
    generators: [
        { id: 0, name: "加速器 Mk I",   baseCost: 10,    costMult: 1.5, amount: 0, bought: 0, production: 1 },
        { id: 1, name: "加速器 Mk II",  baseCost: 100,   costMult: 2.0, amount: 0, bought: 0, production: 1 },
        { id: 2, name: "加速器 Mk III", baseCost: 1000,  costMult: 3.0, amount: 0, bought: 0, production: 1 },
        { id: 3, name: "加速器 Mk IV",  baseCost: 10000, costMult: 5.0, amount: 0, bought: 0, production: 1 }
    ]
};

// 数値を整形する関数（例: 1200 -> 1.20e3）
function format(num) {
    if (num < 1000) return Math.floor(num); // 小数点以下切り捨て
    return num.toExponential(2).replace('+', '');
}

// 現在のコストを計算する関数
function getCost(gen) {
    return gen.baseCost * Math.pow(gen.costMult, gen.bought);
}

// ゲームループ（毎フレーム実行）
function gameLoop() {
    const now = Date.now();
    const dt = (now - game.lastTick) / 1000; // 秒単位の経過時間
    game.lastTick = now;

    // --- 生産ロジック ---
    // 上位の加速器が下位の加速器を生産し、Mk I が粒子を生産する
    
    // まず Mk I が粒子を生む
    const pps = game.generators[0].amount * game.generators[0].production;
    game.particles += pps * dt;

    // Mk II以降は一つ下のランクの加速器(amount)を増やす
    for (let i = 1; i < game.generators.length; i++) {
        const producer = game.generators[i];
        const target = game.generators[i - 1];
        
        // 生産量 = 所持数 * 倍率 * 時間
        target.amount += producer.amount * producer.production * dt;
    }

    updateUI(pps);
    requestAnimationFrame(gameLoop);
}

// 画面更新
function updateUI(pps) {
    document.getElementById('particle-display').textContent = `${format(game.particles)} 粒子`;
    document.getElementById('pps-display').textContent = `(+${format(pps)} /秒)`;

    game.generators.forEach((gen, index) => {
        const cost = getCost(gen);
        const btn = document.getElementById(`btn-${index}`);
        const amountTxt = document.getElementById(`amount-${index}`);
        const multTxt = document.getElementById(`mult-${index}`);
        
        // ボタンのラベル更新
        btn.innerHTML = `購入<br>コスト: ${format(cost)}`;
        
        // 所持数の更新
        amountTxt.textContent = `所持数: ${format(gen.amount)}`;
        
        // 購入可能かどうかの見た目制御
        if (game.particles >= cost) {
            btn.classList.remove('disabled');
        } else {
            btn.classList.add('disabled');
        }
    });
}

// 購入処理
function buyGenerator(index) {
    const gen = game.generators[index];
    const cost = getCost(gen);

    if (game.particles >= cost) {
        game.particles -= cost;
        gen.amount += 1;
        gen.bought += 1;
        
        // おまけ：購入するたびに少し生産倍率が上がる（Antimatter Dimensions的要素）
        gen.production *= 1.05; 
        
        // 倍率表示の更新
        document.getElementById(`mult-${index}`).textContent = `x${gen.production.toFixed(2)}`;
    }
}

// 初期化処理：HTML要素を生成
function init() {
    const container = document.getElementById('generator-container');

    game.generators.forEach((gen, index) => {
        const row = document.createElement('div');
        row.className = 'generator-row';
        row.innerHTML = `
            <div class="gen-info">
                <div class="gen-name">${gen.name}</div>
                <div class="gen-amount" id="amount-${index}">所持数: 0</div>
                <div class="gen-multiplier" id="mult-${index}">x1.00</div>
            </div>
            <button id="btn-${index}" class="buy-btn" onclick="buyGenerator(${index})">
                購入<br>コスト: ${gen.baseCost}
            </button>
        `;
        container.appendChild(row);
    });

    // ループ開始
    gameLoop();
}

// ゲーム起動
init();
