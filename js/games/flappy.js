// Flappy Hearts Game - For Jessica
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

// Game state
let bird = {
    x: 80,
    y: canvas.height / 2,
    width: BIRD_SIZE,
    height: BIRD_SIZE,
    dy: 0,
    rotation: 0
};

let pipes = [];
let score = 0;
let gameRunning = false;
let gameStarted = false;
let pipeTimer = 0;

// Particle system
const particles = new ParticleSystem(canvas, ctx);

// Touch controls
const controls = new TouchControls(canvas);

controls.on('touchstart', () => {
    if (!gameRunning) {
        startGame();
        return;
    }
    
    if (!gameStarted) {
        gameStarted = true;
    }
    
    bird.dy = FLAP_STRENGTH;
    particles.createParticles(bird.x, bird.y + bird.height / 2, 5, '#ff80ab');
});

controls.init();

// Initialize game
function initGame() {
    bird.y = canvas.height / 2;
    bird.dy = 0;
    bird.rotation = 0;
    
    pipes = [];
    score = 0;
    pipeTimer = 0;
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
    }
    
    // Rotation based on velocity
    bird.rotation = Math.min(Math.max(bird.dy * 3, -30), 90);
    
    // Check ground and ceiling collision
    if (bird.y + bird.height > canvas.height - 50 || bird.y < 0) {
        gameOver();
        return;
    }
    
    // Only spawn and move pipes after game has started
    if (!gameStarted) return;
    
    // Spawn pipes
    pipeTimer++;
    if (pipeTimer > 90) {
        const gapY = random(100, canvas.height - 150 - PIPE_GAP);
        pipes.push({
            x: canvas.width,
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
            continue;
        }
        
        // Check if bird passed pipe (score)
        if (!pipes[i].scored && bird.x > pipes[i].x + PIPE_WIDTH) {
            pipes[i].scored = true;
            score++;
            particles.createParticles(bird.x + bird.width / 2, bird.y + bird.height / 2, 20, '#ff4081');
            
            if (score >= WIN_SCORE) {
                winGame();
                return;
            }
            
            updateUI();
        }
        
        // Check collision with pipes (with forgiving hitbox)
        const hitboxMargin = 5;
        if (bird.x + bird.width - hitboxMargin > pipes[i].x + hitboxMargin && 
            bird.x + hitboxMargin < pipes[i].x + PIPE_WIDTH - hitboxMargin) {
            // Top pipe collision
            if (bird.y + hitboxMargin < pipes[i].topHeight) {
                gameOver();
                return;
            }
            // Bottom pipe collision
            if (bird.y + bird.height - hitboxMargin > pipes[i].bottomY) {
                gameOver();
                return;
            }
        }
    }
}

function draw() {
    // Clear canvas with gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#ff80ab');
    gradient.addColorStop(1, '#ff4081');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw ground
    ctx.fillStyle = '#880e4f';
    ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
    
    // Ground pattern
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    for (let i = 0; i < canvas.width; i += 30) {
        ctx.fillRect(i, canvas.height - 50, 15, 50);
    }
    
    // Draw pipes
    pipes.forEach(pipe => {
        // Top pipe
        ctx.fillStyle = '#c51162';
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
        
        // Top pipe cap with hearts
        ctx.fillStyle = '#ff1744';
        ctx.fillRect(pipe.x - 5, pipe.topHeight - 20, PIPE_WIDTH + 10, 20);
        
        // Small heart decoration
        drawHeart(ctx, pipe.x + PIPE_WIDTH / 2, pipe.topHeight - 10, 15, '#ff80ab');
        
        // Bottom pipe
        ctx.fillStyle = '#c51162';
        ctx.fillRect(pipe.x, pipe.bottomY, PIPE_WIDTH, canvas.height - pipe.bottomY - 50);
        
        // Bottom pipe cap with hearts
        ctx.fillStyle = '#ff1744';
        ctx.fillRect(pipe.x - 5, pipe.bottomY, PIPE_WIDTH + 10, 20);
        
        // Small heart decoration
        drawHeart(ctx, pipe.x + PIPE_WIDTH / 2, pipe.bottomY + 10, 15, '#ff80ab');
    });
    
    // Draw bird
    ctx.save();
    ctx.translate(bird.x + bird.width / 2, bird.y + bird.height / 2);
    ctx.rotate(bird.rotation * Math.PI / 180);
    
    // Bird body (heart shape)
    drawHeart(ctx, 0, 0, bird.width, '#ffffff');
    
    // Eye
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(3, -3, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Wings
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.ellipse(-5, 0, 8, 4, 0, 0, Math.PI * 2);
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
        ctx.fillText('Tap to Start Flying!', canvas.width / 2, canvas.height / 2);
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
        "Jessica, you flew straight into my heart! 🦋💕",
        restartGame
    );
}

function restartGame() {
    document.getElementById('gameOverScreen').classList.remove('show');
    initGame();
}

// Start the game
initGame();
