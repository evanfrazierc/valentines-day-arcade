// Go Long, Gaston Game - For Sarah
const canvas = document.getElementById('gameCanvas');
const ctx = setupCanvas(canvas, 350, 600);

// Game constants - use logical dimensions for game calculations
const GRID_SIZE = 20;
const GRID_HEIGHT = Math.floor(canvas.logicalHeight / (canvas.logicalWidth / GRID_SIZE));
const TILE_SIZE = canvas.logicalWidth / GRID_SIZE;
const WIN_SCRAPS = 15;
const DINNER_SCRAPS = ['🍕', '🌭', '🍔'];

// Endless mode - check URL parameter or default to true
const urlParams = new URLSearchParams(window.location.search);
const endlessParam = urlParams.get('endless');
let endlessMode = endlessParam !== null ? (endlessParam === 'true' || endlessParam === '1') : true;
let highScore = 0;

// Cache calculated values for performance
const CACHED_VALUES = {
    rugCenterX: canvas.logicalWidth / 2,
    rugCenterY: canvas.logicalHeight / 2,
    rugRadiusX: canvas.logicalWidth * 0.4,
    rugRadiusY: canvas.logicalHeight * 0.35,
    legWidth: canvas.logicalWidth * 0.05,
    legHeight: canvas.logicalHeight * 0.1,
    tileHalf: TILE_SIZE / 2,
    legWidthSmall: TILE_SIZE / 6,
    legHeightSmall: TILE_SIZE / 3
};

// Pre-calculate heart positions (done once for performance)
const HEART_POSITIONS = [
    { x: CACHED_VALUES.rugCenterX, y: CACHED_VALUES.rugCenterY - CACHED_VALUES.rugRadiusY * 0.7 },
    { x: CACHED_VALUES.rugCenterX, y: CACHED_VALUES.rugCenterY + CACHED_VALUES.rugRadiusY * 0.7 },
    { x: CACHED_VALUES.rugCenterX - CACHED_VALUES.rugRadiusX * 0.7, y: CACHED_VALUES.rugCenterY },
    { x: CACHED_VALUES.rugCenterX + CACHED_VALUES.rugRadiusX * 0.7, y: CACHED_VALUES.rugCenterY },
    { x: CACHED_VALUES.rugCenterX - CACHED_VALUES.rugRadiusX * 0.55, y: CACHED_VALUES.rugCenterY - CACHED_VALUES.rugRadiusY * 0.55 },
    { x: CACHED_VALUES.rugCenterX + CACHED_VALUES.rugRadiusX * 0.55, y: CACHED_VALUES.rugCenterY - CACHED_VALUES.rugRadiusY * 0.55 },
    { x: CACHED_VALUES.rugCenterX - CACHED_VALUES.rugRadiusX * 0.55, y: CACHED_VALUES.rugCenterY + CACHED_VALUES.rugRadiusY * 0.55 },
    { x: CACHED_VALUES.rugCenterX + CACHED_VALUES.rugRadiusX * 0.55, y: CACHED_VALUES.rugCenterY + CACHED_VALUES.rugRadiusY * 0.55 }
];

// Game state
let snake = [];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let scrap = { x: 10, y: 10, targetY: 10, currentY: -2, emoji: '🍕', falling: false };
let grapes = []; // Dangerous grapes that spawn in endless mode
let scrapsCollected = 0;
let gameRunning = false;
let gameSpeed = 150;
let lastUpdate = 0;
let tailWagTime = 0; // For tail wagging animation
let arenaShrinkage = 0; // Track how much arena has shrunk
let baseSpeed = 150; // Base game speed

// Audio using Web Audio API
let audioContext = null;
let audioBuffers = {
    eat: null,
    crash: null,
    move: null,
    bark: null
};
let audioEnabled = false;

async function loadAudio() {
    try {
        const loadSound = async (url) => {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            return await audioContext.decodeAudioData(arrayBuffer);
        };
        
        audioBuffers.eat = await loadSound('../audio/snake-eat.wav');
        audioBuffers.crash = await loadSound('../audio/snake-crash.wav');
        audioBuffers.move = await loadSound('../audio/snake-move.wav');
        audioBuffers.bark = await loadSound('../audio/dog-bark.wav');
        
        audioEnabled = true;
    } catch (error) {
        audioEnabled = false;
    }
}

