// Love Snake Game - For Sarah
const canvas = document.getElementById('gameCanvas');
const ctx = setupCanvas(canvas, 350, 600);

// Game constants
const GRID_SIZE = 20;
const TILE_SIZE = canvas.width / GRID_SIZE;
const WIN_HEARTS = 15;

// Game state
let snake = [];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let heart = { x: 10, y: 10 };
let heartsCollected = 0;
let gameRunning = false;
let gameSpeed = 150;
let lastUpdate = 0;

// Particle system
const particles = new ParticleSystem(canvas, ctx);

// Touch controls
const controls = new TouchControls(canvas);
controls.on('swipe', (dir) => {
    if (!gameRunning) {
        startGame();
        return;
    }
    
    switch(dir) {
        case 'up':
            if (direction.y === 0) nextDirection = { x: 0, y: -1 };
            break;
        case 'down':
            if (direction.y === 0) nextDirection = { x: 0, y: 1 };
            break;
        case 'left':
            if (direction.x === 0) nextDirection = { x: -1, y: 0 };
            break;
        case 'right':
            if (direction.x === 0) nextDirection = { x: 1, y: 0 };
            break;
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
    snake = [
        { x: 5, y: 10 },
        { x: 4, y: 10 },
        { x: 3, y: 10 }
    ];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    heartsCollected = 0;
    gameRunning = false;
    spawnHeart();
    updateUI();
    draw();
}

function startGame() {
    gameRunning = true;
    lastUpdate = Date.now();
    gameLoop();
}

function spawnHeart() {
    let validPosition = false;
    while (!validPosition) {
        heart.x = Math.floor(Math.random() * GRID_SIZE);
        heart.y = Math.floor(Math.random() * GRID_SIZE);
        
        validPosition = !snake.some(segment => 
            segment.x === heart.x && segment.y === heart.y
        );
    }
}

function update() {
    direction = nextDirection;
    
    // Calculate new head position
    const head = { 
        x: snake[0].x + direction.x, 
        y: snake[0].y + direction.y 
    };
    
    // Check wall collision
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        gameOver();
        return;
    }
    
    // Check self collision
    if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        gameOver();
        return;
    }
    
    snake.unshift(head);
    
    // Check heart collision
    if (head.x === heart.x && head.y === heart.y) {
        heartsCollected++;
        particles.createParticles(
            heart.x * TILE_SIZE + TILE_SIZE / 2,
            heart.y * TILE_SIZE + TILE_SIZE / 2,
            20,
            '#ff4081'
        );
        
        if (heartsCollected >= WIN_HEARTS) {
            winGame();
            return;
        }
        
        spawnHeart();
        updateUI();
    } else {
        snake.pop();
    }
}

function draw() {
    // Clear canvas
    ctx.fillStyle = 'rgba(136, 14, 79, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * TILE_SIZE, 0);
        ctx.lineTo(i * TILE_SIZE, canvas.height);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, i * TILE_SIZE);
        ctx.lineTo(canvas.width, i * TILE_SIZE);
        ctx.stroke();
    }
    
    // Draw snake
    snake.forEach((segment, index) => {
        const brightness = 100 - (index / snake.length) * 30;
        ctx.fillStyle = `hsl(330, 100%, ${brightness}%)`;
        
        ctx.fillRect(
            segment.x * TILE_SIZE + 2,
            segment.y * TILE_SIZE + 2,
            TILE_SIZE - 4,
            TILE_SIZE - 4
        );
        
        // Draw eyes on head
        if (index === 0) {
            ctx.fillStyle = '#fff';
            const eyeSize = TILE_SIZE / 6;
            const eyeOffsetX = TILE_SIZE / 3;
            const eyeOffsetY = TILE_SIZE / 3;
            
            if (direction.x !== 0) {
                ctx.beginPath();
                ctx.arc(
                    segment.x * TILE_SIZE + TILE_SIZE / 2 + (direction.x > 0 ? eyeOffsetX : -eyeOffsetX),
                    segment.y * TILE_SIZE + eyeOffsetY,
                    eyeSize, 0, Math.PI * 2
                );
                ctx.fill();
                
                ctx.beginPath();
                ctx.arc(
                    segment.x * TILE_SIZE + TILE_SIZE / 2 + (direction.x > 0 ? eyeOffsetX : -eyeOffsetX),
                    segment.y * TILE_SIZE + TILE_SIZE - eyeOffsetY,
                    eyeSize, 0, Math.PI * 2
                );
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.arc(
                    segment.x * TILE_SIZE + eyeOffsetX,
                    segment.y * TILE_SIZE + TILE_SIZE / 2 + (direction.y > 0 ? eyeOffsetY : -eyeOffsetY),
                    eyeSize, 0, Math.PI * 2
                );
                ctx.fill();
                
                ctx.beginPath();
                ctx.arc(
                    segment.x * TILE_SIZE + TILE_SIZE - eyeOffsetX,
                    segment.y * TILE_SIZE + TILE_SIZE / 2 + (direction.y > 0 ? eyeOffsetY : -eyeOffsetY),
                    eyeSize, 0, Math.PI * 2
                );
                ctx.fill();
            }
        }
    });
    
    // Draw heart
    drawHeart(
        ctx,
        heart.x * TILE_SIZE + TILE_SIZE / 2,
        heart.y * TILE_SIZE + TILE_SIZE / 2,
        TILE_SIZE * 0.6,
        '#ff4081'
    );
    
    // Draw particles
    particles.update();
    particles.draw();
    
    // Draw start message
    if (!gameRunning) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Swipe or Tap to Start!', canvas.width / 2, canvas.height / 2);
    }
}

function gameLoop() {
    if (!gameRunning) return;
    
    const now = Date.now();
    if (now - lastUpdate >= gameSpeed) {
        update();
        lastUpdate = now;
    }
    
    draw();
    requestAnimationFrame(gameLoop);
}

function updateUI() {
    document.getElementById('hearts').textContent = `${heartsCollected}/${WIN_HEARTS}`;
    document.getElementById('length').textContent = snake.length;
}

function gameOver() {
    gameRunning = false;
    document.getElementById('gameOverScreen').classList.add('show');
}

function winGame() {
    gameRunning = false;
    showWinScreen(
        "Sarah, you've captured my heart in every direction! 💕",
        restartGame
    );
}

function restartGame() {
    document.getElementById('gameOverScreen').classList.remove('show');
    initGame();
}

// Start the game
initGame();
