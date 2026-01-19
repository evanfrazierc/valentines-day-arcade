// Flappy Redbird Game - For Karen
const canvas = document.getElementById('gameCanvas');
const ctx = setupCanvas(canvas, 350, 600);

// Game constants
const GRAVITY = 0.25;
const FLAP_STRENGTH = -7;
const BIRD_SIZE = 25;
const PIPE_WIDTH = 60;
const PIPE_GAP = 180;
const PIPE_SPEED = 3;
const WIN_SCORE = 20;
const CLOUD_SPEED = 0.5;

// Game state
let bird = {
    x: 80,
    y: canvas.logicalHeight / 2,
    width: BIRD_SIZE,
    height: BIRD_SIZE,
    dy: 0,
    rotation: 0
};

let pipes = [];
let clouds = [];
let score = 0;
let gameRunning = false;
let gameStarted = false;
let pipeTimer = 0;
let groundOffset = 0;

// Audio
let audioEnabled = false;
let soundPool = {
    flap: [],
    score: [],
    hit: []
};
let soundPoolIndex = {
    flap: 0,
    score: 0,
    hit: 0
};

// Load audio files with sound pooling for better performance
function loadAudio() {
    try {
        // Create a pool of audio elements for each sound to avoid cloning overhead
        const createSoundPool = (src, volume, poolSize = 3) => {
            const pool = [];
            for (let i = 0; i < poolSize; i++) {
                const audio = new Audio(src);
                audio.volume = volume;
                audio.load();
                pool.push(audio);
            }
            return pool;
        };
        
        soundPool.flap = createSoundPool('../audio/flap.wav', 0.5, 10);
        soundPool.score = createSoundPool('../audio/score.wav', 0.6);
        soundPool.hit = createSoundPool('../audio/hit.wav', 0.7);
        
        // Enable audio after first user interaction (browser requirement)
        const enableAudio = () => {
            audioEnabled = true;
        };
        
        // Test if audio can be loaded
        soundPool.flap[0].addEventListener('canplaythrough', enableAudio, { once: true });
    } catch (error) {
        console.log('Audio files not found - game will run without sound');
        audioEnabled = false;
    }
}

// Play a sound effect from the pool
function playSound(poolName) {
    if (!audioEnabled || !soundPool[poolName]) return;
    try {
        // Use round-robin to cycle through pool (much faster than find())
        const pool = soundPool[poolName];
        const sound = pool[soundPoolIndex[poolName]];
        soundPoolIndex[poolName] = (soundPoolIndex[poolName] + 1) % pool.length;
        
        // Only interrupt if sound is nearly finished or paused
        if (sound.paused || sound.ended || sound.currentTime > sound.duration - 0.1) {
            sound.currentTime = 0;
        }
        sound.play().catch(err => {});
    } catch (error) {
        // Silently fail if audio doesn't work
    }
}

// Particle system
const particles = new ParticleSystem(canvas, ctx);

// Touch controls
const controls = new TouchControls(canvas);

controls.on('touchstart', () => {
    // Enable audio on first interaction (browser requirement)
    if (!audioEnabled && flapSound) {
        audioEnabled = true;
    }
    
    if (!gameRunning) {
        startGame();
        return;
    }'flap'
    
    if (!gameStarted) {
        gameStarted = true;
    }
    
    bird.dy = FLAP_STRENGTH;
    playSound('flap');
    particles.createParticles(bird.x, bird.y + bird.height / 2, 5, PALETTE.PINK_PASTEL);
});

controls.init();

// Initialize game
function initGame() {
    bird.y = canvas.logicalHeight / 2;
    bird.dy = 0;
    bird.rotation = 0;
    
    pipes = [];
    clouds = [];
    
    // Create initial clouds
    for (let i = 0; i < 5; i++) {
        clouds.push({
            x: random(0, canvas.logicalWidth),
            y: random(50, canvas.logicalHeight - 100),
            size: random(30, 60),
            speed: CLOUD_SPEED * random(0.5, 1.5)
        });
    }
    
    score = 0;
    pipeTimer = 0;
    groundOffset = 0;
    gameRunning = false;
    gameStarted = false;
    
    updateUI();
    draw();
}

