// Cupid's Rush Game - For Emma
const canvas = document.getElementById('gameCanvas');
const ctx = setupCanvas(canvas, 350, 600);

// Game constants
const GRAVITY = 0.6;
const JUMP_STRENGTH = -12;
const PLAYER_SIZE = 30;
const GROUND_HEIGHT = 100;
const OBSTACLE_WIDTH = 30;
const WIN_HEARTS = 100;

// Game state
let player = {
    x: 80,
    y: canvas.height - GROUND_HEIGHT - PLAYER_SIZE,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    dy: 0,
    grounded: true,
    canDoubleJump: false
};

let obstacles = [];
let hearts = [];
let heartsCollected = 0;
let distance = 0;
let gameRunning = false;
let gameSpeed = 5;
let obstacleTimer = 0;
let heartTimer = 0;
let lastTap = 0;

// Particle system
const particles = new ParticleSystem(canvas, ctx);

// Touch controls
const controls = new TouchControls(canvas);

controls.on('tap', () => {
    if (!gameRunning) {
        startGame();
        return;
    }
    
    const now = Date.now();
    const timeSinceLast = now - lastTap;
    
    // Double tap for double jump
    if (timeSinceLast < 300 && player.canDoubleJump) {
        player.dy = JUMP_STRENGTH * 0.9;
        player.canDoubleJump = false;
        particles.createParticles(player.x + player.width / 2, player.y + player.height, 10, '#ff80ab');
    }
    // Single tap for regular jump
    else if (player.grounded) {
        player.dy = JUMP_STRENGTH;
        player.grounded = false;
        player.canDoubleJump = true;
    }
    
    lastTap = now;
});

controls.init();

// Initialize game
function initGame() {
    player.y = canvas.height - GROUND_HEIGHT - PLAYER_SIZE;
    player.dy = 0;
    player.grounded = true;
    player.canDoubleJump = false;
    
    obstacles = [];
    hearts = [];
    heartsCollected = 0;
    distance = 0;
    gameSpeed = 5;
    obstacleTimer = 0;
    heartTimer = 0;
    gameRunning = false;
    
    updateUI();
    draw();
}

function startGame() {
    gameRunning = true;
    gameLoop();
}

function update() {
    distance += gameSpeed / 10;
    
    // Gradually increase speed
    if (distance % 50 === 0 && gameSpeed < 8) {
        gameSpeed += 0.1;
    }
    
    // Update player
    player.dy += GRAVITY;
    player.y += player.dy;
    
    // Ground collision
    const groundY = canvas.height - GROUND_HEIGHT - PLAYER_SIZE;
    if (player.y >= groundY) {
        player.y = groundY;
        player.dy = 0;
        player.grounded = true;
        player.canDoubleJump = false;
    } else {
        player.grounded = false;
    }
    
    // Spawn obstacles
    obstacleTimer++;
    if (obstacleTimer > 100 / gameSpeed) {
        if (Math.random() < 0.7) {
            const height = random(30, 80);
            obstacles.push({
                x: canvas.width,
                y: canvas.height - GROUND_HEIGHT - height,
                width: OBSTACLE_WIDTH,
                height: height,
                type: 'block'
            });
        }
        obstacleTimer = 0;
    }
    
    // Spawn hearts
    heartTimer++;
    if (heartTimer > 60 / gameSpeed) {
        if (Math.random() < 0.6) {
            hearts.push({
                x: canvas.width,
                y: random(canvas.height - GROUND_HEIGHT - 200, canvas.height - GROUND_HEIGHT - 50),
                size: 20,
                collected: false
            });
        }
        heartTimer = 0;
    }
    
    // Update obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= gameSpeed;
        
        // Remove off-screen obstacles
        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
            continue;
        }
        
        // Check collision
        if (checkCollision(player, obstacles[i])) {
            gameOver();
            return;
        }
    }
    
    // Update hearts
    for (let i = hearts.length - 1; i >= 0; i--) {
        hearts[i].x -= gameSpeed;
        
        // Remove off-screen hearts
        if (hearts[i].x + hearts[i].size < 0) {
            hearts.splice(i, 1);
            continue;
        }
        
        // Check collection
        if (!hearts[i].collected && checkCollision(player, {
            x: hearts[i].x - hearts[i].size / 2,
            y: hearts[i].y - hearts[i].size / 2,
            width: hearts[i].size,
            height: hearts[i].size
        })) {
            hearts[i].collected = true;
            heartsCollected++;
            
            particles.createParticles(hearts[i].x, hearts[i].y, 15, '#ff4081');
            
            if (heartsCollected >= WIN_HEARTS) {
                winGame();
                return;
            }
            
            updateUI();
        }
        
        // Remove collected hearts
        if (hearts[i].collected) {
            hearts.splice(i, 1);
        }
    }
    
    updateUI();
}

function draw() {
    // Clear canvas with gradient sky
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#ff4081');
    gradient.addColorStop(1, '#880e4f');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw ground
    ctx.fillStyle = '#c51162';
    ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);
    
    // Ground detail
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i = 0; i < canvas.width; i += 40) {
        ctx.fillRect(i - (distance * gameSpeed) % 40, canvas.height - GROUND_HEIGHT, 20, 5);
    }
    
    // Draw player
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Player face
    ctx.fillStyle = '#ff1744';
    ctx.beginPath();
    ctx.arc(player.x + 10, player.y + 12, 3, 0, Math.PI * 2);
    ctx.arc(player.x + 20, player.y + 12, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw obstacles
    obstacles.forEach(obstacle => {
        ctx.fillStyle = '#ff1744';
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        
        // Add some detail
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(obstacle.x + 5, obstacle.y + 5, obstacle.width - 10, obstacle.height - 10);
    });
    
    // Draw hearts
    hearts.forEach(heart => {
        if (!heart.collected) {
            drawHeart(ctx, heart.x, heart.y, heart.size, '#ff80ab');
        }
    });
    
    // Draw particles
    particles.update();
    particles.draw();
    
    // Draw start message
    if (!gameRunning) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Tap to Start Running!', canvas.width / 2, canvas.height / 2);
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
    document.getElementById('hearts').textContent = `${heartsCollected}/${WIN_HEARTS}`;
    document.getElementById('distance').textContent = Math.floor(distance) + 'm';
}

function gameOver() {
    gameRunning = false;
    document.getElementById('gameOverScreen').classList.add('show');
}

function winGame() {
    gameRunning = false;
    showWinScreen(
        "Emma, running into you was the best thing ever! 💖",
        restartGame
    );
}

function restartGame() {
    document.getElementById('gameOverScreen').classList.remove('show');
    initGame();
}

// Start the game
initGame();
