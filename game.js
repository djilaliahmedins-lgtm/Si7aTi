const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// إعدادات الكانفاس
canvas.width = 800;
canvas.height = 600;
const GROUND_Y = 530; 

// --- الصور ---
const heroImg = new Image(); heroImg.src = 'hero.jpg'; 
const enemyImg = new Image(); enemyImg.src = 'enemy.jpg';
const fireImg = new Image(); fireImg.src = 'fire.gif';
const bgImg = new Image(); bgImg.src = 'bg.jpg';

let heroLoaded = false; heroImg.onload = () => heroLoaded = true;
let enemyLoaded = false; enemyImg.onload = () => enemyLoaded = true;

// --- المتغيرات ---
let gameState = "START";
let score = 0;
let liceDefeated = 0;
const TOTAL_LICE = 10;
let gameSpeed = 6;
let bgX = 0;

const hero = {
    x: 50, y: GROUND_Y - 120,
    w: 120, h: 120,
    dy: 0, jump: -20, grav: 1.2,
    ground: GROUND_Y - 120,
    onGround: false
};

let enemies = [];
let enemyTimer = 0;
let currEnemy = -1;
let particles = [];

const questions = [
    { q: "القمل يطير؟", a: false, info: "خطأ! القمل يزحف" },
    { q: "المشط ينقل العدوى؟", a: true, info: "صح! لا تشاركه" },
    { q: "القمل يحب الشعر المتسخ؟", a: false, info: "خطأ! يعيش في النظيف" },
    { q: "يجب حلق الشعر للعلاج؟", a: false, info: "خطأ! يوجد دواء" },
    { q: "القمل حشرة صغيرة؟", a: true, info: "صح! كحبة السمسم" },
    { q: "بيض القمل يسمى الصيبان؟", a: true, info: "صح! لونه أبيض" },
    { q: "القمل يعيش على الحيوانات؟", a: false, info: "خطأ! بشري فقط" },
    { q: "الخل يساعد في إزالة البيض؟", a: true, info: "صح! يفكك الالتصاق" },
    { q: "القمل ينتقل بالسباحة؟", a: false, info: "خطأ! يتمسك بالشعر" },
    { q: "النظافة تحمي من القمل؟", a: true, info: "صح! الوقاية خير" }
];

// ==========================================
// === الحل الجذري للمس (Universal Input) ===
// ==========================================

function tryJump(e) {
    // 1. هل ضغطنا على زر؟ (ابدأ، إعادة، خيارات الجواب)
    // إذا نعم، اخرج من الدالة واترك الزر يعمل
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
        return;
    }

    // 2. إذا لم يكن زرًا، امنع التكبير وتصرف كقفزة
    if (e.type === 'touchstart') {
        e.preventDefault(); 
    }

    // 3. تنفيذ القفز إذا كانت اللعبة جارية والبطل على الأرض
    if (gameState === "PLAYING" && hero.onGround) {
        hero.dy = hero.jump;
        hero.onGround = false;
    }
}

// الاستماع على مستوى "المستند" كاملاً (الشاشة كلها)
// خيار passive: false ضروري جداً لمنع مشاكل اللمس في الهواتف الحديثة
document.addEventListener('touchstart', tryJump, {passive: false});
document.addEventListener('mousedown', tryJump);
window.addEventListener('keydown', (e) => {
    if (e.code === "Space") {
        if (gameState === "PLAYING" && hero.onGround) {
            hero.dy = hero.jump;
            hero.onGround = false;
        }
    }
});


// ==========================================
// === باقي منطق اللعبة ===
// ==========================================

function startGame() {
    document.getElementById('startScreen').classList.add('hidden');
    gameState = "PLAYING";
    score = 0; liceDefeated = 0; enemies = []; particles = [];
    hero.y = hero.ground;
    updateUI();
    loop();
}

function loop() {
    if (gameState === "PLAYING" || gameState === "BURNING") {
        update();
        draw();
        requestAnimationFrame(loop);
    } else if (gameState === "QUIZ") {
        draw();
    }
}

