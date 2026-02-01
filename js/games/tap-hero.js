// Tap Hero Rhythm Game - For Harrison
const canvas = document.getElementById('gameCanvas');
const ctx = setupCanvas(canvas, 350, 600);

// Game constants
const NOTE_SPEED = 2;
const TARGET_Y = canvas.logicalHeight - 100;
const TARGET_HEIGHT = 60;
const LANE_WIDTH = canvas.logicalWidth / 3;
const WIN_SCORE = 30;
const HIT_WINDOW = 10; // pixels for perfect hit
const GOOD_WINDOW = 80; // pixels for good hit

// Game state
let notes = [];
let score = 0;
let combo = 0;
let maxCombo = 0;
let missedCount = 0;
let gameRunning = false;
let gameTime = 0;
let notesSpawned = 0;
let totalNotes = 205; // Total notes in the song including half-beats (extended to match 3:53 duration)
let feedbackText = '';
let feedbackTime = 0;
let feedbackColor = '';
let shakeIntensity = 0;
let shakeTime = 0;
let equalizerBars = [];
const NUM_BARS = 30;
let waveOffset = 0;
let waveSpeed = 0.08;
// Endless mode - check URL parameter or default to true
const urlParams = new URLSearchParams(window.location.search);
const endlessParam = urlParams.get('endless');
let endlessMode = endlessParam !== null ? (endlessParam === 'true' || endlessParam === '1') : true;
let highScore = 0;

// Audio
let backgroundMusic = null;
let audioContext = null;
let hitPerfectSound = null;
let hitGoodSound = null;
let hitMissSound = null;
let emptyTapSound = null;
let audioEnabled = false;

// Beat pattern for the song (75 BPM = 800ms per beat)
const BPM = 75;
const BEAT_MS = 60000 / BPM; // 800ms per beat
const HALF_BEAT = BEAT_MS / 2; // 400ms

