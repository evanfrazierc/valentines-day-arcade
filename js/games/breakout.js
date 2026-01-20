// Kitty Catcher Game - For Juliette
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
const CATS_TO_RESCUE = 5;
const CAT_FALL_SPEED = 2;
const CAT_EMOJIS = ['🐱', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '🐈', '🐈‍⬛'];

// Game state
let paddle = { x: canvas.logicalWidth / 2 - PADDLE_WIDTH / 2, y: canvas.logicalHeight - 40, width: PADDLE_WIDTH, height: PADDLE_HEIGHT };
let ball = { x: canvas.logicalWidth / 2, y: canvas.logicalHeight - 60, dx: 4, dy: -4, radius: BALL_RADIUS };
let ballTrail = []; // For motion blur effect
let bricks = [];
let fallingCats = [];
let lives = 3;
let catsRescued = 0;
let gameRunning = false;
let bricksRemaining = 0;
let animationFrameId = null;
let currentBallSpeed = 4;
const BASE_BALL_SPEED = 4;
const SPEED_INCREASE_PER_HIT = 0.25;
const MAX_TRAIL_LENGTH = 8; // Constant for trail optimization

// Pre-create gradients and fonts for better performance
let backgroundGradient = null;
let brickOverlayGradient = null;
let paddleGradient = null;
let animationTime = 0; // Single time calculation per frame
const FONTS = {
    CAT_20: '20px Arial',
    CAT_30: '30px Arial',
    BOLD_20: 'bold 20px Arial'
};

function createGradients() {
    backgroundGradient = ctx.createLinearGradient(0, 0, 0, canvas.logicalHeight);
    backgroundGradient.addColorStop(0, '#4A1942');
    backgroundGradient.addColorStop(0.5, '#67294C');
    backgroundGradient.addColorStop(1, '#2A1A3D');
    
    // Pre-create brick overlay gradient
    brickOverlayGradient = ctx.createLinearGradient(0, 0, 0, BRICK_HEIGHT);
    brickOverlayGradient.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
    brickOverlayGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
    brickOverlayGradient.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
    
    // Pre-create paddle gradient
    paddleGradient = ctx.createLinearGradient(0, 0, 0, PADDLE_HEIGHT);
    paddleGradient.addColorStop(0, PALETTE.PINK_PASTEL);
    paddleGradient.addColorStop(1, PALETTE.PINK_HOT);
}

// Audio using Web Audio API
let audioContext = null;
let audioBuffers = {
    paddle: null,
    brick: null,
    wall: null,
    lose: null,
    catchCat: null
};
let audioEnabled = false;

// Load audio files
async function loadAudio() {
    try {
        const loadSound = async (url) => {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            return await audioContext.decodeAudioData(arrayBuffer);
        };
        
        audioBuffers.paddle = await loadSound('../audio/breakout-paddle.wav');
        audioBuffers.brick = await loadSound('../audio/breakout-brick.wav');
        audioBuffers.wall = await loadSound('../audio/breakout-wall.wav');
        audioBuffers.lose = await loadSound('../audio/breakout-lose.wav');
        audioBuffers.catchCat = await loadSound('../audio/meow.wav');
        
        audioEnabled = true;
    } catch (error) {
        console.log('Audio files not found - game will run without sound');
        audioEnabled = false;
    }
}

