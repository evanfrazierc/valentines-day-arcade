// Heartbreaker Game - For Juliette
const canvas = document.getElementById('gameCanvas');
const ctx = setupCanvas(canvas, 350, 600);

// Game constants
const PADDLE_WIDTH = 80;
const PADDLE_HEIGHT = 15;
const BALL_RADIUS = 8;
const BRICK_ROWS = 5;
const BRICK_COLS = 6;
const BRICK_WIDTH = 50;
const BRICK_HEIGHT = 20;
const BRICK_PADDING = 5;
const BRICK_OFFSET_TOP = 60;
const BRICK_OFFSET_LEFT = 10;

// Game state
let paddle = { x: canvas.width / 2 - PADDLE_WIDTH / 2, y: canvas.height - 40, width: PADDLE_WIDTH, height: PADDLE_HEIGHT };
let ball = { x: canvas.width / 2, y: canvas.height - 60, dx: 4, dy: -4, radius: BALL_RADIUS };
let bricks = [];
let lives = 3;
let gameRunning = false;
let bricksRemaining = 0;
let animationFrameId = null;
let currentBallSpeed = 4;
const BASE_BALL_SPEED = 4;
const SPEED_INCREASE_PER_HIT = 0.25;

// Particle system
const particles = new ParticleSystem(canvas, ctx);

// Touch controls
const controls = new TouchControls(canvas);
let isDragging = false;

controls.on('touchstart', (pos) => {
    isDragging = true;
    if (!gameRunning) {
        startGame();
    }
});

controls.on('touchmove', (pos) => {
    if (isDragging) {
        paddle.x = clamp(pos.x - PADDLE_WIDTH / 2, 0, canvas.width - PADDLE_WIDTH);
    }
});

controls.on('tap', () => {
    if (!gameRunning) {
        startGame();
    }
});

controls.init();

// Initialize game
function initGame() {
    // Reset paddle and ball
    paddle.x = canvas.width / 2 - PADDLE_WIDTH / 2;
    ball.x = canvas.width / 2;
    ball.y = canvas.height - 60;
    currentBallSpeed = BASE_BALL_SPEED;
    const angle = Math.PI / 4; // 45 degrees
    ball.dx = currentBallSpeed * Math.sin(angle);
    ball.dy = -currentBallSpeed * Math.cos(angle);
    lives = 3;
    gameRunning = false;
    
    // Create bricks
    bricks = [];
    const colors = ['#ff1744', '#ff4081', '#ff80ab', '#f50057', '#c51162'];
    
    for (let row = 0; row < BRICK_ROWS; row++) {
        bricks[row] = [];
        for (let col = 0; col < BRICK_COLS; col++) {
            bricks[row][col] = {
                x: BRICK_OFFSET_LEFT + col * (BRICK_WIDTH + BRICK_PADDING),
                y: BRICK_OFFSET_TOP + row * (BRICK_HEIGHT + BRICK_PADDING),
                width: BRICK_WIDTH,
                height: BRICK_HEIGHT,
                color: colors[row % colors.length],
                visible: true
            };
        }
    }
    
    bricksRemaining = BRICK_ROWS * BRICK_COLS;
    updateUI();
    draw();
}

function startGame() {
    // Cancel any existing game loop to prevent multiple loops
    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    
    // Reset ball velocity with current speed
    const angle = Math.PI / 4; // 45 degrees
    ball.dx = currentBallSpeed * Math.sin(angle);
    ball.dy = -currentBallSpeed * Math.cos(angle);
    gameRunning = true;
    setPlayingMode(true);
    gameLoop();
}