const beatPattern = [
    // Intro - warm up (starting at beat 3 to allow proper note spawning)
    { time: BEAT_MS * 3, lane: 1 },
    { time: BEAT_MS * 4, lane: 2 },
    { time: BEAT_MS * 5, lane: 0 },
    { time: BEAT_MS * 6, lane: 2 },
    { time: BEAT_MS * 7, lane: 1 },
    { time: BEAT_MS * 8, lane: 0 },
    { time: BEAT_MS * 9, lane: 1 },
    { time: BEAT_MS * 10, lane: 0 },
    { time: BEAT_MS * 11, lane: 2 },
    { time: BEAT_MS * 12, lane: 1 },
    { time: BEAT_MS * 13, lane: 2 },
    { time: BEAT_MS * 14, lane: 0 },
    { time: BEAT_MS * 15, lane: 1 },
    { time: BEAT_MS * 16, lane: 2 },
    { time: BEAT_MS * 16, lane: 0 }, // Double note
    { time: BEAT_MS * 17, lane: 1 },
    { time: BEAT_MS * 18, lane: 0 },
    { time: BEAT_MS * 19, lane: 2 },
    { time: BEAT_MS * 20, lane: 1 },
    { time: BEAT_MS * 20, lane: 2 }, // Double note
    { time: BEAT_MS * 21, lane: 0 },
    { time: BEAT_MS * 22, lane: 1 },
    { time: BEAT_MS * 23, lane: 2 },
    { time: BEAT_MS * 24, lane: 0 },
    { time: BEAT_MS * 24, lane: 1 }, // Double note
    { time: BEAT_MS * 25, lane: 2 },
    { time: BEAT_MS * 26, lane: 1 },
    { time: BEAT_MS * 27, lane: 0 },
    { time: BEAT_MS * 28, lane: 2 },
    { time: BEAT_MS * 28, lane: 0 }, // Double note
    { time: BEAT_MS * 29, lane: 1 },
    { time: BEAT_MS * 30, lane: 2 },
    { time: BEAT_MS * 31, lane: 0 },
    { time: BEAT_MS * 32, lane: 1 },
    { time: BEAT_MS * 32, lane: 2 }, // Double note
    { time: BEAT_MS * 33, lane: 0 },
    { time: BEAT_MS * 34, lane: 2 },
    { time: BEAT_MS * 35, lane: 1 },
    { time: BEAT_MS * 36, lane: 0 },
    { time: BEAT_MS * 36, lane: 1 }, // Double note
    { time: BEAT_MS * 37, lane: 2 },
    { time: BEAT_MS * 38, lane: 0 },
    { time: BEAT_MS * 39, lane: 1 },
    { time: BEAT_MS * 40, lane: 2 },
    { time: BEAT_MS * 40, lane: 0 }, // Double note
    { time: BEAT_MS * 41, lane: 1 },
    { time: BEAT_MS * 42, lane: 2 },
    { time: BEAT_MS * 43, lane: 0 },
    { time: BEAT_MS * 44, lane: 1 },
    { time: BEAT_MS * 44, lane: 2 }, // Double note
    { time: BEAT_MS * 45, lane: 0 },
    { time: BEAT_MS * 46, lane: 1 },
    { time: BEAT_MS * 47, lane: 2 },
    { time: BEAT_MS * 48, lane: 0 },
    { time: BEAT_MS * 48, lane: 1 }, // Double note
    { time: BEAT_MS * 49, lane: 2 },
    { time: BEAT_MS * 50, lane: 1 },
    // Build up - more challenging
    { time: BEAT_MS * 51, lane: 0 },
    { time: BEAT_MS * 52, lane: 2 },
    { time: BEAT_MS * 52, lane: 1 }, // Double note
    { time: BEAT_MS * 53, lane: 0 },
    { time: BEAT_MS * 54, lane: 1 },
    { time: BEAT_MS * 55, lane: 2 },
    { time: BEAT_MS * 56, lane: 0 },
    { time: BEAT_MS * 56, lane: 2 }, // Double note
    { time: BEAT_MS * 57, lane: 1 },
    { time: BEAT_MS * 58, lane: 0 },
    { time: BEAT_MS * 59, lane: 2 },
    { time: BEAT_MS * 60, lane: 1 },
    { time: BEAT_MS * 60, lane: 0 }, // Double note
    { time: BEAT_MS * 61, lane: 2 },
    { time: BEAT_MS * 62, lane: 1 },
    { time: BEAT_MS * 63, lane: 0 },
    { time: BEAT_MS * 64, lane: 2 },
    { time: BEAT_MS * 64, lane: 1 }, // Double note
    { time: BEAT_MS * 65, lane: 0 },
    { time: BEAT_MS * 66, lane: 1 },
    { time: BEAT_MS * 67, lane: 2 },
    { time: BEAT_MS * 68, lane: 0 },
    { time: BEAT_MS * 68, lane: 1 }, // Double note
    { time: BEAT_MS * 69, lane: 2 },
    { time: BEAT_MS * 70, lane: 0 },
    { time: BEAT_MS * 71, lane: 1 },
    { time: BEAT_MS * 72, lane: 2 },
    { time: BEAT_MS * 72, lane: 0 }, // Double note
    { time: BEAT_MS * 73, lane: 1 },
    { time: BEAT_MS * 74, lane: 2 },
    { time: BEAT_MS * 75, lane: 0 },
    { time: BEAT_MS * 76, lane: 1 },
    { time: BEAT_MS * 76, lane: 2 }, // Double note
    { time: BEAT_MS * 77, lane: 0 },
    { time: BEAT_MS * 78, lane: 2 },
    { time: BEAT_MS * 79, lane: 1 },
    { time: BEAT_MS * 80, lane: 0 },
    { time: BEAT_MS * 80, lane: 2 }, // Double note
    { time: BEAT_MS * 81, lane: 1 },
    { time: BEAT_MS * 82, lane: 0 },
    { time: BEAT_MS * 83, lane: 1 },
    { time: BEAT_MS * 83.5, lane: 2 }, // Half-beat
    { time: BEAT_MS * 84, lane: 1 },
    { time: BEAT_MS * 84, lane: 0 }, // Double note
    { time: BEAT_MS * 85, lane: 0 },
    { time: BEAT_MS * 86, lane: 1 },
    { time: BEAT_MS * 87, lane: 0 },
    { time: BEAT_MS * 88, lane: 2 },
    { time: BEAT_MS * 88, lane: 1 }, // Double note
    { time: BEAT_MS * 89, lane: 0 },
    { time: BEAT_MS * 90, lane: 1 },
    { time: BEAT_MS * 90.5, lane: 2 }, // Half-beat
    { time: BEAT_MS * 91, lane: 0 },
    { time: BEAT_MS * 92, lane: 1 },
    { time: BEAT_MS * 92, lane: 2 }, // Double note
    { time: BEAT_MS * 93, lane: 1 },
    { time: BEAT_MS * 94, lane: 0 },
    { time: BEAT_MS * 95, lane: 2 },
    { time: BEAT_MS * 96, lane: 1 },
    { time: BEAT_MS * 96, lane: 0 }, // Double note
    { time: BEAT_MS * 97, lane: 2 },
    { time: BEAT_MS * 98, lane: 1 },
    { time: BEAT_MS * 99, lane: 0 },
    { time: BEAT_MS * 100, lane: 2 },
    { time: BEAT_MS * 100, lane: 1 }, // Double note
    // Peak - most challenging section with half-beats
    { time: BEAT_MS * 101, lane: 0 },
    { time: BEAT_MS * 101.5, lane: 2 }, // Half-beat
    { time: BEAT_MS * 102, lane: 1 },
    { time: BEAT_MS * 102, lane: 0 }, // Double note
    { time: BEAT_MS * 103, lane: 0 },
    { time: BEAT_MS * 104, lane: 2 },
    { time: BEAT_MS * 104, lane: 1 }, // Double note
    { time: BEAT_MS * 105, lane: 0 },
    { time: BEAT_MS * 105.5, lane: 1 }, // Half-beat
    { time: BEAT_MS * 106, lane: 0 },
    { time: BEAT_MS * 107, lane: 2 },
    { time: BEAT_MS * 107.5, lane: 0 }, // Half-beat
    { time: BEAT_MS * 108, lane: 2 },
    { time: BEAT_MS * 108, lane: 1 }, // Double note
    { time: BEAT_MS * 109, lane: 2 },
    { time: BEAT_MS * 110, lane: 0 },
    { time: BEAT_MS * 110, lane: 1 }, // Double note
    { time: BEAT_MS * 111, lane: 2 },
    { time: BEAT_MS * 111.5, lane: 0 }, // Half-beat
    { time: BEAT_MS * 112, lane: 1 },
    { time: BEAT_MS * 113, lane: 0 },
    { time: BEAT_MS * 114, lane: 2 },
    { time: BEAT_MS * 114, lane: 0 }, // Double note
    { time: BEAT_MS * 115, lane: 1 },
    { time: BEAT_MS * 116, lane: 2 },
    { time: BEAT_MS * 116, lane: 0 }, // Double note
    { time: BEAT_MS * 117, lane: 1 },
    { time: BEAT_MS * 118, lane: 2 },
    { time: BEAT_MS * 118.5, lane: 0 }, // Half-beat
    { time: BEAT_MS * 119, lane: 1 },
    { time: BEAT_MS * 120, lane: 1 },
    { time: BEAT_MS * 120, lane: 2 }, // Double note
    { time: BEAT_MS * 121, lane: 0 },
    { time: BEAT_MS * 121.5, lane: 2 }, // Half-beat
    { time: BEAT_MS * 122, lane: 1 },
    { time: BEAT_MS * 122, lane: 0 }, // Double note
    { time: BEAT_MS * 123, lane: 0 },
    { time: BEAT_MS * 124, lane: 2 },
    { time: BEAT_MS * 124.5, lane: 1 }, // Half-beat
    { time: BEAT_MS * 125, lane: 2 },
    { time: BEAT_MS * 126, lane: 0 },
    { time: BEAT_MS * 126, lane: 2 }, // Double note
    { time: BEAT_MS * 127, lane: 1 },
    { time: BEAT_MS * 127.5, lane: 0 }, // Half-beat
    { time: BEAT_MS * 128, lane: 1 },
    { time: BEAT_MS * 128, lane: 2 }, // Double note
    { time: BEAT_MS * 129, lane: 1 },
    { time: BEAT_MS * 130, lane: 2 },
    { time: BEAT_MS * 130.5, lane: 0 }, // Half-beat
    { time: BEAT_MS * 131, lane: 1 },
    { time: BEAT_MS * 132, lane: 1 },
    { time: BEAT_MS * 132, lane: 0 }, // Double note
    { time: BEAT_MS * 133, lane: 2 },
    { time: BEAT_MS * 133.5, lane: 1 }, // Half-beat
    { time: BEAT_MS * 134, lane: 2 },
    { time: BEAT_MS * 134, lane: 0 }, // Double note
    { time: BEAT_MS * 135, lane: 2 },
    { time: BEAT_MS * 136, lane: 1 },
    { time: BEAT_MS * 136.5, lane: 2 }, // Half-beat
    { time: BEAT_MS * 137, lane: 0 },
    { time: BEAT_MS * 138, lane: 2 },
    { time: BEAT_MS * 138, lane: 1 }, // Double note
    { time: BEAT_MS * 139, lane: 0 },
    { time: BEAT_MS * 139.5, lane: 2 }, // Half-beat
    { time: BEAT_MS * 140, lane: 1 },
    { time: BEAT_MS * 140, lane: 0 }, // Double note
    { time: BEAT_MS * 141, lane: 0 },
    { time: BEAT_MS * 142, lane: 2 },
    { time: BEAT_MS * 142.5, lane: 1 }, // Half-beat
    { time: BEAT_MS * 143, lane: 0 },
    { time: BEAT_MS * 144, lane: 0 },
    { time: BEAT_MS * 144, lane: 2 }, // Double note
    { time: BEAT_MS * 145, lane: 1 },
    { time: BEAT_MS * 145.5, lane: 0 }, // Half-beat
    { time: BEAT_MS * 146, lane: 1 },
    { time: BEAT_MS * 146, lane: 2 }, // Double note
    { time: BEAT_MS * 147, lane: 1 },
    { time: BEAT_MS * 148, lane: 2 },
    { time: BEAT_MS * 148.5, lane: 0 }, // Half-beat
    { time: BEAT_MS * 149, lane: 2 },
    { time: BEAT_MS * 150, lane: 1 },
    { time: BEAT_MS * 150, lane: 2 }, // Double note
    // Final stretch - maintaining challenge with more half-beats
    { time: BEAT_MS * 151, lane: 0 },
    { time: BEAT_MS * 151.5, lane: 1 }, // Half-beat
    { time: BEAT_MS * 152, lane: 2 },
    { time: BEAT_MS * 152, lane: 0 }, // Double note
    { time: BEAT_MS * 153, lane: 0 },
    { time: BEAT_MS * 153.5, lane: 2 }, // Half-beat
    { time: BEAT_MS * 154, lane: 1 },
    { time: BEAT_MS * 155, lane: 2 },
    { time: BEAT_MS * 155.5, lane: 0 }, // Half-beat
    { time: BEAT_MS * 156, lane: 2 },
    { time: BEAT_MS * 156, lane: 1 }, // Double note
    { time: BEAT_MS * 157, lane: 2 },
    { time: BEAT_MS * 157.5, lane: 1 }, // Half-beat
    { time: BEAT_MS * 158, lane: 0 },
    { time: BEAT_MS * 159, lane: 1 },
    { time: BEAT_MS * 159.5, lane: 2 }, // Half-beat
    { time: BEAT_MS * 160, lane: 1 },
    { time: BEAT_MS * 160, lane: 0 }, // Double note
    { time: BEAT_MS * 161, lane: 1 },
    { time: BEAT_MS * 161.5, lane: 0 }, // Half-beat
    { time: BEAT_MS * 162, lane: 2 },
    { time: BEAT_MS * 163, lane: 0 },
    { time: BEAT_MS * 163.5, lane: 1 }, // Half-beat
    { time: BEAT_MS * 164, lane: 0 },
    { time: BEAT_MS * 164, lane: 2 }, // Double note
    { time: BEAT_MS * 165, lane: 0 },
    { time: BEAT_MS * 165.5, lane: 2 }, // Half-beat
    { time: BEAT_MS * 166, lane: 1 },
    { time: BEAT_MS * 167, lane: 2 },
    { time: BEAT_MS * 167.5, lane: 0 }, // Half-beat
    { time: BEAT_MS * 168, lane: 2 },
    { time: BEAT_MS * 168, lane: 1 }, // Double note
    { time: BEAT_MS * 169, lane: 2 },
    { time: BEAT_MS * 169.5, lane: 1 }, // Half-beat
    { time: BEAT_MS * 170, lane: 0 },
    { time: BEAT_MS * 170.5, lane: 2 }, // Half-beat
    { time: BEAT_MS * 171, lane: 1 },
    { time: BEAT_MS * 171.5, lane: 0 }, // Half-beat
    { time: BEAT_MS * 172, lane: 2 },
    { time: BEAT_MS * 172, lane: 1 }, // Double note
    { time: BEAT_MS * 173, lane: 1 },
    { time: BEAT_MS * 173.5, lane: 2 }, // Half-beat
    { time: BEAT_MS * 174, lane: 1 },
    { time: BEAT_MS * 174.5, lane: 0 }, // Half-beat
    { time: BEAT_MS * 175, lane: 2 },
    { time: BEAT_MS * 175, lane: 1 } // Final double note
];

