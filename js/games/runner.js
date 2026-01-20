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
    y: canvas.logicalHeight - GROUND_HEIGHT - PLAYER_SIZE,
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
let speedLines = []; // For visual effect
let difficultyLevel = 0; // Track difficulty progression

// Endless mode - check URL parameter or default to true
const urlParams = new URLSearchParams(window.location.search);
const endlessParam = urlParams.get('endless');
let endlessMode = endlessParam !== null ? (endlessParam === 'true' || endlessParam === '1') : true;
let highScore = 0;

// Pre-create gradients and fonts for better performance
let backgroundGradient = null;
const FONTS = {
    PLAYER: `${PLAYER_SIZE}px Arial`,
    BOLD_24: 'bold 24px Arial'
};

function createGradients() {
    backgroundGradient = ctx.createLinearGradient(0, 0, 0, canvas.logicalHeight);
    backgroundGradient.addColorStop(0, '#8B5CF6');
    backgroundGradient.addColorStop(0.5, '#9BB0E8');
    backgroundGradient.addColorStop(1, '#87CEEB');
}

// Audio using Web Audio API
let audioContext = null;
let audioBuffers = {
    jump: null,
    collect: null,
    hit: null,
    bark: null
};
let audioEnabled = false;

async function loadAudio() {
    if (!audioContext) return;
    
    const loadSound = async (url) => {
        try {
            const response = await fetch(url);
            if (!response.ok) return null;
            const arrayBuffer = await response.arrayBuffer();
            return await audioContext.decodeAudioData(arrayBuffer);
        } catch (error) {
            return null;
        }
    };
    
    audioBuffers.jump = await loadSound('../audio/runner-jump.wav');
    audioBuffers.collect = await loadSound('../audio/runner-collect.wav');
    audioBuffers.hit = await loadSound('../audio/runner-obstacle.wav');
    audioBuffers.bark = await loadSound('../audio/dog-bark.wav');
    
    audioEnabled = Object.values(audioBuffers).filter(b => b !== null).length > 0;
}

function playSound(soundName) {
    if (!audioEnabled || !audioContext || !audioBuffers[soundName]) return;
    try {
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffers[soundName];
        
        const gainNode = audioContext.createGain();
        gainNode.gain.value = soundName === 'jump' ? 0.5 : soundName === 'collect' ? 0.6 : 0.7;
        
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        source.start(0);
    } catch (error) {}
}

function loadHighScore() {
    return parseInt(localStorage.getItem('runnerHighScore') || '0');
}

function saveHighScore(score) {
    const currentHigh = loadHighScore();
    if (score > currentHigh) {
        localStorage.setItem('runnerHighScore', score.toString());
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

controls.on('touchstart', () => {
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
    
    // Double jump - available while rising and if not used yet
    if (!player.grounded && player.dy < 0 && player.canDoubleJump) {
        player.dy = JUMP_STRENGTH * 0.9;
        player.canDoubleJump = false;
        playSound('jump');
        particles.createParticles(player.x + player.width / 2, player.y + player.height, 10, PALETTE.GREEN_LIGHT);
    }
    // Regular jump from ground
    else if (player.grounded) {
        player.dy = JUMP_STRENGTH;
        player.grounded = false;
        player.canDoubleJump = true;
        playSound('jump');
    }
});

controls.init();

// Keyboard controls
window.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        
        if (gameAnimations.isAnimating()) {
            return;
        }
        
        if (!gameRunning) {
            startGame();
            return;
        }
        
        if (player.grounded) {
            player.dy = JUMP_STRENGTH;
            player.grounded = false;
            player.canDoubleJump = true;
            player.rotation = -0.3;
            playSound('jump');
            particles.createParticles(player.x, player.y + PLAYER_SIZE, 8, PALETTE.PINK_HOT);
        } else if (player.canDoubleJump) {
            player.dy = JUMP_STRENGTH * 0.9;
            player.canDoubleJump = false;
            player.rotation = -0.5;
            playSound('jump');
            particles.createParticles(player.x, player.y + PLAYER_SIZE, 12, PALETTE.PINK_PASTEL);
        }
    }
});

