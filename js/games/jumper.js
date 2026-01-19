// On Cloud Wine Game - For Joe
const canvas = document.getElementById('gameCanvas');
const ctx = setupCanvas(canvas, 350, 600);

// Game constants
const GRAVITY = 0.3;
const PLAYER_SIZE = 40;
const PLATFORM_WIDTH = 60;
const PLATFORM_HEIGHT = 12;
const JUMP_STRENGTH = -10;
const WIN_SCORE = 20;
const WINE_SPAWN_CHANCE = 0.3; // 30% chance per platform

// Game state
let player = {
    x: canvas.logicalWidth / 2 - PLAYER_SIZE / 2,
    y: canvas.logicalHeight - 150,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    dy: 0,
    dx: 0,
    rotation: 0,
    shouldSpin: false,
    willSpinNextJump: false
};

let platforms = [];
let wines = [];
let cameraY = 0;
let score = 0;
let maxScore = 0;
let gameRunning = false;

// Audio using Web Audio API
let audioContext = null;
let audioBuffers = {
    jump: null,
    collect: null,
    fall: null
};
let audioEnabled = false;

async function loadAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        const loadSound = async (url) => {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            return await audioContext.decodeAudioData(arrayBuffer);
        };
        
        audioBuffers.jump = await loadSound('../audio/jumper-jump.wav');
        audioBuffers.collect = await loadSound('../audio/jumper-land.wav');
        audioBuffers.fall = await loadSound('../audio/jumper-fall.wav');
        
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
        gainNode.gain.value = soundName === 'jump' ? 0.5 : soundName === 'collect' ? 0.6 : 0.7;
        
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        source.start(0);
    } catch (error) {}
}

// Particle system
const particles = new ParticleSystem(canvas, ctx);

// Control state
let tiltX = 0;
let keysPressed = {};
let tiltPermissionGranted = false;

// Request motion permission for iOS
async function requestMotionPermission() {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
            const permission = await DeviceOrientationEvent.requestPermission();
            tiltPermissionGranted = (permission === 'granted');
            if (tiltPermissionGranted) {
                setupTiltControls();
            }
        } catch (error) {
            console.log('Motion permission error:', error);
        }
    } else {
        // Non-iOS devices don't need permission
        tiltPermissionGranted = true;
        setupTiltControls();
    }
}

// Setup tilt controls
function setupTiltControls() {
    window.addEventListener('deviceorientation', (event) => {
        if (gameRunning && event.gamma !== null) {
            // gamma is the left-to-right tilt in degrees, from -90 to 90
            // Normalize to a value between -1 and 1
            tiltX = Math.max(-1, Math.min(1, event.gamma / 30));
        }
    });
}

// Initialize tilt on first interaction
if (window.DeviceOrientationEvent) {
    requestMotionPermission();
}

// Keyboard controls for desktop
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

// Touch controls (backup for devices without accelerometer)
const controls = new TouchControls(canvas);

controls.on('tap', (pos) => {
    if (!gameRunning) {
        startGame();
        return;
    }
    
    // Tap left or right side to move
    if (pos.x < canvas.logicalWidth / 2) {
        player.dx = -5;
    } else {
        player.dx = 5;
    }
});

controls.on('touchstart', (pos) => {
    if (gameRunning) {
        if (pos.x < canvas.logicalWidth / 2) {
            player.dx = -5;
        } else {
            player.dx = 5;
        }
    }
});

controls.init();

// Generate initial platforms and wines
function generatePlatforms() {
    platforms = [];
    wines = [];
    
    // Starting platform (wide base)
    platforms.push({
        x: 0,
        y: canvas.logicalHeight - 100,
        width: canvas.logicalWidth,
        height: PLATFORM_HEIGHT,
        type: 'normal'
    });
    
    // Generate more platforms going up
    for (let i = 1; i < 20; i++) {
        const x = Math.random() * (canvas.logicalWidth - PLATFORM_WIDTH);
        const y = canvas.logicalHeight - 100 - i * 80;
        
        const platform = {
            x: x,
            y: y,
            width: PLATFORM_WIDTH,
            height: PLATFORM_HEIGHT,
            type: Math.random() < 0.2 ? 'moving' : 'normal',
            direction: Math.random() < 0.5 ? 1 : -1,
            speed: 1
        };
        platforms.push(platform);
        
        // Spawn wine bottle above platform
        if (Math.random() < WINE_SPAWN_CHANCE) {
            wines.push({
                x: x + PLATFORM_WIDTH / 2 - 10,
                y: y - 30,
                size: 20,
                collected: false
            });
        }
    }
}

