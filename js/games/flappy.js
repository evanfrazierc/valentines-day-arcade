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
const ITEM_SIZE = 30;
const ITEM_SPEED = 3; // Match pipe speed
const WIN_SCORE = 15;
const CLOUD_SPEED = 0.5;

// Collectible items (jewelry and clothing emojis)
const COLLECTIBLE_ITEMS = ['💍', '👗', '👠', '👑', '💎', '⌚', '👜'];

// Cached font strings for better performance
const FONTS = {
    ITEM: `${ITEM_SIZE}px Arial`,
    BOLD_24: 'bold 24px Arial',
    REGULAR_16: '16px Arial'
};

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
let items = [];
let clouds = [];
let score = 0;
let gameRunning = false;
let gameStarted = false;
let pipeTimer = 0;
let groundOffset = 0;

// Pre-create gradients for better performance
let backgroundGradient = null;
function createGradients() {
    backgroundGradient = ctx.createLinearGradient(0, 0, 0, canvas.logicalHeight);
    backgroundGradient.addColorStop(0, '#87CEEB');
    backgroundGradient.addColorStop(1, '#4A90E2');
}

// Audio using Web Audio API for better performance
let audioContext = null;
let audioBuffers = {
    flap: null,
    score: null,
    hit: null
};
let audioEnabled = false;

// Load audio files with Web Audio API
async function loadAudio() {
    try {
        const loadSound = async (url) => {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            return await audioContext.decodeAudioData(arrayBuffer);
        };
        
        audioBuffers.flap = await loadSound('../audio/flap.wav');
        audioBuffers.score = await loadSound('../audio/score.wav');
        audioBuffers.hit = await loadSound('../audio/hit.wav');
        
        audioEnabled = true;
    } catch (error) {
        audioEnabled = false;
    }
}

// Play a sound effect using Web Audio API
function playSound(soundName) {
    if (!audioEnabled || !audioContext || !audioBuffers[soundName]) return;
    try {
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffers[soundName];
        
        const gainNode = audioContext.createGain();
        gainNode.gain.value = soundName === 'flap' ? 0.5 : soundName === 'score' ? 0.1 : 0.7;
        
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        source.start(0);
    } catch (error) {}
}

// Particle system
const particles = new ParticleSystem(canvas, ctx);

// Game animations
const gameAnimations = new GameAnimations(canvas, ctx);

// Touch controls
const controls = new TouchControls(canvas);

