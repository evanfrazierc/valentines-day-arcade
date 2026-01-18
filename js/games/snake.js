// Go Long, Gaston Game - For Sarah
const canvas = document.getElementById('gameCanvas');
const ctx = setupCanvas(canvas, 350, 600);

// Game constants - use logical dimensions for game calculations
const GRID_SIZE = 20;
const GRID_HEIGHT = Math.floor(canvas.logicalHeight / (canvas.logicalWidth / GRID_SIZE));
const TILE_SIZE = canvas.logicalWidth / GRID_SIZE;
const WIN_SCRAPS = 15;
const DINNER_SCRAPS = ['🍕', '🌭', '🍔'];

// Game state
let snake = [];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let scrap = { x: 10, y: 10, targetY: 10, currentY: -2, emoji: '🍕', falling: false };
let scrapsCollected = 0;
let gameRunning = false;
let gameSpeed = 150;
let lastUpdate = 0;
let tailWagTime = 0; // For tail wagging animation

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
    scrapsCollected = 0;
    gameRunning = false;
    spawnScrap();
    updateUI();
    draw();
}

function startGame() {
    gameRunning = true;
    setPlayingMode(true);
    lastUpdate = Date.now();
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

function update() {
    direction = nextDirection;
    
    // Calculate new head position
    const head = { 
        x: snake[0].x + direction.x, 
        y: snake[0].y + direction.y 
    };
    
    // Check wall collision
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_HEIGHT) {
        gameOver();
        return;
    }
    
    // Check self collision
    if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        gameOver();
        return;
    }
    
    snake.unshift(head);
    
    // Check scrap collision (only when scrap has landed)
    if (!scrap.falling && (head.x === scrap.x || head.x === scrap.x + 1) &&
        (head.y === scrap.y || head.y === scrap.y + 1)) {
        scrapsCollected++;
        particles.createParticles(
            (scrap.x + 1) * TILE_SIZE,
            (scrap.y + 1) * TILE_SIZE,
            20,
            '#c37557'
        );
        
        if (scrapsCollected >= WIN_SCRAPS) {
            winGame();
            return;
        }
        
        spawnScrap();
        updateUI();
    } else {
        snake.pop();
    }
}