let beatIndex = 0;
let startTime = 0;
let lastEmptyTapTime = 0; // Prevent multiple empty tap sounds

// Pre-create gradient for better performance
let backgroundGradient = null;
const FONTS = {
    FEEDBACK: 'bold 40px Arial, sans-serif',
    BOLD_24: 'bold 24px Arial',
    REGULAR_16: '16px Arial'
};

function createGradient() {
    backgroundGradient = ctx.createLinearGradient(0, 0, 0, canvas.logicalHeight);
    backgroundGradient.addColorStop(0, '#0a0a0a'); // Very dark at top
    backgroundGradient.addColorStop(0.6, '#1a1a1a'); // Dark gray
    backgroundGradient.addColorStop(1, '#2a2a2a'); // Slightly lighter at bottom
}

// Load audio files
async function loadAudio() {
    // Background music (HTML5 Audio)
    try {
        backgroundMusic = new Audio('../audio/tap-hero-music.mp3');
        backgroundMusic.loop = false;
        backgroundMusic.volume = 0.6;
        backgroundMusic.load();
    } catch (error) {}
    
    // Load hit sounds (Web Audio API) - optional
    if (audioContext) {
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
        
        hitPerfectSound = await loadSound('../audio/hit-perfect.wav');
        hitGoodSound = await loadSound('../audio/hit-good.wav');
        hitMissSound = await loadSound('../audio/hit-miss.wav');
        emptyTapSound = await loadSound('../audio/tap-empty.wav');
    }
    
    audioEnabled = true;
    
    // If game already started while we were loading, start the music now
    if (gameRunning && backgroundMusic) {
        backgroundMusic.currentTime = 0;
        backgroundMusic.play().catch(() => {});
    }
}

