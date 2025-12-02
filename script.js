// ゲームの状態管理
const game = {
    particles: 10,
    lastTick: Date.now(),
    // 加速器を8個に拡張
    generators: [
        // id: 階層, name: 名前, baseCost: 初期コスト, costMult: コスト増加倍率, amount: 所持数, bought: 購入回数, production: 基礎生産倍率
        { id: 0, name: "加速器 Mk I",    baseCost: 10,      costMult: 1.5,  amount: 0, bought: 0, production: 1 },
        { id: 1, name: "加速器 Mk II",   baseCost: 100,     costMult: 1.8,  amount: 0, bought: 0, production: 1 },
        { id: 2, name: "加速器 Mk III",  baseCost: 1e3,     costMult: 2.2,  amount: 0, bought: 0, production: 1 }, // 1,000
        { id: 3, name: "加速器 Mk IV",   baseCost: 1e4,     costMult: 3.0,  amount: 0, bought: 0, production: 1 }, // 10,000
        { id: 4, name: "加速器 Mk V",    baseCost: 1e6,     costMult: 4.0,  amount: 0, bought: 0, production: 1 }, // 1,000,000
        { id: 5, name: "加速器 Mk VI",   baseCost: 1e8,     costMult: 6.0,  amount: 0, bought: 0, production: 1 }, // 1億
        { id: 6, name: "加速器 Mk VII",  baseCost: 1e10,    costMult: 10.0, amount: 0, bought: 0, production: 1 }, // 100億
        { id: 7, name: "加速器 Mk VIII", baseCost: 1e12,    costMult: 15.0, amount: 0, bought: 0, production: 1 }  // 1兆
    ]
};

// 数値整形（指数表記を見やすく）
function format(num) {
    if (num < 1000) return Math.floor(num);
    // 指数部が大きすぎるときのための整形
    let exponent = Math.floor(Math.log10(num));
    let mantissa = num / Math.pow(10, exponent);
    return mantissa.toFixed(2) + "e" + exponent;
}

// コスト計算
function getCost(gen) {
    return gen.baseCost * Math.pow(gen.costMult, gen.bought);
}

// ゲームループ
function gameLoop() {
    const now = Date.now();
    const dt = (now - game.lastTick) / 1000; 
    game.lastTick = now;

    // --- 生産ロジック ---
    
    // 1. 最下層(Mk I)が粒子を生む
    const pps = game.generators[0].amount * game.generators[0].production;
    game.particles += pps * dt;

    // 2. 上位層が下位層を生む (Mk VIII -> Mk VII ... -> Mk I)
    // i=1(Mk II) から i=7(Mk VIII) までループ
    for (let i = 1; i < game.generators.length; i++) {
        const producer = game.generators[i];     // 生産する側 (例: Mk VIII)
        const target = game.generators[i - 1];   // 生産される側 (例: Mk VII)
        
        target.amount += producer.amount * producer.production * dt;
    }

    updateUI(pps);
    requestAnimationFrame(gameLoop);
}

// UI更新
function updateUI(pps) {
    document.getElementById('particle-display').textContent = `${format(game.particles)} 粒子`;
    document.getElementById('pps-display').textContent = `(+${format(pps)} /秒)`;

    game.generators.forEach((gen, index) => {
        const cost = getCost(gen);
        const btn = document.getElementById(`btn-${index}`);
        const amountTxt = document.getElementById(`amount-${index}`);
        const multTxt = document.getElementById(`mult-${index}`);
        
        btn.innerHTML = `購入<br>コスト: ${format(cost)}`;
        amountTxt.textContent = `所持数: ${format(gen.amount)}`;
        multTxt.textContent = `x${format(gen.production)}`; // 倍率も見やすく整形
        
        // 購入可能判定
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
        // 購入ごとに生産倍率アップ (Antimatter Dimensions仕様)
        gen.production *= 1.1; // 1.05だと8層では辛いので1.1倍に強化
        updateUI(0); // 即座に反映
    }
}

// 初期化
function init() {
    const container = document.getElementById('generator-container');
    container.innerHTML = ''; // リロード時の重複防止

    game.generators.forEach((gen, index) => {
        const row = document.createElement('div');
        row.className = 'generator-row';
        // 偶数・奇数で見やすく色を変えるクラスを追加
        row.classList.add(index % 2 === 0 ? 'row-even' : 'row-odd');
        
        row.innerHTML = `
            <div class="gen-info">
                <div class="gen-name">${gen.name}</div>
                <div class="gen-amount" id="amount-${index}">所持数: 0</div>
                <div class="gen-multiplier" id="mult-${index}">x1.00</div>
            </div>
            <button id="btn-${index}" class="buy-btn" onclick="buyGenerator(${index})">
                購入<br>コスト: ${format(gen.baseCost)}
            </button>
        `;
        container.appendChild(row);
    });

    gameLoop();
}

init();
