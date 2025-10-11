import { readFile, access } from 'fs/promises';
import { resolve } from 'path';

/**
 * @typedef {Object} CliscoreConfig
 * @property {string[]} [allowedLanguages] - Markdown language identifiers to accept
 * @property {number} [jobs] - Default number of parallel jobs
 * @property {boolean} [fast] - Default to fast mode
 */

/**
 * Load cliscore.json configuration file
 * @param {string} [configPath] - Path to config file (default: ./cliscore.json)
 * @returns {Promise<CliscoreConfig>}
 */
export async function loadConfig(configPath) {
  const path = configPath || resolve(process.cwd(), 'cliscore.json');

  try {
    await access(path);
    const content = await readFile(path, 'utf-8');
    const config = JSON.parse(content);

    // Validate config
    validateConfig(config);

    return config;
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'EACCES') {
      // File doesn't exist or can't be read - that's fine
      return {};
    }
    // JSON parse error or other issue
    throw new Error(`Invalid cliscore.json: ${error.message}`);
  }
}

/**
 * Validate configuration object
 * @param {any} config - Config to validate
 * @throws {Error} If config is invalid
 */
function validateConfig(config) {
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    throw new Error('Config must be an object');
  }

  if (config.allowedLanguages !== undefined) {
    if (!Array.isArray(config.allowedLanguages)) {
      throw new Error('allowedLanguages must be an array');
    }
    for (const lang of config.allowedLanguages) {
      if (typeof lang !== 'string') {
        throw new Error('allowedLanguages must contain only strings');
      }
    }
  }

  if (config.jobs !== undefined) {
    if (typeof config.jobs !== 'number' || config.jobs < 1 || !Number.isInteger(config.jobs)) {
      throw new Error('jobs must be a positive integer');
    }
  }

  if (config.fast !== undefined && typeof config.fast !== 'boolean') {
    throw new Error('fast must be a boolean');
  }
}

/**
 * Merge configuration with defaults and CLI options
 * Priority: CLI args > config file > defaults
 * @param {CliscoreConfig} config - Config from file
 * @param {Object} cliOptions - Options from CLI
 * @returns {Object}
 */
export function mergeConfig(config, cliOptions) {
  const defaults = {
    allowedLanguages: ['cliscore'],
    jobs: 1,
    fast: false
  };

  // Start with defaults
  const merged = { ...defaults };

  // Apply config file
  if (config.allowedLanguages) {
    // Config file replaces default languages entirely
    merged.allowedLanguages = [...config.allowedLanguages];
  }
  if (config.jobs !== undefined) {
    merged.jobs = config.jobs;
  }
  if (config.fast) {
    merged.jobs = 8;
  }

  // Apply CLI options (these override everything)
  if (cliOptions.allowedLanguages && cliOptions.allowedLanguages.length > 1) {
    // CLI added languages beyond the default - use them
    merged.allowedLanguages = [...cliOptions.allowedLanguages];
  }
  if (cliOptions.jobs !== undefined && cliOptions.jobs !== 1) {
    // CLI specified jobs explicitly
    merged.jobs = cliOptions.jobs;
  }

  return merged;
}