// Play a sound effect (uses Web Audio API for overlapping sounds)
function playSound(poolName) {
    if (!audioEnabled || !audioContext) return;
    
    let buffer;
    if (poolName === 'perfect') buffer = hitPerfectSound;
    else if (poolName === 'good') buffer = hitGoodSound;
    else if (poolName === 'miss') buffer = hitMissSound;
    else if (poolName === 'empty') buffer = emptyTapSound;
    
    if (!buffer) return; // Sound not loaded yet
    
    try {
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        
        const gainNode = audioContext.createGain();
        gainNode.gain.value = poolName === 'perfect' ? 0.8 : poolName === 'good' ? 0.7 : poolName === 'empty' ? 0.3 : 0.6;
        
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        source.start(0);
    } catch (error) {
        // Silently fail if audio doesn't work
    }
}

function loadHighScore() {
    return parseInt(localStorage.getItem('tapHeroHighScore') || '0');
}

function saveHighScore(score) {
    const currentHigh = loadHighScore();
    if (score > currentHigh) {
        localStorage.setItem('tapHeroHighScore', score.toString());
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

// Keyboard controls
window.addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        
        if (!gameRunning) {
            startGame();
            return;
        }
        
        let lane;
        switch(e.key) {
            case 'ArrowLeft':
                lane = 0;
                break;
            case 'ArrowDown':
                lane = 1;
                break;
            case 'ArrowRight':
                lane = 2;
                break;
        }
        
        if (lane !== undefined) {
            tapLane(lane);
        }
    }
});

