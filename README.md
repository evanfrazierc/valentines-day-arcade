# 💕 Valentine's Day Arcade 💕

A collection of 7 mobile-optimized arcade games, each personalized for someone special this Valentine's Day!

## 🎮 Games

1. **Go Long, Gaston** (For Sarah) - Wiener dog collecting dinner scraps with endless mode and progressive difficulty
2. **Kitty Catcher** (For Juliette) - Breakout-style game catching falling cats with progressive brick durability
3. **Super Veggie Bro** (For Ryan) - Endless runner with double jump, bouncing obstacles, and speed lines
4. **On Cloud Wine** (For Joe) - Vertical platformer with UFO platforms, comets, and moving clouds
5. **Flappy Redbird** (For Karen) - Fly and collect vintage jewelry and clothing through obstacles
6. **Tap Hero** (For Harrison) - Tap hearts to the rhythm with endless mode
7. **Love Defender** (For You) - Top-down shooter defending against broken hearts with auto-shooting

## 📱 Features

### Core Features
- ✨ Fully mobile-optimized with touch and keyboard controls
- 🎨 Beautiful Valentine's Day theming with custom visuals
- 💕 Personalized win messages for each person
- 🎯 Simple, classic arcade gameplay
- 📏 Responsive design for all screen sizes
- ⚡ Fast loading with vanilla JavaScript (no dependencies!)
- 🎮 Multiple control schemes:
  - Touch/tap controls for mobile
  - Arrow key controls for desktop
  - Tilt controls (On Cloud Wine on iOS - requires permission)
  - Tap controls (Go Long Gaston, Tap Hero)

### Endless Mode (Default ON)
All 8 games feature **endless mode** that defaults to ON with toggleable option:
- 🏆 **High Score Tracking**: Persistent localStorage high scores
- 📊 **Progressive Difficulty**: Games get harder as you play
- 🔄 **URL Parameter Control**: `?endless=true` or `?endless=false`
- 🎮 **Toggle UI**: Switch between endless and classic modes anytime

### Game-Specific Progressive Difficulty

**Go Long, Gaston**
- Speed increases every 10 scraps collected
- Grape hazards spawn (1 per 10 scraps collected)
- Rounded tail animations

**Super Veggie Bro (Runner)**
- Speed lines visual effect at 20+ veggies
- Bouncing obstacles (30% spawn rate at difficulty level 3+)
- Double jump mechanic works anytime with reverse spin animation

**Kitty Catcher (Breakout)**
- Paddle shrinks every 5 cats caught (minimum 40px)
- Brick durability increases with levels (1-3 hits required)
- Ball speed increases with paddle hits, resets per level

**On Cloud Wine (Jumper)**
- Platform gaps increase every 5 bottles (80px → 120px max)
- UFO platforms spawn after 15 bottles (circular motion, decay after jump)
- Comets spawn after 15 bottles (frequency increases 1.5% + 1% per 10 bottles, max 8%)
- Player and wine bottles 25% larger for visibility

**Tap Hero (Rhythm)**
- 205 notes total (175 quarter notes + 30 half notes at 75 BPM)
- 20 miss limit before game over
- Perfect timing challenge

**Love Defender (Shooter)**
- Enemy spawn rate increases with score (every 10 points)
- Enemy speed increases progressively
- Auto-shoot hearts at 300ms intervals
- Tap and drag to move player smoothly
- 3 lives, 50 score to win (classic mode)

## 🚀 Deployment

### GitHub Pages (Recommended)

1. Create a new repository on GitHub
2. Push this code to the repository
3. Go to Settings > Pages
4. Select main branch as source
5. Your site will be live at `https://username.github.io/repository-name`

### Netlify

1. Drag and drop the entire folder to Netlify
2. Site will be deployed instantly

### Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the project directory
3. Follow the prompts

## 🎮 Controls

All games support both touch and keyboard controls for maximum accessibility:

### Universal Controls
- **Arrow Keys** (←↑→↓): Directional movement
- **Space**: Jump, action, or select
- **Tap/Touch**: Primary action (jump, select, shoot)

### Game-Specific Controls

**Go Long, Gaston**
- Arrow keys or swipe to change direction
- Collect 10 scraps to win (classic) or endless high score