function loadHighScore() {
    return parseInt(localStorage.getItem('snakeHighScore') || '0');
}

function saveHighScore(score) {
    const currentHigh = loadHighScore();
    if (score > currentHigh) {
        localStorage.setItem('snakeHighScore', score.toString());
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

function playSound(soundName) {
    if (!audioEnabled || !audioContext || !audioBuffers[soundName]) return;
    try {
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffers[soundName];
        
        const gainNode = audioContext.createGain();
        if (soundName === 'move') {
            gainNode.gain.value = 0.2; // Quieter movement sound
        } else if (soundName === 'eat') {
            gainNode.gain.value = 0.6;
        } else {
            gainNode.gain.value = 0.7;
        }
        
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        source.start(0);
    } catch (error) {}
}

// Particle system
const particles = new ParticleSystem(canvas, ctx);

// Game animations
const gameAnimations = new GameAnimations(canvas, ctx);

// Touch controls
const controls = new TouchControls(canvas);
controls.on('swipe', (dir) => {
    // Disable input during animations
    if (gameAnimations.isAnimating()) {
        return;
    }
    
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
    }
});

controls.init();

// Keyboard controls
window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        
        // Disable input during animations
        if (gameAnimations.isAnimating()) {
            return;
        }
        
        if (!gameRunning) {
            startGame();
            return;
        }
        
        switch(e.key) {
            case 'ArrowUp':
                if (direction.y === 0) nextDirection = { x: 0, y: -1 };
                break;
            case 'ArrowDown':
                if (direction.y === 0) nextDirection = { x: 0, y: 1 };
                break;
            case 'ArrowLeft':
                if (direction.x === 0) nextDirection = { x: -1, y: 0 };
                break;
            case 'ArrowRight':
                if (direction.x === 0) nextDirection = { x: 1, y: 0 };
                break;
        }
    }
});

// Initialize game
function initGame() {
    snake = [
        { x: 5, y: 10 },
        { x: 4, y: 10 },
        { x: 3, y: 10 }
    ];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    scrapsCollected = 0;
    grapes = [];
    gameRunning = false;
    gameSpeed = baseSpeed;
    arenaShrinkage = 0;
    spawnScrap();
    updateUI();
    draw();
}

function startGame() {
    gameRunning = true;
    setPlayingMode(true);
    lastUpdate = Date.now();
    
    // Play three barks
    playSound('bark');
    setTimeout(() => playSound('bark'), 300);
    setTimeout(() => playSound('bark'), 600);
    
    gameLoop();
}

function spawnScrap() {
    const randomEmoji = DINNER_SCRAPS[Math.floor(Math.random() * DINNER_SCRAPS.length)];
    let validPosition = false;
    const minY = Math.floor(GRID_HEIGHT / 3); // Start from 1/3 down (top third excluded)
    const maxY = GRID_HEIGHT - 1; // Leave room for 2x2 scrap
    const maxX = GRID_SIZE - 1; // Leave room for 2x2 scrap
    
    while (!validPosition) {
        scrap.x = Math.floor(Math.random() * maxX);
        scrap.targetY = Math.floor(Math.random() * (maxY - minY)) + minY; // Bottom 2/3 only
        scrap.emoji = randomEmoji;
        
        // Check if any part of the 2x2 scrap overlaps with snake
        validPosition = !snake.some(segment => 
            (segment.x === scrap.x || segment.x === scrap.x + 1) &&
            (segment.y === scrap.targetY || segment.y === scrap.targetY + 1)
        );
    }
    
    // Start scrap above the screen
    scrap.currentY = -2;
    scrap.y = scrap.targetY;
    scrap.falling = true;
}