// Initialize game
function initGame() {
    player.x = canvas.logicalWidth / 2 - PLAYER_SIZE / 2;
    player.y = canvas.logicalHeight - 150;
    player.dy = 0;
    player.dx = 0;
    player.rotation = 0;
    player.shouldSpin = false;
    player.willSpinNextJump = false;
    
    tiltX = 0;
    keysPressed = {};
    
    cameraY = 0;
    score = 0;
    maxScore = 0;
    gameRunning = false;
    
    generatePlatforms();
    
    updateUI();
    draw();
}

function startGame() {
    // Request motion permission on iOS if not already granted
    if (!tiltPermissionGranted && typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        requestMotionPermission().then(() => {
            gameRunning = true;
            setPlayingMode(true);
            player.dy = JUMP_STRENGTH;
            gameLoop();
        });
    } else {
        gameRunning = true;
        setPlayingMode(true);
        player.dy = JUMP_STRENGTH;
        gameLoop();
    }
}

function update() {
    // Handle keyboard controls
    if (keysPressed['ArrowLeft']) {
        player.dx = -5;
    } else if (keysPressed['ArrowRight']) {
        player.dx = 5;
    }
    
    // Handle accelerometer controls
    if (Math.abs(tiltX) > 0.1) {
        player.dx = tiltX * 6;
    }
    
    // Apply gravity
    player.dy += GRAVITY;
    player.y += player.dy;
    player.x += player.dx;
    
    // Update rotation when spinning
    if (player.shouldSpin && player.dy < 0) {
        player.rotation += 0.3; // Spin while jumping up
    } else if (player.shouldSpin && player.dy >= 0) {
        // Stop spinning when starting to fall
        player.shouldSpin = false;
        player.rotation = 0;
    }
    
    // Friction
    player.dx *= 0.9;
    
    // Wrap around screen
    if (player.x + player.width < 0) {
        player.x = canvas.logicalWidth;
    } else if (player.x > canvas.logicalWidth) {
        player.x = -player.width;
    }
    
    // Move camera up when player is in upper half
    if (player.y < canvas.logicalHeight / 2) {
        const diff = canvas.logicalHeight / 2 - player.y;
        cameraY += diff;
        player.y = canvas.logicalHeight / 2;
        
        // Move platforms down
        platforms.forEach(platform => {
            platform.y += diff;
        });
        
        // Move wine glasses down with camera
        wines.forEach(wine => {
            wine.y += diff;
        });
        
        // Update score (height-based)
        const heightScore = Math.floor(cameraY / 10);
        if (heightScore > maxScore) {
            maxScore = heightScore;
        }
    }
    
    // Check wine collection
    wines.forEach(wine => {
        if (!wine.collected) {
            const dist = Math.sqrt(
                Math.pow(player.x + player.width / 2 - (wine.x + 10), 2) +
                Math.pow(player.y + player.height / 2 - (wine.y + 10), 2)
            );
            if (dist < player.width / 2 + 10) {
                wine.collected = true;
                score++;
                player.willSpinNextJump = true; // Spin on next jump
                particles.createParticles(wine.x + 10, wine.y + 10, 15, PALETTE.PURPLE_DARK);
                
                if (score >= WIN_SCORE) {
                    winGame();
                    return;
                }
            }
        }
    });
    
    // Check platform collisions (only when falling)
    if (player.dy > 0) {
        platforms.forEach(platform => {
            if (player.x + player.width > platform.x &&
                player.x < platform.x + platform.width &&
                player.y + player.height > platform.y &&
                player.y + player.height < platform.y + platform.height + 10 &&
                player.dy > 0) {
                
                player.dy = JUMP_STRENGTH;
                playSound('jump');
                
                // Activate spin for this jump if wine was collected
                if (player.willSpinNextJump) {
                    player.shouldSpin = true;
                    player.willSpinNextJump = false;
                }
                
                particles.createParticles(
                    player.x + player.width / 2,
                    player.y + player.height,
                    10,
                    PALETTE.PINK_PASTEL
                );
            }
        });
    }
    
    // Update moving platforms
    platforms.forEach(platform => {
        if (platform.type === 'moving') {
            platform.x += platform.speed * platform.direction;
            
            if (platform.x <= 0 || platform.x + platform.width >= canvas.logicalWidth) {
                platform.direction *= -1;
            }
        }
    });
    
    // Remove platforms that are off screen (bottom)
    platforms = platforms.filter(platform => platform.y < canvas.logicalHeight + 50);
    wines = wines.filter(wine => wine.y < canvas.logicalHeight + 50);
    
    // Add new platforms at top (off-screen)
    const topPlatform = platforms[0];
    if (topPlatform && topPlatform.y > -200) {
        const x = random(0, canvas.logicalWidth - PLATFORM_WIDTH);
        const y = topPlatform.y - random(70, 100);
        
        const platform = {
            x: x,
            y: y,
            width: PLATFORM_WIDTH,
            height: PLATFORM_HEIGHT,
            type: Math.random() < 0.7 ? 'normal' : 'moving',
            direction: Math.random() < 0.5 ? 1 : -1,
            speed: 2
        };
        platforms.unshift(platform);
        
        // Spawn wine bottle above platform
        if (Math.random() < WINE_SPAWN_CHANCE) {
            wines.unshift({
                x: x + PLATFORM_WIDTH / 2 - 10,
                y: y - 30,
                size: 20,
                collected: false
            });
        }
    }
    
    // Check if player fell off screen
    if (player.y > canvas.logicalHeight) {
        playSound('fall');
        gameOver();
        return;
    }
    
    updateUI();
}