**Super Veggie Bro (Runner)**
- Space or tap to jump
- Space/tap while airborne for double jump (works anytime, spins backwards)
- Arrow keys or tilt for left/right movement
- Collect 30 veggies (classic) or endless high score

**Kitty Catcher (Breakout)**
- Arrow keys or drag to move paddle
- Auto-launch ball after life lost
- Catch 5 cats to win (classic) or endless with levels

**On Cloud Wine (Jumper)**
- Arrow keys or device tilt for horizontal movement
- Auto-jumps on platform landing
- Spins when collecting wine bottles
- Reach 20 bottles (classic) or endless high score

**Tap Hero (Rhythm)**
- Space or tap on beat indicators
- 75 BPM rhythm (800ms per beat, 400ms half-beats)
- Hit 205 notes with max 20 misses

**Tap Hero**
- Tap hearts when they reach the line

**Love Defender (Shooter)**
- Touch: Tap and drag anywhere to move player
- Arrow keys or A/D for movement
- Auto-shoots continuously
- Destroy 50 broken hearts (classic) or endless high score
- Hit music notes to win
- Reach 20 hearts (classic) or endless mode

## 💻 Local Development

Simply open `index.html` in a modern web browser. No build process required!

For a local server:
```bash
# Python 3
python -m http.server 8000

# Node.js
npx serve

# PHP
php -S localhost:8000
```

Then visit `http://localhost:8000`

## 🎨 Customization

Each game can be customized by editing:
- Person's name in the HTML file
- Win message in the JavaScript file  
- Difficulty by adjusting game parameters
- Endless mode default via URL parameter (`?endless=false`)
- Colors - **IMPORTANT**: See [COLOR_SYSTEM.md](COLOR_SYSTEM.md) for the 84-color palette system
  - All colors must come from `js/colors.js`
**Love Blocks**: Drop speed, line clear goal  
**Love Defender**: Enemy spawn rate, enemy speed progression, shoot interval, lives theme colors
  - Never hardcode colors outside the defined palette

### Progressive Difficulty Tuning

Each game's difficulty can be adjusted by modifying constants:

**Go Long, Gaston**: `baseSpeed`, grape spawn rate, speed increase interval  
**Super Veggie Bro**: `difficultyLevel` thresholds, obstacle spawn rates, speed line activation  
**Kitty Catcher**: `basePaddleWidth`, shrink interval, brick durability formula  
**On Cloud Wine**: `baseGap`, `currentGap` max, UFO/comet spawn rates and thresholds  
**Tap Hero**: BPM (currently 75), note patterns, miss limit  
**Tap Hero**: Rhythm timing mechanics, note patterns  
**Love Blocks**: Drop speed, line clear goal

## 📦 Tech Stack

- **HTML5 Canvas** for game rendering with optimized drawing
- **Vanilla JavaScript (ES6+)** - No frameworks or build tools
- **CSS3** with animations and responsive design
- **Touch Event API** for mobile controls
- **Keyboard Event API** for desktop controls with preventDefault
- **Device Orientation API** for tilt controls (On Cloud Wine)
- **LocalStorage API** for high score persistence
- **URL Search Params** for endless mode configuration
- **RequestAnimationFrame** for smooth 60fps gameplay
- **No external dependencies!** - Pure vanilla web technologies

### Code Architecture
- Modular game structure with shared utilities
- `js/utils.js` - Canvas setup, touch controls, particle systems, animations
- `js/colors.js` - Centralized 84-color palette
- `css/style.css` - Shared UI components and theme variables
- `css/games.css` - Game-specific styling

## 💝 Perfect For

- Valentine's Day surprises
- Personalized gifts
- Fun interactive greetings
- Mobile gaming on the go
- Showcasing progressive web game development
- Learning canvas-based game programming
- Retro arcade nostalgia with modern features

## 🎯 Development Highlights

- **Endless Mode System**: All 7 games support toggleable endless mode with high scores
- **Progressive Difficulty**: Each game implements unique difficulty scaling mechanics
- **Cross-Platform Controls**: Unified input system supporting touch, keyboard, and tilt
- **Performance Optimized**: Pre-rendered gradients, object pooling, efficient collision detection
- **Accessibility**: Multiple control schemes, visual feedback, clear win/loss states
- **No Build Process**: Pure HTML/CSS/JS - just open and play

---

Made with ❤️ for Valentine's Day 2026