function startGame() {
    gameRunning = true;
    setPlayingMode(true);
    gameLoop();
}

function update() {
    // Only start physics after first flap
    if (gameStarted) {
        // Apply gravity
        bird.dy += GRAVITY;
        bird.y += bird.dy;
    }'hit'
    
    // Rotation based on velocity
    bird.rotation = Math.min(Math.max(bird.dy * 3, -30), 90);
    
    // Check ground and ceiling collision
    if (bird.y + bird.height > canvas.logicalHeight - 50 || bird.y < 0) {
        playSound('hit');
        gameOver();
        return;
    }
    
    // Only spawn and move pipes after game has started
    if (!gameStarted) return;
    
    // Update ground offset
    groundOffset -= PIPE_SPEED;
    if (groundOffset <= -30) {
        groundOffset = 0;
    }
    
    // Update clouds
    for (let i = clouds.length - 1; i >= 0; i--) {
        clouds[i].x -= clouds[i].speed;
        
        // Remove clouds that are off-screen and add new ones
        if (clouds[i].x + clouds[i].size < 0) {
            clouds[i].x = canvas.logicalWidth + 50;
            clouds[i].y = random(50, canvas.logicalHeight - 100);
            clouds[i].size = random(30, 60);
            clouds[i].speed = CLOUD_SPEED * random(0.5, 1.5);
        }
    }
    
    // Spawn pipes
    pipeTimer++;
    if (pipeTimer > 90) {
        const gapY = random(100, canvas.logicalHeight - 150 - PIPE_GAP);
        pipes.push({
            x: canvas.logicalWidth,
            topHeight: gapY,
            bottomY: gapY + PIPE_GAP,
            scored: false
        });
        pipeTimer = 0;
    }
    
    // Update pipes
    for (let i = pipes.length - 1; i >= 0; i--) {
        pipes[i].x -= PIPE_SPEED;
        
        // Remove off-screen pipes
        if (pipes[i].x + PIPE_WIDTH < 0) {
            pipes.splice(i, 1);
            continue;'score'
        }
        
        // Check if bird passed pipe (score)
        if (!pipes[i].scored && bird.x > pipes[i].x + PIPE_WIDTH) {
            pipes[i].scored = true;
            score++;
            playSound('score');
            particles.createParticles(bird.x + bird.width / 2, bird.y + bird.height / 2, 20, PALETTE.PINK_HOT);
            
            if (score >= WIN_SCORE) {
                winGame();
                return;
            }
            
            updateUI();
        }
        'hit'
        // Check collision with pipes (with forgiving hitbox)
        const hitboxMargin = 5;
        if (bird.x + bird.width - hitboxMargin > pipes[i].x + hitboxMargin && 
            bird.x + hitboxMargin < pipes[i].x + PIPE_WIDTH - hitboxMargin) {
            // Top pipe collision'hit'
            if (bird.y + hitboxMargin < pipes[i].topHeight) {
                playSound('hit');
                gameOver();
                return;
            }
            // Bottom pipe collision
            if (bird.y + bird.height - hitboxMargin > pipes[i].bottomY) {                playSound('hit');                gameOver();
                return;
            }
        }
    }
}

