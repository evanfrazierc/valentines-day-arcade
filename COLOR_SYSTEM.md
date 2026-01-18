# Color System

## Overview

This project uses a strict 84-color palette to ensure design consistency across all games and UI elements. **All colors must come from the defined palette** in `js/colors.js`.

## Using Colors in Your Code

### In JavaScript

Import the color palette at the top of your file:

```javascript
// Load the colors.js script in your HTML first:
// <script src="../js/colors.js"></script>

// Then use colors from the PALETTE:
ctx.fillStyle = PALETTE.RED_PRIMARY;
ctx.strokeStyle = PALETTE.BLUE_PASTEL;

// Or use helper functions:
const myColor = getColor('RED_PRIMARY');
const [color1, color2, color3] = getColors('RED_PRIMARY', 'BLUE_PASTEL', 'GREEN_MINT');
```

### In CSS

Reference the colors defined in `css/style.css` CSS variables, which are mapped to the palette:

```css
.my-element {
    color: var(--primary);      /* #fd3b54 - RED_PRIMARY */
    background: var(--secondary); /* #ff57a4 - PINK_HOT */
}
```

Or use the hex values directly (though CSS variables are preferred):

```css
.my-element {
    color: #fd3b54; /* RED_PRIMARY */
}
```

## Available Colors

The palette includes 84 colors organized into categories:

### Neutrals
- BLACK, GRAY_DARKEST, GRAY_DARK, GRAY_LIGHT, WHITE

### Blues & Purples
- Multiple shades from light to dark
- Includes royal blue, sky blue, lavender, violet, etc.

### Pinks & Magentas
- From pale pink to deep magenta
- Includes hot pink, coral pink, rose, etc.

### Reds & Corals
- Bright reds, wine reds, coral shades
- Perfect for Valentine's theme

### Oranges & Peaches
- Warm oranges, peach, rust
- Includes gold and amber tones

### Yellows & Golds
- Bright yellows, golds, creams

### Greens
- Lime, forest, emerald, mint
- Light to dark shades

### Teals & Cyans
- Aqua, teal, turquoise shades

### Browns & Tans
- Saddle brown, chocolate, tan
- Perfect for neutral accents

## Color Naming Convention

Colors are named using the pattern: `[HUE]_[MODIFIER]`

Examples:
- `RED_PRIMARY` - The primary red color
- `BLUE_PASTEL` - A pastel shade of blue
- `PINK_HOT` - A bright, hot pink
- `BROWN_CHOCOLATE` - A chocolate brown

## Finding the Right Color

1. **Open `js/colors.js`** - Browse the PALETTE object
2. **Look by category** - Colors are organized by hue family
3. **Check existing usage** - See how colors are used in other games
4. **Test in browser console** - `console.log(PALETTE)` to see all options

## Adding New Features

When adding new visual elements:

1. ✅ **DO**: Choose colors from `PALETTE`
2. ✅ **DO**: Use `getColor()` for single colors
3. ✅ **DO**: Use `getColors()` for multiple colors
4. ❌ **DON'T**: Hardcode new hex values
5. ❌ **DON'T**: Use colors outside the palette

## Example: Creating a New Game

```javascript
// Load colors.js in your HTML
// <script src="../js/colors.js"></script>

// In your game JavaScript:
const canvas = document.getElementById('gameCanvas');
const ctx = setupCanvas(canvas, 350, 600);

// Use palette colors
const backgroundColor = PALETTE.BLUE_PALE;
const playerColor = PALETTE.RED_PRIMARY;
const enemyColor = PALETTE.PURPLE_DARK;

function draw() {
    // Background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.logicalWidth, canvas.logicalHeight);
    
    // Player
    ctx.fillStyle = playerColor;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Enemy
    ctx.fillStyle = enemyColor;
    ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
}
```

## Helper Functions

### `getColor(colorName)`
Returns a single color from the palette.

```javascript
const red = getColor('RED_PRIMARY'); // '#fd3b54'
```

### `getColors(...colorNames)`
Returns multiple colors at once.

```javascript
const [red, blue, green] = getColors('RED_PRIMARY', 'BLUE_PASTEL', 'GREEN_MINT');
```

### `getRandomColor()`
Returns a random color from the palette.

```javascript
const randomColor = getRandomColor(); // Random color from palette
```

### `getAllColors()`
Returns the entire palette object.

```javascript
const allColors = getAllColors();
console.log(Object.keys(allColors).length); // 84
```

## Validation

To check if all colors in your code use the palette, search for hex patterns:

```bash
# Find all hex colors in JavaScript files
grep -r '#[0-9A-Fa-f]\{6\}' js/

# Compare against colors.js to ensure they're in the palette
```

## Questions?

If you need a color that doesn't exist in the palette, consider:

1. Is there a similar color already available?
2. Can you use a combination of existing colors?
3. If absolutely necessary, discuss adding it to the palette (must maintain the 84-color system)

---

**Remember**: Consistency is key to a polished, professional look! 🎨