// Play a sound effect
function playSound(soundName) {
    if (!audioEnabled || !audioContext || !audioBuffers[soundName]) return;
    try {
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffers[soundName];
        
        const gainNode = audioContext.createGain();
        const volumes = { paddle: 0.5, brick: 0.6, wall: 0.4, lose: 0.7, catchCat: 0.6 };
        gainNode.gain.value = volumes[soundName] || 0.5;
        
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
let isDragging = false;

controls.on('touchstart', async (pos) => {
    // Disable input during animations
    if (gameAnimations.isAnimating()) {
        return;
    }
    
    isDragging = true;
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
    }
});

controls.on('touchmove', (pos) => {
    // Disable input during animations
    if (gameAnimations.isAnimating()) {
        return;
    }
    
    if (isDragging) {
        paddle.x = clamp(pos.x - PADDLE_WIDTH / 2, 0, canvas.logicalWidth - PADDLE_WIDTH);
    }
});

controls.on('tap', () => {
    // Disable input during animations
    if (gameAnimations.isAnimating()) {
        return;
    }
    
    if (!gameRunning) {
        startGame();
    }
});

controls.init();

// Initialize game
function initGame() {
    // Reset paddle and ball
    paddle.x = canvas.logicalWidth / 2 - PADDLE_WIDTH / 2;
    ball.x = canvas.logicalWidth / 2;
    ball.y = canvas.logicalHeight - 60;
    currentBallSpeed = BASE_BALL_SPEED;
    const angle = Math.PI / 4; // 45 degrees
    ball.dx = currentBallSpeed * Math.sin(angle);
    ball.dy = -currentBallSpeed * Math.cos(angle);
    lives = 3;
    catsRescued = 0;
    fallingCats = [];
    gameRunning = false;
    
    // Create bricks
    bricks = [];
    const colors = [PALETTE.RED_PRIMARY, PALETTE.PINK_HOT, PALETTE.PINK_PASTEL, PALETTE.RED_CHERRY, PALETTE.RED_DARK];
    
    // Determine which bricks will have cats (concentrated in top rows)
    const totalBricks = BRICK_ROWS * BRICK_COLS;
    const catBrickCount = Math.max(5, Math.floor(totalBricks * 0.3)); // 30% have cats, minimum 5
    const catIndices = [];
    
    // Weight cat placement toward top rows
    // Row 0 (top): 50% chance, Row 1: 40%, Row 2: 30%, Row 3: 20%, Row 4: 10%
    const rowWeights = [0.50, 0.40, 0.30, 0.20, 0.10];
    
    let brickIndex = 0;
    for (let row = 0; row < BRICK_ROWS; row++) {
        for (let col = 0; col < BRICK_COLS; col++) {
            if (catIndices.length < catBrickCount && Math.random() < rowWeights[row]) {
                catIndices.push(brickIndex);
            }
            brickIndex++;
        }
    }
    
    // If we didn't get enough cats, add more to top rows
    while (catIndices.length < catBrickCount) {
        const idx = Math.floor(Math.random() * BRICK_COLS * 2); // Only top 2 rows
        if (!catIndices.includes(idx)) {
            catIndices.push(idx);
        }
    }
    
    brickIndex = 0;
    for (let row = 0; row < BRICK_ROWS; row++) {
        bricks[row] = [];
        for (let col = 0; col < BRICK_COLS; col++) {
            const hasCat = catIndices.includes(brickIndex);
            bricks[row][col] = {
                x: BRICK_OFFSET_LEFT + col * (BRICK_WIDTH + BRICK_PADDING),
                y: BRICK_OFFSET_TOP + row * (BRICK_HEIGHT + BRICK_PADDING),
                width: BRICK_WIDTH,
                height: BRICK_HEIGHT,
                color: colors[row % colors.length],
                visible: true,
                hasCat: hasCat,
                catEmoji: hasCat ? CAT_EMOJIS[Math.floor(Math.random() * CAT_EMOJIS.length)] : null,
                catAnimOffset: hasCat ? Math.random() * Math.PI * 2 : 0
            };
            brickIndex++;
        }
    }
    
    bricksRemaining = BRICK_ROWS * BRICK_COLS;
    
    // Initialize gradients for better performance
    createGradients();
    
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
    // Add current ball position to trail
    ballTrail.push({ x: ball.x, y: ball.y });
    if (ballTrail.length > MAX_TRAIL_LENGTH) {
        ballTrail.shift(); // Keep only last positions for performance
    }
    
    // Move ball
    ball.x += ball.dx;
    ball.y += ball.dy;
    
    // Wall collision
    if (ball.x + ball.radius > canvas.logicalWidth || ball.x - ball.radius < 0) {
        ball.dx = -ball.dx;
        playSound('wall');
        
        // Prevent shallow angles - ensure minimum vertical speed
        const minVerticalSpeed = currentBallSpeed * 0.3;
        if (Math.abs(ball.dy) < minVerticalSpeed) {
            ball.dy = ball.dy > 0 ? minVerticalSpeed : -minVerticalSpeed;
            // Adjust dx to maintain overall speed
            const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
            const ratio = currentBallSpeed / speed;
            ball.dx *= ratio;
            ball.dy *= ratio;
        }
    }
    
    if (ball.y - ball.radius < 0) {
        ball.dy = -ball.dy;
        playSound('wall');
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
        
        playSound('paddle');
        particles.createParticles(ball.x, ball.y, 10, PALETTE.PINK_HOT);
    }
    
    // Ball falls below paddle
    if (ball.y - ball.radius > canvas.logicalHeight) {
        lives--;
        playSound('lose');
        updateUI();
        
        if (lives <= 0) {
            gameOver();
            return;
        }
        
        // Reset ball with base speed
        ball.x = canvas.logicalWidth / 2;
        ball.y = canvas.logicalHeight - 60;
        currentBallSpeed = BASE_BALL_SPEED; // Reset to base speed
        const angle = Math.PI / 4; // 45 degrees
        ball.dx = currentBallSpeed * Math.sin(angle);
        ball.dy = -currentBallSpeed * Math.cos(angle);
        gameRunning = false;
    }
    
    // Update falling cats
    for (let i = fallingCats.length - 1; i >= 0; i--) {
        const cat = fallingCats[i];
        cat.y += CAT_FALL_SPEED;
        
        // Check if paddle caught the cat
        if (cat.y + 20 >= paddle.y && 
            cat.y <= paddle.y + paddle.height &&
            cat.x + 15 >= paddle.x && 
            cat.x <= paddle.x + paddle.width) {
            catsRescued++;
            playSound('catchCat');
            fallingCats.splice(i, 1);
            particles.createParticles(cat.x + 15, cat.y + 10, 20, PALETTE.YELLOW_GOLD);
            updateUI();
            
            // Check win condition
            if (catsRescued >= CATS_TO_RESCUE) {
                winGame();
                return;
            }
        }
        // Cat fell off screen
        else if (cat.y > canvas.logicalHeight) {
            fallingCats.splice(i, 1);
        }
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
                playSound('brick');
                bricksRemaining--;
                
                // If brick has a cat, make it fall
                if (brick.hasCat) {
                    fallingCats.push({
                        x: brick.x + brick.width / 2 - 15,
                        y: brick.y + brick.height,
                        emoji: brick.catEmoji
                    });
                }
                
                particles.createParticles(
                    brick.x + brick.width / 2,
                    brick.y + brick.height / 2,
                    15,
                    brick.color
                );
                
                updateUI();
                
                // Check lose condition: no more bricks but haven't rescued 5 cats
                if (bricksRemaining === 0 && catsRescued < CATS_TO_RESCUE) {
                    gameOver();
                    return;
                }
                
                return; // Only hit one brick per frame
            }
        }
    }
}