// Perspective helpers
function getLaneXAtY(lane, y) {
    // Create perspective: top is narrower (50% width), bottom is full width
    const perspectiveFactor = 0.5 + (y / canvas.logicalHeight) * 0.5; // 0.5 to 1.0
    const topWidth = canvas.logicalWidth * 0.5;
    const bottomWidth = canvas.logicalWidth;
    const currentWidth = topWidth + (bottomWidth - topWidth) * (y / canvas.logicalHeight);
    const leftOffset = (canvas.logicalWidth - currentWidth) / 2;
    
    const laneWidth = currentWidth / 3;
    return leftOffset + lane * laneWidth + laneWidth / 2;
}

function getLaneWidthAtY(y) {
    const topWidth = canvas.logicalWidth * 0.5;
    const bottomWidth = canvas.logicalWidth;
    const currentWidth = topWidth + (bottomWidth - topWidth) * (y / canvas.logicalHeight);
    return currentWidth / 3;
}

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
            score += 2;
            combo++;
            feedbackText = '🤘 Perfect! 🤘';
            feedbackColor = PALETTE.YELLOW_LIGHT;
            feedbackTime = Date.now();
            playSound('perfect');
            // Boost equalizer on perfect hit
            waveSpeed = 0.16; // Speed up wave
            waveOffset += 0.5; // Jump wave forward
            equalizerBars.forEach(bar => {
                bar.targetHeight = Math.min(1.0, bar.targetHeight + 0.3);
            });
            particles.createParticles(
                lane * LANE_WIDTH + LANE_WIDTH / 2,
                TARGET_Y,
                20,
                PALETTE.YELLOW_LIGHT
            );
        } else {
            // Good hit
            score++;
            combo++;
            feedbackText = '👍 Nice! 👍';
            feedbackColor = PALETTE.PINK_PASTEL;
            feedbackTime = Date.now();
            playSound('good');
            // Boost equalizer on good hit
            waveSpeed = 0.12; // Speed up wave slightly
            waveOffset += 0.3; // Jump wave forward
            equalizerBars.forEach(bar => {
                bar.targetHeight = Math.min(1.0, bar.targetHeight + 0.2);
            });
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
        
        if (score >= WIN_SCORE && !endlessMode) {
            winGame();
        }
        
        updateUI();
    } else if (gameRunning) {
        // Empty tap during gameplay - play soft feedback (debounced)
        const now = Date.now();
        if (now - lastEmptyTapTime > 100) { // Prevent multiple sounds within 100ms
            playSound('empty');
            lastEmptyTapTime = now;
        }
    }
    // Note: Don't reset combo for empty taps, only when notes are missed
}

