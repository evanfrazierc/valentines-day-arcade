// Tap Hero Rhythm Game - For Harrison
const canvas = document.getElementById('gameCanvas');
const ctx = setupCanvas(canvas, 350, 600);

// Game constants
const NOTE_SPEED = 3;
const TARGET_Y = canvas.logicalHeight - 100;
const TARGET_HEIGHT = 60;
const LANE_WIDTH = canvas.logicalWidth / 3;
const WIN_SCORE = 30;
const HIT_WINDOW = 70; // pixels for perfect hit
const GOOD_WINDOW = 120; // pixels for good hit

// Game state
let notes = [];
let score = 0;
let combo = 0;
let maxCombo = 0;
let gameRunning = false;
let gameTime = 0;
let notesSpawned = 0;
let totalNotes = 50; // Total notes in the song

// Beat pattern for the song (timing in milliseconds)
// Minimum 700ms between notes to prevent 3 simultaneous notes
const beatPattern = [
    { time: 1000, lane: 1 },
    { time: 1700, lane: 2 },
    { time: 2400, lane: 0 },
    { time: 3100, lane: 1 },
    { time: 3800, lane: 2 },
    { time: 4500, lane: 0 },
    { time: 5200, lane: 1 },
    { time: 5900, lane: 2 },
    { time: 6600, lane: 0 },
    { time: 7300, lane: 1 },
    { time: 8000, lane: 2 },
    { time: 8700, lane: 0 },
    { time: 9400, lane: 1 },
    { time: 10100, lane: 2 },
    { time: 10800, lane: 0 },
    { time: 11500, lane: 1 },
    { time: 12200, lane: 2 },
    { time: 12900, lane: 0 },
    { time: 13600, lane: 1 },
    { time: 14300, lane: 2 },
    { time: 15000, lane: 0 },
    { time: 15700, lane: 1 },
    { time: 16400, lane: 2 },
    { time: 17100, lane: 0 },
    { time: 17800, lane: 1 },
    { time: 18500, lane: 2 },
    { time: 19200, lane: 0 },
    { time: 19900, lane: 1 },
    { time: 20600, lane: 2 },
    { time: 21300, lane: 0 },
    { time: 22000, lane: 1 },
    { time: 22700, lane: 2 },
    { time: 23400, lane: 0 },
    { time: 24100, lane: 1 },
    { time: 24800, lane: 2 },
    { time: 25500, lane: 0 },
    { time: 26200, lane: 1 },
    { time: 26900, lane: 2 },
    { time: 27600, lane: 0 },
    { time: 28300, lane: 1 },
    { time: 29000, lane: 2 },
    { time: 29700, lane: 0 },
    { time: 30400, lane: 1 },
    { time: 31100, lane: 2 },
    { time: 31800, lane: 0 },
    { time: 32500, lane: 1 },
    { time: 33200, lane: 2 },
    { time: 33900, lane: 0 },
    { time: 34600, lane: 1 },
    { time: 35300, lane: 2 }
];

let beatIndex = 0;
let startTime = 0;

// Particle system
const particles = new ParticleSystem(canvas, ctx);

// Touch controls
const controls = new TouchControls(canvas);

// Handle multi-touch
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!gameRunning) {
        startGame();
        return;
    }
    
    // Process all touch points
    const rect = canvas.getBoundingClientRect();
    const visualHeight = rect.height;
    const visualWidth = visualHeight * (canvas.logicalWidth / canvas.logicalHeight);
    const visualLeft = (rect.width - visualWidth) / 2;
    
    for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const relativeX = touch.clientX - rect.left - visualLeft;
        const canvasX = (relativeX / visualWidth) * canvas.logicalWidth;
        const lane = Math.max(0, Math.min(2, Math.floor(canvasX / LANE_WIDTH)));
        tapLane(lane);
    }
}, { passive: false });

controls.on('touchstart', (pos) => {
    if (!gameRunning) {
        startGame();
        return;
    }
    
    // Get the actual canvas rect
    const rect = canvas.getBoundingClientRect();
    
    // Calculate canvas visual bounds based on aspect ratio
    const visualHeight = rect.height;
    const visualWidth = visualHeight * (canvas.logicalWidth / canvas.logicalHeight);
    const visualLeft = (rect.width - visualWidth) / 2;
    
    // Map screen coordinate to canvas coordinate
    const relativeX = pos.x - visualLeft;
    const canvasX = (relativeX / visualWidth) * canvas.logicalWidth;
    
    // Determine which lane was tapped (clamp to 0-2)
    const lane = Math.max(0, Math.min(2, Math.floor(canvasX / LANE_WIDTH)));
    tapLane(lane);
});

controls.on('tap', (pos) => {
    if (!gameRunning) {
        startGame();
        return;
    }
    
    const rect = canvas.getBoundingClientRect();
    const visualHeight = rect.height;
    const visualWidth = visualHeight * (canvas.logicalWidth / canvas.logicalHeight);
    const visualLeft = (rect.width - visualWidth) / 2;
    const relativeX = pos.x - visualLeft;
    const canvasX = (relativeX / visualWidth) * canvas.logicalWidth;
    const lane = Math.max(0, Math.min(2, Math.floor(canvasX / LANE_WIDTH)));
    tapLane(lane);
});

controls.init();