function draw() {
    // Update animation time once per frame
    animationTime = Date.now() * 0.002;
        // Apply shake animation if active
    ctx.save();
    gameAnimations.applyShake();
        // Clear canvas with gradient background (pre-created for performance)
    ctx.fillStyle = backgroundGradient;
    ctx.fillRect(0, 0, canvas.logicalWidth, canvas.logicalHeight);
    
    // Draw bricks - optimized rendering
    const radius = 6;
    
    // First pass: Draw all brick shadows (batched for performance)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    bricks.forEach(row => {
        row.forEach(brick => {
            if (brick.visible) {
                ctx.beginPath();
                ctx.roundRect(brick.x + 2, brick.y + 2, brick.width, brick.height, radius);
                ctx.fill();
            }
        });
    });
    
    // Second pass: Draw brick colors and overlays
    bricks.forEach(row => {
        row.forEach(brick => {
            if (brick.visible) {
                // Main brick color
                ctx.fillStyle = brick.color;
                ctx.beginPath();
                ctx.roundRect(brick.x, brick.y, brick.width, brick.height, radius);
                ctx.fill();
                
                // Use pre-created gradient with transform for 3D effect
                ctx.save();
                ctx.translate(brick.x, brick.y);
                ctx.fillStyle = brickOverlayGradient;
                ctx.beginPath();
                ctx.roundRect(0, 0, brick.width, brick.height, radius);
                ctx.fill();
                ctx.restore();
                
                // Add subtle border (only for cat bricks to reduce draw calls)
                if (brick.hasCat) {
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.roundRect(brick.x, brick.y, brick.width, brick.height, radius);
                    ctx.stroke();
                }
            }
        });
    });
    
    // Third pass: Draw cat emojis (if any) - separate to batch font operations
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    bricks.forEach(row => {
        row.forEach(brick => {
            if (brick.visible && brick.hasCat) {
                // Calculate slight movement animation using shared time
                const offsetX = Math.sin(animationTime + brick.catAnimOffset) * 2;
                const offsetY = Math.cos(animationTime * 1.5 + brick.catAnimOffset) * 1.5;
                
                // White background circle for better visibility
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.beginPath();
                ctx.arc(brick.x + brick.width / 2 + offsetX, brick.y + brick.height / 2 + offsetY, 12, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw cat emoji
                ctx.fillStyle = '#000000';
                ctx.fillText(brick.catEmoji, brick.x + brick.width / 2 + offsetX, brick.y + brick.height / 2 + offsetY);
            }
        });
    });
    
    // Draw falling cats (batch font operations)
    if (fallingCats.length > 0) {
        ctx.fillStyle = '#000000';
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        fallingCats.forEach(cat => {
            ctx.fillText(cat.emoji, cat.x + 15, cat.y);
        });
    }
    
    // Draw paddle with pre-created gradient
    ctx.save();
    ctx.translate(paddle.x, paddle.y);
    ctx.fillStyle = paddleGradient;
    ctx.fillRect(0, 0, paddle.width, paddle.height);
    
    // Round corners
    ctx.fillStyle = PALETTE.PINK_PASTEL;
    ctx.beginPath();
    ctx.arc(5, paddle.height / 2, 5, 0, Math.PI * 2);
    ctx.arc(paddle.width - 5, paddle.height / 2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Draw ball trail (optimized - only draw every other trail point for performance)
    for (let i = 0; i < ballTrail.length; i += 2) {
        const alpha = (i + 1) / ballTrail.length * 0.3;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(ballTrail[i].x, ballTrail[i].y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Draw ball with subtle glow (reduced blur for performance)
    ctx.fillStyle = PALETTE.WHITE;
    ctx.shadowBlur = 8; // Reduced from 15
    ctx.shadowColor = PALETTE.PINK_HOT;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Draw particles
    particles.update();
    particles.draw();
    
    ctx.restore();
    
    // Draw heart rain animation
    if (gameAnimations.isAnimating()) {
        gameAnimations.drawHeartRain();
    }
    
    // Draw start message
    if (!gameRunning && lives > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Tap to Launch!', canvas.logicalWidth / 2, canvas.logicalHeight / 2);
    }
}

function gameLoop() {
    if (gameRunning) {
        update();
    }
    
    draw();
    
    if (gameRunning || lives > 0 || gameAnimations.isAnimating()) {
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

function updateUI() {
    document.getElementById('cats').textContent = `${catsRescued}/${CATS_TO_RESCUE}`;
    document.getElementById('lives').textContent = lives;
    const catsOverlay = document.getElementById('cats-overlay');
    const livesOverlay = document.getElementById('lives-overlay');
    if (catsOverlay) catsOverlay.textContent = `${catsRescued}/${CATS_TO_RESCUE}`;
    if (livesOverlay) livesOverlay.textContent = lives;
}

function gameOver() {
    gameRunning = false;
    gameAnimations.startShake();
    
    setTimeout(() => {
        setPlayingMode(false);
        document.getElementById('gameOverScreen').classList.add('show');
    }, 800);
}

function winGame() {
    gameRunning = false;
    gameAnimations.startHeartRain();
    
    setTimeout(() => {
        setPlayingMode(false);
        showWinScreen(
            "You rescued all 5 cats! You're purr-fect! 🐱💕",
            restartGame
        );
    }, 2000);
}

function restartGame() {
    document.getElementById('gameOverScreen').classList.remove('show');
    initGame();
}

// Initialize game (audio loads on first user interaction)
initGame();
