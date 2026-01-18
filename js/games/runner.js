// Cupid's Rush Game - For Ryan
const canvas = document.getElementById('gameCanvas');
const ctx = setupCanvas(canvas, 350, 600);

// Game constants
const GRAVITY = 0.5;
const JUMP_STRENGTH = -15;
const PLAYER_SIZE = 50;
const GROUND_HEIGHT = 100;
const OBSTACLE_WIDTH = 30;
const WIN_VEGGIES = 30;
const MEAT_EMOJIS = ['🍗', '🍖', '🥩', '🌭'];
const VEGGIE_EMOJIS = ['🥦', '🥕', '🌽', '🥒', '🥬', '🍅'];
const DOG_EMOJIS = ['🐕', '🦮'];

// Game state
let player = {
    x: 80,
    y: canvas.height - GROUND_HEIGHT - PLAYER_SIZE,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    dy: 0,
    grounded: true,
    canDoubleJump: false,
    rotation: 0
};

let obstacles = [];
let veggies = [];
let clouds = [];
let dog = null;
let veggiesCollected = 0;
let distance = 0;
let gameRunning = false;
let gameSpeed = 5;
let obstacleTimer = 0;
let nextObstacleTime = 0;
let veggieTimer = 0;

// Particle system
const particles = new ParticleSystem(canvas, ctx);

// Touch controls
const controls = new TouchControls(canvas);

controls.on('touchstart', () => {
    if (!gameRunning) {
        startGame();
        return;
    }
    
    // Double jump - available while rising and if not used yet
    if (!player.grounded && player.dy < 0 && player.canDoubleJump) {
        player.dy = JUMP_STRENGTH * 0.9;
        player.canDoubleJump = false;
        particles.createParticles(player.x + player.width / 2, player.y + player.height, 10, '#90EE90');
    }
    // Regular jump from ground
    else if (player.grounded) {
        player.dy = JUMP_STRENGTH;
        player.grounded = false;
        player.canDoubleJump = true;
    }
});

controls.init();

// Initialize game
function initGame() {
    player.y = canvas.height - GROUND_HEIGHT - PLAYER_SIZE;
    player.dy = 0;
    player.grounded = true;
    player.canDoubleJump = false;
    player.rotation = 0;
    
    obstacles = [];
    veggies = [];
    clouds = [];
    dog = null;
    
    // Create initial clouds
    for (let i = 0; i < 5; i++) {
        const cloudSize = random(30, 60);
        // Generate random cloud shape with 3-5 circles
        const numCircles = Math.floor(random(3, 6));
        const circles = [];
        for (let j = 0; j < numCircles; j++) {
            circles.push({
                offsetX: random(0, cloudSize * 0.9),
                offsetY: random(-cloudSize * 0.2, cloudSize * 0.2),
                radius: random(cloudSize * 0.4, cloudSize * 0.7)
            });
        }
        
        clouds.push({
            x: random(0, canvas.width),
            y: random(20, canvas.height - GROUND_HEIGHT - 250),
            size: cloudSize,
            speed: random(0.3, 0.8),
            circles: circles
        });
    }
    
    veggiesCollected = 0;
    distance = 0;
    gameSpeed = 2.5;
    obstacleTimer = 0;
    nextObstacleTime = random(80, 150);
    veggieTimer = 0;
    gameRunning = false;
    
    updateUI();
    draw();
}

function startGame() {
    gameRunning = true;
    setPlayingMode(true);
    gameLoop();
}

