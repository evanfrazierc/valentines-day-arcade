// Kitty Catcher Game - For Juliette
const canvas = document.getElementById('gameCanvas');
const ctx = setupCanvas(canvas, 350, 600);

// Game constants
const PADDLE_WIDTH = 80;
const PADDLE_HEIGHT = 15;
const PADDLE_SPEED = 8;
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
const CAT_EMOJIS = ['🐱', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '🐈'];

// Game state
let paddle = { x: canvas.logicalWidth / 2 - PADDLE_WIDTH / 2, y: canvas.logicalHeight - 40, width: PADDLE_WIDTH, height: PADDLE_HEIGHT };
let ball = { x: canvas.logicalWidth / 2, y: canvas.logicalHeight - 60, dx: 4, dy: -4, radius: BALL_RADIUS };
let ballTrail = []; // For motion blur effect
let bricks = [];
let fallingCats = [];
let fallingRainbow = null; // Rainbow powerup falling
let fallingHeart = null; // Heart powerup falling
let rainbowPowerupActive = false;
let rainbowPowerupEndTime = 0;
let lives = 3;
let catsRescued = 0;
let gameRunning = false;
let bricksRemaining = 0;
let animationFrameId = null;
let currentBallSpeed = 4;
let basePaddleWidth = PADDLE_WIDTH; // Track current paddle width in endless mode
let currentLevel = 1; // Track difficulty level for brick durability
const BASE_BALL_SPEED = 4;
const SPEED_INCREASE_PER_HIT = 0.25;
const MAX_TRAIL_LENGTH = 8; // Constant for trail optimization
// Endless mode - check URL parameter or default to true
const urlParams = new URLSearchParams(window.location.search);
const endlessParam = urlParams.get('endless');
let endlessMode = endlessParam !== null ? (endlessParam === 'true' || endlessParam === '1') : true;
let highScore = 0;

// Tilt controls
let tiltControlsEnabled = false;
let tiltControlsAvailable = false;
let tiltCalibration = 0; // Store initial tilt angle

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

function loadHighScore() {
    return parseInt(localStorage.getItem('kittyCatcherHighScore') || '0');
}

function saveHighScore(score) {
    const currentHigh = loadHighScore();
    if (score > currentHigh) {
        localStorage.setItem('kittyCatcherHighScore', score.toString());
        highScore = score;
        updateHighScoreDisplay();
    }
}

function updateHighScoreDisplay() {
    const highScoreEl = document.getElementById('highScore');
    if (highScoreEl) {
        highScoreEl.textContent = highScore;
    }
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

// Tilt controls setup
function handleOrientation(event) {
    if (!tiltControlsEnabled || !gameRunning) return;
    
    // Use gamma (left-right tilt) for horizontal movement
    // gamma ranges from -90 to 90 degrees
    const gamma = event.gamma;
    if (gamma === null) return;
    
    // Calculate relative tilt from calibration
    const relativeTilt = gamma - tiltCalibration;
    
    // Map tilt angle to paddle position
    // Sensitivity: ~30 degrees of tilt covers the full screen
    const sensitivity = 30;
    const normalizedTilt = Math.max(-1, Math.min(1, relativeTilt / sensitivity));
    
    // Center is canvas width / 2, move based on tilt
    const centerX = canvas.logicalWidth / 2;
    const range = canvas.logicalWidth / 2 - PADDLE_WIDTH / 2;
    paddle.x = centerX + (normalizedTilt * range) - PADDLE_WIDTH / 2;
    paddle.x = clamp(paddle.x, 0, canvas.logicalWidth - PADDLE_WIDTH);
}

async function requestTiltPermission() {
    // Check if device orientation is available
    if (!window.DeviceOrientationEvent) {
        alert('Device orientation is not supported on this device.');
        return false;
    }
    
    // iOS 13+ requires permission
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
            const permission = await DeviceOrientationEvent.requestPermission();
            if (permission === 'granted') {
                return true;
            } else {
                alert('Permission to access device orientation was denied.');
                return false;
            }
        } catch (error) {
            console.error('Error requesting device orientation permission:', error);
            alert('Could not request device orientation permission.');
            return false;
        }
    }
    
    // Non-iOS or older iOS, permission not required
    return true;
}