function spawnGrape() {
    let validPosition = false;
    const minY = Math.floor(GRID_HEIGHT / 3); // Start from 1/3 down (top third excluded)
    const maxY = GRID_HEIGHT - 1; // Leave room for 2x2 grape
    const maxX = GRID_SIZE - 1; // Leave room for 2x2 grape
    let grape = { x: 0, targetY: 0, currentY: -2, y: 0, falling: true };
    
    while (!validPosition) {
        grape.x = Math.floor(Math.random() * maxX);
        grape.targetY = Math.floor(Math.random() * (maxY - minY)) + minY; // Bottom 2/3 only
        
        // Check if any part of the 2x2 grape overlaps with snake or scrap
        const overlapsSnake = snake.some(segment => 
            (segment.x === grape.x || segment.x === grape.x + 1) &&
            (segment.y === grape.targetY || segment.y === grape.targetY + 1)
        );
        
        const overlapsScrap = (grape.x === scrap.x || grape.x === scrap.x + 1) &&
            (grape.targetY === scrap.targetY || grape.targetY === scrap.targetY + 1);
        
        // Check if overlaps with other grapes
        const overlapsGrape = grapes.some(g => 
            Math.abs(g.x - grape.x) < 2 && Math.abs(g.targetY - grape.targetY) < 2
        );
        
        validPosition = !overlapsSnake && !overlapsScrap && !overlapsGrape;
    }
    
    grape.y = grape.targetY;
    grapes.push(grape);
}

function update() {
    direction = nextDirection;
    
    // Calculate new head position
    const head = { 
        x: snake[0].x + direction.x, 
        y: snake[0].y + direction.y 
    };
    
    // Play move sound
    playSound('move');
    
    // Check wall collision
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_HEIGHT) {
        playSound('crash');
        gameOver();
        return;
    }
    
    // Check self collision
    if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        playSound('crash');
        gameOver();
        return;
    }
    
    // Check grape collision (deadly!)
    for (let grape of grapes) {
        if (!grape.falling && (head.x === grape.x || head.x === grape.x + 1) &&
            (head.y === grape.y || head.y === grape.y + 1)) {
            playSound('crash');
            gameOver();
            return;
        }
    }
    
    snake.unshift(head);
    
    // Check scrap collision (only when scrap has landed)
    if (!scrap.falling && (head.x === scrap.x || head.x === scrap.x + 1) &&
        (head.y === scrap.y || head.y === scrap.y + 1)) {
        scrapsCollected++;
        playSound('eat');
        particles.createParticles(
            (scrap.x + 1) * TILE_SIZE,
            (scrap.y + 1) * TILE_SIZE,
            20,
            PALETTE.BROWN_CHOCOLATE
        );
        
        // Progressive difficulty in endless mode
        if (endlessMode && scrapsCollected > 0) {
            // Increase speed every 10 scraps
            if (scrapsCollected % 10 === 0) {
                gameSpeed = Math.max(50, baseSpeed - (Math.floor(scrapsCollected / 10) * 15));
            }
        }
        
        // Clear all grapes when scrap is collected
        grapes = [];
        
        if (scrapsCollected >= WIN_SCRAPS && !endlessMode) {
            winGame();
            return;
        }
        
        spawnScrap();
        
        // Spawn grapes in endless mode after 10 scraps (1 grape per 10 scraps)
        if (endlessMode && scrapsCollected >= 10) {
            const grapeCount = Math.floor(scrapsCollected / 10);
            for (let i = 0; i < grapeCount; i++) {
                spawnGrape();
            }
        }
        updateUI();
    } else {
        snake.pop();
    }
}