function update() {
    // Move ball
    ball.x += ball.dx;
    ball.y += ball.dy;
    
    // Wall collision
    if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
        ball.dx = -ball.dx;
    }
    
    if (ball.y - ball.radius < 0) {
        ball.dy = -ball.dy;
    }
    
    // Paddle collision
    if (ball.y + ball.radius > paddle.y &&
        ball.x > paddle.x &&
        ball.x < paddle.x + paddle.width &&
        ball.dy > 0) {
        
        // Increase ball speed with each hit
        currentBallSpeed += SPEED_INCREASE_PER_HIT;
        
        // Calculate bounce angle based on where ball hits paddle
        const hitPos = (ball.x - paddle.x) / paddle.width;
        const angle = (hitPos - 0.5) * Math.PI / 3; // -60 to 60 degrees
        
        ball.dx = currentBallSpeed * Math.sin(angle);
        ball.dy = -currentBallSpeed * Math.cos(angle);
        
        particles.createParticles(ball.x, ball.y, 10, '#ff4081');
    }
    
    // Ball falls below paddle
    if (ball.y - ball.radius > canvas.height) {
        lives--;
        updateUI();
        
        if (lives <= 0) {
            gameOver();
            return;
        }
        
        // Reset ball with base speed
        ball.x = canvas.width / 2;
        ball.y = canvas.height - 60;
        currentBallSpeed = BASE_BALL_SPEED; // Reset to base speed
        const angle = Math.PI / 4; // 45 degrees
        ball.dx = currentBallSpeed * Math.sin(angle);
        ball.dy = -currentBallSpeed * Math.cos(angle);
        gameRunning = false;
    }
    
    // Brick collision
    for (let row = 0; row < BRICK_ROWS; row++) {
        for (let col = 0; col < BRICK_COLS; col++) {
            const brick = bricks[row][col];
            if (!brick.visible) continue;
            
            if (checkCollision(
                { x: ball.x - ball.radius, y: ball.y - ball.radius, width: ball.radius * 2, height: ball.radius * 2 },
                brick
            )) {
                ball.dy = -ball.dy;
                brick.visible = false;
                bricksRemaining--;
                
                particles.createParticles(
                    brick.x + brick.width / 2,
                    brick.y + brick.height / 2,
                    15,
                    brick.color
                );
                
                updateUI();
                
                if (bricksRemaining === 0) {
                    winGame();
                    return;
                }
                
                return; // Only hit one brick per frame
            }
        }
    }
}

function draw() {
    // Clear canvas
    ctx.fillStyle = 'rgba(136, 14, 79, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw bricks
    bricks.forEach(row => {
        row.forEach(brick => {
            if (brick.visible) {
                // Draw heart-shaped brick
                ctx.save();
                ctx.translate(brick.x + brick.width / 2, brick.y + brick.height / 2);
                
                // Draw heart
                drawHeart(ctx, 0, 0, brick.width * 0.8, brick.color);
                
                ctx.restore();
            }
        });
    });
    
    // Draw paddle
    ctx.fillStyle = '#ff4081';
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    
    // Add gradient
    const gradient = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.height);
    gradient.addColorStop(0, '#ff80ab');
    gradient.addColorStop(1, '#ff4081');
    ctx.fillStyle = gradient;
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    
    // Round corners
    ctx.fillStyle = '#ff80ab';
    ctx.beginPath();
    ctx.arc(paddle.x + 5, paddle.y + paddle.height / 2, 5, 0, Math.PI * 2);
    ctx.arc(paddle.x + paddle.width - 5, paddle.y + paddle.height / 2, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw ball
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Ball glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff4081';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Draw particles
    particles.update();
    particles.draw();
    
    // Draw start message
    if (!gameRunning && lives > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Tap to Launch!', canvas.width / 2, canvas.height / 2);
    }
}

function gameLoop() {
    if (gameRunning) {
        update();
    }
    
    draw();
    
    if (gameRunning || lives > 0) {
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

function updateUI() {
    document.getElementById('bricks').textContent = bricksRemaining;
    document.getElementById('lives').textContent = lives;
    const bricksOverlay = document.getElementById('bricks-overlay');
    const livesOverlay = document.getElementById('lives-overlay');
    if (bricksOverlay) bricksOverlay.textContent = bricksRemaining;
    if (livesOverlay) livesOverlay.textContent = lives;
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
        "Juliette, you broke through all my walls! Be my Valentine? ❤️",
        restartGame
    );
}

function restartGame() {
    document.getElementById('gameOverScreen').classList.remove('show');
    initGame();
}

// Start the game
initGame();
