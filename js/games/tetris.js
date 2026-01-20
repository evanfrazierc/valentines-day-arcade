// Love Blocks Game - For Megan
const canvas = document.getElementById('gameCanvas');
const ctx = setupCanvas(canvas, 300, 600);

// Game constants
const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = canvas.logicalWidth / COLS;
const WIN_LINES = 10;

// Tetromino shapes (heart-themed variations)
const SHAPES = [
    [[1, 1, 1, 1]], // I
    [[1, 1], [1, 1]], // O
    [[0, 1, 0], [1, 1, 1]], // T
    [[1, 1, 0], [0, 1, 1]], // S
    [[0, 1, 1], [1, 1, 0]], // Z
    [[1, 0, 0], [1, 1, 1]], // L
    [[0, 0, 1], [1, 1, 1]]  // J
];

const COLORS = [PALETTE.RED_PRIMARY, PALETTE.PINK_HOT, PALETTE.PINK_PASTEL, PALETTE.RED_CHERRY, PALETTE.RED_DARK, PALETTE.CORAL_PINK, PALETTE.RED_VIBRANT];

// Game state
let board = [];
let currentPiece = null;
let currentX = 0;
let currentY = 0;
let currentRotation = 0;
let score = 0;
let lines = 0;
let gameRunning = false;
let dropTimer = 0;
let dropInterval = 60;
let fastDrop = false;
// Endless mode - check URL parameter or default to true
const urlParams = new URLSearchParams(window.location.search);
const endlessParam = urlParams.get('endless');
let endlessMode = endlessParam !== null ? (endlessParam === 'true' || endlessParam === '1') : true;
let highScore = 0;

// Pre-create gradient for better performance
let backgroundGradient = null;
function createGradient() {
    backgroundGradient = ctx.createLinearGradient(0, 0, 0, canvas.logicalHeight);
    backgroundGradient.addColorStop(0, PALETTE.BROWN_MAHOGANY);
    backgroundGradient.addColorStop(1, PALETTE.RED_DARK);
}

// Audio using Web Audio API
let audioContext = null;
let audioBuffers = {
    rotate: null,
    drop: null,
    line: null
};
let audioEnabled = false;

async function loadAudio() {
    try {
        const loadSound = async (url) => {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            return await audioContext.decodeAudioData(arrayBuffer);
        };
        
        audioBuffers.rotate = await loadSound('../audio/tetris-rotate.wav');
        audioBuffers.drop = await loadSound('../audio/tetris-drop.wav');
        audioBuffers.line = await loadSound('../audio/tetris-line.wav');
        
        audioEnabled = true;
    } catch (error) {
        audioEnabled = false;
    }
}

function playSound(soundName) {
    if (!audioEnabled || !audioContext || !audioBuffers[soundName]) return;
    try {
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffers[soundName];
        
        const gainNode = audioContext.createGain();
        gainNode.gain.value = soundName === 'rotate' ? 0.3 : soundName === 'drop' ? 0.5 : 0.7;
        
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        source.start(0);
    } catch (error) {}
}

function loadHighScore() {
    return parseInt(localStorage.getItem('tetrisHighScore') || '0');
}