function draw() {
    // Sky gradient that gets darker with each wine collected
    const skyProgress = score / WIN_SCORE; // 0 = light sky, 1 = space
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.logicalHeight);
    
    // Interpolate from light sky blue to dark space
    const skyBlue = { r: 135, g: 206, b: 235 }; // Light sky blue
    const darkSpace = { r: 5, g: 5, b: 15 }; // Very dark space
    
    const r = Math.round(skyBlue.r + (darkSpace.r - skyBlue.r) * skyProgress);
    const g = Math.round(skyBlue.g + (darkSpace.g - skyBlue.g) * skyProgress);
    const b = Math.round(skyBlue.b + (darkSpace.b - skyBlue.b) * skyProgress);
    
    gradient.addColorStop(0, `rgb(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)})`);
    gradient.addColorStop(1, `rgb(${r}, ${g}, ${b})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.logicalWidth, canvas.logicalHeight);
    
    // Draw stars in space when sky is dark enough
    if (skyProgress > 0.3) {
        ctx.save(); // Save current context state
        const starOpacity = (skyProgress - 0.3) * 1.4;
        ctx.fillStyle = `rgba(255, 255, 255, ${starOpacity})`;
        // Draw random stars (deterministic based on canvas dimensions)
        for (let i = 0; i < 50; i++) {
            const starX = ((i * 137) % canvas.logicalWidth);
            const starY = ((i * 211) % canvas.logicalHeight);
            const starSize = ((i * 13) % 3) + 1;
            ctx.fillRect(starX, starY, starSize, starSize);
        }
        ctx.restore(); // Restore context state
    }
    
    // Draw platforms as clouds
    platforms.forEach(platform => {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `${PLATFORM_HEIGHT * 5}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('☁️', platform.x + platform.width / 2, platform.y + platform.height / 2);
    });
    
    // Draw wine glasses
    wines.forEach(wine => {
        if (!wine.collected) {
            ctx.fillStyle = '#8B0000';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🍷', wine.x + 10, wine.y + 10);
        }
    });
    
    // Draw player as dancing man emoji
    ctx.save();
    ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
    ctx.rotate(player.rotation);
    ctx.fillStyle = '#FFD700';
    ctx.font = `${PLAYER_SIZE}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🕺', 0, 0);
    ctx.restore();
    
    // Draw particles
    particles.update();
    particles.draw();
    
    // Draw start message
    if (!gameRunning) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Tap to Start!', canvas.logicalWidth / 2, canvas.logicalHeight / 2 - 50);
        ctx.font = '16px Arial';
        ctx.fillText('Tilt device or use arrow keys', canvas.logicalWidth / 2, canvas.logicalHeight / 2 - 20);
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
    const scoreOverlay = document.getElementById('score-overlay');
    if (scoreOverlay) scoreOverlay.textContent = `${score}/${WIN_SCORE}`;
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
        "Joe, you're on cloud wine! Cheers to you! 🍷☁️",
        restartGame
    );
}

function restartGame() {
    document.getElementById('gameOverScreen').classList.remove('show');
    initGame();
}

// Load audio and start the game
loadAudio();
initGame();
