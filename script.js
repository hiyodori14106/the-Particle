// --- State ---
function getInitialState() {
    return {
        particles: 10,
        totalParticles: 10,
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

// --- Core Logic ---
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

function gameLoop() {
    const now = Date.now();
    let dt = (now - game.lastTick) / 1000;
    if (dt > 86400) dt = 0;
    game.lastTick = now;

    // Production
    const pps = game.generators[0].amount * game.generators[0].production;
    const produced = pps * dt;
    game.particles += produced;
    game.totalParticles += produced;

    // Cascade
    for (let i = 1; i < game.generators.length; i++) {
        const producer = game.generators[i];
        const target = game.generators[i - 1];
        target.amount += producer.amount * producer.production * dt;
    }

    updateUI(pps);
    
    // Save & Stats
    const wrapper = document.getElementById('app-wrapper');
    if (!wrapper.classList.contains('closed')) {
        updateStats();
    }
    if (now % 10000 < 20) saveGame(true);

    requestAnimationFrame(gameLoop);
}

// --- UI ---
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
    const elapsed = (Date.now() - game.startTime) / 1000;
    document.getElementById('stat-time').textContent = formatTime(elapsed);
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

// --- Sidebar & Tabs ---
function toggleSidebar() {
    const wrapper = document.getElementById('app-wrapper');
    wrapper.classList.toggle('closed');
}

function switchTab(tabName, btn) {
    document.querySelectorAll('.sidebar-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

// --- Save System ---
const SAVE_KEY = 'theParticleSave_v3';

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
            game = { ...getInitialState(), ...parsed };
            if (parsed.generators) {
                game.generators = parsed.generators.map((g, i) => ({ ...getInitialState().generators[i], ...g }));
            }
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

// --- Init ---
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