function saveHighScore(score) {
    const currentHigh = loadHighScore();
    if (score > currentHigh) {
        localStorage.setItem('tetrisHighScore', score.toString());
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
let lastSwipeTime = 0;

controls.on('swipe', (direction) => {
    // Disable input during animations
    if (gameAnimations.isAnimating()) {
        return;
    }
    
    if (!gameRunning) {
        startGame();
        return;
    }
    
    const now = Date.now();
    if (now - lastSwipeTime < 100) return; // Debounce
    lastSwipeTime = now;
    
    switch(direction) {
        case 'left':
            movePiece(-1, 0);
            break;
        case 'right':
            movePiece(1, 0);
            break;
        case 'down':
            fastDrop = true;
            break;
    }
});

controls.on('tap', () => {
    // Disable input during animations
    if (gameAnimations.isAnimating()) {
        return;
    }
    
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (audioContext.state === 'suspended') {
            audioContext.resume();
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
    rotatePiece();
});

controls.init();

// Keyboard controls
window.addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '].includes(e.key)) {
        e.preventDefault();
        
        if (gameAnimations.isAnimating()) {
            return;
        }
        
        if (!gameRunning) {
            startGame();
            return;
        }
        
        switch(e.key) {
            case 'ArrowLeft':
                movePiece(-1);
                break;
            case 'ArrowRight':
                movePiece(1);
                break;
            case 'ArrowDown':
                fastDrop = true;
                break;
            case 'ArrowUp':
            case ' ':
                rotatePiece();
                break;
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowDown') {
        fastDrop = false;
    }
});

// Initialize game
function initGame() {
    // Create empty board
    board = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
    
    score = 0;
    lines = 0;
    dropTimer = 0;
    fastDrop = false;
    gameRunning = false;
    
    // Initialize gradient for better performance
    createGradient();
    
    updateUI();
    draw();
}

function startGame() {
    gameRunning = true;
    setPlayingMode(true);
    spawnPiece();
    gameLoop();
}

function spawnPiece() {
    const shapeIndex = Math.floor(Math.random() * SHAPES.length);
    currentPiece = {
        shape: SHAPES[shapeIndex],
        color: COLORS[shapeIndex]
    };
    currentRotation = 0;
    currentX = Math.floor(COLS / 2) - Math.floor(currentPiece.shape[0].length / 2);
    currentY = 0;
    
    // Check if game over
    if (checkCollision(0, 0)) {
        gameOver();
    }
}

function checkCollision(offsetX, offsetY, rotation = currentRotation) {
    const shape = getRotatedShape(rotation);
    
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                const newX = currentX + x + offsetX;
                const newY = currentY + y + offsetY;
                
                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true;
                }
                
                if (newY >= 0 && board[newY][newX]) {
                    return true;
                }
            }
        }
    }
    
    return false;
}

function getRotatedShape(rotation) {
    let shape = currentPiece.shape;
    
    for (let i = 0; i < rotation; i++) {
        const rotated = [];
        for (let x = 0; x < shape[0].length; x++) {
            const row = [];
            for (let y = shape.length - 1; y >= 0; y--) {
                row.push(shape[y][x]);
            }
            rotated.push(row);
        }
        shape = rotated;
    }
    
    return shape;
}

function movePiece(dx, dy) {
    if (!checkCollision(dx, dy)) {
        currentX += dx;
        currentY += dy;
        return true;
    }
    return false;
}

function rotatePiece() {
    const newRotation = (currentRotation + 1) % 4;
    
    if (!checkCollision(0, 0, newRotation)) {
        currentRotation = newRotation;
        playSound('rotate');
        particles.createParticles(
            (currentX + 1) * BLOCK_SIZE,
            (currentY + 1) * BLOCK_SIZE,
            5,
            currentPiece.color
        );
    }
}

function lockPiece() {
    const shape = getRotatedShape(currentRotation);
    
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                const boardY = currentY + y;
                if (boardY >= 0) {
                    board[boardY][currentX + x] = currentPiece.color;
                }
            }
        }
    }
    
    clearLines();
    playSound('drop');
    spawnPiece();
    fastDrop = false;
}

function clearLines() {
    let linesCleared = 0;
    
    for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(cell => cell !== 0)) {
            playSound('line');
            // Create particles for cleared line
            for (let x = 0; x < COLS; x++) {
                particles.createParticles(
                    x * BLOCK_SIZE + BLOCK_SIZE / 2,
                    y * BLOCK_SIZE + BLOCK_SIZE / 2,
                    3,
                    board[y][x]
                );
            }
            
            board.splice(y, 1);
            board.unshift(Array(COLS).fill(0));
            linesCleared++;
            y++; // Check same row again
        }
    }
    
    if (linesCleared > 0) {
        lines += linesCleared;
        score += linesCleared * 100 * linesCleared; // Bonus for multiple lines
        
        if (lines >= WIN_LINES && !endlessMode) {
            winGame();
        }
        
        updateUI();
    }
}

