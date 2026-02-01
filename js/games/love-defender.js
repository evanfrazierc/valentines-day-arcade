// Love Defender - Top-down shooter game
const canvas = document.getElementById('gameCanvas');
const ctx = setupCanvas(canvas, 350, 600);

// Game constants
const PLAYER_WIDTH = 55;
const PLAYER_HEIGHT = 55;
const PLAYER_SPEED = 6;
const BULLET_SPEED = 8;
const BULLET_WIDTH = 8;
const BULLET_HEIGHT = 15;
const ENEMY_WIDTH = 55;
const ENEMY_HEIGHT = 55;
const ENEMY_SPEED = 2;
const SHOOT_INTERVAL = 300; // milliseconds
const WIN_SCORE = 75;
const STARTING_LIVES = 3;

// Audio
let audioContext = null;
let shootSound = null;
let explosionSound = null;
let powerUpSound = null;
let hitSound = null;
let loseLifeSound = null;
let meowSound = null;
let audioEnabled = false;

// Game state
let player = {
    x: canvas.logicalWidth / 2 - PLAYER_WIDTH / 2,
    y: canvas.logicalHeight - PLAYER_HEIGHT - 30,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    speed: PLAYER_SPEED,
    movingLeft: false,
    movingRight: false,
    isDragging: false,
    targetX: canvas.logicalWidth / 2 - PLAYER_WIDTH / 2
};

let bullets = [];
let enemies = [];
let enemyBullets = [];
let particles = [];
let powerups = [];
let score = 0;
let lives = STARTING_LIVES;
let gameRunning = false;
let lastShootTime = 0;
let enemySpawnTimer = 0;
let nextEnemyTime = 1000; // milliseconds
let difficultyLevel = 0;
let shieldActive = false;
let shieldHits = 0;
let rapidFireActive = false;
let rapidFireEndTime = 0;
let spreadShotActive = false;
let spreadShotEndTime = 0;
let pierceShotActive = false;
let pierceShotEndTime = 0;
let homingMissilesActive = false;
let homingMissilesEndTime = 0;
let flashActive = false;
let flashStartTime = 0;
let rainbowIndex = 0; // For cycling through rainbow hearts

// Enemy types
const ENEMY_TYPES = {
    BASIC: { emoji: '💔', speed: 1, hp: 1, shootChance: 0, size: 42, points: 1 },
    FAST: { emoji: '🔥', speed: 2.5, hp: 1, shootChance: 0, size: 35, points: 2 },
    TANK: { emoji: '🖤', speed: 0.8, hp: 5, shootChance: 0, size: 50, points: 5 },
    SHOOTER: { emoji: '😈', speed: 1.2, hp: 2, shootChance: 0.015, size: 42, points: 3 },
    STALKER: { emoji: '👻', speed: 1.2, hp: 3, shootChance: 0, size: 45, points: 4 }
};

// Power-up types
const POWERUP_TYPES = {
    SHIELD: { emoji: '🛡️', duration: 0, effect: 'shield' },
    RAPID_FIRE: { emoji: '⚡', duration: 8000, effect: 'rapidFire' },
    EXTRA_LIFE: { emoji: '❤️', duration: 0, effect: 'extraLife' },
    SPREAD_SHOT: { emoji: '💥', duration: 10000, effect: 'spreadShot' },
    BOMB: { emoji: '💣', duration: 0, effect: 'bomb' },
    PIERCE_SHOT: { emoji: '🗡️', duration: 8000, effect: 'pierceShot' },
    HOMING_MISSILES: { emoji: '🎯', duration: 10000, effect: 'homingMissiles' }
};

// Endless mode - check URL parameter or default to true
const urlParams = new URLSearchParams(window.location.search);
const endlessParam = urlParams.get('endless');
let endlessMode = endlessParam !== null ? (endlessParam === 'true' || endlessParam === '1') : true;
let highScore = 0;

// Background elements
let stars = [];

// Touch controls
let touchControls = new TouchControls(canvas);

// Game animations for screen shake
let gameAnimations = new GameAnimations(canvas, ctx);

// Pre-create gradients
let backgroundGradient = null;
let playerGradient = null;

function createGradients() {
    backgroundGradient = ctx.createLinearGradient(0, 0, 0, canvas.logicalHeight);
    backgroundGradient.addColorStop(0, PALETTE.PURPLE_DARKEST);
    backgroundGradient.addColorStop(0.5, PALETTE.PURPLE_DARK);
    backgroundGradient.addColorStop(1, PALETTE.BLUE_DARKEST);
    
    playerGradient = ctx.createLinearGradient(0, 0, 0, PLAYER_HEIGHT);
    playerGradient.addColorStop(0, PALETTE.PINK_BRIGHT);
    playerGradient.addColorStop(1, PALETTE.RED_PRIMARY);
}

// Initialize stars for background
function createStars() {
    stars = [];
    for (let i = 0; i < 50; i++) {
        stars.push({
            x: Math.random() * canvas.logicalWidth,
            y: Math.random() * canvas.logicalHeight,
            size: Math.random() * 2 + 1,
            speed: Math.random() * 1 + 0.5
        });
    }
}