function calibrateTilt() {
    // Capture current device orientation as the "center" position
    const handleCalibration = (event) => {
        tiltCalibration = event.gamma || 0;
        window.removeEventListener('deviceorientation', handleCalibration);
    };
    window.addEventListener('deviceorientation', handleCalibration);
}

function enableTiltControls() {
    window.addEventListener('deviceorientation', handleOrientation);
    calibrateTilt();
    tiltControlsEnabled = true;
}

function disableTiltControls() {
    window.removeEventListener('deviceorientation', handleOrientation);
    tiltControlsEnabled = false;
}

// Check if tilt controls are available on this device
if (window.DeviceOrientationEvent) {
    tiltControlsAvailable = true;
    
    // Add tilt toggle button if on mobile
    if ('ontouchstart' in window) {
        const gameControls = document.querySelector('.game-controls');
        if (gameControls) {
            const tiltToggle = document.createElement('button');
            tiltToggle.id = 'tiltToggle';
            tiltToggle.className = 'btn';
            tiltToggle.textContent = '📱 Enable Tilt Controls';
            tiltToggle.style.marginTop = '10px';
            
            tiltToggle.addEventListener('click', async () => {
                if (!tiltControlsEnabled) {
                    const granted = await requestTiltPermission();
                    if (granted) {
                        enableTiltControls();
                        tiltToggle.textContent = '📱 Disable Tilt Controls';
                        tiltToggle.classList.add('active');
                    }
                } else {
                    disableTiltControls();
                    tiltToggle.textContent = '📱 Enable Tilt Controls';
                    tiltToggle.classList.remove('active');
                }
            });
            
            gameControls.appendChild(tiltToggle);
        }
    }
}

controls.init();

// Keyboard controls
let keysPressed = {};
window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        keysPressed[e.key] = true;
        
        if (!gameRunning) {
            startGame();
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        keysPressed[e.key] = false;
    }
});