// Initialize game
function initGame() {
    notes = [];
    score = 0;
    combo = 0;
    maxCombo = 0;
    missedCount = 0;
    gameRunning = false;
    gameTime = 0;
    beatIndex = 0;
    notesSpawned = 0;
    feedbackText = '';
    feedbackTime = 0;
    feedbackColor = '';
    shakeIntensity = 0;
    shakeTime = 0;
    waveOffset = 0;
    
    // Initialize equalizer bars
    equalizerBars = [];
    for (let i = 0; i < NUM_BARS; i++) {
        equalizerBars.push({
            height: Math.random() * 0.6 + 0.3,
            targetHeight: Math.random() * 0.6 + 0.3,
            color: `hsl(${(i / NUM_BARS) * 360}, 70%, 50%)`
        });
    }
    startTime = 0;
    
    // Initialize gradient for better performance
    createGradient();
    
    updateUI();
    draw();
}

function startGame() {
    gameRunning = true;
    setPlayingMode(true);
    startTime = Date.now();
    
    // Start background music
    if (audioEnabled && backgroundMusic) {
        backgroundMusic.currentTime = 0;
        backgroundMusic.play().catch(() => {});
    }
    
    gameLoop();
}

function update() {
    // Use music playback time as source of truth for perfect sync
    // Fall back to Date.now() if music isn't playing yet
    if (backgroundMusic && audioEnabled && !backgroundMusic.paused) {
        gameTime = backgroundMusic.currentTime * 1000; // Convert to milliseconds
    } else {
        gameTime = Date.now() - startTime;
    }
    
    // Spawn notes based on beat pattern
    while (beatIndex < beatPattern.length && 
           gameTime >= beatPattern[beatIndex].time - 2000) {
        const beat = beatPattern[beatIndex];
        notes.push({
            lane: beat.lane,
            y: -30,
            size: 45,
            hit: false,
            missed: false
        });
        notesSpawned++;
        beatIndex++;
    }
    
    // Update equalizer bars with wave pattern
    waveOffset += waveSpeed;
    waveSpeed = Math.max(0.08, waveSpeed * 0.98); // Gradually slow back to base speed
    equalizerBars.forEach((bar, i) => {
        // Create wave pattern using sine waves
        const wave1 = Math.sin((i / NUM_BARS) * Math.PI * 2 + waveOffset) * 0.15;
        const wave2 = Math.sin((i / NUM_BARS) * Math.PI * 4 + waveOffset * 1.5) * 0.1;
        bar.targetHeight = 0.5 + wave1 + wave2;
        
        // Fast interpolation for smooth wave motion
        bar.height += (bar.targetHeight - bar.height) * 0.6;
    });
    
    // Update notes
    for (let i = notes.length - 1; i >= 0; i--) {
        if (!notes[i].hit && !notes[i].missed) {
            notes[i].y += NOTE_SPEED;
            
            // Check if note was missed
            if (notes[i].y > TARGET_Y + GOOD_WINDOW) {
                notes[i].missed = true;
                missedCount++;
                combo = 0;
                feedbackText = '💔 Missed 💔';
                feedbackColor = PALETTE.RED_PRIMARY;
                feedbackTime = Date.now();
                playSound('miss');
                gameAnimations.startShake();
                updateUI();
                
                // Check if player has missed too many notes
                if (missedCount >= 20) {
                    gameOver();
                    return;
                }
            }
        }
        
        // Remove notes that are off screen or have been processed
        // Allow notes to go past screen to trigger missed state
        if (notes[i].y > canvas.logicalHeight + 50 || notes[i].hit || notes[i].missed) {
            notes.splice(i, 1);
        }
    }
    
    // Check if song is over
    if (beatIndex >= beatPattern.length && notes.length === 0) {
        if (endlessMode) {
            // In endless mode, player always wins when song ends
            winGame();
        } else if (score >= WIN_SCORE) {
            winGame();
        } else {
            gameOver();
        }
    }
}