function update() {
    // فيزياء البطل
    if (gameState !== "QUIZ") {
        hero.dy += hero.grav;
        hero.y += hero.dy;
        if (hero.y > hero.ground) {
            hero.y = hero.ground;
            hero.dy = 0;
            hero.onGround = true;
        }
    }

    // الخلفية والمفرقعات
    if (gameState === "PLAYING") {
        bgX -= 2;
        if (bgX <= -canvas.width) bgX = 0;
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.8; p.life--;
        if (p.life <= 0) particles.splice(i, 1);
    }

    // الأعداء
    if (gameState === "PLAYING") {
        enemyTimer++;
        if (enemyTimer > 100 && Math.random() < 0.03) {
            if(liceDefeated < TOTAL_LICE) {
                enemies.push({
                    x: canvas.width, y: GROUND_Y - 90,
                    w: 90, h: 90,
                    qIdx: Math.floor(Math.random()*questions.length),
                    isBurning: false, burnTime: 0
                });
                enemyTimer = 0;
            }
        }
    }

    for (let i = 0; i < enemies.length; i++) {
        let e = enemies[i];

        if (e.isBurning) {
            e.burnTime--;
            if (e.burnTime <= 0) {
                enemies.splice(i, 1);
                resumeGame();
                return;
            }
        } else if (gameState === "PLAYING") {
            e.x -= gameSpeed;
            // تصادم
            if (hero.x < e.x + e.w - 40 && hero.x + hero.w - 40 > e.x &&
                hero.y < e.y + e.h && hero.y + hero.h > e.y) {
                triggerQuiz(i);
                return;
            }
            if (e.x + e.w < 0) { enemies.splice(i, 1); i--; }
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (bgImg.complete) {
        ctx.drawImage(bgImg, bgX, 0, canvas.width, canvas.height);
        ctx.drawImage(bgImg, bgX + canvas.width, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = "#333"; ctx.fillRect(0,0,canvas.width, canvas.height);
    }

    if (heroLoaded) ctx.drawImage(heroImg, hero.x, hero.y, hero.w, hero.h);
    else { ctx.fillStyle = "blue"; ctx.fillRect(hero.x, hero.y, hero.w, hero.h); }

    for (let e of enemies) {
        if (e.isBurning) {
            ctx.drawImage(fireImg, e.x - 20, e.y - 30, e.w + 40, e.h + 50);
        } else {
            if (enemyLoaded) ctx.drawImage(enemyImg, e.x, e.y, e.w, e.h);
            else { ctx.fillStyle = "red"; ctx.fillRect(e.x, e.y, e.w, e.h); }
        }
    }

    for (let p of particles) {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function spawnConfetti() {
    let cx = canvas.width / 2;
    let cy = canvas.height / 2;
    for (let i = 0; i < 100; i++) {
        particles.push({
            x: cx, y: cy,
            vx: (Math.random() - 0.5) * 30,
            vy: (Math.random() - 1) * 30,
            size: Math.random() * 10 + 5,
            color: `hsl(${Math.random() * 360}, 100%, 50%)`,
            life: 80
        });
    }
}

function triggerQuiz(idx) {
    gameState = "QUIZ";
    currEnemy = idx;
    let q = questions[enemies[idx].qIdx];

    document.getElementById('msgIdle').classList.add('hidden');
    document.getElementById('msgQuiz').classList.remove('hidden');
    
    document.getElementById('qText').innerText = q.q;
    document.getElementById('fbText').innerText = "";
}

function checkAnswer(ans) {
    let e = enemies[currEnemy];
    let q = questions[e.qIdx];
    let fb = document.getElementById('fbText');

    if (ans === q.a) {
        score += 10;
        liceDefeated++;
        fb.style.color = "#2ecc71";
        fb.innerText = "أحسنت! " + q.info;
        spawnConfetti();
        setTimeout(() => { startBurning(); }, 1000);
    } else {
        fb.style.color = "#e74c3c";
        fb.innerText = q.info;
        setTimeout(() => { enemies.splice(currEnemy, 1); resumeGame(); }, 2000);
    }
}

function startBurning() {
    document.getElementById('msgQuiz').classList.add('hidden');
    document.getElementById('msgIdle').classList.remove('hidden');
    if (enemies[currEnemy]) {
        enemies[currEnemy].isBurning = true;
        enemies[currEnemy].burnTime = 60;
        gameState = "BURNING";
        loop();
    } else {
        resumeGame();
    }
}

function resumeGame() {
    updateUI();
    document.getElementById('msgQuiz').classList.add('hidden');
    document.getElementById('msgIdle').classList.remove('hidden');

    if (liceDefeated >= TOTAL_LICE) {
        document.getElementById('endScreen').classList.remove('hidden');
        document.getElementById('finalScore').innerText = "النقاط: " + score;
        gameState = "END";
    } else {
        gameState = "PLAYING";
        loop();
    }
}

function updateUI() {
    document.getElementById('scoreVal').innerText = score;
    document.getElementById('liceVal').innerText = TOTAL_LICE - liceDefeated;
}

// بدء التشغيل
requestAnimationFrame(draw);