// Initialize game
function initGame() {
    player.y = canvas.logicalHeight - GROUND_HEIGHT - PLAYER_SIZE;
    player.dy = 0;
    player.grounded = true;
    player.canDoubleJump = false;
    player.rotation = 0;
    
    obstacles = [];
    veggies = [];
    clouds = [];
    dog = null;
    speedLines = [];
    difficultyLevel = 0;
    
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
            x: random(0, canvas.logicalWidth),
            y: random(20, canvas.logicalHeight - GROUND_HEIGHT - 250),
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
    // Initialize gradients for better performance
    createGradients();    
    updateUI();
    draw();
}

function startGame() {
    gameRunning = true;
    setPlayingMode(true);
    gameLoop();
}

function update() {
    const prevDistanceMilestone = Math.floor(distance / 100);
    distance += gameSpeed / 10;
    const currentDistanceMilestone = Math.floor(distance / 100);
    
    // Update difficulty level in endless mode
    if (endlessMode) {
        difficultyLevel = Math.floor(distance / 200); // Level up every 200 distance
        
        // Update speed lines based on difficulty
        if (difficultyLevel > 0 && Math.random() < 0.3) {
            speedLines.push({
                x: canvas.logicalWidth,
                y: random(0, canvas.logicalHeight - GROUND_HEIGHT),
                length: random(20, 50),
                speed: random(8, 15) + difficultyLevel * 2,
                opacity: random(0.3, 0.6)
            });
        }
    }
    
    // Gradually increase speed every 100 units of distance
    if (currentDistanceMilestone > prevDistanceMilestone && gameSpeed < 8) {
        gameSpeed += 0.3;
    }
    
    // Update player
    player.dy += GRAVITY;
    player.y += player.dy;
    
    // Ground collision
    const groundY = canvas.logicalHeight - GROUND_HEIGHT - PLAYER_SIZE;
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
        const height = random(50, 90);
        const spawnOffset = height * 0.6;
        
        // Determine obstacle type based on difficulty
        let obstacleType = 'block';
        let bounceSpeed = 0;
        
        if (endlessMode && difficultyLevel >= 3 && Math.random() < 0.3) {
            // Bouncing obstacles at higher difficulty
            obstacleType = 'bouncing';
            bounceSpeed = random(2, 4);
        }
        
        obstacles.push({
            x: canvas.logicalWidth + spawnOffset,
            y: canvas.logicalHeight - GROUND_HEIGHT - height,
            width: OBSTACLE_WIDTH,
            height: height,
            type: obstacleType,
            emoji: MEAT_EMOJIS[Math.floor(Math.random() * MEAT_EMOJIS.length)],
            bounceSpeed: bounceSpeed,
            bounceDirection: -1 // Start moving up
        });
        
        // Create cluster pattern at higher difficulty
        if (endlessMode && difficultyLevel >= 2 && Math.random() < 0.25) {
            // Add 1-2 more obstacles in a cluster
            const clusterSize = Math.random() < 0.5 ? 1 : 2;
            for (let i = 1; i <= clusterSize; i++) {
                const clusterHeight = random(50, 90);
                const clusterOffset = clusterHeight * 0.6;
                const gap = random(60, 100); // Tight gap requiring precise timing
                obstacles.push({
                    x: canvas.logicalWidth + spawnOffset + (gap * i),
                    y: canvas.logicalHeight - GROUND_HEIGHT - clusterHeight,
                    width: OBSTACLE_WIDTH,
                    height: clusterHeight,
                    type: 'block',
                    emoji: MEAT_EMOJIS[Math.floor(Math.random() * MEAT_EMOJIS.length)],
                    bounceSpeed: 0,
                    bounceDirection: 0
                });
            }
        }
        
        obstacleTimer = 0;
        // Fixed delay before next obstacle (not affected by speed)
        nextObstacleTime = random(120, 180);
    }
    
    // Spawn veggies
    veggieTimer++;
    if (veggieTimer > 150 / gameSpeed) {
        if (Math.random() < 0.6) {
            // Check if there's an obstacle near the right edge of screen
            const heartY = random(canvas.logicalHeight - GROUND_HEIGHT - 280, canvas.logicalHeight - GROUND_HEIGHT - 80);
            let canSpawn = true;
            
            // Don't spawn if there's an obstacle that would overlap
            for (let obstacle of obstacles) {
                // Simple collision check - don't spawn if veggie would collide with nearby obstacle
                const margin = 40; // Extra clearance around veggie
                const veggieBox = {
                    x: canvas.logicalWidth - margin,
                    y: heartY - margin,
                    width: 30 + margin * 2,
                    height: 30 + margin * 2
                };
                
                // Check if obstacle is close enough to matter (within 250px)
                if (obstacle.x > canvas.logicalWidth - 250) {
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
                    x: canvas.logicalWidth,
                    y: heartY,
                    size: 20,
                    collected: false,
                    emoji: VEGGIE_EMOJIS[Math.floor(Math.random() * VEGGIE_EMOJIS.length)],
                    baseY: heartY,
                    oscillation: Math.random() * Math.PI * 2
                });
            }
        }
        veggieTimer = 0;
    }
    
    // Update obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= gameSpeed;
        
        // Handle bouncing obstacles
        if (obstacles[i].type === 'bouncing') {
            obstacles[i].y += obstacles[i].bounceSpeed * obstacles[i].bounceDirection;
            
            // Bounce off ground and top bounds
            const maxY = canvas.logicalHeight - GROUND_HEIGHT - obstacles[i].height;
            const minY = 50;
            
            if (obstacles[i].y >= maxY) {
                obstacles[i].y = maxY;
                obstacles[i].bounceDirection = -1;
            } else if (obstacles[i].y <= minY) {
                obstacles[i].y = minY;
                obstacles[i].bounceDirection = 1;
            }
        }
        
        // Remove off-screen obstacles - account for emoji size extending beyond width
        const emojiExtension = obstacles[i].height * 0.6; // Extra space for emoji
        if (obstacles[i].x + obstacles[i].width + emojiExtension < 0) {
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
            playSound('hit');
            gameOver();
            return;
        }
    }
    
    // Update veggies
    for (let i = veggies.length - 1; i >= 0; i--) {
        veggies[i].x -= gameSpeed;
        
        // Add vertical oscillation
        veggies[i].oscillation += 0.05;
        veggies[i].y = veggies[i].baseY + Math.sin(veggies[i].oscillation) * 30;
        
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
            
            playSound('collect');
            particles.createParticles(veggies[i].x, veggies[i].y, 15, PALETTE.GREEN_MEDIUM);
            
            if (veggiesCollected >= WIN_VEGGIES && !endlessMode) {
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
            
            clouds[i].x = canvas.logicalWidth + random(50, 150);
            clouds[i].y = random(20, canvas.logicalHeight - GROUND_HEIGHT - 250);
            clouds[i].size = cloudSize;
            clouds[i].circles = circles;
        }
    }
    
    // Update speed lines
    for (let i = speedLines.length - 1; i >= 0; i--) {
        speedLines[i].x -= speedLines[i].speed;
        
        if (speedLines[i].x + speedLines[i].length < 0) {
            speedLines.splice(i, 1);
        }
    }
    
    // Update dog
    if (dog) {
        dog.x += dog.speed;
        
        // Play second bark after delay
        if (!dog.barkedTwice && dog.x < canvas.logicalWidth - 100) {
            playSound('bark');
            dog.barkedTwice = true;
        }
        
        // Remove dog when it goes off-screen (left side)
        if (dog.x < -50) {
            dog = null;
        }
    } else {
        // Randomly spawn dog (low probability each frame)
        if (Math.random() < 0.0005) { // Reduced from 0.002 to 0.0005
            dog = {
                x: canvas.logicalWidth + 50,
                y: canvas.logicalHeight - GROUND_HEIGHT + 30, // On the ground surface
                size: 40,
                speed: -gameSpeed * 2.5, // Negative to move left
                emoji: DOG_EMOJIS[Math.floor(Math.random() * DOG_EMOJIS.length)],
                barkedTwice: false
            };
            playSound('bark'); // First bark
        }
    }
    
    updateUI();
}