function draw() {
    // Clear canvas with hardwood floor color
    ctx.fillStyle = '#837050';
    ctx.fillRect(0, 0, canvas.logicalWidth, canvas.logicalHeight);
    
    // Draw oval rug in center
    const rugCenterX = canvas.logicalWidth / 2;
    const rugCenterY = canvas.logicalHeight / 2;
    const rugRadiusX = canvas.logicalWidth * 0.4;
    const rugRadiusY = canvas.logicalHeight * 0.35;
    
    // Rug shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(rugCenterX + 3, rugCenterY + 3, rugRadiusX, rugRadiusY, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Main rug
    ctx.fillStyle = '#8e94c5';
    ctx.beginPath();
    ctx.ellipse(rugCenterX, rugCenterY, rugRadiusX, rugRadiusY, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Rug border pattern - light pale pink
    ctx.strokeStyle = '#ff9fba';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(rugCenterX, rugCenterY, rugRadiusX - 8, rugRadiusY - 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // Inner decorative border
    ctx.strokeStyle = '#ffd9cc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(rugCenterX, rugCenterY, rugRadiusX - 18, rugRadiusY - 18, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // Valentine's Day heart decorations on rug
    ctx.fillStyle = '#ff9fba';
    const heartSize = TILE_SIZE * 0.8;
    
    // Draw hearts at various positions around the rug - moved towards border
    const heartPositions = [
        { x: rugCenterX, y: rugCenterY - rugRadiusY * 0.7 }, // top
        { x: rugCenterX, y: rugCenterY + rugRadiusY * 0.7 }, // bottom
        { x: rugCenterX - rugRadiusX * 0.7, y: rugCenterY }, // left
        { x: rugCenterX + rugRadiusX * 0.7, y: rugCenterY }, // right
        { x: rugCenterX - rugRadiusX * 0.55, y: rugCenterY - rugRadiusY * 0.55 }, // top-left
        { x: rugCenterX + rugRadiusX * 0.55, y: rugCenterY - rugRadiusY * 0.55 }, // top-right
        { x: rugCenterX - rugRadiusX * 0.55, y: rugCenterY + rugRadiusY * 0.55 }, // bottom-left
        { x: rugCenterX + rugRadiusX * 0.55, y: rugCenterY + rugRadiusY * 0.55 }  // bottom-right
    ];
    
    heartPositions.forEach(pos => {
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
    ctx.strokeStyle = '#ffd9cc';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(rugCenterX, rugCenterY - centerSize * 0.5);
    ctx.lineTo(rugCenterX + centerSize * 0.5, rugCenterY);
    ctx.lineTo(rugCenterX, rugCenterY + centerSize * 0.5);
    ctx.lineTo(rugCenterX - centerSize * 0.5, rugCenterY);
    ctx.closePath();
    ctx.stroke();
    
    // Inner diamond
    ctx.strokeStyle = '#ff9fba';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rugCenterX, rugCenterY - centerSize * 0.3);
    ctx.lineTo(rugCenterX + centerSize * 0.3, rugCenterY);
    ctx.lineTo(rugCenterX, rugCenterY + centerSize * 0.3);
    ctx.lineTo(rugCenterX - centerSize * 0.3, rugCenterY);
    ctx.closePath();
    ctx.stroke();
    
    // Center circle
    ctx.fillStyle = '#ffd9cc';
    ctx.beginPath();
    ctx.arc(rugCenterX, rugCenterY, centerSize * 0.1, 0, Math.PI * 2);
    ctx.fill();
    
    // Small decorative circles at diamond corners
    ctx.fillStyle = '#ff9fba';
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
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(canvas.logicalWidth * 0.1, 0, canvas.logicalWidth * 0.15, canvas.logicalHeight * 0.1);
    ctx.fillRect(canvas.logicalWidth * 0.75, 0, canvas.logicalWidth * 0.15, canvas.logicalHeight * 0.1);
    
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
    
    // Draw wiener dog (snake)
    snake.forEach((segment, index) => {
        // Wiener dog brown/tan coloring
        const isHead = index === 0;
        const isTail = index === snake.length - 1;
        const centerX = segment.x * TILE_SIZE + TILE_SIZE / 2;
        const centerY = segment.y * TILE_SIZE + TILE_SIZE / 2;
        
        if (isHead) {
            ctx.fillStyle = '#945140'; // Saddle brown for head
        } else {
            ctx.fillStyle = '#000000'; // Black for body
        }
        
        // Draw main body
        ctx.fillRect(
            segment.x * TILE_SIZE,
            segment.y * TILE_SIZE,
            TILE_SIZE,
            TILE_SIZE
        );
        
        // Draw legs only on first body segment (index 1) and tail segment
        // Hide back legs when moving down, hide front legs when moving up
        const isFirstBody = index === 1;
        const shouldShowFrontLegs = isFirstBody && direction.y !== -1; // Hide front legs when moving up
        const shouldShowBackLegs = isTail && direction.y !== 1; // Hide back legs when moving down
        
        if (shouldShowFrontLegs || shouldShowBackLegs) {
            ctx.fillStyle = '#9f4f3a'; // Sienna for legs
            const legWidth = TILE_SIZE / 6;
            const legHeight = TILE_SIZE / 3;
            
            // Left/Top legs
            ctx.fillRect(
                segment.x * TILE_SIZE + TILE_SIZE / 4 - legWidth / 2,
                segment.y * TILE_SIZE + TILE_SIZE - 2,
                legWidth,
                legHeight
            );
            
            // Right/Bottom legs
            ctx.fillRect(
                segment.x * TILE_SIZE + 3 * TILE_SIZE / 4 - legWidth / 2,
                segment.y * TILE_SIZE + TILE_SIZE - 2,
                legWidth,
                legHeight
            );
        }
        
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
            
            ctx.fillStyle = '#945140';
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
            ctx.fillStyle = '#000000'; // Black ears
            
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
            ctx.fillStyle = '#000';
            const eyeSize = TILE_SIZE / 5;
            const noseSize = TILE_SIZE / 6;
            const eyeOffsetX = TILE_SIZE / 3;
            const eyeOffsetY = TILE_SIZE / 3;
            
            if (direction.x !== 0) {
                // Snout - long brown triangle extending in front of head
                const snoutLength = TILE_SIZE * 0.8;
                const snoutWidth = TILE_SIZE * 0.4;
                ctx.fillStyle = '#945140';
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
                ctx.fillStyle = '#000';
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
                ctx.fillStyle = '#FFF';
                ctx.beginPath();
                ctx.arc(
                    eyeX,
                    segment.y * TILE_SIZE + eyeOffsetY,
                    eyeSize * 1.5, 0, Math.PI * 2
                );
                ctx.fill();
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // Top pupil
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(
                    eyeX,
                    segment.y * TILE_SIZE + eyeOffsetY,
                    eyeSize / 2, 0, Math.PI * 2
                );
                ctx.fill();
                
                // Bottom eye
                ctx.fillStyle = '#FFF';
                ctx.beginPath();
                ctx.arc(
                    eyeX,
                    segment.y * TILE_SIZE + TILE_SIZE - eyeOffsetY,
                    eyeSize * 1.5, 0, Math.PI * 2
                );
                ctx.fill();
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // Bottom pupil
                ctx.fillStyle = '#000';
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
                ctx.fillStyle = '#945140';
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
                ctx.fillStyle = '#000';
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
                ctx.fillStyle = '#FFF';
                ctx.beginPath();
                ctx.arc(
                    segment.x * TILE_SIZE + eyeOffsetX,
                    eyeY,
                    eyeSize * 1.5, 0, Math.PI * 2
                );
                ctx.fill();
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // Left pupil
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(
                    segment.x * TILE_SIZE + eyeOffsetX,
                    eyeY,
                    eyeSize / 2, 0, Math.PI * 2
                );
                ctx.fill();
                
                // Right eye
                ctx.fillStyle = '#FFF';
                ctx.beginPath();
                ctx.arc(
                    segment.x * TILE_SIZE + TILE_SIZE - eyeOffsetX,
                    eyeY,
                    eyeSize * 1.5, 0, Math.PI * 2
                );
                ctx.fill();
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // Right pupil
                ctx.fillStyle = '#000';
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
    
    // Draw particles
    particles.update();
    particles.draw();
    
    // Draw start message
    if (!gameRunning) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Swipe or Tap to Start!', canvas.logicalWidth / 2, canvas.logicalHeight / 2);
    }
}

function gameLoop() {
    if (!gameRunning) return;
    
    // Update scrap falling animation every frame for smoothness
    if (scrap.falling) {
        scrap.currentY += 0.5; // Smooth fall speed
        if (scrap.currentY >= scrap.targetY) {
            scrap.currentY = scrap.targetY;
            scrap.falling = false;
        }
    }
    
    const now = Date.now();
    if (now - lastUpdate >= gameSpeed) {
        update();
        lastUpdate = now;
    }
    
    draw();
    requestAnimationFrame(gameLoop);
}

function updateUI() {
    document.getElementById('scraps').textContent = `${scrapsCollected}/${WIN_SCRAPS}`;
    document.getElementById('length').textContent = snake.length;
    const scrapsOverlay = document.getElementById('scraps-overlay');
    const lengthOverlay = document.getElementById('length-overlay');
    if (scrapsOverlay) scrapsOverlay.textContent = `${scrapsCollected}/${WIN_SCRAPS}`;
    if (lengthOverlay) lengthOverlay.textContent = snake.length;
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
        "Sarah, Gaston fetched all the scraps just for you! 🐕💕",
        restartGame
    );
}

function restartGame() {
    document.getElementById('gameOverScreen').classList.remove('show');
    initGame();
}

// Start the game
initGame();