function draw() {
    // Apply shake animation if active
    ctx.save();
    gameAnimations.applyShake();
    
    // Clear canvas with blue floor
    ctx.fillStyle = '#89BDE8'; // Lighter, more pale blue
    ctx.fillRect(0, 0, canvas.logicalWidth, canvas.logicalHeight);
    
    // Add wood plank texture to floor
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    for (let i = 0; i < canvas.logicalHeight; i += TILE_SIZE * 3) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.logicalWidth, i);
        ctx.stroke();
    }
    
    // Draw oval rug in center
    const rugCenterX = CACHED_VALUES.rugCenterX;
    const rugCenterY = CACHED_VALUES.rugCenterY;
    const rugRadiusX = CACHED_VALUES.rugRadiusX;
    const rugRadiusY = CACHED_VALUES.rugRadiusY;
    
    // Rug shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(rugCenterX + 3, rugCenterY + 3, rugRadiusX, rugRadiusY, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Main rug - vibrant magenta/purple
    ctx.fillStyle = '#C44BAD';
    ctx.beginPath();
    ctx.ellipse(rugCenterX, rugCenterY, rugRadiusX, rugRadiusY, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Rug border pattern - light pale pink
    ctx.strokeStyle = PALETTE.PINK_PASTEL;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(rugCenterX, rugCenterY, rugRadiusX - 8, rugRadiusY - 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // Inner decorative border
    ctx.strokeStyle = PALETTE.PINK_PALE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(rugCenterX, rugCenterY, rugRadiusX - 18, rugRadiusY - 18, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // Valentine's Day heart decorations on rug
    ctx.fillStyle = PALETTE.PINK_PASTEL;
    const heartSize = TILE_SIZE * 0.8;
    
    // Draw hearts at pre-calculated positions (optimized)
    HEART_POSITIONS.forEach(pos => {
        // Draw properly proportioned heart shape
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.beginPath();
        ctx.moveTo(0, heartSize * 0.3);
        // Left curve
        ctx.bezierCurveTo(-heartSize * 0.5, -heartSize * 0.1, -heartSize * 0.5, -heartSize * 0.5, 0, -heartSize * 0.2);
        // Right curve
        ctx.bezierCurveTo(heartSize * 0.5, -heartSize * 0.5, heartSize * 0.5, -heartSize * 0.1, 0, heartSize * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    });
    
    // Geometric designs in center of rug
    const centerSize = TILE_SIZE * 2;
    
    // Outer diamond
    ctx.strokeStyle = PALETTE.PINK_PALE;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(rugCenterX, rugCenterY - centerSize * 0.5);
    ctx.lineTo(rugCenterX + centerSize * 0.5, rugCenterY);
    ctx.lineTo(rugCenterX, rugCenterY + centerSize * 0.5);
    ctx.lineTo(rugCenterX - centerSize * 0.5, rugCenterY);
    ctx.closePath();
    ctx.stroke();
    
    // Inner diamond
    ctx.strokeStyle = PALETTE.PINK_PASTEL;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rugCenterX, rugCenterY - centerSize * 0.3);
    ctx.lineTo(rugCenterX + centerSize * 0.3, rugCenterY);
    ctx.lineTo(rugCenterX, rugCenterY + centerSize * 0.3);
    ctx.lineTo(rugCenterX - centerSize * 0.3, rugCenterY);
    ctx.closePath();
    ctx.stroke();
    
    // Center circle
    ctx.fillStyle = PALETTE.PINK_PALE;
    ctx.beginPath();
    ctx.arc(rugCenterX, rugCenterY, centerSize * 0.1, 0, Math.PI * 2);
    ctx.fill();
    
    // Small decorative circles at diamond corners
    ctx.fillStyle = PALETTE.PINK_PASTEL;
    const circleRadius = centerSize * 0.06;
    [
        { x: rugCenterX, y: rugCenterY - centerSize * 0.5 },
        { x: rugCenterX + centerSize * 0.5, y: rugCenterY },
        { x: rugCenterX, y: rugCenterY + centerSize * 0.5 },
        { x: rugCenterX - centerSize * 0.5, y: rugCenterY }
    ].forEach(pos => {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, circleRadius, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Table legs/shadow at top to suggest being under table
    const legWidth = TILE_SIZE * 1.5;
    const legHeight = canvas.logicalHeight * 0.1; // Shorter legs
    const legColor = 'rgba(139, 69, 19, 0.35)'; // More transparent brown
    const legShadow = 'rgba(0, 0, 0, 0.1)'; // Subtle shadow
    
    // Top left leg
    ctx.fillStyle = legShadow;
    ctx.fillRect(canvas.logicalWidth * 0.15 + 2, 0, legWidth, legHeight + 2);
    ctx.fillStyle = legColor;
    ctx.fillRect(canvas.logicalWidth * 0.15, 0, legWidth, legHeight);
    
    // Top right leg
    ctx.fillStyle = legShadow;
    ctx.fillRect(canvas.logicalWidth * 0.85 - legWidth + 2, 0, legWidth, legHeight + 2);
    ctx.fillStyle = legColor;
    ctx.fillRect(canvas.logicalWidth * 0.85 - legWidth, 0, legWidth, legHeight);
    
    // Table legs/shadow at bottom to mirror top legs
    // Bottom left leg
    ctx.fillStyle = legShadow;
    ctx.fillRect(canvas.logicalWidth * 0.15 + 2, canvas.logicalHeight - legHeight, legWidth, legHeight + 2);
    ctx.fillStyle = legColor;
    ctx.fillRect(canvas.logicalWidth * 0.15, canvas.logicalHeight - legHeight, legWidth, legHeight);
    
    // Bottom right leg
    ctx.fillStyle = legShadow;
    ctx.fillRect(canvas.logicalWidth * 0.85 - legWidth + 2, canvas.logicalHeight - legHeight, legWidth, legHeight + 2);
    ctx.fillStyle = legColor;
    ctx.fillRect(canvas.logicalWidth * 0.85 - legWidth, canvas.logicalHeight - legHeight, legWidth, legHeight);
    
    // Draw grid
    ctx.strokeStyle = 'rgba(139, 69, 19, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * TILE_SIZE, 0);
        ctx.lineTo(i * TILE_SIZE, canvas.logicalHeight);
        ctx.stroke();
    }
    for (let i = 0; i <= GRID_HEIGHT; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * TILE_SIZE);
        ctx.lineTo(canvas.logicalWidth, i * TILE_SIZE);
        ctx.stroke();
    }
    
    // Draw wiener dog (snake) - draw legs first so body covers them when overlapping
    // First pass: Draw all legs
    snake.forEach((segment, index) => {
        const isFirstBody = index === 1;
        const isTail = index === snake.length - 1;
        
        // Draw legs only on first body segment (index 1) and tail segment
        if (isFirstBody || isTail) {
            ctx.fillStyle = PALETTE.BROWN_SIENNA; // Sienna for legs
            const legWidth = TILE_SIZE / 6;
            const legHeight = TILE_SIZE / 3;
            
            // Left leg
            ctx.fillRect(
                segment.x * TILE_SIZE + TILE_SIZE / 4 - legWidth / 2,
                segment.y * TILE_SIZE + TILE_SIZE - 2,
                legWidth,
                legHeight
            );
            
            // Right leg
            ctx.fillRect(
                segment.x * TILE_SIZE + 3 * TILE_SIZE / 4 - legWidth / 2,
                segment.y * TILE_SIZE + TILE_SIZE - 2,
                legWidth,
                legHeight
            );
        }
    });
    
    // Second pass: Draw body segments (will cover legs naturally when overlapping)
    snake.forEach((segment, index) => {
        // Wiener dog brown/tan coloring
        const isHead = index === 0;
        const isTail = index === snake.length - 1;
        const centerX = segment.x * TILE_SIZE + TILE_SIZE / 2;
        const centerY = segment.y * TILE_SIZE + TILE_SIZE / 2;
        
        if (isHead) {
            ctx.fillStyle = PALETTE.BROWN_SADDLE; // Saddle brown for head
        } else {
            ctx.fillStyle = PALETTE.BLACK; // Black for body
        }
        
        // Draw main body
        ctx.fillRect(
            segment.x * TILE_SIZE,
            segment.y * TILE_SIZE,
            TILE_SIZE,
            TILE_SIZE
        );
        
        // Draw wagging tail on last segment
        if (isTail) {
            tailWagTime += 0.1;
            const wagAngle = Math.sin(tailWagTime) * 0.6; // Increased wag angle for more movement
            const tailLength = TILE_SIZE * 1.2; // Increased from TILE_SIZE / 2
            const tailWidth = TILE_SIZE / 8; // Thin tail
            
            // Determine tail direction (opposite of where next segment is)
            let tailDirection = { x: 0, y: 0 };
            if (index > 0) {
                const prevSegment = snake[index - 1];
                tailDirection.x = segment.x - prevSegment.x;
                tailDirection.y = segment.y - prevSegment.y;
            } else {
                // Fallback if only one segment
                tailDirection.x = -direction.x;
                tailDirection.y = -direction.y;
            }
            
            ctx.fillStyle = PALETTE.BROWN_SADDLE;
            ctx.save();
            ctx.translate(centerX, centerY);
            
            // Rotate based on tail direction and add wag
            let baseAngle = Math.atan2(tailDirection.y, tailDirection.x);
            ctx.rotate(baseAngle + wagAngle);
            
            // Draw tail as a thin rectangle
            ctx.fillRect(TILE_SIZE / 4, -tailWidth / 2, tailLength, tailWidth);
            
            ctx.restore();
        }
        
        // Draw floppy ears and face on head
        if (isHead) {
            // Floppy ears
            ctx.fillStyle = PALETTE.BLACK; // Black ears
            
            if (direction.x !== 0) {
                // Horizontal movement - ears on top and bottom, angled back
                
                // Top ear
                ctx.save();
                ctx.translate(
                    centerX + (direction.x > 0 ? -TILE_SIZE / 4 : TILE_SIZE / 4),
                    segment.y * TILE_SIZE - TILE_SIZE / 4
                );
                ctx.rotate(direction.x > 0 ? -0.5 : 0.5); // Top ear angle
                ctx.beginPath();
                ctx.ellipse(0, 0, TILE_SIZE / 3, TILE_SIZE / 1.5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                
                // Bottom ear
                ctx.save();
                ctx.translate(
                    centerX + (direction.x > 0 ? -TILE_SIZE / 4 : TILE_SIZE / 4),
                    segment.y * TILE_SIZE + TILE_SIZE + TILE_SIZE / 4
                );
                ctx.rotate(direction.x > 0 ? 0.5 : -0.5); // Bottom ear angle (opposite)
                ctx.beginPath();
                ctx.ellipse(0, 0, TILE_SIZE / 3, TILE_SIZE / 1.5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else {
                // Vertical movement - ears on left and right, angled back
                
                // Left ear
                ctx.save();
                ctx.translate(
                    segment.x * TILE_SIZE - TILE_SIZE / 4,
                    centerY + (direction.y > 0 ? -TILE_SIZE / 4 : TILE_SIZE / 4)
                );
                ctx.rotate(direction.y > 0 ? -0.5 : 0.5); // Left ear angle
                ctx.beginPath();
                ctx.ellipse(0, 0, TILE_SIZE / 1.5, TILE_SIZE / 3, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                
                // Right ear
                ctx.save();
                ctx.translate(
                    segment.x * TILE_SIZE + TILE_SIZE + TILE_SIZE / 4,
                    centerY + (direction.y > 0 ? -TILE_SIZE / 4 : TILE_SIZE / 4)
                );
                ctx.rotate(direction.y > 0 ? 0.5 : -0.5); // Right ear angle (opposite)
                ctx.beginPath();
                ctx.ellipse(0, 0, TILE_SIZE / 1.5, TILE_SIZE / 3, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            
            // Eyes
            ctx.fillStyle = PALETTE.BLACK;
            const eyeSize = TILE_SIZE / 5;
            const noseSize = TILE_SIZE / 6;
            const eyeOffsetX = TILE_SIZE / 3;
            const eyeOffsetY = TILE_SIZE / 3;
            
            if (direction.x !== 0) {
                // Snout - long brown triangle extending in front of head
                const snoutLength = TILE_SIZE * 0.8;
                const snoutWidth = TILE_SIZE * 0.4;
                ctx.fillStyle = PALETTE.BROWN_SADDLE;
                ctx.beginPath();
                if (direction.x > 0) {
                    // Moving right - triangle points right
                    ctx.moveTo(centerX + snoutLength, centerY);
                    ctx.lineTo(centerX, centerY - snoutWidth / 2);
                    ctx.lineTo(centerX, centerY + snoutWidth / 2);
                } else {
                    // Moving left - triangle points left
                    ctx.moveTo(centerX - snoutLength, centerY);
                    ctx.lineTo(centerX, centerY - snoutWidth / 2);
                    ctx.lineTo(centerX, centerY + snoutWidth / 2);
                }
                ctx.closePath();
                ctx.fill();
                
                // Black nose at tip of snout
                ctx.fillStyle = PALETTE.BLACK;
                ctx.beginPath();
                ctx.arc(
                    centerX + (direction.x > 0 ? snoutLength : -snoutLength),
                    centerY,
                    TILE_SIZE / 8, 0, Math.PI * 2
                );
                ctx.fill();
                
                // Cartoon eyes - white with black pupils
                const eyeX = centerX + (direction.x > 0 ? eyeOffsetX : -eyeOffsetX);
                
                // Top eye
                ctx.fillStyle = PALETTE.WHITE;
                ctx.beginPath();
                ctx.arc(
                    eyeX,
                    segment.y * TILE_SIZE + eyeOffsetY,
                    eyeSize * 1.5, 0, Math.PI * 2
                );
                ctx.fill();
                ctx.strokeStyle = PALETTE.BLACK;
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // Top pupil
                ctx.fillStyle = PALETTE.BLACK;
                ctx.beginPath();
                ctx.arc(
                    eyeX,
                    segment.y * TILE_SIZE + eyeOffsetY,
                    eyeSize / 2, 0, Math.PI * 2
                );
                ctx.fill();
                
                // Bottom eye
                ctx.fillStyle = PALETTE.WHITE;
                ctx.beginPath();
                ctx.arc(
                    eyeX,
                    segment.y * TILE_SIZE + TILE_SIZE - eyeOffsetY,
                    eyeSize * 1.5, 0, Math.PI * 2
                );
                ctx.fill();
                ctx.strokeStyle = PALETTE.BLACK;
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // Bottom pupil
                ctx.fillStyle = PALETTE.BLACK;
                ctx.beginPath();
                ctx.arc(
                    eyeX,
                    segment.y * TILE_SIZE + TILE_SIZE - eyeOffsetY,
                    eyeSize / 2, 0, Math.PI * 2
                );
                ctx.fill();
                
                // Nose
                ctx.beginPath();
                ctx.arc(
                    centerX + (direction.x > 0 ? TILE_SIZE / 2.5 : -TILE_SIZE / 2.5),
                    centerY,
                    noseSize, 0, Math.PI * 2
                );
                ctx.fill();
            } else {
                // Snout - long brown triangle extending in front of head
                const snoutLength = TILE_SIZE * 0.8;
                const snoutWidth = TILE_SIZE * 0.4;
                ctx.fillStyle = PALETTE.BROWN_SADDLE;
                ctx.beginPath();
                if (direction.y > 0) {
                    // Moving down - triangle points down
                    ctx.moveTo(centerX, centerY + snoutLength);
                    ctx.lineTo(centerX - snoutWidth / 2, centerY);
                    ctx.lineTo(centerX + snoutWidth / 2, centerY);
                } else {
                    // Moving up - triangle points up
                    ctx.moveTo(centerX, centerY - snoutLength);
                    ctx.lineTo(centerX - snoutWidth / 2, centerY);
                    ctx.lineTo(centerX + snoutWidth / 2, centerY);
                }
                ctx.closePath();
                ctx.fill();
                
                // Black nose at tip of snout
                ctx.fillStyle = PALETTE.BLACK;
                ctx.beginPath();
                ctx.arc(
                    centerX,
                    centerY + (direction.y > 0 ? snoutLength : -snoutLength),
                    TILE_SIZE / 8, 0, Math.PI * 2
                );
                ctx.fill();
                
                // Cartoon eyes - white with black pupils
                const eyeY = centerY + (direction.y > 0 ? eyeOffsetY : -eyeOffsetY);
                
                // Left eye
                ctx.fillStyle = PALETTE.WHITE;
                ctx.beginPath();
                ctx.arc(
                    segment.x * TILE_SIZE + eyeOffsetX,
                    eyeY,
                    eyeSize * 1.5, 0, Math.PI * 2
                );
                ctx.fill();
                ctx.strokeStyle = PALETTE.BLACK;
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // Left pupil
                ctx.fillStyle = PALETTE.BLACK;
                ctx.beginPath();
                ctx.arc(
                    segment.x * TILE_SIZE + eyeOffsetX,
                    eyeY,
                    eyeSize / 2, 0, Math.PI * 2
                );
                ctx.fill();
                
                // Right eye
                ctx.fillStyle = PALETTE.WHITE;
                ctx.beginPath();
                ctx.arc(
                    segment.x * TILE_SIZE + TILE_SIZE - eyeOffsetX,
                    eyeY,
                    eyeSize * 1.5, 0, Math.PI * 2
                );
                ctx.fill();
                ctx.strokeStyle = PALETTE.BLACK;
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // Right pupil
                ctx.fillStyle = PALETTE.BLACK;
                ctx.beginPath();
                ctx.arc(
                    segment.x * TILE_SIZE + TILE_SIZE - eyeOffsetX,
                    eyeY,
                    eyeSize / 2, 0, Math.PI * 2
                );
                ctx.fill();
                
                // Nose
                ctx.beginPath();
                ctx.arc(
                    centerX,
                    centerY + (direction.y > 0 ? TILE_SIZE / 2.5 : -TILE_SIZE / 2.5),
                    noseSize, 0, Math.PI * 2
                );
                ctx.fill();
            }
        }
    });
    
    // Draw dinner scrap (2x2 tiles) at animated position
    ctx.font = `${TILE_SIZE * 1.8}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
        scrap.emoji,
        scrap.x * TILE_SIZE + TILE_SIZE,
        scrap.currentY * TILE_SIZE + TILE_SIZE
    );
    
    // Draw grapes (2x2 tiles) at animated positions - DANGER!
    grapes.forEach(grape => {
        ctx.fillText(
            '🍇',
            grape.x * TILE_SIZE + TILE_SIZE,
            grape.currentY * TILE_SIZE + TILE_SIZE
        );
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
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Swipe or Tap to Start!', canvas.logicalWidth / 2, canvas.logicalHeight / 2);
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
    
    // Update scrap falling animation every frame for smoothness
    if (scrap.falling) {
        scrap.currentY += 0.5; // Smooth fall speed
        if (scrap.currentY >= scrap.targetY) {
            scrap.currentY = scrap.targetY;
            scrap.falling = false;
        }
    }
    
    // Update grape falling animations
    grapes.forEach(grape => {
        if (grape.falling) {
            grape.currentY += 0.5; // Smooth fall speed
            if (grape.currentY >= grape.targetY) {
                grape.currentY = grape.targetY;
                grape.falling = false;
            }
        }
    });
    
    const now = Date.now();
    if (now - lastUpdate >= gameSpeed) {
        update();
        lastUpdate = now;
    }
    
    draw();
    requestAnimationFrame(gameLoop);
}

function updateUI() {
    if (endlessMode) {
        document.getElementById('scraps').textContent = scrapsCollected;
        const scrapsOverlay = document.getElementById('scraps-overlay');
        if (scrapsOverlay) scrapsOverlay.textContent = scrapsCollected;
    } else {
        document.getElementById('scraps').textContent = `${scrapsCollected}/${WIN_SCRAPS}`;
        const scrapsOverlay = document.getElementById('scraps-overlay');
        if (scrapsOverlay) scrapsOverlay.textContent = `${scrapsCollected}/${WIN_SCRAPS}`;
    }
    
    document.getElementById('length').textContent = snake.length;
    const lengthOverlay = document.getElementById('length-overlay');
    if (lengthOverlay) lengthOverlay.textContent = snake.length;
}

function gameOver() {
    gameRunning = false;
    
    // Save high score in endless mode
    if (endlessMode) {
        saveHighScore(scrapsCollected);
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
            "Sarah, Gaston fetched all the scraps just for you! 🐕💕",
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
const endlessModeToggle = document.getElementById('endlessModeToggle');
const highScoreLabel = document.getElementById('highScoreLabel');
const highScoreDisplay = document.getElementById('highScore');

highScore = loadHighScore();
updateHighScoreDisplay();

// Set initial checkbox state and display
endlessModeToggle.checked = endlessMode;
if (endlessMode) {
    highScoreLabel.style.display = 'block';
    highScoreDisplay.style.display = 'block';
}

endlessModeToggle.addEventListener('change', (e) => {
    endlessMode = e.target.checked;
    
    if (endlessMode) {
        highScoreLabel.style.display = 'block';
        highScoreDisplay.style.display = 'block';
        updateHighScoreDisplay();
    } else {
        highScoreLabel.style.display = 'none';
        highScoreDisplay.style.display = 'none';
    }
    
    // Update UI to reflect mode change
    updateUI();
});