controls.on('touchstart', async () => {
    // Disable input during animations
    if (gameAnimations.isAnimating()) {
        return;
    }
    
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {});
        }
        // Play silent sound to unlock audio on iOS
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0;
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.start(0);
        oscillator.stop(0.001);
        setTimeout(() => loadAudio(), 100);
    }
    
    if (!gameRunning) {
        startGame();
        return;
    }
    
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
    items = [];
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
    
    // Initialize gradients for better performance
    createGradients();
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
    
    // Spawn collectible items
    pipeTimer++;
    if (pipeTimer > 70) {
        const gapY = random(100, canvas.logicalHeight - 150 - PIPE_GAP);
        pipes.push({
            x: canvas.logicalWidth,
            topHeight: gapY,
            bottomY: gapY + PIPE_GAP,
            scored: false
        });
        
        // Spawn item in the gap
        const itemY = gapY + PIPE_GAP / 2 - ITEM_SIZE / 2;
        items.push({
            x: canvas.logicalWidth + PIPE_WIDTH / 2 - ITEM_SIZE / 2,
            y: itemY,
            emoji: COLLECTIBLE_ITEMS[Math.floor(Math.random() * COLLECTIBLE_ITEMS.length)],
            collected: false
        });
        
        pipeTimer = 0;
    }
    
    // Update pipes
    for (let i = pipes.length - 1; i >= 0; i--) {
        pipes[i].x -= PIPE_SPEED;
        
        // Remove off-screen pipes
        if (pipes[i].x + PIPE_WIDTH < 0) {
            pipes.splice(i, 1);
            continue;
        }
        
        // Check collision with pipes (with forgiving hitbox)
        const hitboxMargin = 5;
        if (bird.x + bird.width - hitboxMargin > pipes[i].x + hitboxMargin && 
            bird.x + hitboxMargin < pipes[i].x + PIPE_WIDTH - hitboxMargin) {
            // Top pipe collision
            if (bird.y + hitboxMargin < pipes[i].topHeight) {
                playSound('hit');
                gameOver();
                return;
            }
            // Bottom pipe collision
            if (bird.y + bird.height - hitboxMargin > pipes[i].bottomY) {
                playSound('hit');
                gameOver();
                return;
            }
        }
    }
    
    // Update collectible items
    for (let i = items.length - 1; i >= 0; i--) {
        items[i].x -= ITEM_SPEED;
        
        // Remove off-screen items
        if (items[i].x + ITEM_SIZE < 0) {
            items.splice(i, 1);
            continue;
        }
        
        // Check if bird collected item
        if (!items[i].collected) {
            const dx = (bird.x + bird.width / 2) - (items[i].x + ITEM_SIZE / 2);
            const dy = (bird.y + bird.height / 2) - (items[i].y + ITEM_SIZE / 2);
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Collision detection
            if (distance < (bird.width / 2 + ITEM_SIZE / 2)) {
                items[i].collected = true;
                score++;
                playSound('score');
                particles.createParticles(items[i].x + ITEM_SIZE / 2, items[i].y + ITEM_SIZE / 2, 20, PALETTE.PINK_HOT);
                
                if (score >= WIN_SCORE) {
                    winGame();
                    return;
                }
                
                updateUI();
                items.splice(i, 1);
            }
        }
    }
}

function draw() {
    // Apply shake animation if active
    ctx.save();
    gameAnimations.applyShake();
    
    // Clear canvas with sky blue gradient
    ctx.fillStyle = backgroundGradient;
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
    
    // Draw collectible items
    if (items.length > 0) {
        ctx.font = FONTS.ITEM;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        items.forEach(item => {
            if (!item.collected) {
                ctx.fillText(item.emoji, item.x + ITEM_SIZE / 2, item.y + ITEM_SIZE / 2);
            }
        });
    }
    
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
    
    ctx.restore();
    
    // Draw heart rain animation (after restore, so it's not affected by shake)
    if (gameAnimations.isAnimating()) {
        gameAnimations.drawHeartRain();
    }
    
    // Draw start message
    if (!gameRunning) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.textAlign = 'center';
        ctx.font = FONTS.BOLD_24;
        ctx.fillText('Tap to Start Flying!', canvas.logicalWidth / 2, canvas.logicalHeight / 2 - 20);
        ctx.font = FONTS.REGULAR_16;
        ctx.fillText('Collect jewelry & clothing!', canvas.logicalWidth / 2, canvas.logicalHeight / 2 + 10);
    }
}

function gameLoop() {
    if (!gameRunning) {
        draw();
        // Continue loop if animations are active
        if (gameAnimations.isAnimating()) {
            requestAnimationFrame(gameLoop);
        }
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
    gameAnimations.startShake();
    
    // Wait for animation to finish before showing dialog
    setTimeout(() => {
        setPlayingMode(false);
        document.getElementById('gameOverScreen').classList.add('show');
    }, 800);
}

function winGame() {
    gameRunning = false;
    gameAnimations.startHeartRain();
    
    // Wait for animation to finish before showing dialog
    setTimeout(() => {
        setPlayingMode(false);
        showWinScreen(
            "Karen, you're as beautiful as a cardinal in flight! 🐦💕",
            restartGame
        );
    }, 2000);
}

function restartGame() {
    document.getElementById('gameOverScreen').classList.remove('show');
    initGame();
}

// Initialize the game (audio loads on first user interaction)
initGame();
