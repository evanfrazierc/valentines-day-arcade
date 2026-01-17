// Utility functions shared across games

// Touch controls helper
class TouchControls {
    constructor(canvas) {
        this.canvas = canvas;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
        this.minSwipeDistance = 30;
        this.tapThreshold = 10;
        this.callbacks = {};
    }

    on(event, callback) {
        this.callbacks[event] = callback;
    }

    init() {
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        
        // Also support mouse for testing
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    }

    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        
        if (this.callbacks.touchstart) {
            const rect = this.canvas.getBoundingClientRect();
            // Map from display coordinates to canvas coordinates
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            this.callbacks.touchstart({
                x: (touch.clientX - rect.left) * scaleX,
                y: (touch.clientY - rect.top) * scaleY
            });
        }
    }

    handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        
        if (this.callbacks.touchmove) {
            const rect = this.canvas.getBoundingClientRect();
            // Map from display coordinates to canvas coordinates
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            this.callbacks.touchmove({
                x: (touch.clientX - rect.left) * scaleX,
                y: (touch.clientY - rect.top) * scaleY
            });
        }
    }

    handleTouchEnd(e) {
        e.preventDefault();
        const touch = e.changedTouches[0];
        this.touchEndX = touch.clientX;
        this.touchEndY = touch.clientY;
        
        this.handleGesture();
    }

    handleMouseDown(e) {
        this.touchStartX = e.clientX;
        this.touchStartY = e.clientY;
        
        if (this.callbacks.touchstart) {
            const rect = this.canvas.getBoundingClientRect();
            // Map from display coordinates to canvas coordinates
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            this.callbacks.touchstart({
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY
            });
        }
    }

    handleMouseMove(e) {
        if (e.buttons === 1 && this.callbacks.touchmove) {
            const rect = this.canvas.getBoundingClientRect();
            // Map from display coordinates to canvas coordinates
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            this.callbacks.touchmove({
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY
            });
        }
    }

    handleMouseUp(e) {
        this.touchEndX = e.clientX;
        this.touchEndY = e.clientY;
        this.handleGesture();
    }

    handleGesture() {
        const deltaX = this.touchEndX - this.touchStartX;
        const deltaY = this.touchEndY - this.touchStartY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // Check for tap
        if (distance < this.tapThreshold) {
            if (this.callbacks.tap) {
                const rect = this.canvas.getBoundingClientRect();
                this.callbacks.tap({
                    x: this.touchEndX - rect.left,
                    y: this.touchEndY - rect.top
                });
            }
            return;
        }

        // Check for swipe
        if (distance >= this.minSwipeDistance) {
            const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
            
            let direction;
            if (angle > -45 && angle <= 45) direction = 'right';
            else if (angle > 45 && angle <= 135) direction = 'down';
            else if (angle > -135 && angle <= -45) direction = 'up';
            else direction = 'left';

            if (this.callbacks.swipe) {
                this.callbacks.swipe(direction, { deltaX, deltaY });
            }
        }
    }
}

// Particle system for effects
class ParticleSystem {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.particles = [];
    }

    createParticles(x, y, count, color) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 1,
                color: color || `hsl(${Math.random() * 60 + 320}, 100%, 70%)`
            });
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2; // gravity
            p.life -= 0.02;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw() {
        this.particles.forEach(p => {
            this.ctx.save();
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
    }
}

// Win screen helper
function showWinScreen(message, onRestart, onHome) {
    const winScreen = document.getElementById('winScreen');
    const winMessage = document.getElementById('winMessage');
    
    winMessage.textContent = message;
    winScreen.classList.add('show');
    
    createConfetti();
    
    document.getElementById('restartBtn').onclick = () => {
        winScreen.classList.remove('show');
        if (onRestart) onRestart();
    };
    
    document.getElementById('homeBtn').onclick = () => {
        if (onHome) onHome();
        else window.location.href = '../index.html';
    };
}

// Confetti effect
function createConfetti() {
    const colors = ['#ff1744', '#ff4081', '#ff80ab', '#f50057', '#c51162'];
    
    for (let i = 0; i < 100; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
            document.body.appendChild(confetti);
            
            setTimeout(() => confetti.remove(), 3000);
        }, i * 30);
    }
}

// Canvas scaling for responsive design
function setupCanvas(canvas, width, height) {
    // Calculate available space (accounting for header, info, controls, padding)
    const reservedHeight = 250; // Space for UI elements
    const maxWidth = Math.min(width, window.innerWidth - 40);
    const maxHeight = Math.min(height, window.innerHeight - reservedHeight);
    const aspectRatio = height / width;
    
    let canvasWidth = maxWidth;
    let canvasHeight = canvasWidth * aspectRatio;
    
    // If height is too tall, scale by height instead
    if (canvasHeight > maxHeight) {
        canvasHeight = maxHeight;
        canvasWidth = canvasHeight / aspectRatio;
    }
    
    // Set canvas to logical dimensions (not DPR adjusted)
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';
    
    const ctx = canvas.getContext('2d');
    
    return ctx;
}

// Draw a heart shape
function drawHeart(ctx, x, y, size, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y + size / 4);
    ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + size / 4);
    ctx.bezierCurveTo(x - size / 2, y + size / 2, x, y + size * 0.75, x, y + size);
    ctx.bezierCurveTo(x, y + size * 0.75, x + size / 2, y + size / 2, x + size / 2, y + size / 4);
    ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + size / 4);
    ctx.fill();
    ctx.restore();
}

// Simple collision detection
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Random number between min and max
function random(min, max) {
    return Math.random() * (max - min) + min;
}

// Clamp value between min and max
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// Fullscreen functionality
function toggleFullscreen() {
    const elem = document.documentElement;
    
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        // Enter fullscreen
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }
    } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
}

// Initialize fullscreen button
function initFullscreenButton() {
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (!fullscreenBtn) return;
    
    fullscreenBtn.addEventListener('click', toggleFullscreen);
    
    // Update button text when fullscreen changes
    document.addEventListener('fullscreenchange', updateFullscreenButton);
    document.addEventListener('webkitfullscreenchange', updateFullscreenButton);
}

function updateFullscreenButton() {
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (!fullscreenBtn) return;
    
    if (document.fullscreenElement || document.webkitFullscreenElement) {
        fullscreenBtn.textContent = '⊗';
    } else {
        fullscreenBtn.textContent = '⛶';
    }
}
// Toggle playing mode to hide UI
function setPlayingMode(isPlaying) {
    const container = document.querySelector('.game-container');
    if (container) {
        if (isPlaying) {
            container.classList.add('playing');
        } else {
            container.classList.remove('playing');
        }
    }
}