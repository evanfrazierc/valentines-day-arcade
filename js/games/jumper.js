// Love Bounce Game - For Alex
const canvas = document.getElementById('gameCanvas');
const ctx = setupCanvas(canvas, 350, 600);

// Game constants
const GRAVITY = 0.4;
const PLAYER_SIZE = 30;
const PLATFORM_WIDTH = 60;
const PLATFORM_HEIGHT = 12;
const JUMP_STRENGTH = -10;
const WIN_SCORE = 2000;

// Game state
let player = {
    x: canvas.width / 2 - PLAYER_SIZE / 2,
    y: canvas.height - 150,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    dy: 0,
    dx: 0
};

let platforms = [];
let cameraY = 0;
let score = 0;
let maxScore = 0;
let gameRunning = false;

// Particle system
const particles = new ParticleSystem(canvas, ctx);

// Touch controls
const controls = new TouchControls(canvas);

controls.on('tap', (pos) => {
    if (!gameRunning) {
        startGame();
        return;
    }
    
    // Tap left or right side to move
    if (pos.x < canvas.width / 2) {
        player.dx = -5;
    } else {
        player.dx = 5;
    }
});

controls.on('touchstart', (pos) => {
    if (gameRunning) {
        if (pos.x < canvas.width / 2) {
            player.dx = -5;
        } else {
            player.dx = 5;
        }
    }
});

controls.init();

// Initialize game
function initGame() {
    player.x = canvas.width / 2 - PLAYER_SIZE / 2;
    player.y = canvas.height - 150;
    player.dy = 0;
    player.dx = 0;
    
    platforms = [];
    cameraY = 0;
    score = 0;
    maxScore = 0;
    gameRunning = false;
    
    // Create initial platforms
    for (let i = 0; i < 12; i++) {
        platforms.push({
            x: random(0, canvas.width - PLATFORM_WIDTH),
            y: canvas.height - 100 - i * 60,
            width: PLATFORM_WIDTH,
            height: PLATFORM_HEIGHT,
            type: Math.random() < 0.8 ? 'normal' : 'moving',
            direction: Math.random() < 0.5 ? 1 : -1,
            speed: 2
        });
    }
    
    updateUI();
    draw();
}

function startGame() {
    gameRunning = true;
    player.dy = JUMP_STRENGTH;
    gameLoop();
}

function update() {
    // Apply gravity
    player.dy += GRAVITY;
    player.y += player.dy;
    player.x += player.dx;
    
    // Friction
    player.dx *= 0.9;
    
    // Wrap around screen
    if (player.x + player.width < 0) {
        player.x = canvas.width;
    } else if (player.x > canvas.width) {
        player.x = -player.width;
    }
    
    // Move camera up when player is in upper half
    if (player.y < canvas.height / 2) {
        const diff = canvas.height / 2 - player.y;
        cameraY += diff;
        player.y = canvas.height / 2;
        
        // Move platforms down
        platforms.forEach(platform => {
            platform.y += diff;
        });
        
        // Update score
        score = Math.floor(cameraY / 10);
        if (score > maxScore) {
            maxScore = score;
        }
        
        if (score >= WIN_SCORE) {
            winGame();
            return;
        }
    }
    
    // Check platform collisions (only when falling)
    if (player.dy > 0) {
        platforms.forEach(platform => {
            if (player.x + player.width > platform.x &&
                player.x < platform.x + platform.width &&
                player.y + player.height > platform.y &&
                player.y + player.height < platform.y + platform.height + 10 &&
                player.dy > 0) {
                
                player.dy = JUMP_STRENGTH;
                particles.createParticles(
                    player.x + player.width / 2,
                    player.y + player.height,
                    10,
                    '#ff80ab'
                );
            }
        });
    }
    
    // Update moving platforms
    platforms.forEach(platform => {
        if (platform.type === 'moving') {
            platform.x += platform.speed * platform.direction;
            
            if (platform.x <= 0 || platform.x + platform.width >= canvas.width) {
                platform.direction *= -1;
            }
        }
    });
    
    // Remove platforms that are off screen (bottom)
    platforms = platforms.filter(platform => platform.y < canvas.height + 50);
    
    // Add new platforms at top
    while (platforms.length < 12) {
        const lastPlatform = platforms[0];
        platforms.unshift({
            x: random(0, canvas.width - PLATFORM_WIDTH),
            y: lastPlatform.y - random(50, 80),
            width: PLATFORM_WIDTH,
            height: PLATFORM_HEIGHT,
            type: Math.random() < 0.7 ? 'normal' : 'moving',
            direction: Math.random() < 0.5 ? 1 : -1,
            speed: 2
        });
    }
    
    // Check if player fell off screen
    if (player.y > canvas.height) {
        gameOver();
        return;
    }
    
    updateUI();
}

function draw() {
    // Clear canvas with gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#c51162');
    gradient.addColorStop(1, '#880e4f');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw platforms
    platforms.forEach(platform => {
        if (platform.type === 'normal') {
            // Draw as heart
            drawHeart(
                ctx,
                platform.x + platform.width / 2,
                platform.y + platform.height / 2,
                platform.width * 0.8,
                '#ff4081'
            );
        } else {
            // Moving platforms - different color
            drawHeart(
                ctx,
                platform.x + platform.width / 2,
                platform.y + platform.height / 2,
                platform.width * 0.8,
                '#ff80ab'
            );
        }
    });
    
    // Draw player
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Player face
    ctx.fillStyle = '#ff1744';
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2 - 6, player.y + player.height / 2 - 4, 3, 0, Math.PI * 2);
    ctx.arc(player.x + player.width / 2 + 6, player.y + player.height / 2 - 4, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Smile
    ctx.strokeStyle = '#ff1744';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + player.height / 2 + 2, 8, 0.2, Math.PI - 0.2);
    ctx.stroke();
    
    // Draw particles
    particles.update();
    particles.draw();
    
    // Draw start message
    if (!gameRunning) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Tap to Start!', canvas.width / 2, canvas.height / 2 - 50);
        ctx.font = '16px Arial';
        ctx.fillText('Tap left/right sides to move', canvas.width / 2, canvas.height / 2 - 20);
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
}

function gameOver() {
    gameRunning = false;
    document.getElementById('gameOverScreen').classList.add('show');
}

function winGame() {
    gameRunning = false;
    showWinScreen(
        "Alex, you make my heart bounce with joy! 💓",
        restartGame
    );
}

function restartGame() {
    document.getElementById('gameOverScreen').classList.remove('show');
    initGame();
}

// Start the game
initGame();