// Initialize gradients and stars
createGradients();
createStars();

// Load high score from localStorage
const savedHighScore = localStorage.getItem('loveDefenderHighScore');
if (savedHighScore) {
    highScore = parseInt(savedHighScore);
    document.getElementById('highScore').textContent = highScore;
}

// Set up endless mode toggle
const endlessToggle = document.getElementById('endlessToggle');
endlessToggle.checked = endlessMode;

const highScoreLabel = document.getElementById('highScoreLabel');
const highScoreValue = document.getElementById('highScoreValue');
const valentineMessage = document.getElementById('valentineMessage');

if (endlessMode) {
    highScoreLabel.style.display = 'block';
    highScoreValue.style.display = 'block';
    if (valentineMessage) valentineMessage.style.display = 'none';
} else {
    highScoreLabel.style.display = 'none';
    highScoreValue.style.display = 'none';
    if (valentineMessage) valentineMessage.style.display = 'block';
}

endlessToggle.addEventListener('change', (e) => {
    endlessMode = e.target.checked;
    
    if (endlessMode) {
        highScoreLabel.style.display = 'block';
        highScoreValue.style.display = 'block';
        if (valentineMessage) valentineMessage.style.display = 'none';
    } else {
        highScoreLabel.style.display = 'none';
        highScoreValue.style.display = 'none';
        if (valentineMessage) valentineMessage.style.display = 'block';
    }
    
    restartGame();
});

// Set up touch controls
touchControls.on('touchstart', handleTouchStart);
touchControls.on('touchmove', handleTouchMove);
touchControls.on('touchend', handleTouchEnd);
touchControls.init();

// Keyboard controls
document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);

// Restart button
document.getElementById('restartBtn').addEventListener('click', () => {
    document.getElementById('winScreen').style.display = 'none';
    restartGame();
});

document.getElementById('homeBtn').addEventListener('click', () => {
    window.location.href = '../index.html';
});

// Initialize audio on first user interaction
function initAudio() {
    if (audioContext) return; // Already initialized
    
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        loadAudio();
    } catch (error) {
        console.log('Audio not supported');
    }
}

// Load audio files
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
    
    // Load sound effects based on their names
    hitSound = await loadSound('../audio/hit.wav'); // For bullet hits
    explosionSound = await loadSound('../audio/breakout-brick.wav'); // For enemy explosions
    powerUpSound = await loadSound('../audio/runner-collect.wav'); // For collecting power-ups
    shootSound = await loadSound('../audio/flap.wav'); // For shooting (subtle sound)
    loseLifeSound = await loadSound('../audio/gaston-crash.wav'); // For losing a life
    meowSound = await loadSound('../audio/meow.wav'); // For cat meowing at game start
    
    audioEnabled = true;
}

// Play a sound effect
function playSound(buffer, volume = 0.5) {
    if (!audioEnabled || !audioContext || !buffer) return;
    
    try {
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        
        const gainNode = audioContext.createGain();
        gainNode.gain.value = volume;
        
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        source.start(0);
    } catch (error) {
        // Silently fail if audio doesn't work
    }
}

// Initialize game state
function initGame() {
    player.x = canvas.logicalWidth / 2 - PLAYER_WIDTH / 2;
    player.y = canvas.logicalHeight - PLAYER_HEIGHT - 30;
    player.isDragging = false;
    player.targetX = canvas.logicalWidth / 2 - PLAYER_WIDTH / 2;
    player.movingLeft = false;
    player.movingRight = false;
    
    bullets = [];
    enemies = [];
    enemyBullets = [];
    particles = [];
    powerups = [];
    score = 0;
    lives = STARTING_LIVES;
    shieldActive = false;
    shieldHits = 0;
    rapidFireActive = false;
    rapidFireEndTime = 0;
    spreadShotActive = false;
    pierceShotActive = false;
    homingMissilesActive = false;
    gameRunning = false;
    lastShootTime = Date.now();
    enemySpawnTimer = 0;
    nextEnemyTime = 1000;
    difficultyLevel = 0;
    
    updateUI();
    draw();
}

function startGame() {
    initAudio(); // Initialize audio on first interaction
    gameRunning = true;
    setPlayingMode(true);
    lastShootTime = Date.now();
    
    // Play meow sound when game starts
    setTimeout(() => playSound(meowSound, 0.5), 100);
    
    requestAnimationFrame(gameLoop);
}

function restartGame() {
    document.getElementById('gameOverScreen').style.display = 'none';
    initGame();
}

// Touch handling
function handleTouchStart(pos) {
    if (!gameRunning) {
        startGame();
        return;
    }
    
    player.isDragging = true;
    player.movingLeft = false;
    player.movingRight = false;
    player.targetX = pos.x - player.width / 2;
}

function handleTouchMove(pos) {
    if (!gameRunning) return;
    
    if (player.isDragging) {
        player.targetX = pos.x - player.width / 2;
    }
}

function handleTouchEnd(pos) {
    player.isDragging = false;
    player.movingLeft = false;
    player.movingRight = false;
}