function update() {
    distance += gameSpeed / 10;
    
    // Gradually increase speed
    if (distance % 50 === 0 && gameSpeed < 6) {
        gameSpeed += 0.25;
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
        player.rotation = 0; // Reset rotation on landing
    } else {
        player.grounded = false;
        // Spin while in air
        player.rotation += 0.15;
    }
    
    // Spawn obstacles with random timing
    obstacleTimer++;
    if (obstacleTimer >= nextObstacleTime) {
        const height = random(30, 80);
        obstacles.push({
            x: canvas.width,
            y: canvas.height - GROUND_HEIGHT - height,
            width: OBSTACLE_WIDTH,
            height: height,
            type: 'block',
            emoji: MEAT_EMOJIS[Math.floor(Math.random() * MEAT_EMOJIS.length)]
        });
        obstacleTimer = 0;
        // Random delay before next obstacle: shorter at higher speeds
        const minDelay = Math.max(60, 120 - gameSpeed * 10);
        const maxDelay = Math.max(100, 200 - gameSpeed * 15);
        nextObstacleTime = random(minDelay, maxDelay);
    }
    
    // Spawn veggies
    veggieTimer++;
    if (veggieTimer > 60 / gameSpeed) {
        if (Math.random() < 0.6) {
            // Check if there's an obstacle near the right edge of screen
            const heartY = random(canvas.height - GROUND_HEIGHT - 200, canvas.height - GROUND_HEIGHT - 100);
            let canSpawn = true;
            
            // Don't spawn if there's an obstacle that would overlap
            for (let obstacle of obstacles) {
                // Simple collision check - don't spawn if veggie would collide with nearby obstacle
                const margin = 40; // Extra clearance around veggie
                const veggieBox = {
                    x: canvas.width - margin,
                    y: heartY - margin,
                    width: 30 + margin * 2,
                    height: 30 + margin * 2
                };
                
                // Check if obstacle is close enough to matter (within 250px)
                if (obstacle.x > canvas.width - 250) {
                    // Check if veggie and obstacle boxes would overlap
                    if (veggieBox.x < obstacle.x + obstacle.width &&
                        veggieBox.x + veggieBox.width > obstacle.x &&
                        veggieBox.y < obstacle.y + obstacle.height &&
                        veggieBox.y + veggieBox.height > obstacle.y) {
                        canSpawn = false;
                        break;
                    }
                }
            }
            
            if (canSpawn) {
                veggies.push({
                    x: canvas.width,
                    y: heartY,
                    size: 20,
                    collected: false,
                    emoji: VEGGIE_EMOJIS[Math.floor(Math.random() * VEGGIE_EMOJIS.length)]
                });
            }
        }
        veggieTimer = 0;
    }
    
    // Update obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= gameSpeed;
        
        // Remove off-screen obstacles
        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
            continue;
        }
        
        // Check collision with more forgiving hitbox
        const hitboxMargin = 8;
        if (checkCollision(player, {
            x: obstacles[i].x + hitboxMargin,
            y: obstacles[i].y + hitboxMargin,
            width: obstacles[i].width - hitboxMargin * 2,
            height: obstacles[i].height - hitboxMargin * 2
        })) {
            gameOver();
            return;
        }
    }
    
    // Update veggies
    for (let i = veggies.length - 1; i >= 0; i--) {
        veggies[i].x -= gameSpeed;
        
        // Remove off-screen veggies
        if (veggies[i].x + veggies[i].size < 0) {
            veggies.splice(i, 1);
            continue;
        }
        
        // Check collection with larger, more forgiving hitbox
        const hitboxSize = veggies[i].size * 1.75; // 75% larger hitbox
        if (!veggies[i].collected && checkCollision(player, {
            x: veggies[i].x - hitboxSize / 2,
            y: veggies[i].y - hitboxSize / 2,
            width: hitboxSize,
            height: hitboxSize
        })) {
            veggies[i].collected = true;
            veggiesCollected++;
            
            particles.createParticles(veggies[i].x, veggies[i].y, 15, '#4CAF50');
            
            if (veggiesCollected >= WIN_VEGGIES) {
                winGame();
                return;
            }
            
            updateUI();
        }
        
        // Remove collected veggies
        if (veggies[i].collected) {
            veggies.splice(i, 1);
        }
    }
    
    // Update clouds
    for (let i = clouds.length - 1; i >= 0; i--) {
        clouds[i].x -= clouds[i].speed;
        
        // Remove clouds that are off-screen and spawn new ones
        if (clouds[i].x + clouds[i].size < 0) {
            const cloudSize = random(30, 60);
            const numCircles = Math.floor(random(3, 6));
            const circles = [];
            for (let j = 0; j < numCircles; j++) {
                circles.push({
                    offsetX: random(0, cloudSize * 0.9),
                    offsetY: random(-cloudSize * 0.2, cloudSize * 0.2),
                    radius: random(cloudSize * 0.4, cloudSize * 0.7)
                });
            }
            
            clouds[i].x = canvas.width + random(50, 150);
            clouds[i].y = random(20, canvas.height - GROUND_HEIGHT - 250);
            clouds[i].size = cloudSize;
            clouds[i].circles = circles;
        }
    }
    
    // Update dog
    if (dog) {
        dog.x += dog.speed;
        
        // Remove dog when it goes off-screen (left side)
        if (dog.x < -50) {
            dog = null;
        }
    } else {
        // Randomly spawn dog (low probability each frame)
        if (Math.random() < 0.002) {
            dog = {
                x: canvas.width + 50,
                y: canvas.height - GROUND_HEIGHT + 30, // On the ground surface
                size: 40,
                speed: -gameSpeed * 2.5, // Negative to move left
                emoji: DOG_EMOJIS[Math.floor(Math.random() * DOG_EMOJIS.length)]
            };
        }
    }
    
    updateUI();
}