function draw() {
    // Apply shake animation if active
    ctx.save();
    gameAnimations.applyShake();
    
    // Clear canvas with vibrant sunrise gradient (pre-created for performance)
    ctx.fillStyle = backgroundGradient;
    ctx.fillRect(0, 0, canvas.logicalWidth, canvas.logicalHeight);
    
    // Draw speed lines (behind everything else)
    speedLines.forEach(line => {
        ctx.strokeStyle = `rgba(255, 255, 255, ${line.opacity})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(line.x, line.y);
        ctx.lineTo(line.x - line.length, line.y);
        ctx.stroke();
    });
    
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
    
    // Draw ground with flappy bird style pattern
    ctx.fillStyle = '#4CAF50'; // Green base (same as flappy bird)
    ctx.fillRect(0, canvas.logicalHeight - GROUND_HEIGHT, canvas.logicalWidth, GROUND_HEIGHT);
    
    // Ground pattern (moving stripes) - moves at same speed as obstacles
    const groundOffset = (distance * 10) % 30; // distance * 10 = gameSpeed per frame
    ctx.fillStyle = '#45a049'; // Darker green stripes (same as flappy bird)
    for (let i = -30; i < canvas.logicalWidth + 30; i += 30) {
        ctx.fillRect(i - groundOffset, canvas.logicalHeight - GROUND_HEIGHT, 15, GROUND_HEIGHT);
    }
    
    // Draw player with rotation
    ctx.save();
    ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
    ctx.rotate(player.rotation);
    
    // Running man emoji - flipped to face right
    ctx.scale(-1, 1); // Flip horizontally
    ctx.font = FONTS.PLAYER;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PALETTE.BLACK; // Set color for emoji
    ctx.fillText('🏃', 0, 0);
    
    ctx.restore();
    
    // Draw dog running in opposite direction
    if (dog) {
        ctx.font = `${dog.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = PALETTE.BLACK;
        ctx.fillText(dog.emoji, dog.x, dog.y + dog.size / 2);
    }
    
    // Draw obstacles as varied meat emojis
    obstacles.forEach(obstacle => {
        // Only draw if on screen (with margin for emoji size)
        const emojiExtension = obstacle.height * 0.6;
        if (obstacle.x + obstacle.width + emojiExtension >= 0 && obstacle.x - emojiExtension <= canvas.logicalWidth) {
            ctx.font = `${obstacle.height * 1.2}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = PALETTE.BLACK;
            ctx.fillText(obstacle.emoji, obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2);
        }
    });
    
    // Draw veggie emojis
    veggies.forEach(veggie => {
        if (!veggie.collected) {
            ctx.font = `${veggie.size * 1.5}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = PALETTE.BLACK; // Set color for emoji
            ctx.fillText(veggie.emoji, veggie.x + veggie.size / 2, veggie.y + veggie.size / 2);
        }
    });
    
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
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = FONTS.BOLD_24;
        ctx.textAlign = 'center';
        ctx.fillText('Tap to Start Running!', canvas.logicalWidth / 2, canvas.logicalHeight / 2);
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
        document.getElementById('veggies').textContent = veggiesCollected;
        const veggiesOverlay = document.getElementById('veggies-overlay');
        if (veggiesOverlay) veggiesOverlay.textContent = veggiesCollected;
    } else {
        document.getElementById('veggies').textContent = `${veggiesCollected}/${WIN_VEGGIES}`;
        const veggiesOverlay = document.getElementById('veggies-overlay');
        if (veggiesOverlay) veggiesOverlay.textContent = `${veggiesCollected}/${WIN_VEGGIES}`;
    }
    
    document.getElementById('distance').textContent = Math.floor(distance) + 'm';
    const distanceOverlay = document.getElementById('distance-overlay');
    if (distanceOverlay) distanceOverlay.textContent = Math.floor(distance) + 'm';
}

function gameOver() {
    gameRunning = false;
    
    if (endlessMode) {
        saveHighScore(veggiesCollected);
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
            "Ryan, running into you was the best thing ever! 💖",
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
