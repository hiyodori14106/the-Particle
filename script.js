// --- 既存の loadGame をこれに置き換え ---
function loadGame() {
    const data = localStorage.getItem(SAVE_KEY);
    if (data) {
        try {
            const parsed = JSON.parse(data);
            const fresh = getInitialState();
            
            // セーブデータの lastTick を一時保存（上書きされる前に！）
            const savedLastTick = parsed.lastTick || Date.now();

            // データのマージ
            game = { ...fresh, ...parsed };
            
            // ジェネレーターのマージ
            if (parsed.generators) {
                game.generators = parsed.generators.map((g, i) => ({ ...fresh.generators[i], ...g }));
            }
            if (game.prestigeCount === undefined) game.prestigeCount = 0;

            // --- ここが追加変更点: オフライン進行の計算 ---
            const now = Date.now();
            // ミリ秒を秒に変換
            const offlineSeconds = (now - savedLastTick) / 1000;

            // 10秒以上経過していたらオフライン計算を行う
            if (offlineSeconds > 10) {
                simulateOfflineProgress(offlineSeconds);
            }

            // 現在時刻に更新
            game.lastTick = now;

        } catch(e) { console.error(e); }
    }
}

// --- 新規追加: オフライン進行のシミュレーション関数 ---
function simulateOfflineProgress(seconds) {
    // 24時間(86400秒)を上限とする（バランス崩壊防止のため）
    if (seconds > 86400) seconds = 86400;

    const globalMult = getGlobalMultiplier();

    // 1. 粒子の生産計算 (Mk.1 -> 粒子)
    // オフライン開始時点の生産力に基づき計算（線形計算）
    const pps = game.generators[0].amount * game.generators[0].production * globalMult;
    const gainedParticles = pps * seconds;

    game.particles += gainedParticles;
    game.totalParticles += gainedParticles;

    // 2. 加速器のカスケード生産 (Mk.N -> Mk.N-1)
    // ※計算の順序による誤差を防ぐため、増加量は別変数で計算してから適用
    let gains = new Array(game.generators.length).fill(0);

    for (let i = 1; i < game.generators.length; i++) {
        const producer = game.generators[i];
        // producerがどれだけ下の階層を生み出したか
        const producedAmount = producer.amount * producer.production * globalMult * seconds;
        gains[i - 1] = producedAmount;
    }

    // 計算した増加量を適用
    for (let i = 0; i < gains.length; i++) {
        if (gains[i] > 0) {
            game.generators[i].amount += gains[i];
        }
    }

    // ユーザーへの報告（0粒子より多ければアラート表示）
    if (gainedParticles > 0) {
        // 数値が見やすいようにフォーマット
        alert(
            `おかえりなさい！\n` +
            `オフライン経過時間: ${formatTime(seconds)}\n` +
            `獲得粒子: ${format(gainedParticles)}`
        );
    }
}