function draw() {
    // Clear canvas with gradient sky - early morning dawn
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#2c3e50'); // Dark blue-grey
    gradient.addColorStop(1, '#ff9a9e'); // Soft pink/coral
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw clouds
    clouds.forEach(cloud => {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        // Draw cloud using its unique circle pattern
        cloud.circles.forEach(circle => {
            ctx.arc(
                cloud.x + circle.offsetX,
                cloud.y + circle.offsetY,
                circle.radius,
                0,
                Math.PI * 2
            );
        });
        ctx.fill();
    });
    
    // Draw ground with earthy gradient
    const groundGradient = ctx.createLinearGradient(0, canvas.height - GROUND_HEIGHT, 0, canvas.height);
    groundGradient.addColorStop(0, '#6B4423'); // Deep brown
    groundGradient.addColorStop(1, '#C9A876'); // Light tan
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);
    
    // Ground detail
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i = 0; i < canvas.width; i += 40) {
        ctx.fillRect(i - (distance * gameSpeed * 3) % 40, canvas.height - GROUND_HEIGHT, 20, 5);
    }
    
    // Draw player with rotation
    ctx.save();
    ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
    ctx.rotate(player.rotation);
    
    // Running man emoji - flipped to face right
    ctx.scale(-1, 1); // Flip horizontally
    ctx.font = `${player.width}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000000'; // Set color for emoji
    ctx.fillText('🏃', 0, 0);
    
    ctx.restore();
    
    // Draw dog running in opposite direction
    if (dog) {
        ctx.font = `${dog.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#000000';
        ctx.fillText(dog.emoji, dog.x, dog.y + dog.size / 2);
    }
    
    // Draw obstacles as varied meat emojis
    obstacles.forEach(obstacle => {
        ctx.font = `${obstacle.height * 1.2}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#000000';
        ctx.fillText(obstacle.emoji, obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2);
    });
    
    // Draw veggie emojis
    veggies.forEach(veggie => {
        if (!veggie.collected) {
            ctx.font = `${veggie.size * 1.5}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#000000'; // Set color for emoji
            ctx.fillText(veggie.emoji, veggie.x + veggie.size / 2, veggie.y + veggie.size / 2);
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
    document.getElementById('veggies').textContent = `${veggiesCollected}/${WIN_VEGGIES}`;
    document.getElementById('distance').textContent = Math.floor(distance) + 'm';
    const veggiesOverlay = document.getElementById('veggies-overlay');
    const distanceOverlay = document.getElementById('distance-overlay');
    if (veggiesOverlay) veggiesOverlay.textContent = `${veggiesCollected}/${WIN_VEGGIES}`;
    if (distanceOverlay) distanceOverlay.textContent = Math.floor(distance) + 'm';
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
        "Ryan, running into you was the best thing ever! 💖",
        restartGame
    );
}

function restartGame() {
    document.getElementById('gameOverScreen').classList.remove('show');
    initGame();
}

// Start the game
initGame();