// Keyboard handling
function handleKeyDown(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        if (!gameRunning) {
            startGame();
            return;
        }
        player.movingLeft = true;
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        if (!gameRunning) {
            startGame();
            return;
        }
        player.movingRight = true;
    }
}

function handleKeyUp(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        player.movingLeft = false;
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        player.movingRight = false;
    }
}

// Update game state
function update(deltaTime) {
    if (!gameRunning) return;
    
    // Update difficulty - cap at level 20 (score 200) for maximum speed
    difficultyLevel = Math.min(20, Math.floor(score / 10));
    
    // Move player
    if (player.isDragging) {
        // Smoothly move toward target position
        const dx = player.targetX - player.x;
        const moveSpeed = 0.3; // Smooth interpolation
        player.x += dx * moveSpeed;
    } else {
        // Keyboard controls
        if (player.movingLeft) {
            player.x -= player.speed;
        }
        if (player.movingRight) {
            player.x += player.speed;
        }
    }
    
    // Keep player in bounds
    player.x = Math.max(0, Math.min(canvas.logicalWidth - player.width, player.x));
    player.targetX = Math.max(0, Math.min(canvas.logicalWidth - player.width, player.targetX));
    
    // Update power-up timers
    if (rapidFireActive && Date.now() > rapidFireEndTime) {
        rapidFireActive = false;
    }
    if (spreadShotActive && Date.now() > spreadShotEndTime) {
        spreadShotActive = false;
    }
    if (pierceShotActive && Date.now() > pierceShotEndTime) {
        pierceShotActive = false;
    }
    if (homingMissilesActive && Date.now() > homingMissilesEndTime) {
        homingMissilesActive = false;
    }
    
    // Auto-shoot
    const now = Date.now();
    const shootInterval = rapidFireActive ? 100 : SHOOT_INTERVAL;
    if (now - lastShootTime > shootInterval) {
        shootBullet();
        lastShootTime = now;
    }
    
    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        // Homing missiles logic - overrides normal movement
        if (homingMissilesActive && enemies.length > 0) {
            // Find nearest enemy
            let nearestEnemy = null;
            let minDist = Infinity;
            for (let enemy of enemies) {
                const dx = (enemy.x + enemy.width / 2) - (bullets[i].x + bullets[i].width / 2);
                const dy = (enemy.y + enemy.height / 2) - (bullets[i].y + bullets[i].height / 2);
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < minDist) {
                    minDist = dist;
                    nearestEnemy = enemy;
                }
            }
            
            // Home towards nearest enemy - full tracking
            if (nearestEnemy) {
                const dx = (nearestEnemy.x + nearestEnemy.width / 2) - (bullets[i].x + bullets[i].width / 2);
                const dy = (nearestEnemy.y + nearestEnemy.height / 2) - (bullets[i].y + bullets[i].height / 2);
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    // Accelerate as they get closer - speed multiplier based on distance
                    // Closer = faster (max 2.5x speed at very close range)
                    const speedMultiplier = Math.min(2.5, 1 + (200 / Math.max(dist, 50)));
                    const currentSpeed = bullets[i].speed * speedMultiplier;
                    
                    // Move directly toward target
                    bullets[i].x += (dx / dist) * currentSpeed;
                    bullets[i].y += (dy / dist) * currentSpeed;
                }
            } else {
                // No enemies, move up
                bullets[i].y -= bullets[i].speed;
            }
        } else if (bullets[i].vx !== undefined && bullets[i].vy !== undefined) {
            // Spread shot bullet with directional velocity
            bullets[i].x += bullets[i].vx;
            bullets[i].y += bullets[i].vy;
        } else {
            // Normal bullet
            bullets[i].y -= bullets[i].speed;
        }
        
        // Remove off-screen bullets
        if (bullets[i].y + bullets[i].height < 0 || 
            bullets[i].x + bullets[i].width < 0 || 
            bullets[i].x > canvas.logicalWidth) {
            bullets.splice(i, 1);
        }
    }
    
    // Spawn enemies
    enemySpawnTimer += deltaTime;
    const spawnRate = Math.max(500, nextEnemyTime - (difficultyLevel * 50)); // Faster spawning
    if (enemySpawnTimer >= spawnRate) {
        spawnEnemy();
        enemySpawnTimer = 0;
    }
    
    // Update enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        // Stalker enemies follow the player
        if (enemy.type === ENEMY_TYPES.STALKER) {
            const playerCenterX = player.x + player.width / 2;
            const enemyCenterX = enemy.x + enemy.width / 2;
            const dx = playerCenterX - enemyCenterX;
            const dy = (player.y - enemy.y);
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                // Move towards player
                enemy.x += (dx / distance) * enemy.type.speed;
                enemy.y += (dy / distance) * enemy.type.speed;
            }
        } else {
            // Normal downward movement
            enemy.y += enemy.type.speed * (1 + difficultyLevel * 0.15);
        }
        
        // Horizontal movement for shooter and fast enemies
        if (enemy.horizontalSpeed !== 0) {
            enemy.x += enemy.horizontalSpeed;
            
            // Bounce off walls
            if (enemy.x <= 0 || enemy.x + enemy.width >= canvas.logicalWidth) {
                enemy.horizontalSpeed *= -1;
                enemy.horizontalDirection *= -1;
            }
        }
        
        // Enemy shooting with cooldown
        if (enemy.type.shootChance > 0) {
            enemy.shootCooldown -= deltaTime;
            
            // Shoot if cooldown is ready and hasn't shot max times
            if (enemy.shootCooldown <= 0 && enemy.shotsFired < 2) {
                shootEnemyBullet(enemy);
                enemy.shotsFired++;
                enemy.shootCooldown = 1500 + Math.random() * 1000; // 1.5-2.5 seconds between shots
            }
        }
        
        // Check collision with player (using smaller hitbox)
        if (checkCollision(enemy, getPlayerHitbox())) {
            createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, PALETTE.RED_VIBRANT);
            enemies.splice(i, 1);
            
            if (shieldActive && shieldHits < 2) {
                shieldHits++;
                if (shieldHits >= 2) {
                    shieldActive = false;
                }
            } else {
                lives--;
                playSound(loseLifeSound, 0.7);
                gameAnimations.startShake();
            }
            
            updateUI();
            
            if (lives <= 0) {
                gameOver();
            }
            continue;
        }
        
        // Remove off-screen enemies
        if (enemy.y > canvas.logicalHeight) {
            enemies.splice(i, 1);
        }
    }
    
    // Update enemy bullets
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        // Move with directional velocity
        enemyBullets[i].x += enemyBullets[i].vx;
        enemyBullets[i].y += enemyBullets[i].vy;
        
        // Check collision with player (using smaller hitbox)
        if (checkCollision(enemyBullets[i], getPlayerHitbox())) {
            createExplosion(player.x + player.width / 2, player.y + player.height / 2, PALETTE.ORANGE_BRIGHT);
            enemyBullets.splice(i, 1);
            
            if (shieldActive && shieldHits < 2) {
                shieldHits++;
                if (shieldHits >= 2) {
                    shieldActive = false;
                }
            } else {
                lives--;
                playSound(loseLifeSound, 0.7);
                gameAnimations.startShake();
            }
            
            updateUI();
            
            if (lives <= 0) {
                gameOver();
            }
            continue;
        }
        
        // Remove off-screen bullets
        if (enemyBullets[i].y > canvas.logicalHeight) {
            enemyBullets.splice(i, 1);
        }
    }
    
    // Update power-ups
    for (let i = powerups.length - 1; i >= 0; i--) {
        const powerup = powerups[i];
        
        // Move down slowly
        powerup.y += powerup.velocity;
        
        // Rotate
        powerup.rotation += 0.05;
        
        // Age
        powerup.lifetime += deltaTime;
        
        // Check collision with player
        if (checkCollision(powerup, player)) {
            // Play power-up collection sound
            playSound(powerUpSound, 0.6);
            
            // Apply power-up effect
            if (powerup.type === POWERUP_TYPES.SHIELD) {
                shieldActive = true;
                shieldHits = 0;
            } else if (powerup.type === POWERUP_TYPES.RAPID_FIRE) {
                rapidFireActive = true;
                rapidFireEndTime = Date.now() + 8000; // 8 seconds
            } else if (powerup.type === POWERUP_TYPES.SPREAD_SHOT) {
                spreadShotActive = true;
                spreadShotEndTime = Date.now() + 10000; // 10 seconds
            } else if (powerup.type === POWERUP_TYPES.PIERCE_SHOT) {
                pierceShotActive = true;
                pierceShotEndTime = Date.now() + 8000; // 8 seconds
            } else if (powerup.type === POWERUP_TYPES.HOMING_MISSILES) {
                homingMissilesActive = true;
                homingMissilesEndTime = Date.now() + 10000; // 10 seconds
            } else if (powerup.type === POWERUP_TYPES.BOMB) {
                // Destroy all enemies instantly
                flashActive = true;
                flashStartTime = Date.now();
                gameAnimations.startShake();
                
                // Add score for all enemies and create explosions
                for (let enemy of enemies) {
                    score += enemy.type.points;
                    createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, PALETTE.ORANGE_BRIGHT);
                }
                enemies = [];
                updateUI();
            } else if (powerup.type === POWERUP_TYPES.EXTRA_LIFE) {
                if (lives < 4) {
                    lives++;
                    updateUI();
                }
            }
            
            createExplosion(powerup.x + powerup.width / 2, powerup.y + powerup.height / 2, PALETTE.YELLOW_BRIGHT);
            powerups.splice(i, 1);
            continue;
        }
        
        // Remove if expired or off-screen
        if (powerup.lifetime >= powerup.maxLifetime || powerup.y > canvas.logicalHeight) {
            powerups.splice(i, 1);
        }
    }
    
    // Check bullet-enemy bullet collisions (player can shoot down enemy arrows)
    for (let i = bullets.length - 1; i >= 0; i--) {
        let bulletDestroyed = false;
        
        for (let j = enemyBullets.length - 1; j >= 0; j--) {
            if (checkCollision(bullets[i], enemyBullets[j])) {
                // Destroy both bullets
                createExplosion(enemyBullets[j].x + enemyBullets[j].width / 2, 
                              enemyBullets[j].y + enemyBullets[j].height / 2, 
                              PALETTE.ORANGE_BRIGHT);
                bullets.splice(i, 1);
                enemyBullets.splice(j, 1);
                bulletDestroyed = true;
                break;
            }
        }
        
        if (bulletDestroyed) continue;
    }
    
    // Check bullet-enemy collisions
    for (let i = bullets.length - 1; i >= 0; i--) {
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (checkCollision(bullets[i], enemies[j])) {
                // Hit!
                enemies[j].hp--;
                
                // Play hit sound
                playSound(hitSound, 0.4);
                
                // Only destroy bullet if not piercing
                if (!pierceShotActive) {
                    bullets.splice(i, 1);
                }
                
                if (enemies[j].hp <= 0) {
                    createExplosion(enemies[j].x + enemies[j].width / 2, enemies[j].y + enemies[j].height / 2, PALETTE.PINK_BRIGHT);
                    score += enemies[j].type.points;
                    
                    // Play explosion sound
                    playSound(explosionSound, 0.5);
                    
                    // Black hearts (TANK enemies) always drop power-ups
                    if (enemies[j].type === ENEMY_TYPES.TANK) {
                        // Don't drop extra life power-ups if player already has 4 hearts
                        let powerupTypes = [POWERUP_TYPES.SHIELD, POWERUP_TYPES.RAPID_FIRE, POWERUP_TYPES.SPREAD_SHOT, POWERUP_TYPES.PIERCE_SHOT, POWERUP_TYPES.HOMING_MISSILES];
                        if (lives < 4) {
                            powerupTypes.push(POWERUP_TYPES.EXTRA_LIFE);
                        }
                        
                        // Bomb is rare - 15% chance to add it to the pool
                        if (Math.random() < 0.15) {
                            powerupTypes = [POWERUP_TYPES.BOMB];
                        }
                        
                        const type = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
                        powerups.push({
                            x: enemies[j].x + enemies[j].width / 2 - 15,
                            y: enemies[j].y,
                            width: 30,
                            height: 30,
                            type: type,
                            velocity: 2,
                            rotation: 0,
                            lifetime: 0,
                            maxLifetime: 6000 // 6 seconds
                        });
                    }
                    
                    enemies.splice(j, 1);
                    updateUI();
                    
                    // Check win condition
                    if (!endlessMode && score >= WIN_SCORE) {
                        gameWon();
                    }
                } else {
                    // Visual feedback for hit but not destroyed
                    createExplosion(enemies[j].x + enemies[j].width / 2, enemies[j].y + enemies[j].height / 2, PALETTE.YELLOW_LIGHT);
                }
                break;
            }
        }
    }
    
    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }
    
    // Update stars
    for (let star of stars) {
        star.y += star.speed;
        if (star.y > canvas.logicalHeight) {
            star.y = 0;
            star.x = Math.random() * canvas.logicalWidth;
        }
    }
    
    // Save high score
    if (endlessMode && score > highScore) {
        highScore = score;
        localStorage.setItem('loveDefenderHighScore', highScore.toString());
        document.getElementById('highScore').textContent = highScore;
    }
}