// Initialize game
function initGame() {
    // Reset paddle and ball
    paddle.x = canvas.logicalWidth / 2 - PADDLE_WIDTH / 2;
    basePaddleWidth = PADDLE_WIDTH;
    paddle.width = basePaddleWidth;
    // Don't reset currentLevel here - it's managed by level progression
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
    
    // Choose one random brick to be the rainbow brick first
    const rainbowBrickIndex = Math.floor(Math.random() * (BRICK_ROWS * BRICK_COLS));
    
    // Determine which bricks will have cats (concentrated in top rows)
    const totalBricks = BRICK_ROWS * BRICK_COLS;
    const catBrickCount = Math.max(5, Math.floor(totalBricks * 0.3)); // 30% have cats, minimum 5
    const catIndices = [];
    
    // Weight cat placement toward top rows
    // Row 0 (top): 50% chance, Row 1: 40%, Row 2: 30%, Row 3: 20%, Row 4: 10%
    const rowWeights = [0.50, 0.40, 0.30, 0.20, 0.10];
    
    let brickIndex = 0;
    
    // Choose heart block first if player has lost lives (lives < 3)
    let heartBrickIndex = -1;
    if (lives < 3) {
        // Find a brick that's not rainbow
        const availableIndices = [];
        for (let i = 0; i < totalBricks; i++) {
            if (i !== rainbowBrickIndex) {
                availableIndices.push(i);
            }
        }
        if (availableIndices.length > 0) {
            heartBrickIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
        }
    }
    
    for (let row = 0; row < BRICK_ROWS; row++) {
        for (let col = 0; col < BRICK_COLS; col++) {
            // Don't put cats in the rainbow brick or heart brick
            if (brickIndex !== rainbowBrickIndex && brickIndex !== heartBrickIndex && catIndices.length < catBrickCount && Math.random() < rowWeights[row]) {
                catIndices.push(brickIndex);
            }
            brickIndex++;
        }
    }
    
    brickIndex = 0;
    
    // Choose stone blocks (2 per level starting from level 2)
    const stoneBlockCount = currentLevel >= 2 ? (currentLevel - 1) * 2 : 0;
    const stoneBlockIndices = [];
    const totalBrickCount = BRICK_ROWS * BRICK_COLS;
    
    // Randomly select stone blocks (avoid rainbow and heart brick)
    while (stoneBlockIndices.length < stoneBlockCount && stoneBlockIndices.length < totalBrickCount - 1) {
        const idx = Math.floor(Math.random() * totalBrickCount);
        if (idx !== rainbowBrickIndex && idx !== heartBrickIndex && !stoneBlockIndices.includes(idx)) {
            stoneBlockIndices.push(idx);
        }
    }
    
    for (let row = 0; row < BRICK_ROWS; row++) {
        bricks[row] = [];
        for (let col = 0; col < BRICK_COLS; col++) {
            const hasCat = catIndices.includes(brickIndex);
            const isRainbow = brickIndex === rainbowBrickIndex;
            const isStone = stoneBlockIndices.includes(brickIndex);
            const isHeart = brickIndex === heartBrickIndex;
            // Durability: stone blocks = 2 hits, normal bricks = 1 hit
            const durability = isStone ? 2 : 1;
            bricks[row][col] = {
                x: BRICK_OFFSET_LEFT + col * (BRICK_WIDTH + BRICK_PADDING),
                y: BRICK_OFFSET_TOP + row * (BRICK_HEIGHT + BRICK_PADDING),
                width: BRICK_WIDTH,
                height: BRICK_HEIGHT,
                color: colors[row % colors.length],
                visible: true,
                hasCat: hasCat,
                isRainbow: isRainbow,
                isStone: isStone,
                isHeart: isHeart,
                catEmoji: hasCat ? CAT_EMOJIS[Math.floor(Math.random() * CAT_EMOJIS.length)] : null,
                durability: durability,
                maxDurability: durability,
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

function addHeartBlockToLevel() {
    // Find a visible brick that's not rainbow or stone and convert it to heart block
    const availableBricks = [];
    for (let row = 0; row < BRICK_ROWS; row++) {
        for (let col = 0; col < BRICK_COLS; col++) {
            const brick = bricks[row][col];
            if (brick.visible && !brick.isRainbow && !brick.isStone) {
                availableBricks.push(brick);
            }
        }
    }
    
    console.log('addHeartBlockToLevel called, available bricks:', availableBricks.length);
    
    if (availableBricks.length > 0) {
        const heartBrick = availableBricks[Math.floor(Math.random() * availableBricks.length)];
        heartBrick.isHeart = true;
        console.log('Heart block added at row', Math.floor(heartBrick.y / (BRICK_HEIGHT + BRICK_PADDING)));
    }
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
    if (!gameRunning) return;
    
    // Check rainbow powerup timer
    if (rainbowPowerupActive && Date.now() > rainbowPowerupEndTime) {
        rainbowPowerupActive = false;
    }
    
    // Handle keyboard input for paddle movement
    if (keysPressed['ArrowLeft']) {
        paddle.x -= PADDLE_SPEED;
        paddle.x = Math.max(0, paddle.x);
    }
    if (keysPressed['ArrowRight']) {
        paddle.x += PADDLE_SPEED;
        paddle.x = Math.min(canvas.logicalWidth - paddle.width, paddle.x);
    }
    
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
        
        // Keep ball inside bounds
        if (ball.x - ball.radius < 0) {
            ball.x = ball.radius;
        } else if (ball.x + ball.radius > canvas.logicalWidth) {
            ball.x = canvas.logicalWidth - ball.radius;
        }
        
        // Prevent shallow angles - ensure minimum vertical speed (increased threshold)
        const minVerticalSpeed = currentBallSpeed * 0.5; // Increased from 0.3 to 0.5
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
        ball.y = ball.radius; // Keep ball inside bounds
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
        // If no bricks remaining, advance to next level without losing life
        if (bricksRemaining === 0) {
            // Just reset the ball position and wait for level advance
            ball.x = canvas.logicalWidth / 2;
            ball.y = canvas.logicalHeight - 60;
            currentBallSpeed = BASE_BALL_SPEED;
            const angle = Math.PI / 4; // 45 degrees
            ball.dx = currentBallSpeed * Math.sin(angle);
            ball.dy = -currentBallSpeed * Math.cos(angle);
            gameRunning = false;
            return;
        }
        
        lives--;
        playSound('lose');
        updateUI();
        
        // Reset rainbow powerup
        rainbowPowerupActive = false;
        rainbowPowerupEndTime = 0;
        
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
            
            // Progressive difficulty in endless mode
            if (endlessMode) {
                // Shrink paddle every 5 cats (minimum 40px)
                if (catsRescued % 5 === 0) {
                    basePaddleWidth = Math.max(40, basePaddleWidth - 8);
                    paddle.width = basePaddleWidth;
                }
            }
            
            updateUI();
            
            // Check win condition
            if (catsRescued >= CATS_TO_RESCUE && !endlessMode) {
                winGame();
                return;
            }
        }
        // Cat fell off screen
        else if (cat.y > canvas.logicalHeight) {
            fallingCats.splice(i, 1);
        }
    }
    
    // Update falling rainbow powerup
    if (fallingRainbow) {
        fallingRainbow.y += CAT_FALL_SPEED;
        fallingRainbow.pulse = (fallingRainbow.pulse + 0.15) % (Math.PI * 2);
        
        // Check if paddle caught the rainbow
        if (fallingRainbow.y + 20 >= paddle.y && 
            fallingRainbow.y <= paddle.y + paddle.height &&
            fallingRainbow.x + 15 >= paddle.x && 
            fallingRainbow.x <= paddle.x + paddle.width) {
            // Activate powerup
            rainbowPowerupActive = true;
            rainbowPowerupEndTime = Date.now() + 10000; // 10 seconds
            fallingRainbow = null;
            playSound('catchCat');
            particles.createParticles(paddle.x + paddle.width / 2, paddle.y, 30, PALETTE.YELLOW_GOLD);
        }
        // Rainbow fell off screen
        else if (fallingRainbow.y > canvas.logicalHeight) {
            fallingRainbow = null;
        }
    }
    
    // Update falling heart powerup
    if (fallingHeart) {
        fallingHeart.y += CAT_FALL_SPEED;
        fallingHeart.pulse = (fallingHeart.pulse + 0.15) % (Math.PI * 2);
        
        // Check if paddle caught the heart
        if (fallingHeart.y + 20 >= paddle.y && 
            fallingHeart.y <= paddle.y + paddle.height &&
            fallingHeart.x + 15 >= paddle.x && 
            fallingHeart.x <= paddle.x + paddle.width) {
            // Give extra life
            lives = Math.min(3, lives + 1);
            fallingHeart = null;
            playSound('catchCat');
            particles.createParticles(paddle.x + paddle.width / 2, paddle.y, 30, PALETTE.PINK_HOT);
            updateUI();
        }
        // Heart fell off screen
        else if (fallingHeart.y > canvas.logicalHeight) {
            fallingHeart = null;
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
                // If rainbow powerup is active, pass through bricks
                if (rainbowPowerupActive) {
                    // Destroy brick instantly without bouncing
                    brick.visible = false;
                    bricksRemaining--;
                    
                    // If brick has a cat, make it fall
                    if (brick.hasCat) {
                        fallingCats.push({
                            x: brick.x + brick.width / 2 - 15,
                            y: brick.y + brick.height,
                            emoji: brick.catEmoji
                        });
                    }
                    
                    playSound('brick');
                    particles.createParticles(
                        brick.x + brick.width / 2,
                        brick.y + brick.height / 2,
                        15,
                        brick.color
                    );
                    
                    updateUI();
                    continue; // Keep going through bricks
                }
                
                // Normal brick hit behavior
                ball.dy = -ball.dy;
                
                // If rainbow brick, spawn falling rainbow powerup
                if (brick.isRainbow && !fallingRainbow) {
                    fallingRainbow = {
                        x: brick.x + brick.width / 2 - 15,
                        y: brick.y + brick.height,
                        pulse: 0 // For pulsing animation
                    };
                }
                
                // If heart brick, spawn falling heart powerup
                if (brick.isHeart && !fallingHeart) {
                    fallingHeart = {
                        x: brick.x + brick.width / 2 - 15,
                        y: brick.y + brick.height,
                        pulse: 0 // For pulsing animation
                    };
                }
                
                // Decrease brick durability
                brick.durability--;
                
                // Only break brick when durability reaches 0
                if (brick.durability <= 0) {
                    brick.visible = false;
                    bricksRemaining--;
                    
                    // If brick has a cat, make it fall
                    if (brick.hasCat) {
                        fallingCats.push({
                            x: brick.x + brick.width / 2 - 15,
                            y: brick.y + brick.height,
                            emoji: brick.catEmoji
                        });
                    }
                }
                
                playSound('brick');
                
                particles.createParticles(
                    brick.x + brick.width / 2,
                    brick.y + brick.height / 2,
                    15,
                    brick.color
                );
                
                updateUI();
                
                // Check level complete (only if no cats are falling)
                if (bricksRemaining === 0 && fallingCats.length === 0) {
                    if (endlessMode) {
                        // In endless mode, regenerate level without resetting lives or score
                        const currentLives = lives;
                        const currentCatsRescued = catsRescued;
                        const nextLevel = currentLevel + 1;
                        const needsHeartBlock = currentLives < 3; // Check before initGame
                        
                        // Set level before calling initGame so stone blocks are created correctly
                        currentLevel = nextLevel;
                        initGame();
                        lives = currentLives;
                        catsRescued = currentCatsRescued;
                        
                        // Add heart block if needed (after lives are restored)
                        if (needsHeartBlock) {
                            addHeartBlockToLevel();
                        }
                        
                        // Reset rainbow powerup when advancing level
                        rainbowPowerupActive = false;
                        rainbowPowerupEndTime = 0;
                        gameRunning = true;
                        updateUI();
                        playSound('brick');
                        return;
                    } else if (catsRescued < CATS_TO_RESCUE) {
                        // In normal mode, lose if bricks are gone but not enough cats rescued
                        gameOver();
                        return;
                    }
                }
                
                return; // Only hit one brick per frame
            }
        }
    }
    
    // Check level complete at end of update (for when last cat is caught/missed)
    if (bricksRemaining === 0 && fallingCats.length === 0) {
        if (endlessMode) {
            // In endless mode, regenerate level without resetting lives or score
            const currentLives = lives;
            const currentCatsRescued = catsRescued;
            const nextLevel = currentLevel + 1;
            const needsHeartBlock = currentLives < 3; // Check before initGame
            
            // Set level before calling initGame so stone blocks are created correctly
            currentLevel = nextLevel;
            initGame();
            lives = currentLives;
            catsRescued = currentCatsRescued;
            
            // Add heart block if needed (after lives are restored)
            if (needsHeartBlock) {
                addHeartBlockToLevel();
            }
            
            // Reset rainbow powerup when advancing level
            rainbowPowerupActive = false;
            rainbowPowerupEndTime = 0;
            gameRunning = true;
            updateUI();
            playSound('brick');
        } else if (catsRescued < CATS_TO_RESCUE) {
            // In normal mode, lose if bricks are gone but not enough cats rescued
            gameOver();
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
                // Adjust brick opacity based on durability
                const durabilityRatio = brick.durability / brick.maxDurability;
                const alpha = 0.5 + (durabilityRatio * 0.5); // 0.5 to 1.0 opacity
                
                // Rainbow bricks get special gradient
                if (brick.isRainbow) {
                    const rainbowGradient = ctx.createLinearGradient(brick.x, brick.y, brick.x + brick.width, brick.y);
                    rainbowGradient.addColorStop(0, '#FF0000');
                    rainbowGradient.addColorStop(0.2, '#FF7F00');
                    rainbowGradient.addColorStop(0.4, '#FFFF00');
                    rainbowGradient.addColorStop(0.6, '#00FF00');
                    rainbowGradient.addColorStop(0.8, '#0000FF');
                    rainbowGradient.addColorStop(1, '#8B00FF');
                    ctx.fillStyle = rainbowGradient;
                } else if (brick.isHeart) {
                    // Heart blocks get pink gradient
                    const heartGradient = ctx.createRadialGradient(
                        brick.x + brick.width / 2, brick.y + brick.height / 2, 0,
                        brick.x + brick.width / 2, brick.y + brick.height / 2, brick.width / 2
                    );
                    heartGradient.addColorStop(0, '#FF69B4');
                    heartGradient.addColorStop(0.5, '#FF1493');
                    heartGradient.addColorStop(1, '#C71585');
                    ctx.fillStyle = heartGradient;
                } else if (brick.isStone) {
                    // Stone blocks get gray gradient
                    const stoneGradient = ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.height);
                    stoneGradient.addColorStop(0, '#808080');
                    stoneGradient.addColorStop(0.5, '#606060');
                    stoneGradient.addColorStop(1, '#505050');
                    ctx.fillStyle = stoneGradient;
                } else {
                    // Main brick color with durability-based opacity
                    ctx.fillStyle = brick.color;
                }
                
                ctx.globalAlpha = (brick.isRainbow || brick.isStone || brick.isHeart) ? 1.0 : alpha;
                ctx.beginPath();
                ctx.roundRect(brick.x, brick.y, brick.width, brick.height, radius);
                ctx.fill();
                ctx.globalAlpha = 1.0;
                
                // Use pre-created gradient with transform for 3D effect
                ctx.save();
                ctx.translate(brick.x, brick.y);
                ctx.fillStyle = brickOverlayGradient;
                ctx.beginPath();
                ctx.roundRect(0, 0, brick.width, brick.height, radius);
                ctx.fill();
                ctx.restore();
                
                // Draw durability cracks for damaged bricks
                if (brick.durability < brick.maxDurability) {
                    const crackCount = brick.maxDurability - brick.durability;
                    
                    if (brick.isStone) {
                        // Stone blocks get more visible, realistic cracks
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                        ctx.lineWidth = 2;
                        
                        // Draw jagged crack lines
                        for (let i = 0; i < crackCount; i++) {
                            ctx.beginPath();
                            const startX = brick.x + 15 + i * 20;
                            const startY = brick.y + 3;
                            ctx.moveTo(startX, startY);
                            // Zigzag pattern for realistic cracks
                            ctx.lineTo(startX - 3, startY + 7);
                            ctx.lineTo(startX + 2, startY + 10);
                            ctx.lineTo(startX - 2, startY + 14);
                            ctx.lineTo(startX + 1, brick.y + brick.height - 3);
                            ctx.stroke();
                        }
                        
                        // Add dark shadow to cracks for depth
                        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
                        ctx.lineWidth = 1;
                        for (let i = 0; i < crackCount; i++) {
                            ctx.beginPath();
                            const startX = brick.x + 16 + i * 20;
                            const startY = brick.y + 3;
                            ctx.moveTo(startX, startY);
                            ctx.lineTo(startX - 3, startY + 7);
                            ctx.lineTo(startX + 2, startY + 10);
                            ctx.lineTo(startX - 2, startY + 14);
                            ctx.lineTo(startX + 1, brick.y + brick.height - 3);
                            ctx.stroke();
                        }
                    } else {
                        // Regular bricks get simple cracks
                        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
                        ctx.lineWidth = 1.5;
                        for (let i = 0; i < crackCount; i++) {
                            ctx.beginPath();
                            ctx.moveTo(brick.x + 10 + i * 12, brick.y + 5);
                            ctx.lineTo(brick.x + 15 + i * 12, brick.y + brick.height - 5);
                            ctx.stroke();
                        }
                    }
                }
                
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
    
    // Third pass: Draw cat emojis and special block indicators - separate to batch font operations
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
            
            // Draw heart emoji on heart blocks
            if (brick.visible && brick.isHeart) {
                // White background circle for better visibility
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.beginPath();
                ctx.arc(brick.x + brick.width / 2, brick.y + brick.height / 2, 12, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = '#000000';
                ctx.font = '24px Arial';
                ctx.fillText('💖', brick.x + brick.width / 2, brick.y + brick.height / 2);
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
        // Draw falling rainbow powerup with pulsing animation
    if (fallingRainbow) {
        const pulseScale = 1 + Math.sin(fallingRainbow.pulse) * 0.2;
        const fontSize = 30 * pulseScale;
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('🌈', fallingRainbow.x + 15, fallingRainbow.y);
    }
    
    // Draw falling heart powerup with pulsing animation
    if (fallingHeart) {
        const pulseScale = 1 + Math.sin(fallingHeart.pulse) * 0.2;
        const fontSize = 30 * pulseScale;
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('💖', fallingHeart.x + 15, fallingHeart.y);
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
    if (rainbowPowerupActive) {
        // Draw rainbow gradient ball
        const rainbowGradient = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ball.radius);
        const hueOffset = (Date.now() / 10) % 360;
        rainbowGradient.addColorStop(0, `hsl(${hueOffset}, 100%, 70%)`);
        rainbowGradient.addColorStop(0.5, `hsl(${(hueOffset + 60) % 360}, 100%, 60%)`);
        rainbowGradient.addColorStop(1, `hsl(${(hueOffset + 120) % 360}, 100%, 50%)`);
        ctx.fillStyle = rainbowGradient;
        ctx.shadowBlur = 15;
        ctx.shadowColor = `hsl(${hueOffset}, 100%, 60%)`;
    } else {
        ctx.fillStyle = PALETTE.WHITE;
        ctx.shadowBlur = 8; // Reduced from 15
        ctx.shadowColor = PALETTE.PINK_HOT;
    }
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
    if (endlessMode) {
        document.getElementById('cats').textContent = catsRescued;
        const catsOverlay = document.getElementById('cats-overlay');
        if (catsOverlay) catsOverlay.textContent = catsRescued;
    } else {
        document.getElementById('cats').textContent = `${catsRescued}/${CATS_TO_RESCUE}`;
        const catsOverlay = document.getElementById('cats-overlay');
        if (catsOverlay) catsOverlay.textContent = `${catsRescued}/${CATS_TO_RESCUE}`;
    }
    
    const livesText = '❤️'.repeat(lives);
    document.getElementById('lives').textContent = livesText;
    const livesOverlay = document.getElementById('lives-overlay');
    if (livesOverlay) livesOverlay.textContent = livesText;
}

function gameOver() {
    gameRunning = false;
    
    if (endlessMode) {
        saveHighScore(catsRescued);
    }
    
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
            "Juliette, this Valenti...MEOW! THUD! OH NO!\n\nThe cat's in the cupboard, the yarn's on the stove.\n\nIt sprinted, it vanished, it's now on your head.\n\nThe cat says, \"Happy Valentine's,\" then goes back to bed 🐱💕",
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

// Endless mode toggle
const endlessToggle = document.getElementById('endlessToggle');
if (endlessToggle) {
    // Set initial checkbox state and display
    endlessToggle.checked = endlessMode;
    const highScoreLabel = document.getElementById('highScoreLabel');
    const highScoreValue = document.getElementById('highScoreValue');
    const valentineMessage = document.getElementById('valentineMessage');
    
    if (endlessMode) {
        highScore = loadHighScore();
        updateHighScoreDisplay();
        highScoreLabel.style.display = 'block';
        highScoreValue.style.display = 'block';
        if (valentineMessage) valentineMessage.style.display = 'none';
    } else {
        if (valentineMessage) valentineMessage.style.display = 'block';
    }
    
    endlessToggle.addEventListener('change', (e) => {
        endlessMode = e.target.checked;
        
        if (endlessMode) {
            highScore = loadHighScore();
            updateHighScoreDisplay();
            highScoreLabel.style.display = 'block';
            highScoreValue.style.display = 'block';
            if (valentineMessage) valentineMessage.style.display = 'none';
        } else {
            highScoreLabel.style.display = 'none';
            highScoreValue.style.display = 'none';
            if (valentineMessage) valentineMessage.style.display = 'block';
        }
        
        updateUI();
    });
}
