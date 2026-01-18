/**
 * 84-Color Palette
 * All colors used in the Valentine's Day Arcade must come from this palette.
 * This ensures design consistency across all games and UI elements.
 */

const PALETTE = {
    // Neutrals & Blacks/Whites
    BLACK: '#000000',
    GRAY_DARKEST: '#3d3b38',
    GRAY_DARK: '#7b7671',
    GRAY_LIGHT: '#bcb8b2',
    WHITE: '#ffffff',
    
    // Blues & Purples
    BLUE_LIGHT: '#bfc8e3',
    BLUE_MEDIUM: '#8f90bf',
    BLUE_DARK: '#5c627a',
    BLUE_DARKEST: '#2d383a',
    PURPLE_LIGHT: '#abafd7',
    PURPLE_MEDIUM: '#8e94c5',
    PURPLE_DARK: '#7378b8',
    PURPLE_DARKER: '#6456b7',
    PURPLE_DARKEST: '#001c5a',
    PURPLE_BRIGHT: '#5a2bb6',
    PURPLE_VIBRANT: '#9c5fd0',
    PURPLE_PINK: '#da97e0',
    
    // Pinks & Magentas
    PINK_LIGHTEST: '#ffd7ff',
    PINK_LIGHT: '#ff9cf1',
    PINK_BRIGHT: '#ff4fdf',
    PINK_DEEP: '#d811b9',
    MAGENTA_DARK: '#803790',
    MAGENTA_DARKER: '#843179',
    MAGENTA_VIVID: '#ce328c',
    PINK_HOT: '#ff57a4',
    PINK_PASTEL: '#ff9fba',
    PINK_PALE: '#ffd9cc',
    
    // Reds & Corals
    RED_DARK: '#a50b5e',
    RED_BRIGHT: '#d72847',
    RED_VIBRANT: '#ff4c41',
    CORAL_LIGHT: '#fe8a7e',
    CORAL_LIGHTEST: '#febaad',
    CORAL_PINK: '#fe8588',
    RED_PRIMARY: '#fd3b54',
    RED_CHERRY: '#d10841',
    RED_WINE: '#960052',
    RED_ROSE: '#c32148',
    
    // Oranges & Peaches
    ORANGE_RED: '#e34b3d',
    ORANGE_BRIGHT: '#ff7034',
    ORANGE_LIGHT: '#ffa170',
    ORANGE_PALE: '#ffcba4',
    ORANGE_MEDIUM: '#ffa650',
    ORANGE_DARK: '#f28133',
    ORANGE_DARKER: '#df5d34',
    ORANGE_RUST: '#ca3435',
    ORANGE_VIVID: '#e77200',
    ORANGE_GOLD: '#f19816',
    
    // Yellows & Golds
    YELLOW_GOLD: '#fbbc2a',
    YELLOW_LIGHT: '#fcdf8a',
    YELLOW_PALE: '#ffffd1',
    YELLOW_BRIGHT: '#ffff81',
    CREAM_LIGHT: '#ffebb5',
    
    // Greens
    GREEN_LIME: '#b1db69',
    GREEN_MEDIUM: '#4aa769',
    GREEN_DARK: '#00755e',
    GREEN_LIGHT: '#8bdf7d',
    GREEN_BRIGHT: '#2bd33c',
    GREEN_FOREST: '#15a44d',
    
    // Teals & Cyans
    TEAL_DARK: '#01796f',
    TEAL_MEDIUM: '#019f82',
    TEAL_BRIGHT: '#00c696',
    TEAL_LIGHT: '#98e1bb',
    TEAL_PALE: '#defee8',
    CYAN_BRIGHT: '#5ce1d8',
    CYAN_MEDIUM: '#00b7bd',
    CYAN_DARK: '#008b9e',
    CYAN_DARKER: '#006281',
    CYAN_NAVY: '#003366',
    
    // Blues (continued)
    BLUE_ROYAL: '#0050bc',
    BLUE_SKY: '#1d75fb',
    BLUE_PASTEL: '#76a4f0',
    BLUE_PALE: '#c3cde6',
    
    // Browns & Tans
    BROWN_TAN: '#837050',
    BROWN_LIGHT: '#9d8f5b',
    BROWN_MEDIUM: '#baae6e',
    BROWN_PALE: '#dacd8c',
    BROWN_SADDLE: '#945140',
    BROWN_SIENNA: '#9f4f3a',
    BROWN_CHOCOLATE: '#c37557',
    BROWN_CARAMEL: '#e1a07d',
    BROWN_BEIGE: '#dbaa98',
    BROWN_TAN_DARK: '#b87d66',
    BROWN_MAHOGANY: '#672940',
    BROWN_DARK: '#703130',
    
    // Special/Mixed
    CYAN_TEAL: '#84b8b4',
    BLUE_PERIWINKLE: '#82a2d1',
    PURPLE_LAVENDER: '#a791eb',
    PINK_LAVENDER: '#fbc8f5',
    GREEN_SAGE: '#7c957a',
    GREEN_MINT: '#84c4a4',
    CYAN_AQUA: '#79d7ea',
    BLUE_POWDER: '#a2aff2',
    GREEN_OLIVE: '#a2b884',
    GREEN_EMERALD: '#82d189',
    TEAL_MINT: '#91ebd4',
    BLUE_ICE: '#c9e5fa',
    YELLOW_KHAKI: '#b8a784',
    GREEN_YELLOW: '#b9ca89',
    GREEN_PASTEL: '#91eb91',
    MINT_CREAM: '#c9fce9',
    BROWN_ROSE: '#957686',
    BROWN_MAUVE: '#c49484',
    YELLOW_CREAM: '#eade7a',
    GREEN_CHARTREUSE: '#c3f2a2',
    PURPLE_PLUM: '#b884af',
    ROSE_DEEP: '#d1828f',
    ORANGE_TAN: '#ebbd91',
    YELLOW_VANILLA: '#f7f9c4',
    PURPLE_STEEL: '#797699',
    PURPLE_IRIS: '#b484c4',
    PINK_ORCHID: '#ea79bb',
    PINK_ROSE: '#f2a9a2',
    BLUE_SLATE: '#8495b8',
    PURPLE_WISTERIA: '#9d82d1',
    PURPLE_VIOLET: '#ea91eb',
    PINK_BLUSH: '#ffc8d4',
    TEAL_SEAFOAM: '#76958d',
    BLUE_POWDER_LIGHT: '#84b4c4',
    BLUE_COBALT: '#7982ea',
    PURPLE_PERIWINKLE: '#d1a2f2',
    TEAL_JADE: '#84b88d',
    TEAL_AQUAMARINE: '#82d1c4',
    BLUE_CORNFLOWER: '#91beeb',
    LAVENDER_MIST: '#d2c6fa',
    GREEN_MOSS: '#969976',
    GREEN_PISTACHIO: '#94c484',
    GREEN_SEAFOAM: '#79eaa8',
    CYAN_LIGHT: '#a2ebf2'
};

/**
 * Get a color from the palette by name
 * @param {string} colorName - The name of the color (e.g., 'RED_PRIMARY')
 * @returns {string} The hex color code
 */
function getColor(colorName) {
    if (!PALETTE[colorName]) {
        console.warn(`Color "${colorName}" not found in palette. Returning BLACK as fallback.`);
        return PALETTE.BLACK;
    }
    return PALETTE[colorName];
}

/**
 * Get multiple colors from the palette
 * @param {string[]} colorNames - Array of color names
 * @returns {string[]} Array of hex color codes
 */
function getColors(...colorNames) {
    return colorNames.map(name => getColor(name));
}

/**
 * Get a random color from the palette
 * @returns {string} Random hex color code
 */
function getRandomColor() {
    const colors = Object.values(PALETTE);
    return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Get all colors in the palette
 * @returns {Object} The complete color palette
 */
function getAllColors() {
    return { ...PALETTE };
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PALETTE, getColor, getColors, getRandomColor, getAllColors };
}