// Shoot a bullet
function shootBullet() {
    const rainbowHearts = ['❤️', '🧡', '💛', '💚', '💙', '💜', '💖'];
    const heartColor = rainbowHearts[rainbowIndex % rainbowHearts.length];
    rainbowIndex++;
    
    // Play shoot sound
    playSound(shootSound, 0.1);
    
    // Homing missiles move slower for better tracking
    const bulletSpeed = homingMissilesActive ? BULLET_SPEED * 0.5 : BULLET_SPEED;
    
    if (spreadShotActive) {
        // Shoot 3 bullets in a spread pattern
        const angles = [-0.3, 0, 0.3]; // Left, center, right (in radians)
        angles.forEach(angle => {
            bullets.push({
                x: player.x + player.width / 2 - BULLET_WIDTH / 2,
                y: player.y,
                width: BULLET_WIDTH,
                height: BULLET_HEIGHT,
                speed: bulletSpeed,
                heart: heartColor,
                vx: Math.sin(angle) * bulletSpeed * 0.5, // Horizontal velocity
                vy: -bulletSpeed // Vertical velocity
            });
        });
    } else {
        // Normal single bullet
        bullets.push({
            x: player.x + player.width / 2 - BULLET_WIDTH / 2,
            y: player.y,
            width: BULLET_WIDTH,
            height: BULLET_HEIGHT,
            speed: bulletSpeed,
            heart: heartColor
        });
    }
}