function draw() {
    // Apply screen shake from game animations
    ctx.save();
    gameAnimations.applyShake();
    
    // Clear canvas with dark club atmosphere (pre-created gradient for performance)
    ctx.fillStyle = backgroundGradient;
    ctx.fillRect(0, 0, canvas.logicalWidth, canvas.logicalHeight);
    
    // Draw equalizer visualization
    const maxEqualizerHeight = canvas.logicalHeight * 0.8; // 80% of screen
    const barWidth = canvas.logicalWidth / NUM_BARS;
    
    equalizerBars.forEach((bar, i) => {
        const x = i * barWidth;
        const height = bar.height * maxEqualizerHeight;
        const y = canvas.logicalHeight - height;
        
        // Draw bar with gradient
        const barGradient = ctx.createLinearGradient(x, y, x, canvas.logicalHeight);
        barGradient.addColorStop(0, bar.color);
        barGradient.addColorStop(1, '#000000');
        ctx.fillStyle = barGradient;
        ctx.fillRect(x, y, barWidth - 2, height);
        
        // Add glow effect at top
        ctx.fillStyle = `${bar.color}88`;
        ctx.fillRect(x, y, barWidth - 2, 3);
    });
    
    // Add stage lights effect (spotlights from top)
    const spotlightGradient = ctx.createRadialGradient(
        canvas.logicalWidth / 2, -50, 0,
        canvas.logicalWidth / 2, 200, 200
    );
    spotlightGradient.addColorStop(0, 'rgba(255, 200, 100, 0.1)');
    spotlightGradient.addColorStop(1, 'rgba(255, 200, 100, 0)');
    ctx.fillStyle = spotlightGradient;
    ctx.fillRect(0, 0, canvas.logicalWidth, canvas.logicalHeight);
    
    // Draw guitar neck with perspective
    const topWidth = canvas.logicalWidth * 0.5;
    const bottomWidth = canvas.logicalWidth;
    const topOffset = (canvas.logicalWidth - topWidth) / 2;
    const bottomOffset = (canvas.logicalWidth - bottomWidth) / 2;
    
    // Draw fretboard background with wood texture
    // Base wood color with rich gradient
    const fretboardGradient = ctx.createLinearGradient(canvas.logicalWidth / 2 - 50, 0, canvas.logicalWidth / 2 + 50, 0);
    fretboardGradient.addColorStop(0, '#3d2817');
    fretboardGradient.addColorStop(0.3, '#5a3f2a');
    fretboardGradient.addColorStop(0.5, '#6b4423');
    fretboardGradient.addColorStop(0.7, '#5a3f2a');
    fretboardGradient.addColorStop(1, '#3d2817');
    ctx.fillStyle = fretboardGradient;
    ctx.beginPath();
    ctx.moveTo(topOffset, 0);
    ctx.lineTo(canvas.logicalWidth - topOffset, 0);
    ctx.lineTo(canvas.logicalWidth - bottomOffset, canvas.logicalHeight);
    ctx.lineTo(bottomOffset, canvas.logicalHeight);
    ctx.closePath();
    ctx.fill();
    
    // Add wood grain texture with horizontal lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 1;
    for (let y = 0; y < canvas.logicalHeight; y += 3) {
        const currentWidth = topWidth + (bottomWidth - topWidth) * (y / canvas.logicalHeight);
        const currentOffset = (canvas.logicalWidth - currentWidth) / 2;
        const grain = Math.sin(y * 0.1) * 2;
        ctx.beginPath();
        ctx.moveTo(currentOffset + grain, y);
        ctx.lineTo(canvas.logicalWidth - currentOffset + grain, y);
        ctx.stroke();
    }
    
    // Add darker wood grain variation
    ctx.strokeStyle = 'rgba(80, 50, 20, 0.2)';
    for (let y = 0; y < canvas.logicalHeight; y += 8) {
        const currentWidth = topWidth + (bottomWidth - topWidth) * (y / canvas.logicalHeight);
        const currentOffset = (canvas.logicalWidth - currentWidth) / 2;
        const grain = Math.sin(y * 0.05) * 3;
        ctx.beginPath();
        ctx.moveTo(currentOffset + grain, y);
        ctx.lineTo(canvas.logicalWidth - currentOffset + grain, y);
        ctx.stroke();
    }
    
    // Add highlighting on edges for depth
    ctx.strokeStyle = 'rgba(120, 80, 40, 0.3)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(topOffset, 0);
    ctx.lineTo(bottomOffset, canvas.logicalHeight);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(canvas.logicalWidth - topOffset, 0);
    ctx.lineTo(canvas.logicalWidth - bottomOffset, canvas.logicalHeight);
    ctx.stroke();
    
    // Draw lane dividers (strings)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    for (let i = 1; i < 3; i++) {
        const topX = topOffset + (topWidth / 3) * i;
        const bottomX = bottomOffset + (bottomWidth / 3) * i;
        ctx.beginPath();
        ctx.moveTo(topX, 0);
        ctx.lineTo(bottomX, canvas.logicalHeight);
        ctx.stroke();
    }
    
    // Draw frets (horizontal lines)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 3;
    for (let i = 1; i < 8; i++) {
        const y = (canvas.logicalHeight / 8) * i;
        const currentWidth = topWidth + (bottomWidth - topWidth) * (y / canvas.logicalHeight);
        const leftX = (canvas.logicalWidth - currentWidth) / 2;
        ctx.beginPath();
        ctx.moveTo(leftX, y);
        ctx.lineTo(leftX + currentWidth, y);
        ctx.stroke();
    }
    
    // Draw target line with perspective
    const targetWidth = topWidth + (bottomWidth - topWidth) * (TARGET_Y / canvas.logicalHeight);
    const targetOffset = (canvas.logicalWidth - targetWidth) / 2;
    
    ctx.strokeStyle = PALETTE.WHITE;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(targetOffset, TARGET_Y);
    ctx.lineTo(canvas.logicalWidth - targetOffset, TARGET_Y);
    ctx.stroke();
    
    // Draw target area
    const targetTopY = TARGET_Y - TARGET_HEIGHT / 2;
    const targetBottomY = TARGET_Y + TARGET_HEIGHT / 2;
    const targetTopWidth = topWidth + (bottomWidth - topWidth) * (targetTopY / canvas.logicalHeight);
    const targetBottomWidth = topWidth + (bottomWidth - topWidth) * (targetBottomY / canvas.logicalHeight);
    const targetTopOffset = (canvas.logicalWidth - targetTopWidth) / 2;
    const targetBottomOffset = (canvas.logicalWidth - targetBottomWidth) / 2;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(targetTopOffset, targetTopY);
    ctx.lineTo(canvas.logicalWidth - targetTopOffset, targetTopY);
    ctx.lineTo(canvas.logicalWidth - targetBottomOffset, targetBottomY);
    ctx.lineTo(targetBottomOffset, targetBottomY);
    ctx.closePath();
    ctx.fill();
    
    // Draw notes
    notes.forEach(note => {
        if (!note.hit) {
            const x = getLaneXAtY(note.lane, note.y);
            
            // Scale note size based on perspective
            const perspectiveFactor = 0.5 + (note.y / canvas.logicalHeight) * 0.5;
            const size = note.size * perspectiveFactor;
            
            // Color based on position
            let color = PALETTE.PINK_HOT;
            const distanceFromTarget = Math.abs(note.y - TARGET_Y);
            if (distanceFromTarget < HIT_WINDOW) {
                color = PALETTE.YELLOW_LIGHT; // Yellow for perfect
            } else if (distanceFromTarget < GOOD_WINDOW) {
                color = PALETTE.PINK_PASTEL; // Light pink for good
            }
            
            drawHeart(ctx, x, note.y, size, color);
        }
    });
    
    // Draw particles
    particles.update();
    particles.draw();
    
    // Draw heart rain animation (for win)
    gameAnimations.drawHeartRain();
    
    // Draw hit feedback
    if (feedbackText && gameRunning && Date.now() - feedbackTime < 500) {
        ctx.fillStyle = feedbackColor;
        ctx.font = 'bold 40px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(feedbackText, canvas.logicalWidth / 2, 60);
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
    
    // Restore context from shake
    ctx.restore();
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
    
    document.getElementById('combo').textContent = combo;
    const comboOverlay = document.getElementById('combo-overlay');
    if (comboOverlay) comboOverlay.textContent = combo;
}

