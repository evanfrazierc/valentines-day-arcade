// Love Blocks Game - For Taylor
const canvas = document.getElementById('gameCanvas');
const ctx = setupCanvas(canvas, 300, 600);

// Game constants
const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = canvas.width / COLS;
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

const COLORS = ['#ff1744', '#ff4081', '#ff80ab', '#f50057', '#c51162', '#ff5252', '#ff6e40'];

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

// Particle system
const particles = new ParticleSystem(canvas, ctx);

// Touch controls
const controls = new TouchControls(canvas);
let lastSwipeTime = 0;

controls.on('swipe', (direction) => {
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
    if (!gameRunning) {
        startGame();
        return;
    }
    rotatePiece();
});

controls.init();

// Initialize game
function initGame() {
    // Create empty board
    board = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
    
    score = 0;
    lines = 0;
    dropTimer = 0;
    fastDrop = false;
    gameRunning = false;
    
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
    spawnPiece();
    fastDrop = false;
}

function clearLines() {
    let linesCleared = 0;
    
    for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(cell => cell !== 0)) {
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
        
        if (lines >= WIN_LINES) {
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
    // Clear canvas
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#880e4f');
    gradient.addColorStop(1, '#c51162');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * BLOCK_SIZE);
        ctx.lineTo(canvas.width, y * BLOCK_SIZE);
        ctx.stroke();
    }
    for (let x = 0; x <= COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * BLOCK_SIZE, 0);
        ctx.lineTo(x * BLOCK_SIZE, canvas.height);
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
    
    // Draw start message
    if (!gameRunning) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, canvas.height / 2 - 40, canvas.width, 80);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Tap to Start!', canvas.width / 2, canvas.height / 2);
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
    document.getElementById('lines').textContent = `${lines}/${WIN_LINES}`;
    document.getElementById('score').textContent = score;
    const linesOverlay = document.getElementById('lines-overlay');
    const scoreOverlay = document.getElementById('score-overlay');
    if (linesOverlay) linesOverlay.textContent = `${lines}/${WIN_LINES}`;
    if (scoreOverlay) scoreOverlay.textContent = score;
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
        "Taylor, we fit together perfectly! 🧩💗",
        restartGame
    );
}

function restartGame() {
    document.getElementById('gameOverScreen').classList.remove('show');
    initGame();
}

// Start the game
initGame();