// Shoot enemy bullet
function shootEnemyBullet(enemy) {
    const bulletSpeed = 4 + (difficultyLevel * 0.3); // Speed increases with difficulty
    
    enemyBullets.push({
        x: enemy.x + enemy.width / 2 - 10,
        y: enemy.y + enemy.height,
        width: 20,
        height: 20,
        speed: bulletSpeed,
        vx: 0,
        vy: bulletSpeed
    });
}

// Spawn an enemy
function spawnEnemy() {
    // Check if there's already a Tank enemy on screen
    const hasTank = enemies.some(e => e.type === ENEMY_TYPES.TANK);
    // Check stalker count (max 2 on screen)
    const stalkerCount = enemies.filter(e => e.type === ENEMY_TYPES.STALKER).length;
    
    // Determine enemy type based on difficulty and randomness
    let type;
    const rand = Math.random();
    
    if (difficultyLevel < 2) {
        type = ENEMY_TYPES.BASIC; // Only basic enemies early on
    } else if (difficultyLevel < 4) {
        // Introduce fast enemies
        type = rand < 0.7 ? ENEMY_TYPES.BASIC : ENEMY_TYPES.FAST;
    } else if (difficultyLevel < 6) {
        // Introduce tank and shooter enemies
        if (rand < 0.5) type = ENEMY_TYPES.BASIC;
        else if (rand < 0.75) type = ENEMY_TYPES.FAST;
        else if (rand < 0.9 && !hasTank) type = ENEMY_TYPES.TANK;
        else type = ENEMY_TYPES.SHOOTER;
    } else {
        // Full variety at high difficulty
        if (rand < 0.25) type = ENEMY_TYPES.BASIC;
        else if (rand < 0.4) type = ENEMY_TYPES.FAST;
        else if (rand < 0.55 && !hasTank) type = ENEMY_TYPES.TANK;
        else if (rand < 0.75) type = ENEMY_TYPES.SHOOTER;
        else if (stalkerCount < 2) type = ENEMY_TYPES.STALKER;
        else type = ENEMY_TYPES.SHOOTER; // Fallback to shooter if stalker limit reached
    }
    
    const x = Math.random() * (canvas.logicalWidth - type.size);
    const enemy = {
        x: x,
        y: -type.size,
        width: type.size,
        height: type.size,
        type: type,
        hp: type.hp,
        maxHp: type.hp,
        shootCooldown: 0,
        shotsFired: 0
    };
    
    // All shooter enemies move horizontally
    if (type === ENEMY_TYPES.SHOOTER) {
        enemy.horizontalSpeed = (Math.random() < 0.5 ? -1 : 1) * 1.5; // Move left or right
        enemy.horizontalDirection = enemy.horizontalSpeed > 0 ? 1 : -1;
    } else if (type === ENEMY_TYPES.FAST) {
        // Fast enemies fall at an angle
        enemy.horizontalSpeed = (Math.random() < 0.5 ? -1 : 1) * 0.8; // Move diagonally (slower horizontal)
        enemy.horizontalDirection = enemy.horizontalSpeed > 0 ? 1 : -1;
    } else {
        enemy.horizontalSpeed = 0;
    }
    
    enemies.push(enemy);
}