function update() {
    dropTimer++;
    const interval = fastDrop ? 3 : dropInterval;
    
    if (dropTimer >= interval) {
        if (!movePiece(0, 1)) {
            lockPiece();
        }
        dropTimer = 0;
    }
}

function draw() {
    // Apply shake animation if active
    ctx.save();
    gameAnimations.applyShake();
    
    // Clear canvas (pre-created gradient for performance)
    ctx.fillStyle = backgroundGradient;
    ctx.fillRect(0, 0, canvas.logicalWidth, canvas.logicalHeight);
    
    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * BLOCK_SIZE);
        ctx.lineTo(canvas.logicalWidth, y * BLOCK_SIZE);
        ctx.stroke();
    }
    for (let x = 0; x <= COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * BLOCK_SIZE, 0);
        ctx.lineTo(x * BLOCK_SIZE, canvas.logicalHeight);
        ctx.stroke();
    }
    
    // Draw locked pieces
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (board[y][x]) {
                ctx.fillStyle = board[y][x];
                ctx.fillRect(
                    x * BLOCK_SIZE + 1,
                    y * BLOCK_SIZE + 1,
                    BLOCK_SIZE - 2,
                    BLOCK_SIZE - 2
                );
                
                // Highlight
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.fillRect(
                    x * BLOCK_SIZE + 3,
                    y * BLOCK_SIZE + 3,
                    BLOCK_SIZE - 6,
                    BLOCK_SIZE / 3
                );
            }
        }
    }
    
    // Draw current piece
    if (currentPiece) {
        const shape = getRotatedShape(currentRotation);
        ctx.fillStyle = currentPiece.color;
        
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    ctx.fillRect(
                        (currentX + x) * BLOCK_SIZE + 1,
                        (currentY + y) * BLOCK_SIZE + 1,
                        BLOCK_SIZE - 2,
                        BLOCK_SIZE - 2
                    );
                    
                    // Highlight
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                    ctx.fillRect(
                        (currentX + x) * BLOCK_SIZE + 3,
                        (currentY + y) * BLOCK_SIZE + 3,
                        BLOCK_SIZE - 6,
                        BLOCK_SIZE / 3
                    );
                    ctx.fillStyle = currentPiece.color;
                }
            }
        }
    }
    
    // Draw particles
    particles.update();
    particles.draw();
    
    ctx.restore();
    
    // Draw heart rain animation
    if (gameAnimations.isAnimating()) {
        gameAnimations.drawHeartRain();
    }
    
    // Draw start message
    if (!gameRunning) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, canvas.logicalHeight / 2 - 40, canvas.logicalWidth, 80);
        
        ctx.fillStyle = PALETTE.WHITE;
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Tap to Start!', canvas.logicalWidth / 2, canvas.logicalHeight / 2);
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
    if (endlessMode) {
        document.getElementById('lines').textContent = lines;
        const linesOverlay = document.getElementById('lines-overlay');
        if (linesOverlay) linesOverlay.textContent = lines;
    } else {
        document.getElementById('lines').textContent = `${lines}/${WIN_LINES}`;
        const linesOverlay = document.getElementById('lines-overlay');
        if (linesOverlay) linesOverlay.textContent = `${lines}/${WIN_LINES}`;
    }
    
    document.getElementById('score').textContent = score;
    const scoreOverlay = document.getElementById('score-overlay');
    if (scoreOverlay) scoreOverlay.textContent = score;
}

function gameOver() {
    gameRunning = false;
    
    if (endlessMode) {
        saveHighScore(score);
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
            "Megan, our love blocks fit perfectly! ❤️🧩",
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
    
    if (endlessMode) {
        highScore = loadHighScore();
        updateHighScoreDisplay();
        highScoreLabel.style.display = 'block';
        highScoreValue.style.display = 'block';
    }
    
    endlessToggle.addEventListener('change', (e) => {
        endlessMode = e.target.checked;
        
        if (endlessMode) {
            highScore = loadHighScore();
            updateHighScoreDisplay();
            highScoreLabel.style.display = 'block';
            highScoreValue.style.display = 'block';
        } else {
            highScoreLabel.style.display = 'none';
            highScoreValue.style.display = 'none';
        }
        
        updateUI();
    });
}
