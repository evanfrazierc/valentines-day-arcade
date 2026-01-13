// Maze of Love Game - For Chris
const canvas = document.getElementById('gameCanvas');
const ctx = setupCanvas(canvas, 350, 600);

// Game constants
const GRID_SIZE = 15;
const TILE_SIZE = canvas.width / GRID_SIZE;
const TOTAL_HEARTS = 10;

// Game state
let player = { x: 1, y: 1 };
let hearts = [];
let heartsCollected = 0;
let moves = 0;
let gameRunning = true;

// Maze layout (1 = wall, 0 = path)
let maze = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
    [1,0,1,0,1,0,1,1,1,0,1,0,1,0,1],
    [1,0,1,0,0,0,0,0,1,0,0,0,1,0,1],
    [1,0,1,1,1,1,1,0,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,1,1,0,1,1,1,0,1],
    [1,0,1,0,0,0,1,0,0,0,1,0,1,0,1],
    [1,0,1,0,1,1,1,0,1,0,1,0,1,0,1],
    [1,0,0,0,1,0,0,0,1,0,0,0,1,0,1],
    [1,1,1,0,1,0,1,1,1,1,1,0,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,1,0,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

// Particle system
const particles = new ParticleSystem(canvas, ctx);

// Touch controls
const controls = new TouchControls(canvas);

controls.on('swipe', (direction) => {
    if (!gameRunning) return;
    
    let newX = player.x;
    let newY = player.y;
    
    switch(direction) {
        case 'up': newY--; break;
        case 'down': newY++; break;
        case 'left': newX--; break;
        case 'right': newX++; break;
    }
    
    // Check if move is valid
    if (newX >= 0 && newX < GRID_SIZE && 
        newY >= 0 && newY < GRID_SIZE && 
        maze[newY][newX] === 0) {
        
        player.x = newX;
        player.y = newY;
        moves++;
        
        // Check heart collection
        for (let i = hearts.length - 1; i >= 0; i--) {
            if (hearts[i].x === player.x && hearts[i].y === player.y && !hearts[i].collected) {
                hearts[i].collected = true;
                heartsCollected++;
                
                particles.createParticles(
                    player.x * TILE_SIZE + TILE_SIZE / 2,
                    player.y * TILE_SIZE + TILE_SIZE / 2,
                    20,
                    '#ff4081'
                );
                
                if (heartsCollected >= TOTAL_HEARTS) {
                    setTimeout(() => winGame(), 500);
                }
                
                updateUI();
            }
        }
        
        updateUI();
    }
});

controls.init();

// Initialize game
function initGame() {
    player = { x: 1, y: 1 };
    heartsCollected = 0;
    moves = 0;
    gameRunning = true;
    
    // Place hearts in random path locations
    hearts = [];
    const pathCells = [];
    
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            if (maze[y][x] === 0 && !(x === 1 && y === 1)) {
                pathCells.push({ x, y });
            }
        }
    }
    
    // Randomly select locations for hearts
    for (let i = 0; i < TOTAL_HEARTS; i++) {
        const randomIndex = Math.floor(Math.random() * pathCells.length);
        const cell = pathCells.splice(randomIndex, 1)[0];
        hearts.push({
            x: cell.x,
            y: cell.y,
            collected: false,
            pulse: 0
        });
    }
    
    updateUI();
    gameLoop();
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#880e4f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw maze
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            if (maze[y][x] === 1) {
                // Wall
                ctx.fillStyle = '#c51162';
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                
                // Wall border
                ctx.strokeStyle = '#ff1744';
                ctx.lineWidth = 1;
                ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            } else {
                // Path
                ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }
    
    // Draw hearts
    hearts.forEach(heart => {
        if (!heart.collected) {
            heart.pulse = (heart.pulse + 0.1) % (Math.PI * 2);
            const scale = 1 + Math.sin(heart.pulse) * 0.2;
            
            ctx.save();
            ctx.translate(
                heart.x * TILE_SIZE + TILE_SIZE / 2,
                heart.y * TILE_SIZE + TILE_SIZE / 2
            );
            ctx.scale(scale, scale);
            
            drawHeart(ctx, 0, 0, TILE_SIZE * 0.5, '#ff4081');
            
            ctx.restore();
        }
    });
    
    // Draw player
    ctx.save();
    ctx.translate(
        player.x * TILE_SIZE + TILE_SIZE / 2,
        player.y * TILE_SIZE + TILE_SIZE / 2
    );
    
    // Player body
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, TILE_SIZE * 0.35, 0, Math.PI * 2);
    ctx.fill();
    
    // Player face
    ctx.fillStyle = '#ff1744';
    ctx.beginPath();
    ctx.arc(-4, -3, 2, 0, Math.PI * 2);
    ctx.arc(4, -3, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Smile
    ctx.strokeStyle = '#ff1744';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 1, 5, 0.2, Math.PI - 0.2);
    ctx.stroke();
    
    ctx.restore();
    
    // Draw particles
    particles.update();
    particles.draw();
    
    // Draw directional hints
    if (moves === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Swipe to move!', canvas.width / 2, 30);
    }
}

function gameLoop() {
    draw();
    if (gameRunning) {
        requestAnimationFrame(gameLoop);
    }
}

function updateUI() {
    document.getElementById('hearts').textContent = `${heartsCollected}/${TOTAL_HEARTS}`;
    document.getElementById('moves').textContent = moves;
}

function winGame() {
    gameRunning = false;
    showWinScreen(
        "Chris, I'd navigate any maze to find you! 💘",
        restartGame
    );
}

function restartGame() {
    initGame();
}

// Start the game
initGame();