function draw() {
    // Clear canvas with sky blue gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.logicalHeight);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#4A90E2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.logicalWidth, canvas.logicalHeight);
    
    // Draw clouds
    clouds.forEach(cloud => {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        
        // Main cloud body
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, cloud.size * 0.5, 0, Math.PI * 2);
        ctx.arc(cloud.x + cloud.size * 0.4, cloud.y - cloud.size * 0.1, cloud.size * 0.4, 0, Math.PI * 2);
        ctx.arc(cloud.x + cloud.size * 0.7, cloud.y, cloud.size * 0.45, 0, Math.PI * 2);
        ctx.arc(cloud.x + cloud.size * 0.35, cloud.y + cloud.size * 0.15, cloud.size * 0.35, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Draw ground
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(0, canvas.logicalHeight - 50, canvas.logicalWidth, 50);
    
    // Ground pattern (moving stripes)
    ctx.fillStyle = '#45a049';
    for (let i = -30; i < canvas.logicalWidth + 30; i += 30) {
        ctx.fillRect(i + groundOffset, canvas.logicalHeight - 50, 15, 50);
    }
    
    // Draw pipes
    pipes.forEach(pipe => {
        // Top pipe
        ctx.fillStyle = PALETTE.RED_DARK;
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
        
        // Top pipe cap with hearts
        ctx.fillStyle = PALETTE.RED_PRIMARY;
        ctx.fillRect(pipe.x - 5, pipe.topHeight - 20, PIPE_WIDTH + 10, 20);
        
        // Small heart decoration (upside down, closer to edge)
        ctx.save();
        ctx.translate(pipe.x + PIPE_WIDTH / 2, pipe.topHeight - 3);
        ctx.scale(1, -1);
        drawHeart(ctx, 0, 0, 15, PALETTE.PINK_PASTEL);
        ctx.restore();
        
        // Bottom pipe
        ctx.fillStyle = PALETTE.RED_DARK;
        ctx.fillRect(pipe.x, pipe.bottomY, PIPE_WIDTH, canvas.logicalHeight - pipe.bottomY - 50);
        
        // Bottom pipe cap with hearts
        ctx.fillStyle = PALETTE.RED_PRIMARY;
        ctx.fillRect(pipe.x - 5, pipe.bottomY, PIPE_WIDTH + 10, 20);
        
        // Small heart decoration (closer to edge)
        drawHeart(ctx, pipe.x + PIPE_WIDTH / 2, pipe.bottomY + 3, 15, PALETTE.PINK_PASTEL);
    });
    
    // Draw red cardinal
    ctx.save();
    ctx.translate(bird.x + bird.width / 2, bird.y + bird.height / 2);
    ctx.rotate(bird.rotation * Math.PI / 180);
    
    // Bird body - red cardinal
    ctx.fillStyle = '#DC143C';
    ctx.beginPath();
    ctx.ellipse(0, 0, bird.width / 2, bird.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Black face mask
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(bird.width / 4, -bird.height / 6, bird.width / 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye
    ctx.fillStyle = PALETTE.WHITE;
    ctx.beginPath();
    ctx.arc(bird.width / 4, -bird.height / 6, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Orange beak
    ctx.fillStyle = '#FF8C00';
    ctx.beginPath();
    ctx.moveTo(bird.width / 2, 0);
    ctx.lineTo(bird.width / 2 + 8, -2);
    ctx.lineTo(bird.width / 2 + 8, 2);
    ctx.closePath();
    ctx.fill();
    
    // Red crest on top
    ctx.fillStyle = '#DC143C';
    ctx.beginPath();
    ctx.moveTo(0, -bird.height / 2);
    ctx.lineTo(-3, -bird.height / 2 - 8);
    ctx.lineTo(3, -bird.height / 2 - 8);
    ctx.closePath();
    ctx.fill();
    
    // Wing
    ctx.fillStyle = '#8B0000';
    ctx.beginPath();
    ctx.ellipse(-bird.width / 4, 0, bird.width / 3, bird.height / 5, -20 * Math.PI / 180, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
    
    // Draw particles
    particles.update();
    particles.draw();
    
    // Draw start message
    if (!gameRunning) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Tap to Start Flying!', canvas.logicalWidth / 2, canvas.logicalHeight / 2);
    }
}

function gameLoop() {
    if (!gameRunning) {
        draw();
        return;
    }
    
    update();
    draw();
    
    requestAnimationFrame(gameLoop);
}

function updateUI() {
    document.getElementById('score').textContent = `${score}/${WIN_SCORE}`;
    const scoreOverlay = document.getElementById('score-overlay');
    if (scoreOverlay) scoreOverlay.textContent = `${score}/${WIN_SCORE}`;
}

function gameOver() {
    gameRunning = false;
    setPlayingMode(false);
    document.getElementById('gameOverScreen').classList.add('show');
}

function winGame() {
    gameRunning = false;
    setPlayingMode(false);
    showWinScreen(
        "Karen, you're as beautiful as a cardinal in flight! 🐦💕",
        restartGame
    );
}

function restartGame() {
    document.getElementById('gameOverScreen').classList.remove('show');
    initGame();
}

// Load audio and start the game
loadAudio();
initGame();
