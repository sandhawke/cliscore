/**
 * ANSI color and formatting utilities for terminal output
 */

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  // Bright foreground colors
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',

  // Background colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m'
};

/**
 * Check if colors should be disabled
 * @returns {boolean}
 */
function shouldDisableColors() {
  return process.env.NO_COLOR !== undefined ||
         process.env.TERM === 'dumb' ||
         !process.stdout.isTTY;
}

/**
 * Colorize text
 * @param {string} text - Text to colorize
 * @param {string} color - Color name from COLORS
 * @returns {string}
 */
export function colorize(text, color) {
  if (shouldDisableColors()) {
    return text;
  }
  return COLORS[color] + text + COLORS.reset;
}

/**
 * Style helpers
 */
export const style = {
  bold: (text) => colorize(text, 'bright'),
  dim: (text) => colorize(text, 'dim'),
  red: (text) => colorize(text, 'red'),
  green: (text) => colorize(text, 'green'),
  yellow: (text) => colorize(text, 'yellow'),
  blue: (text) => colorize(text, 'blue'),
  magenta: (text) => colorize(text, 'magenta'),
  cyan: (text) => colorize(text, 'cyan'),
  gray: (text) => colorize(text, 'gray'),
  brightRed: (text) => colorize(text, 'brightRed'),
  brightGreen: (text) => colorize(text, 'brightGreen'),
  brightYellow: (text) => colorize(text, 'brightYellow'),
  brightCyan: (text) => colorize(text, 'brightCyan')
};

/**
 * Create a horizontal line
 * @param {number} width - Width of the line
 * @param {string} char - Character to use
 * @param {string} color - Color name
 * @returns {string}
 */
export function line(width = 80, char = '─', color = null) {
  const ln = char.repeat(width);
  return color ? colorize(ln, color) : ln;
}

/**
 * Create a box frame around text
 * @param {string} text - Text to frame
 * @param {string} title - Optional title
 * @param {string} color - Color for the frame
 * @returns {string}
 */
export function box(text, title = null, color = 'cyan') {
  const lines = text.split('\n');
  const maxWidth = Math.max(...lines.map(l => l.length), title ? title.length : 0);
  const width = Math.min(maxWidth + 4, 100);

  const topLine = title
    ? `┌─ ${title} ${'─'.repeat(Math.max(0, width - title.length - 5))}┐`
    : `┌${'─'.repeat(width - 2)}┐`;

  const bottomLine = `└${'─'.repeat(width - 2)}┘`;

  const framedLines = lines.map(line => {
    const padding = ' '.repeat(Math.max(0, width - line.length - 4));
    return `│ ${line}${padding} │`;
  });

  const result = [topLine, ...framedLines, bottomLine].join('\n');
  return color ? colorize(result, color) : result;
}

/**
 * Format a file location (file:line)
 * @param {string} file - File path
 * @param {number} line - Line number
 * @returns {string}
 */
export function formatLocation(file, line) {
  return style.cyan(file) + style.dim(':') + style.yellow(line.toString());
}

/**
 * Create a section divider
 * @param {string} title - Section title
 * @param {string} color - Color for the divider
 * @returns {string}
 */
export function divider(title = '', color = 'cyan') {
  const width = 80;
  if (title) {
    const padding = Math.max(0, (width - title.length - 4) / 2);
    const leftPad = '═'.repeat(Math.floor(padding));
    const rightPad = '═'.repeat(Math.ceil(padding));
    const div = `${leftPad}  ${title}  ${rightPad}`;
    return colorize(div, color);
  }
  return colorize('═'.repeat(width), color);
}
