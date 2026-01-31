// On Cloud Wine Game - For Joe
const canvas = document.getElementById('gameCanvas');
const ctx = setupCanvas(canvas, 350, 600);

// Game constants
const GRAVITY = 0.3;
const PLAYER_SIZE = 50;
const PLATFORM_WIDTH = 60;
const PLATFORM_HEIGHT = 12;
const JUMP_STRENGTH = -10;
const WIN_SCORE = 15;
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
let comets = [];
let cameraY = 0;
let score = 0;
let maxScore = 0;
let gameRunning = false;
let baseGap = 80; // Base vertical gap between platforms
let currentGap = 80; // Current gap (increases with difficulty)
// Endless mode - check URL parameter or default to true
const urlParams = new URLSearchParams(window.location.search);
const endlessParam = urlParams.get('endless');
let endlessMode = endlessParam !== null ? (endlessParam === 'true' || endlessParam === '1') : true;
let highScore = 0;

// Pre-create gradient for better performance
let backgroundGradient = null;
const FONTS = {
    PLATFORM: `${PLATFORM_HEIGHT * 5}px Arial`,
    WINE: '32px Arial',
    PLAYER: `${PLAYER_SIZE}px Arial`,
    BOLD_20: 'bold 20px Arial',
    REGULAR_16: '16px Arial'
};

function createGradient() {
    backgroundGradient = ctx.createLinearGradient(0, 0, 0, canvas.logicalHeight);
    backgroundGradient.addColorStop(0, '#87CEEB');
    backgroundGradient.addColorStop(0.5, '#B0E0E6');
    backgroundGradient.addColorStop(1, '#FFE4E1');
}

// Audio using Web Audio API
let audioContext = null;
let audioBuffers = {
    jump: null,
    score: null,
    fall: null
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
    
    audioBuffers.jump = await loadSound('../audio/jumper-jump.wav');
    audioBuffers.score = await loadSound('../audio/jumper-score.wav');
    audioBuffers.fall = await loadSound('../audio/jumper-fall.wav');
    
    audioEnabled = Object.values(audioBuffers).filter(b => b !== null).length > 0;
}

function playSound(soundName) {
    if (!audioEnabled || !audioContext || !audioBuffers[soundName]) return;
    try {
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffers[soundName];
        
        const gainNode = audioContext.createGain();
        gainNode.gain.value = soundName === 'jump' ? 0.5 : soundName === 'score' ? 0.6 : 0.7;
        
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        source.start(0);
    } catch (error) {}
}

function loadHighScore() {
    return parseInt(localStorage.getItem('onCloudWineHighScore') || '0');
}

function saveHighScore(score) {
    const currentHigh = loadHighScore();
    if (score > currentHigh) {
        localStorage.setItem('onCloudWineHighScore', score.toString());
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
    
    // Tap left or right side to move
    if (pos.x < canvas.logicalWidth / 2) {
        player.dx = -5;
    } else {
        player.dx = 5;
    }
});