function tapLane(lane) {
    // Find the closest note in this lane
    let closestNote = null;
    let closestDistance = Infinity;
    
    for (let note of notes) {
        if (note.lane === lane && !note.hit && !note.missed) {
            const distance = Math.abs(note.y - TARGET_Y);
            if (distance < GOOD_WINDOW && distance < closestDistance) {
                closestDistance = distance;
                closestNote = note;
            }
        }
    }
    
    if (closestNote) {
        closestNote.hit = true;
        
        // Determine hit quality
        if (closestDistance < HIT_WINDOW) {
            // Perfect hit
            score++;
            combo++;
            particles.createParticles(
                lane * LANE_WIDTH + LANE_WIDTH / 2,
                TARGET_Y,
                20,
                PALETTE.YELLOW_GOLD
            );
        } else {
            // Good hit
            score++;
            combo++;
            particles.createParticles(
                lane * LANE_WIDTH + LANE_WIDTH / 2,
                TARGET_Y,
                10,
                PALETTE.PINK_PASTEL
            );
        }
        
        if (combo > maxCombo) {
            maxCombo = combo;
        }
        
        if (score >= WIN_SCORE) {
            winGame();
        }
        
        updateUI();
    } else {
        // Missed tap - reset combo
        if (combo > 0) {
            combo = 0;
            updateUI();
        }
    }
}

// Initialize game
function initGame() {
    notes = [];
    score = 0;
    combo = 0;
    maxCombo = 0;
    gameRunning = false;
    gameTime = 0;
    beatIndex = 0;
    notesSpawned = 0;
    startTime = 0;
    
    updateUI();
    draw();
}

function startGame() {
    gameRunning = true;
    setPlayingMode(true);
    startTime = Date.now();
    gameLoop();
}

function update() {
    gameTime = Date.now() - startTime;
    
    // Spawn notes based on beat pattern
    while (beatIndex < beatPattern.length && 
           gameTime >= beatPattern[beatIndex].time - 2000) {
        const beat = beatPattern[beatIndex];
        notes.push({
            lane: beat.lane,
            y: -30,
            size: 30,
            hit: false,
            missed: false
        });
        notesSpawned++;
        beatIndex++;
    }
    
    // Update notes
    for (let i = notes.length - 1; i >= 0; i--) {
        if (!notes[i].hit) {
            notes[i].y += NOTE_SPEED;
            
            // Check if note was missed
            if (notes[i].y > TARGET_Y + GOOD_WINDOW && !notes[i].missed) {
                notes[i].missed = true;
                combo = 0;
                updateUI();
            }
        }
        
        // Remove notes that are off screen
        if (notes[i].y > canvas.logicalHeight || notes[i].hit) {
            notes.splice(i, 1);
        }
    }
    
    // Check if song is over
    if (beatIndex >= beatPattern.length && notes.length === 0) {
        if (score >= WIN_SCORE) {
            winGame();
        } else {
            gameOver();
        }
    }
}

function draw() {
    // Clear canvas with gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.logicalHeight);
    gradient.addColorStop(0, PALETTE.BROWN_MAHOGANY);
    gradient.addColorStop(1, PALETTE.RED_DARK);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.logicalWidth, canvas.logicalHeight);
    
    // Draw lane dividers
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    for (let i = 1; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(i * LANE_WIDTH, 0);
        ctx.lineTo(i * LANE_WIDTH, canvas.logicalHeight);
        ctx.stroke();
    }
    
    // Draw target line
    ctx.strokeStyle = PALETTE.WHITE;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, TARGET_Y);
    ctx.lineTo(canvas.logicalWidth, TARGET_Y);
    ctx.stroke();
    
    // Draw target area
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(0, TARGET_Y - TARGET_HEIGHT / 2, canvas.logicalWidth, TARGET_HEIGHT);
    
    // Draw notes
    notes.forEach(note => {
        if (!note.hit) {
            const x = note.lane * LANE_WIDTH + LANE_WIDTH / 2;
            
            // Color based on position
            let color = PALETTE.PINK_HOT;
            const distanceFromTarget = Math.abs(note.y - TARGET_Y);
            if (distanceFromTarget < HIT_WINDOW) {
                color = PALETTE.YELLOW_GOLD; // Yellow for perfect
            } else if (distanceFromTarget < GOOD_WINDOW) {
                color = PALETTE.PINK_PASTEL; // Light pink for good
            }
            
            drawHeart(ctx, x, note.y, note.size, color);
        }
    });
    
    // Draw particles
    particles.update();
    particles.draw();
    
    // Draw combo multiplier
    if (combo > 1 && gameRunning) {
        ctx.fillStyle = PALETTE.YELLOW_GOLD;
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${combo}x`, canvas.logicalWidth / 2, 60);
    }
    
    // Draw start message
    if (!gameRunning) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Tap to Start!', canvas.logicalWidth / 2, canvas.logicalHeight / 2 - 30);
        ctx.font = '16px Arial';
        ctx.fillText('Tap hearts as they hit the line', canvas.logicalWidth / 2, canvas.logicalHeight / 2 + 10);
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
    document.getElementById('combo').textContent = combo;
    const scoreOverlay = document.getElementById('score-overlay');
    const comboOverlay = document.getElementById('combo-overlay');
    if (scoreOverlay) scoreOverlay.textContent = `${score}/${WIN_SCORE}`;
    if (comboOverlay) comboOverlay.textContent = combo;
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
        "Harrison, you hit all the right notes in my heart! 🎵💕",
        restartGame
    );
}

function restartGame() {
    document.getElementById('gameOverScreen').classList.remove('show');
    initGame();
}

// Start the game
initGame();
