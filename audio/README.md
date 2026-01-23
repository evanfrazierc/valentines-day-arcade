# Audio Files

Place your audio files in this directory to add sound to the games.

## Tap Hero Audio Files

- `tap-hero-music.wav` - Background music track (~35 seconds long to match the beat pattern)
- `hit-perfect.wav` - Sound effect for perfect hits (bright, satisfying chime)
- `hit-good.wav` - Sound effect for good hits (softer chime)
- `hit-miss.wav` - Sound effect for missed notes (low buzz or error sound)

## Flappy Redbird Audio Files

- `flap.wav` - Sound when bird flaps (whoosh or wing flutter)
- `score.wav` - Sound when passing through pipes (ding, bell, or chime)
- `hit.wav` - Sound when hitting obstacles (thud or crash)

## Breakout Audio Files

- `breakout-paddle.wav` - Ball bouncing off paddle (ping or bloop)
- `breakout-brick.wav` - Breaking a brick (pop or crack)
- `breakout-wall.wav` - Ball bouncing off walls (softer ping)
- `breakout-lose.wav` - Ball falls off bottom (descending tone)
- `breakout-win.wav` - Level complete (triumphant fanfare)

## Gaston (Go Long, Gaston) Audio Files

- `gaston-eat.wav` - Eating food (munch, chomp, or gulp)
- `gaston-move.wav` - Optional: subtle movement sound (slither)
- `gaston-crash.wav` - Hitting wall or self (crash or game over tone)

## Runner Audio Files

- `runner-jump.wav` - Character jumping (boing or whoosh)
- `runner-land.wav` - Landing on platform (soft thud)
- `runner-collect.wav` - Collecting items (coin sound or sparkle)
- `runner-obstacle.wav` - Hitting obstacle (oof or crash)

## Jumper Audio Files

- `jumper-jump.wav` - Jumping between platforms (spring or boing)
- `jumper-land.wav` - Landing on platform (tap or thud)
- `jumper-fall.wav` - Falling off screen (descending whistle)
- `jumper-score.wav` - Moving to higher platform (ascending chime)

## Tetris Audio Files

- `tetris-music.wav` - Background music (classic 8-bit style recommended)
- `tetris-rotate.wav` - Rotating piece (quick tick)
- `tetris-move.wav` - Moving piece left/right (subtle click)
- `tetris-drop.wav` - Piece landing (thud)
- `tetris-line.wav` - Clearing a line (satisfying pop or chime)
- `tetris-tetris.wav` - Clearing 4 lines at once (special fanfare)

## Audio Format Recommendations

- **Format**: WAV or MP3 (WAV for quality, MP3 for smaller file size)
- **Sample Rate**: 44.1kHz
- **Bit Rate**: 128kbps for music, 64kbps for sound effects
- **Length**: 
  - Background music: 30-60 seconds (loopable)
  - Sound effects: 0.1-0.5 seconds
  - Keep files short and punchy for responsive gameplay
  
## Where to Find Royalty-Free Audio

- **Music**: 
  - [FreeMusicArchive](https://freemusicarchive.org/)
  - [Incompetech](https://incompetech.com/music/royalty-free/)
  - [YouTube Audio Library](https://www.youtube.com/audiolibrary)
  
- **Sound Effects**:
  - [Freesound](https://freesound.org/)
  - [Zapsplat](https://www.zapsplat.com/)
  - [Mixkit](https://mixkit.co/free-sound-effects/)
  - [OpenGameArt](https://opengameart.org/) - Great for retro game sounds
  - [JSFXR](https://sfxr.me/) - Generate 8-bit sounds in your browser

## Sound Design Tips

- **Match the theme**: Hearts and romance - use warm, pleasant tones
- **Volume balance**: Sound effects should be punchy but not overwhelming
- **Consistency**: Keep similar sounds (like multiple jump sounds) in the same sonic family
- **Feedback**: Positive actions (score, collect) should sound rewarding
- **Errors**: Mistakes should have distinct negative sounds without being harsh

## Notes

- The games will work without audio files (audio is optional)
- Make sure files are named exactly as shown above
- Keep file sizes reasonable for web loading (< 500KB for effects, < 2MB for music)
- Audio will automatically enable on first user interaction due to browser policies