// Check collision between two rectangles
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Get player hitbox (30% smaller for more forgiving collisions)
function getPlayerHitbox() {
    const shrink = 0.3;
    const shrinkX = player.width * shrink / 2;
    const shrinkY = player.height * shrink / 2;
    return {
        x: player.x + shrinkX,
        y: player.y + shrinkY,
        width: player.width - (shrinkX * 2),
        height: player.height - (shrinkY * 2)
    };
}

// Create particle explosion
function createExplosion(x, y, color) {
    for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * 3,
            vy: Math.sin(angle) * 3,
            size: 4,
            life: 1,
            color: color,
            update: function() {
                this.x += this.vx;
                this.y += this.vy;
                this.life -= 0.02;
                this.size = Math.max(0, this.size - 0.1);
            }
        });
    }
}

// Draw everything
function draw() {
    // Apply screen shake
    ctx.save();
    gameAnimations.applyShake();
    
    // Clear canvas
    ctx.fillStyle = backgroundGradient;
    ctx.fillRect(0, 0, canvas.logicalWidth, canvas.logicalHeight);
    
    // Draw stars
    ctx.fillStyle = PALETTE.WHITE;
    for (let star of stars) {
        ctx.fillRect(star.x, star.y, star.size, star.size);
    }
    
    // Draw player (cat emoji based on lives)
    let catEmoji = '🐱'; // Default happy cat
    if (lives <= 1) {
        catEmoji = '🙀'; // Scared/shocked cat - critical health
    } else if (lives === 2) {
        catEmoji = '😿'; // Crying cat - low health
    }
    ctx.font = `${player.width}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(catEmoji, player.x + player.width / 2, player.y + player.height / 2);
    
    // Draw bullets (heart emoji or knife for pierce shot)
    ctx.font = '20px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let bullet of bullets) {
        const bulletEmoji = pierceShotActive ? '🗡️' : bullet.heart;
        ctx.fillText(bulletEmoji, bullet.x + bullet.width / 2, bullet.y + bullet.height / 2);
    }
    
    // Draw enemy bullets (red circle emoji)
    ctx.font = '20px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let bullet of enemyBullets) {
        ctx.fillText('⭕', bullet.x + bullet.width / 2, bullet.y + bullet.height / 2);
    }
    
    // Draw enemies with different visuals for each type
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let enemy of enemies) {
        ctx.font = `${enemy.width}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
        ctx.fillText(enemy.type.emoji, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
        
        // Draw HP bar for enemies with multiple HP
        if (enemy.maxHp > 1) {
            const barWidth = enemy.width * 0.8;
            const barHeight = 4;
            const barX = enemy.x + (enemy.width - barWidth) / 2;
            const barY = enemy.y - 8;
            
            // Background
            ctx.fillStyle = PALETTE.GRAY_DARK;
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            // HP
            const hpPercent = enemy.hp / enemy.maxHp;
            ctx.fillStyle = hpPercent > 0.5 ? PALETTE.GREEN_BRIGHT : (hpPercent > 0.25 ? PALETTE.ORANGE_BRIGHT : PALETTE.RED_VIBRANT);
            ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
        }
    }
    
    // Draw power-ups
    for (let powerup of powerups) {
        ctx.save();
        ctx.translate(powerup.x + powerup.width / 2, powerup.y + powerup.height / 2);
        ctx.rotate(powerup.rotation);
        
        // Pulse effect based on lifetime
        const pulse = 1 + Math.sin(powerup.lifetime / 100) * 0.1;
        const size = powerup.width * pulse;
        
        // Glowing effect - multiple layers
        const glowPulse = 0.3 + Math.sin(powerup.lifetime / 150) * 0.2;
        
        // Outer glow
        ctx.shadowColor = powerup.type === POWERUP_TYPES.SHIELD ? PALETTE.BLUE_BRIGHT :
                          powerup.type === POWERUP_TYPES.RAPID_FIRE ? PALETTE.YELLOW_BRIGHT :
                          PALETTE.PINK_HOT;
        ctx.shadowBlur = 20;
        ctx.globalAlpha = glowPulse;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = ctx.shadowColor;
        ctx.fill();
        
        // Inner glow
        ctx.shadowBlur = 15;
        ctx.globalAlpha = glowPulse + 0.2;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw emoji
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#FFFFFF'; // Set white color for emoji visibility
        ctx.font = `${size}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(powerup.type.emoji, 0, 0);
        
        ctx.restore();
    }
    
    // Draw shield effect if active
    if (shieldActive) {
        ctx.save();
        const centerX = player.x + player.width / 2;
        const centerY = player.y + player.height / 2;
        const radius = player.width * 0.7;
        const glowPulse = Math.sin(Date.now() / 200) * 0.1;
        
        // Outer glow
        ctx.globalAlpha = 0.2 + glowPulse;
        ctx.shadowColor = PALETTE.BLUE_BRIGHT;
        ctx.shadowBlur = 20;
        ctx.strokeStyle = PALETTE.BLUE_BRIGHT;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius + 3, 0, Math.PI * 2);
        ctx.stroke();
        
        // Middle glow layer
        ctx.globalAlpha = 0.3 + glowPulse;
        ctx.shadowBlur = 15;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Inner shield fill
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = PALETTE.BLUE_BRIGHT;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Show cracks if hit
        if (shieldHits > 0) {
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 0.6;
            ctx.strokeStyle = PALETTE.ORANGE_BRIGHT;
            ctx.lineWidth = 2;
            for (let i = 0; i < shieldHits; i++) {
                const angle = (i / 2) * Math.PI * 2;
                const x1 = centerX + Math.cos(angle) * player.width * 0.5;
                const y1 = centerY + Math.sin(angle) * player.width * 0.5;
                const x2 = centerX + Math.cos(angle) * radius;
                const y2 = centerY + Math.sin(angle) * radius;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        }
        ctx.restore();
    }
    
    // Draw rapid fire effect if active
    if (rapidFireActive) {
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = PALETTE.YELLOW_BRIGHT;
        const pulse = Math.sin(Date.now() / 100) * 5;
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width * 0.6 + pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    
    // Draw spread shot effect if active
    if (spreadShotActive) {
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = PALETTE.ORANGE_BRIGHT;
        const pulse = Math.sin(Date.now() / 150) * 5;
        // Draw three small circles in spread pattern
        const angles = [-0.3, 0, 0.3];
        angles.forEach(angle => {
            const offsetX = Math.sin(angle) * 15;
            const offsetY = -Math.cos(angle) * 10;
            ctx.beginPath();
            ctx.arc(player.x + player.width / 2 + offsetX, player.y + player.height / 2 + offsetY, player.width * 0.3 + pulse, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }
    
    // Draw pierce shot effect if active
    if (pierceShotActive) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = PALETTE.RED_VIBRANT;
        ctx.lineWidth = 3;
        const pulse = Math.sin(Date.now() / 100) * 3;
        // Draw glowing line above player
        ctx.shadowColor = PALETTE.RED_VIBRANT;
        ctx.shadowBlur = 10 + pulse;
        ctx.beginPath();
        ctx.moveTo(player.x, player.y - 5);
        ctx.lineTo(player.x + player.width, player.y - 5);
        ctx.stroke();
        ctx.restore();
    }
    
    // Draw homing missiles effect if active
    if (homingMissilesActive) {
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = PALETTE.GREEN_BRIGHT;
        const pulse = Math.sin(Date.now() / 120) * 4;
        // Draw targeting reticle
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI / 2) + (Date.now() / 1000);
            const x = player.x + player.width / 2 + Math.cos(angle) * (player.width * 0.5 + pulse);
            const y = player.y + player.height / 2 + Math.sin(angle) * (player.width * 0.5 + pulse);
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
    
    // Draw particles
    for (let particle of particles) {
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.life;
        ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
        ctx.globalAlpha = 1;
    }
    
    // Draw flash effect for bomb
    if (flashActive) {
        const elapsed = Date.now() - flashStartTime;
        if (elapsed < 300) { // Flash for 300ms
            ctx.save();
            const alpha = 1 - (elapsed / 300); // Fade out
            ctx.globalAlpha = alpha * 0.8;
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.logicalWidth, canvas.logicalHeight);
            ctx.restore();
        } else {
            flashActive = false;
        }
    }
    
    // Draw heart rain animation (for win)
    if (gameAnimations.animating) {
        gameAnimations.drawHeartRain();
    }
    
    ctx.restore();
}

// Draw a heart shape
function drawHeart(x, y, size, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    
    const topCurveHeight = size * 0.3;
    ctx.moveTo(x, y + topCurveHeight);
    
    // Left curve
    ctx.bezierCurveTo(
        x, y, 
        x - size / 2, y, 
        x - size / 2, y + topCurveHeight
    );
    
    ctx.bezierCurveTo(
        x - size / 2, y + (size + topCurveHeight) / 2, 
        x, y + (size + topCurveHeight) / 1.2, 
        x, y + size
    );
    
    // Right curve
    ctx.bezierCurveTo(
        x, y + (size + topCurveHeight) / 1.2, 
        x + size / 2, y + (size + topCurveHeight) / 2, 
        x + size / 2, y + topCurveHeight
    );
    
    ctx.bezierCurveTo(
        x + size / 2, y, 
        x, y, 
        x, y + topCurveHeight
    );
    
    ctx.closePath();
    ctx.fill();
}

// Draw a broken heart
function drawBrokenHeart(x, y, size, color) {
    ctx.fillStyle = color;
    
    // Left half
    ctx.beginPath();
    ctx.moveTo(x - 2, y);
    ctx.lineTo(x - size/2, y - size/3);
    ctx.lineTo(x - size/2, y + size/3);
    ctx.lineTo(x - 2, y + size);
    ctx.lineTo(x - 2, y);
    ctx.fill();
    
    // Right half
    ctx.beginPath();
    ctx.moveTo(x + 2, y);
    ctx.lineTo(x + size/2, y - size/3);
    ctx.lineTo(x + size/2, y + size/3);
    ctx.lineTo(x + 2, y + size);
    ctx.lineTo(x + 2, y);
    ctx.fill();
}

// Update UI
function updateUI() {
    const livesText = '❤️'.repeat(lives);
    const scoreText = endlessMode ? score : `${score}/${WIN_SCORE}`;
    document.getElementById('score').textContent = scoreText;
    document.getElementById('lives').textContent = livesText;
    document.getElementById('score-overlay').textContent = scoreText;
    document.getElementById('lives-overlay').textContent = livesText;
}

// Game over
function gameOver() {
    gameRunning = false;
    
    gameAnimations.startShake();
    
    // Keep game loop running for shake animation
    requestAnimationFrame(gameLoop);
    
    setTimeout(() => {
        setPlayingMode(false);
        document.getElementById('gameOverScreen').style.display = 'flex';
    }, 1000);
}

// Game won
function gameWon() {
    gameRunning = false;
    
    // Explode all enemies on screen
    for (let enemy of enemies) {
        createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, PALETTE.YELLOW_LIGHT);
    }
    enemies = [];
    
    // Start heart rain after explosions
    setTimeout(() => {
        gameAnimations.startHeartRain();
        // Make sure game loop continues for animation
        requestAnimationFrame(gameLoop);
    }, 300);
    
    setTimeout(() => {
        setPlayingMode(false);
        const winMessage = `Megan, you craft your Valentines with glitter and grace,

While I'm knee-deep in code, trying to keep pace.

Through every small chaos, every project we start,

You're still my favorite crafting partner, and you have all of my heart ❤️💖`;
        document.getElementById('winMessage').innerHTML = winMessage.replace(/\n/g, '<br>');
        document.getElementById('winScreen').style.display = 'flex';
    }, 2000);
}

// Game loop
let lastTime = Date.now();
function gameLoop() {
    const now = Date.now();
    const deltaTime = now - lastTime;
    lastTime = now;
    
    update(deltaTime);
    draw();
    
    if (gameRunning || gameAnimations.isAnimating()) {
        requestAnimationFrame(gameLoop);
    }
}

// Initialize the game
initGame();