function gameOver() {
    gameRunning = false;
    
    if (endlessMode) {
        saveHighScore(score);
    }
    
    setPlayingMode(false);
    if (audioEnabled && backgroundMusic) {
        backgroundMusic.pause();
    }
    document.getElementById('gameOverScreen').classList.add('show');
}

function winGame() {
    gameRunning = false;
    
    if (endlessMode) {
        saveHighScore(score);
    }
    
    gameAnimations.startHeartRain();
    
    // Keep game loop running for animation
    requestAnimationFrame(gameLoop);
    
    setTimeout(() => {
        setPlayingMode(false);
        if (audioEnabled && backgroundMusic) {
            backgroundMusic.pause();
        }
        showWinScreen(
            "Harrison, this Valentine's, dream big and loud.\n\nI'll be front row while you headline the crowd.\n\nBetween film edits, fishing tales, and playing guitar chords\n\nIt is only a matter of time before you collect all the awards 🎸🎬💕",
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
    const valentineMessage = document.getElementById('valentineMessage');
    
    if (endlessMode) {
        highScore = loadHighScore();
        updateHighScoreDisplay();
        highScoreLabel.style.display = 'block';
        highScoreValue.style.display = 'block';
        if (valentineMessage) valentineMessage.style.display = 'none';
    } else {
        if (valentineMessage) valentineMessage.style.display = 'block';
    }
    
    endlessToggle.addEventListener('change', (e) => {
        endlessMode = e.target.checked;
        
        if (endlessMode) {
            highScore = loadHighScore();
            updateHighScoreDisplay();
            highScoreLabel.style.display = 'block';
            highScoreValue.style.display = 'block';
            if (valentineMessage) valentineMessage.style.display = 'none';
        } else {
            highScoreLabel.style.display = 'none';
            highScoreValue.style.display = 'none';
            if (valentineMessage) valentineMessage.style.display = 'block';
        }
        
        updateUI();
    });
}