controls.on('touchstart', (pos) => {
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
    
    // Starting platform (wide ground base that can't be missed)
    platforms.push({
        x: 0,
        y: canvas.logicalHeight - 100,
        width: canvas.logicalWidth,
        height: PLATFORM_HEIGHT,
        type: 'normal',
        direction: 0,
        speed: 0,
        visible: true,
        decaying: false,
        decayTime: 0
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
            speed: 1,
            visible: true,
            decaying: false,
            decayTime: 0
        };
        platforms.push(platform);
        
        // Spawn wine bottle above platform
        if (Math.random() < WINE_SPAWN_CHANCE) {
            wines.push({
                x: x + PLATFORM_WIDTH / 2 - 10,
                y: y - 30,
                size: 20,
                collected: false,
                platform: platform
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
    baseGap = 80;
    currentGap = 80;
    comets = [];
    gameRunning = false;
    
    generatePlatforms();
    
    // Initialize gradient for better performance
    createGradient();
    
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
            // Also move UFO center point for circular motion
            if (platform.type === 'ufo') {
                platform.centerY += diff;
            }
        });
        
        // Move wine glasses down with camera
        wines.forEach(wine => {
            wine.y += diff;
        });
        
        // Move comets down with camera (so they fall at constant rate)
        comets.forEach(comet => {
            comet.y += diff;
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
                playSound('score');
                player.willSpinNextJump = true; // Spin on next jump
                particles.createParticles(wine.x + 10, wine.y + 10, 15, PALETTE.PURPLE_DARK);
                
                if (score >= WIN_SCORE && !endlessMode) {
                    winGame();
                    return;
                }
            }
        }
    });
    
    // Check platform collisions (only when falling)
    if (player.dy > 0) {
        platforms.forEach(platform => {
            if (!platform.visible) return; // Skip invisible platforms
            
            if (player.x + player.width > platform.x &&
                player.x < platform.x + platform.width &&
                player.y + player.height > platform.y &&
                player.y + player.height < platform.y + platform.height + 10 &&
                player.dy > 0) {
                
                player.dy = JUMP_STRENGTH;
                playSound('jump');
                
                // Start decay timer for UFO platforms
                if (platform.type === 'ufo') {
                    platform.decaying = true;
                    platform.decayTime = Math.random() * 500 + 500; // 0.5-1s in milliseconds
                }
                
                // Activate spin for this jump if wine was collected
                if (player.willSpinNextJump) {
                    player.shouldSpin = true;
                    player.willSpinNextJump = false;
                }
                
                // Increase gap in endless mode every 5 bottles (max 120px)
                if (endlessMode && score % 5 === 0 && score > 0) {
                    currentGap = Math.min(120, baseGap + Math.floor(score / 5) * 5);
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
    
    // Update moving platforms (including UFOs)
    platforms.forEach(platform => {
        if (platform.type === 'moving') {
            platform.x += platform.speed * platform.direction;
            
            if (platform.x <= 0 || platform.x + platform.width >= canvas.logicalWidth) {
                platform.direction *= -1;
            }
        } else if (platform.type === 'ufo') {
            // Circular motion for UFOs
            platform.angle += platform.speed * platform.direction;
            platform.x = platform.centerX + Math.cos(platform.angle) * platform.radius;
            platform.y = platform.centerY + Math.sin(platform.angle) * platform.radius;
        }
        
        // UFO platforms decay after being jumped on
        if (platform.type === 'ufo' && platform.decaying) {
            platform.decayTime -= 16; // Approximately 1 frame at 60fps
            if (platform.decayTime <= 0) {
                platform.visible = false;
            }
        }
    });
    
    // Update wines that are on moving platforms
    wines.forEach(wine => {
        if (!wine.collected && wine.platform && wine.platform.type === 'moving') {
            wine.x = wine.platform.x + PLATFORM_WIDTH / 2 - 10;
        }
    });
    
    // Update comets (falling down)
    comets.forEach(comet => {
        comet.y += comet.speed;
        comet.rotation += comet.rotationSpeed;
        
        // Update trail
        comet.trail.unshift({ x: comet.x + comet.size / 2, y: comet.y + comet.size / 2 });
        if (comet.trail.length > 5) {
            comet.trail.pop();
        }
    });
    
    // Check comet collision with player
    comets.forEach(comet => {
        const dist = Math.sqrt(
            Math.pow(player.x + player.width / 2 - (comet.x + comet.size / 2), 2) +
            Math.pow(player.y + player.height / 2 - (comet.y + comet.size / 2), 2)
        );
        if (dist < player.width / 2 + comet.size / 2) {
            playSound('fall');
            gameOver();
            return;
        }
    });
    
    // Remove comets that are off screen
    comets = comets.filter(comet => comet.y < canvas.logicalHeight + 50);
    
    // Remove platforms that are off screen (bottom)
    platforms = platforms.filter(platform => platform.y < canvas.logicalHeight + 50);
    wines = wines.filter(wine => wine.y < canvas.logicalHeight + 50);
    
    // Find the topmost regular platform (not UFO) for spacing calculation
    const topRegularPlatform = platforms.find(p => p.type !== 'ufo');
    
    // Add new regular platforms at top (off-screen)
    if (topRegularPlatform && topRegularPlatform.y > -200) {
        const x = random(0, canvas.logicalWidth - PLATFORM_WIDTH);
        const y = topRegularPlatform.y - random(currentGap - 10, currentGap + 20);
        
        // Regular platforms: normal or moving
        const platformType = Math.random() < 0.3 ? 'moving' : 'normal';
        
        const platform = {
            x: x,
            y: y,
            width: PLATFORM_WIDTH,
            height: PLATFORM_HEIGHT,
            type: platformType,
            direction: Math.random() < 0.5 ? 1 : -1,
            speed: 2,
            visible: true,
            decaying: false,
            decayTime: 0
        };
        platforms.unshift(platform);
        
        // Spawn wine bottle above platform
        if (Math.random() < WINE_SPAWN_CHANCE) {
            wines.unshift({
                x: x + PLATFORM_WIDTH / 2 - 10,
                y: y - 30,
                size: 20,
                collected: false,
                platform: platform
            });
        }
    }
    
    // Spawn UFO platforms separately (not affecting regular spacing)
    // Only after 15 bottles, rare spawn rate
    if (endlessMode && score >= 15 && topRegularPlatform && Math.random() < 0.0005) {
        const centerX = random(PLATFORM_WIDTH, canvas.logicalWidth - PLATFORM_WIDTH);
        const centerY = topRegularPlatform.y - random(60, 100);
        const radius = random(30, 50);
        const angle = Math.random() * Math.PI * 2;
        
        const ufoPlatform = {
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius,
            width: PLATFORM_WIDTH,
            height: PLATFORM_HEIGHT,
            type: 'ufo',
            direction: Math.random() < 0.5 ? 1 : -1,
            speed: 0.02, // Angular speed for circular motion
            visible: true,
            decaying: false,
            decayTime: 0,
            centerX: centerX,
            centerY: centerY,
            radius: radius,
            angle: angle
        };
        platforms.unshift(ufoPlatform);
    }
    
    // Spawn comets (hazards that fall down)
    // Start after 15 bottles, frequency increases with score
    if (endlessMode && score >= 15) {
        const baseSpawnRate = 0.001; // Base 0.1% chance per frame
        const scoreMultiplier = Math.floor((score - 20) / 10) * 0.01; // +1% per 10 bottles
        const cometSpawnRate = Math.min(0.08, baseSpawnRate + scoreMultiplier); // Max 8%
        
        if (Math.random() < cometSpawnRate) {
            comets.push({
                x: Math.random() * (canvas.logicalWidth - 30),
                y: -cameraY - 50, // Spawn above visible area
                size: 30,
                speed: 2 + Math.random() * 2, // 2-4 pixels per frame
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: 0.2,
                trail: [] // Trail positions for blur effect
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
    // Apply shake animation if active
    ctx.save();
    gameAnimations.applyShake();
    
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
    
    // Draw platforms as clouds or UFOs
    platforms.forEach(platform => {
        if (!platform.visible) return; // Skip invisible platforms
        
        // Fade out decaying UFO platforms
        if (platform.type === 'ufo' && platform.decaying) {
            const alpha = Math.max(0, platform.decayTime / 1000); // Fade based on remaining time
            ctx.globalAlpha = alpha;
        }
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `${PLATFORM_HEIGHT * 5}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Draw UFO emoji for UFO platforms, cloud for others
        const emoji = platform.type === 'ufo' ? '🛸' : '☁️';
        ctx.fillText(emoji, platform.x + platform.width / 2, platform.y + platform.height / 2);
        
        ctx.globalAlpha = 1.0; // Reset alpha
    });
    
    // Draw wine glasses
    wines.forEach(wine => {
        if (!wine.collected) {
            ctx.fillStyle = '#8B0000';
            ctx.font = '32px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🍷', wine.x + 10, wine.y + 10);
        }
    });
    
    // Draw comets as spinning stars with trail
    comets.forEach(comet => {
        // Draw trail (blur effect)
        comet.trail.forEach((pos, index) => {
            const alpha = 1 - (index / comet.trail.length);
            ctx.globalAlpha = alpha * 0.4;
            ctx.font = `${30 - index * 3}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⭐', pos.x, pos.y);
        });
        
        ctx.globalAlpha = 1.0;
        
        // Draw main star
        ctx.save();
        ctx.translate(comet.x + comet.size / 2, comet.y + comet.size / 2);
        ctx.rotate(comet.rotation);
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⭐', 0, 0);
        ctx.restore();
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
    
    ctx.restore();
    
    // Draw heart rain animation
    if (gameAnimations.isAnimating()) {
        gameAnimations.drawHeartRain();
    }
    
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
        document.getElementById('score').textContent = score;
        const scoreOverlay = document.getElementById('score-overlay');
        if (scoreOverlay) scoreOverlay.textContent = score;
    } else {
        document.getElementById('score').textContent = `${score}/${WIN_SCORE}`;
        const scoreOverlay = document.getElementById('score-overlay');
        if (scoreOverlay) scoreOverlay.textContent = `${score}/${WIN_SCORE}`;
    }
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
            "Joe, you're on cloud wine with me! 🍷☁️💕",
            restartGame
        );
    }, 800);
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
